import { Telegraf } from 'telegraf';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { scanHistory } from './historyScanner.mjs';

const execAsync = promisify(exec);

/** One-line log helper for openclaw CLI (no secrets; truncate). */
function clip(s, max = 600) {
    return String(s || '')
        .replace(/\s+/g, ' ')
        .slice(0, max);
}

function logOpenclawCli(phase, payload) {
    console.log('[TelegramService][openclaw]', phase, JSON.stringify(payload));
}

export const telegramEvents = new EventEmitter();

// In-memory message store for Phase 3.1 (Buffer per chat)
const messageBuffer = new Map();
const MAX_BUFFER_SIZE = 500;

/** Maps OpenClaw session file UUID → canonical Telegram group id (numeric string). */
const sessionToCanonicalChat = new Map();

/** UI / legacy aliases → canonical Telegram chat id (same numeric id as openclaw --to). */
const CHAT_ID_ALIASES = new Map([
    ['TTG000_General_Chat', '-1003752539559'],
    ['TG000_General_Chat', '-1003752539559'],
    ['TSG003_General_Chat', '-1003752539559'],
    ['tg000_general_chat', '-1003752539559'],
    ['-3736210177', '-1003752539559']
]);

/**
 * Loads `name` → `id` from channel_config.json so labels (e.g. TTG001_Idea_Capture) map to the
 * real group id in this install — never a stale hardcoded id.
 */
function hydrateChannelAliasesFromDiskSync() {
    const tryPaths = [];
    if (process.env.WORKSPACE_ROOT) {
        tryPaths.push(
            path.join(process.env.WORKSPACE_ROOT, 'OpenClaw_Control_Center', 'Prototyp', 'channel_CHAT-manager', 'channel_config.json')
        );
    }
    tryPaths.push(path.join(process.cwd(), '..', '..', 'Prototyp', 'channel_CHAT-manager', 'channel_config.json'));

    for (const configPath of tryPaths) {
        try {
            if (!fs.existsSync(configPath)) continue;
            const raw = fs.readFileSync(configPath, 'utf8');
            const parsed = JSON.parse(raw);
            let n = 0;
            for (const c of parsed.channels || []) {
                if (c?.id == null || !c?.name) continue;
                const id = String(c.id).trim();
                const name = String(c.name).trim();
                CHAT_ID_ALIASES.set(name, id);
                CHAT_ID_ALIASES.set(name.toLowerCase(), id);
                n++;
            }
            console.log(`[TelegramService] Hydrated ${n} channel id aliases from ${configPath}`);
            return;
        } catch (e) {
            console.warn(`[TelegramService] Could not hydrate aliases from ${configPath}:`, e.message);
        }
    }
    console.warn('[TelegramService] No channel_config.json found for alias hydration; label→id may be incomplete.');
}

/**
 * Single storage key per Telegram group so SSE and buffers stay consistent.
 * Exported for the telegram route (SSE backlog + live) to match the same key.
 */
export function normalizeChatIdForBuffer(chatId) {
    const s = String(chatId ?? '').trim();
    if (!s) return s;
    return CHAT_ID_ALIASES.get(s) || s;
}

function extractSessionUuidFromPath(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;
    const m = filePath.match(/[/\\]sessions[/\\]([a-f0-9-]{36})\.jsonl$/i);
    return m ? m[1].toLowerCase() : null;
}

/**
 * Reads Telegram group id from OpenClaw user envelope (Conversation info JSON).
 */
