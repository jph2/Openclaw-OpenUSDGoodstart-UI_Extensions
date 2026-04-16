import React from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * Telegram bot chips for a channel. No placeholder text when empty.
 */
export default function ActiveBotsList({ chatId, suppressTopBorder }) {
    const { data: bots, isLoading } = useQuery({
        queryKey: ['activeBots', chatId],
        queryFn: async () => {
            const res = await fetch(`/api/telegram/bots/${chatId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.bots || [];
        },
        staleTime: 60000
    });

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: suppressTopBorder ? 0 : '12px',
                paddingTop: suppressTopBorder ? 0 : '12px',
                borderTop: suppressTopBorder ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}
        >
            {isLoading && <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Checking bots…</div>}

            {bots &&
                bots.map((bot) => (
                    <div
                        key={bot.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}
                    >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#50e3c2' }}></div>
                        <span>
                            {bot.first_name} {bot.username && `(@${bot.username})`}
                        </span>
                    </div>
                ))}
        </div>
    );
}
