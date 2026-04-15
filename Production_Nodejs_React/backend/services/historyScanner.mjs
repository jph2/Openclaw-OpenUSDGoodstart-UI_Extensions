import fs from 'fs/promises';
import path from 'path';

/**
 * Memory History Hydration Scanner
 * Scans /home/claw-agentbox/.openclaw/workspace/memory/*.md for historical transcripts.
 */
export async function scanHistory(memoryDir = '/home/claw-agentbox/.openclaw/workspace/memory') {
    const historicalMessages = new Map(); // chatId -> [msgObj]
    
    try {
        const files = await fs.readdir(memoryDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        for (const file of mdFiles) {
            const content = await fs.readFile(path.join(memoryDir, file), 'utf8');
            const parsed = parseMarkdownTranscript(content);
            
            if (parsed.length > 0) {
                // Determine chatId from filename or content?
                // Sub-Task 6.3 says: "Abgleich der agent:main:telegram:group:<ID> Keys mit den Markdown-Metadaten"
                // For now, we will map to TTG000_General_Chat (or legacy TG000_) if not specified.
                // But let's look for session info in the header.
                const chatId = extractChatId(content) || '-1003752539559'; // Default to general chat for testing
                
                if (!historicalMessages.has(chatId)) historicalMessages.set(chatId, []);
                historicalMessages.get(chatId).push(...parsed);
            }
        }
        
        // Sort by date and limit per chat
        for (const [chatId, msgs] of historicalMessages) {
            msgs.sort((a, b) => a.date - b.date);
            historicalMessages.set(chatId, msgs.slice(-100)); // Keep last 100
        }
        
    } catch (err) {
        console.warn('[HistoryScanner] Failed to scan history:', err.message);
    }
    
    return historicalMessages;
}

function extractChatId(content) {
    // Attempt to find a group ID in the metadata blocks
    const match = content.match(/"conversation_label":\s*".*id:(-?\d+)"/);
    if (match) return match[1];
    return null;
}

function parseMarkdownTranscript(content) {
    const messages = [];
    const lines = content.split('\n');
    
    let currentMsg = null;
    
    for (const line of lines) {
        if (line.startsWith('user:') || line.startsWith('assistant:')) {
            if (currentMsg) messages.push(currentMsg);
            
            const role = line.startsWith('user:') ? 'user' : 'assistant';
            const text = line.replace(/^(user:|assistant:)\s*/, '');
            
            currentMsg = {
                id: `hist_${Math.random().toString(36).substr(2, 9)}`,
                text: text,
                sender: role === 'assistant' ? 'TARS (Archive)' : 'User (Archive)',
                senderId: role,
                date: Date.now() / 1000 - 86400, // Placeholder date (1 day ago)
                isBot: role === 'assistant'
            };
        } else if (currentMsg && line.trim() !== '') {
            // Append line to current message text
            currentMsg.text += '\n' + line;
        }
    }
    
    if (currentMsg) messages.push(currentMsg);
    
    return messages;
}