function extractTelegramGroupIdFromUserPayload(data) {
    const role = data.message?.role;
    if (role !== 'user') return null;
    const blocks = data.message.content || [];
    let fullText = '';
    for (const b of blocks) {
        if (b.type === 'text' && b.text) fullText += b.text;
    }
    const jsonMatch = fullText.match(/Conversation info \(untrusted metadata\):\s*```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) return null;
    try {
        const meta = JSON.parse(jsonMatch[1]);
        if (meta.chat_id != null && String(meta.chat_id).trim() !== '') {
            return String(meta.chat_id).trim();
        }
        const label = meta.conversation_label;
        if (typeof label === 'string') {
            const idMatch = label.match(/\bid:(-?\d+)/);
            if (idMatch) return idMatch[1];
        }
    } catch {
        return null;
    }
    return null;
}

let bot = null;         // TARS (Inbound)
let relayBot = null;    // CASE / Shedly (Outbound)

// Track file sizes to only read new lines
const fileOffsets = new Map();

export const initTelegramService = () => {
    hydrateChannelAliasesFromDiskSync();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const relayToken = process.env.RELAY_BOT_TOKEN || process.env.SHEDLY_BOT_TOKEN;

    if (!token) {
        console.warn('[TelegramService] TELEGRAM_BOT_TOKEN not found in .env.');
    }
    
    if (!relayToken) {
        console.warn('[TelegramService] RELAY_BOT_TOKEN not found in .env. Cannot send answers!');
    } else {
        // relayBot = new Telegraf(relayToken); (Mirroring disabled to prevent Bot-on-Bot noise)
    }

    // Load historical messages from Markdown transcripts
    scanHistory().then(historyMap => {
        console.log(`[TelegramService] Hydrated history for ${historyMap.size} chats.`);
        for (const [chatId, messages] of historyMap) {
            const key = normalizeChatIdForBuffer(chatId);
            if (!messageBuffer.has(key)) {
                messageBuffer.set(key, messages);
            } else {
                const existing = messageBuffer.get(key);
                const merged = [...messages, ...existing].sort((a,b) => a.date - b.date);
                messageBuffer.set(key, merged.slice(-MAX_BUFFER_SIZE));
            }
        }
    });

    try {
        if (token) {
            // bot = new Telegraf(token);
            // NOTE: bot.launch() is INTENTIONALLY REMOVED to satisfy Phase 7 (Gateway-First)
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
            
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const lines = data.split('\n').filter(l => l.trim() !== '');
                // Read last 200 lines of any loaded JSONL
                const recentLines = lines.slice(-200); 
                
                for (const line of recentLines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.type === 'message' && parsed.message) {
                            processGatewayMessage(parsed, true, filePath);
                        }
                    } catch(e) { }
                }
            } catch (err) {
                console.error(`[Chokidar ADD Error] ${err.message}`);
            }
            fileOffsets.set(filePath, stats ? stats.size : fs.statSync(filePath).size);
        });

        watcher.on('change', (filePath, stats) => {
            if (!filePath.endsWith('.jsonl') || !filePath.includes('/sessions/')) return;
            
            const currentSize = stats ? stats.size : fs.statSync(filePath).size;
            const previousSize = fileOffsets.get(filePath) || 0;
            
            if (currentSize > previousSize) {
                try {
                    const fd = fs.openSync(filePath, 'r');
                    const bufferSize = currentSize - previousSize;
                    const buffer = Buffer.alloc(bufferSize);
                    
                    fs.readSync(fd, buffer, 0, bufferSize, previousSize);
                    fs.closeSync(fd);
                    
                    fileOffsets.set(filePath, currentSize);
                    const data = buffer.toString();
                    const lines = data.split('\n').filter(l => l.trim() !== '');
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.type === 'message' && parsed.message) {
                                processGatewayMessage(parsed, false, filePath);
                            }
                        } catch(e) { }
                    }
                } catch (err) {
                    console.error(`[TelegramService] File Read Error (${path.basename(filePath)}):`, err.message);
                }
            } else if (currentSize < previousSize) {
                fileOffsets.set(filePath, currentSize);
            }
        });

        console.log('[TelegramService] Phase 7 Gateway Listener active. Bridging session transcripts to React SSE.');

    } catch (err) {
        console.error('[TelegramService] Initialization failed:', err.message);
    }
};

const processGatewayMessage = (data, isInit = false, filePath = '') => {
    const role = data.message.role;
    const contentBlocks = data.message.content || [];
    let text = '';
    
    // Convert OpenClaw message format to pure text
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

    const sessionUuid = extractSessionUuidFromPath(filePath);
    let telegramFromUser = extractTelegramGroupIdFromUserPayload(data);
    if (telegramFromUser) {
        telegramFromUser = normalizeChatIdForBuffer(telegramFromUser);
        if (sessionUuid) sessionToCanonicalChat.set(sessionUuid, telegramFromUser);
    }

    let canonicalChatId = null;
    if (telegramFromUser) {
        canonicalChatId = telegramFromUser;
    } else if (sessionUuid && sessionToCanonicalChat.has(sessionUuid)) {
        canonicalChatId = sessionToCanonicalChat.get(sessionUuid);
    }

    // No Telegram routing for this line (e.g. IDE-only session) → do not mirror into any channel buffer.
    if (!canonicalChatId) {
        return;
    }

    const msgObj = {
        id: data.id || `gen_${Math.random()}`,
        text: text,
        sender: role === 'assistant' ? 'TARS (Engine)' : (role === 'toolResult' ? 'System (Tool)' : 'User (Telegram)'),
        senderId: role,
        date: Math.floor(new Date(data.timestamp || Date.now()).getTime() / 1000),
        isBot: role === 'assistant' || role === 'toolResult',
        metrics: data.message.usage || null,
        model: data.message.model || ''
    };

    const chatId = canonicalChatId;
    if (!messageBuffer.has(chatId)) messageBuffer.set(chatId, []);
    const chatBuffer = messageBuffer.get(chatId);

    if (!chatBuffer.find(m => m.id === msgObj.id)) {
        chatBuffer.push(msgObj);
        chatBuffer.sort((a,b) => a.date - b.date);
        if (chatBuffer.length > MAX_BUFFER_SIZE) {
            chatBuffer.splice(0, chatBuffer.length - MAX_BUFFER_SIZE);
        }

        if (!isInit) {
            telegramEvents.emit('newMessage', { chatId, message: msgObj });
        }
    }
};

export const getMessagesForChat = (chatId) => {
    const key = normalizeChatIdForBuffer(chatId.toString());
    return messageBuffer.get(key) || [];
};

export const sendMessageToChat = async (chatId, text) => {
    const realChatId = normalizeChatIdForBuffer(String(chatId));
    const bufferKey = realChatId;

    logOpenclawCli('inject_start', {
        bufferKey,
        rawChatId: String(chatId),
        realChatId: String(realChatId),
        textLen: String(text).length
    });

    console.log(`[TelegramService] CLI Injection -> To: ${realChatId}, Text: "${text.substring(0, 50)}..."`);
    const safeText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
    if (!safeText.trim()) {
        logOpenclawCli('inject_skip', { reason: 'empty_after_escape', realChatId: String(realChatId) });
        return { message_id: `ui-empty-${Date.now()}` };
    }

    const cmd = `export PATH=$PATH:/home/claw-agentbox/.npm-global/bin && openclaw agent --channel telegram --to "${realChatId}" --message "${safeText}" --deliver`;

    try {
        const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
        logOpenclawCli('inject_ok', {
            realChatId: String(realChatId),
            stdoutLen: (stdout || '').length,
            stderrLen: (stderr || '').length,
            stdoutPreview: clip(stdout, 800),
            stderrPreview: clip(stderr, 400)
        });
        console.log('[TelegramService] openclaw agent finished (exit 0).');
    } catch (err) {
        logOpenclawCli('inject_err', {
            realChatId: String(realChatId),
            message: clip(err?.message, 400),
            stderrPreview: clip(err?.stderr, 400),
            stdoutPreview: clip(err?.stdout, 400)
        });
        console.error('[TelegramService] openclaw agent failed:', err.message);
        const fail = new Error(
            `OpenClaw CLI failed for chat ${realChatId}: ${clip(err?.message, 200)}`
        );
        fail.status = 502;
        fail.cause = err;
        throw fail;
    }

    const localId = `ui-${Date.now()}`;
    const uiMsg = {
        id: localId,
        text: text,
        sender: 'You (Web-UI)',
        senderId: 'user',
        date: Math.floor(Date.now() / 1000),
        isBot: false
    };

    if (!messageBuffer.has(bufferKey)) messageBuffer.set(bufferKey, []);
    messageBuffer.get(bufferKey).push(uiMsg);
    telegramEvents.emit('newMessage', { chatId: bufferKey, message: uiMsg });

    return { message_id: localId };
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
