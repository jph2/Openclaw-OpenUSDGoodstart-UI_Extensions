import React, { useState, useEffect, useRef } from 'react';
import { Send, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const RENDER_PLUGINS = [remarkGfm];

const RENDER_COMPONENTS = {
    p: ({ node: _node, ...props }) => <p style={{ margin: '0 0 10px 0' }} {...props} />,
    pre: ({ node: _node, ...props }) => <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', overflowX: 'auto', margin: '10px 0' }} {...props} />,
    code: ({ node: _node, inline, className, children, ...props }) => inline ? <code style={{ background: 'rgba(0,0,0,0.15)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em' }} {...props}>{children}</code> : <code style={{ fontFamily: 'monospace', fontSize: '0.9em' }} className={className} {...props}>{children}</code>,
    ul: ({ node: _node, ...props }) => <ul style={{ paddingLeft: '24px', marginBottom: '10px', marginTop: '0' }} {...props} />,
    ol: ({ node: _node, ...props }) => <ol style={{ paddingLeft: '24px', marginBottom: '10px', marginTop: '0' }} {...props} />,
    li: ({ node: _node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
    a: ({ node: _node, ...props }) => <a style={{ color: '#50e3c2', textDecoration: 'none' }} {...props} />
};

const MessageBubble = React.memo(({ msg }) => {
    const isMe = msg.senderId === 'me' || (msg.sender && (msg.sender.toLowerCase() === 'you (frontend)' || msg.sender.toLowerCase().includes('jan') || msg.sender.toLowerCase().includes('user')));
    
    const formatNum = (n) => n > 1000 ? (n/1000).toFixed(1) + 'k' : n;
    const timestampStr = new Date(msg.date * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let stamp = `${timestampStr}`;
    if (msg.metrics) {
        const input = formatNum(msg.metrics.input || 0);
        const output = formatNum(msg.metrics.output || 0);
        const cache = formatNum(msg.metrics.cacheRead || 0);
        stamp += ` ↑${input} ↓${output} R${cache}`;
    }
    if (msg.model) {
        stamp += ` ctx ${msg.model}`;
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: isMe ? 0 : '8px', marginRight: isMe ? '8px' : 0, fontWeight: 600 }}>
                {msg.sender.replace(' (Gateway)', '')} {msg.isBot && <span style={{ background: '#50e3c2', color: '#000', padding: '1px 4px', borderRadius: '4px', fontSize: '9px', marginLeft: '4px', fontWeight: 'bold' }}>BOT</span>}
            </div>
            <div style={{ 
                background: isMe ? '#50e3c2' : '#2a2b36', 
                color: isMe ? '#000' : '#e0e0e0',
                padding: '12px 16px', 
                borderRadius: '8px',
                borderBottomRightRadius: isMe ? 0 : '8px',
                borderBottomLeftRadius: isMe ? '8px' : 0,
                maxWidth: '85%',
                wordBreak: 'break-word',
                lineHeight: '1.5',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <button 
                        onClick={() => copyToClipboard(msg.text)}
                        style={{ background: 'rgba(0,0,0,0.1)', border: 'none', color: isMe ? '#000' : '#888', cursor: 'pointer', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Copy as markdown"
                    >
                        <Copy size={14} />
                    </button>
                </div>
                <div style={{ paddingRight: '20px' }}>
                    {/* eslint-disable no-unused-vars */}
                    <ReactMarkdown remarkPlugins={RENDER_PLUGINS} components={RENDER_COMPONENTS}>
                        {msg.text}
                    </ReactMarkdown>
                </div>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', marginLeft: isMe ? 0 : '8px', marginRight: isMe ? '8px' : 0 }}>
                {stamp}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.msg.id === nextProps.msg.id && prevProps.msg.text === nextProps.msg.text;
});

export default function TelegramChat({ channelId, channelName }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showSystemMessages, setShowSystemMessages] = useState(false);
    const containerRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Setup Server-Sent Events for live messages
    useEffect(() => {
        if (!channelId) return;
        
        let shouldReconnect = true;
        let eventSource = null;
        
        const connectSSE = () => {
             eventSource = new EventSource(`/api/telegram/stream/${channelId}`);
             
             eventSource.onmessage = (event) => {
                 if (event.data === ':ping') return;
                 try {
                     const parsed = JSON.parse(event.data);
                     if (parsed.type === 'INIT') {
                         setMessages(parsed.messages);
                     } else if (parsed.type === 'MESSAGE') {
                         setMessages(prev => {
                             // Avoid duplicates if SSE reconnects
                             if (prev.find(m => m.id === parsed.message.id)) return prev;
                             return [...prev, parsed.message];
                         });
                     }
                 } catch (e) {
                     console.warn('Failed to parse SSE payload', e);
                 }
             };
             
             eventSource.onerror = (e) => {
                 console.warn("SSE connection error", e);
                 eventSource.close();
                 if (shouldReconnect) {
                     setTimeout(connectSSE, 3000);
                 }
             };
        };

        connectSSE();

        return () => {
            shouldReconnect = false;
            if (eventSource) eventSource.close();
        };
    }, [channelId]);

    const cleanMessageText = (text) => {
        if (showSystemMessages) return text;
        
        let cleaned = text;
        // Function 2: Text cleaning
        cleaned = cleaned.replace(/\[\[reply_to_current\]\]\s*/g, '');
        cleaned = cleaned.replace(/Conversation info \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```\s*/g, '');
        cleaned = cleaned.replace(/Sender \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```\s*/g, '');
        
        return cleaned.trim();
    };

    const filteredMessages = messages.filter(msg => {
        if (showSystemMessages) return true;
        
        const text = msg.text || '';
        // Function 1: Block system messages
        if (text === 'HEARTBEAT_OK') return false;
        if (text.startsWith('Read HEARTBEAT.md')) return false;
        
        return true;
    }).map(msg => ({
        ...msg,
        displayChatText: cleanMessageText(msg.text || '')
    })).filter(msg => msg.displayChatText.length > 0 || showSystemMessages);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending) return;
        
        const textToSend = inputValue.trim();
        setInputValue('');
        setIsSending(true);
        
        try {
            const res = await fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: channelId, text: textToSend })
            });
            if (!res.ok) throw new Error('Send failed');
            // Optimistic update is not strictly needed because the bot will broadcast it back via SSE
            // Actually, bots don't receive their own outgoing messages natively via telegraf unless specified,
            // but let's see. If not, we can push an optimistic message. For safety, let's push an optimistic one:
            setMessages(prev => [...prev, { id: Date.now(), text: textToSend, sender: 'You (Frontend)', senderId: 'me', date: Date.now()/1000, isBot: false }]);
        } catch (err) {
            console.error(err);
            alert("Failed to send message.");
            setInputValue(textToSend); // restore on fail
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div style={{
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: '#13141c', 
            color: '#fff',
            height: '100%',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', background: '#1a1b26', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#50e3c2' }}>#</span>
                    {channelName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={showSystemMessages} 
                            onChange={() => setShowSystemMessages(!showSystemMessages)} 
                        />
                        Show System/Agent Internal Tasks
                    </label>
                    <div style={{ fontSize: '11px', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        NATIVE CLIENT
                    </div>
                </div>
            </div>
            
            {/* Messages Area */}
            <div ref={containerRef} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Waiting for messages in {channelName}...
                    </div>
                ) : (
                    filteredMessages.map((msg, idx) => (
                        <MessageBubble key={msg.id || idx} msg={{...msg, text: msg.displayChatText}} />
                    ))
                )}
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: '#1a1b26' }}>
                <div style={{ display: 'flex', background: '#13141c', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                        placeholder={`Message ${channelName}...`}
                        disabled={isSending}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', 
                            color: '#fff', outline: 'none', padding: '4px'
                        }} 
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isSending || !inputValue.trim()} 
                        style={{ 
                            background: inputValue.trim() ? '#50e3c2' : '#2a2b36', 
                            border: 'none',
                            color: inputValue.trim() ? '#000' : 'var(--text-muted)', 
                            padding: '6px 14px', borderRadius: '4px', cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', transition: 'all 0.2s'
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
