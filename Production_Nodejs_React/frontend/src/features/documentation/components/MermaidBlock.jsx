import React, { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;

function ensureMermaidInit() {
    if (initialized) return;
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeVariables: {
            primaryColor: '#1a1a1a',
            primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#50e3c2',
            lineColor: '#50e3c2',
            secondaryColor: '#111111',
            tertiaryColor: '#2a2a2a',
            background: '#0a0a0a',
            mainBkg: '#111111',
            textColor: '#e0e0e0'
        }
    });
    initialized = true;
}

/**
 * Renders a Mermaid diagram from a string definition (client-side).
 */
export default function MermaidBlock({ chart, caption }) {
    const reactId = useId().replace(/:/g, '');
    const containerRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !chart?.trim()) return undefined;

        ensureMermaidInit();
        setError(null);
        el.innerHTML = '';

        const id = `mmd-docs-${reactId}-${Math.random().toString(36).slice(2, 9)}`;
        let cancelled = false;

        mermaid
            .render(id, chart.trim())
            .then(({ svg }) => {
                if (!cancelled && containerRef.current === el) {
                    el.innerHTML = svg;
                }
            })
            .catch((err) => {
                if (!cancelled && containerRef.current === el) {
                    setError(err?.message || 'Could not render diagram.');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [chart, reactId]);

    return (
        <figure style={{ margin: '1.25rem 0' }}>
            <div
                ref={containerRef}
                style={{
                    overflowX: 'auto',
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                }}
                aria-label={caption || 'Diagram'}
            />
            {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '8px 0 0' }}>{error}</p>
            )}
            {caption && !error && (
                <figcaption style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>{caption}</figcaption>
            )}
        </figure>
    );
}
