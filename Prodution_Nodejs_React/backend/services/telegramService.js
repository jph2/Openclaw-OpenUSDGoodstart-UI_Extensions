import { Telegraf } from 'telegraf';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

export const telegramEvents = new EventEmitter();

// In-memory message store for Phase 3.1 (Buffer per chat)
const messageBuffer = new Map();
const MAX_BUFFER_SIZE = 50;

let bot = null;         // TARS (Inbound)
let relayBot = null;    // CASE / Shedly (Outbound)

// Track file sizes to only read new lines
const fileOffsets = new Map();

export const initTelegramService = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const relayToken = process.env.RELAY_BOT_TOKEN || process.env.SHEDLY_BOT_TOKEN;

    if (!token) {
        console.warn('[TelegramService] TELEGRAM_BOT_TOKEN not found in .env.');
    }
    
    if (!relayToken) {
        console.warn('[TelegramService] RELAY_BOT_TOKEN not found in .env. Cannot send answers!');
    } else {
        relayBot = new Telegraf(relayToken);
    }

    try {
        if (token) {
            bot = new Telegraf(token);
            // NOTE: bot.launch() is INTENTIONALLY REMOVED to satisfy Phase 7 (Gateway-First)
            // The 409 Conflict is solved because the local process no longer actively polls Telegram.
        }

        // ==========================================
        // PHASE 7: Gateway-First Filesystem Bridge
        // ==========================================
        const agentsDir = path.resolve(process.env.HOME || '/home/claw-agentbox', '.openclaw/agents');
        
        console.log(`[TelegramService] Initializing Chokidar Gateway Listener on ${agentsDir} ...`);
        
        const watcher = chokidar.watch(agentsDir, {
            persistent: true,
            ignoreInitial: false,
            usePolling: true,
            interval: 500
        });

        watcher.on('add', (filePath, stats) => {
            if (!filePath.endsWith('.jsonl') || !filePath.includes('/sessions/')) return;
            
            fs.appendFileSync('backend_debug.log', `[Chokidar ADD] ${filePath}\n`);
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const lines = data.split('\n').filter(l => l.trim() !== '');
                const recentLines = lines.slice(-200); 
                
                for (const line of recentLines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.type === 'message' && parsed.message) {
                            processGatewayMessage(parsed);
                        }
                    } catch(e) { }
                }
            } catch (err) {
                fs.appendFileSync('backend_debug.log', `[Chokidar ADD Error] ${err.message}\n`);
            }
            fileOffsets.set(filePath, stats ? stats.size : fs.statSync(filePath).size);
        });

        watcher.on('change', (filePath, stats) => {
            if (!filePath.endsWith('.jsonl') || !filePath.includes('/sessions/')) return;
            
            fs.appendFileSync('backend_debug.log', `[Chokidar CHANGE] ${filePath}\n`);
            const currentSize = stats ? stats.size : fs.statSync(filePath).size;
            const previousSize = fileOffsets.get(filePath) || 0;
            
            if (currentSize > previousSize) {
                const stream = fs.createReadStream(filePath, { start: previousSize, end: currentSize - 1 });
                let data = '';
                
                stream.on('error', err => fs.appendFileSync('backend_debug.log', `[Stream Error] ${err.message}\n`));
                stream.on('data', chunk => { data += chunk.toString(); });
                stream.on('end', () => {
                    fileOffsets.set(filePath, currentSize);
                    const lines = data.split('\n').filter(l => l.trim() !== '');
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.type === 'message' && parsed.message) {
                                processGatewayMessage(parsed);
                            }
                        } catch(e) { }
                    }
                });
            } else if (currentSize < previousSize) {
                fileOffsets.set(filePath, currentSize);
            }
        });

        console.log('[TelegramService] Phase 7 Gateway Listener active. Bridging session transcripts to React SSE.');

    } catch (err) {
        console.error('[TelegramService] Initialization failed:', err.message);
    }
};

const processGatewayMessage = (data) => {
    const role = data.message.role;
    const contentBlocks = data.message.content || [];
    let text = '';
    
    // Convert OpenClaw message format to pure text for the Simple React Chat
    contentBlocks.forEach(b => {
        if (b.type === 'text') {
            text += b.text + '\n';
        } else if (b.type === 'toolCall') {
            text += `⚙️ [Tool Call: ${b.name}]\n`;
        } else if (b.type === 'toolResult') {
            text += `✅ [Tool Result: ${b.toolName}]\n`;
        }
    });
    
    text = text.trim();
    if (!text) return;

    // Use a hardcoded mapped ID, or route generically.
    // The frontend listens on -1003752539559 / -3736210177 or the channel UI name directly.
    const targetChatIds = ['-1003752539559', '-3736210177', 'TG000_General_Chat', 'TG001_Idea_Capture'];
    
    const msgObj = {
        id: data.id,
        text: text,
        sender: role === 'assistant' ? 'TARS (Gateway)' : (role === 'toolResult' ? 'System (Tool)' : 'User'),
        senderId: role,
        date: Math.floor(new Date(data.timestamp).getTime() / 1000),
        isBot: role === 'assistant' || role === 'toolResult',
        metrics: data.message.usage || null,
        model: data.message.model || ''
    };

    targetChatIds.forEach(chatId => {
        if (!messageBuffer.has(chatId)) messageBuffer.set(chatId, []);
        const chatBuffer = messageBuffer.get(chatId);
        
        // Push and emit
        chatBuffer.push(msgObj);
        if (chatBuffer.length > MAX_BUFFER_SIZE) chatBuffer.shift();
        
        telegramEvents.emit('newMessage', { chatId, message: msgObj });
    });
};

export const getMessagesForChat = (chatId) => {
    return messageBuffer.get(chatId.toString()) || [];
};

export const sendMessageToChat = async (chatId, text) => {
    if (!relayBot) {
        console.warn('Relay bot is not configured, falling back to TARS bot (may cause Bot-to-Bot filter issues)');
        if (!bot) throw new Error('No Telegram bot configured.');
        return await bot.telegram.sendMessage(chatId, text);
    }
    return await relayBot.telegram.sendMessage(chatId, text);
};

let relayBotInfo = null;
let mainBotInfo = null;

export const getChatBots = async (chatId) => {
    if (!bot) return [];
    try {
        if (!mainBotInfo) mainBotInfo = await bot.telegram.getMe();
        
        const admins = await bot.telegram.getChatAdministrators(chatId);
        // Filter out human admins, keep only bots, AND hide the primary bot itself
        const bots = admins.filter(admin => admin.user.is_bot && admin.user.id !== mainBotInfo.id).map(admin => admin.user);

        if (relayBot) {
            try {
                if (!relayBotInfo) relayBotInfo = await relayBot.telegram.getMe();
                if (!bots.find(b => b.id === relayBotInfo.id)) {
                    const relayMember = await bot.telegram.getChatMember(chatId, relayBotInfo.id);
                    if (['creator', 'administrator', 'member', 'restricted'].includes(relayMember.status)) {
                        bots.push(relayMember.user);
                    }
                }
            } catch (err) {}
        }

        return bots;
    } catch (err) {
        console.error(`[TelegramService] Failed to fetch admins for ${chatId}:`, err.message);
        return [];
    }
};
