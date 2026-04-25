/**
 * Live Open Brain sync dispatch (Ticket G). "stub" stays local-only; "http"
 * POSTs the export record to OPEN_BRAIN_SYNC_URL.
 */

export class OpenBrainSyncDispatchError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = 'OpenBrainSyncDispatchError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

function stubThoughtId(exportRecord) {
    const id = exportRecord?.dedup?.identity;
    if (!id || typeof id !== 'string') {
        throw new OpenBrainSyncDispatchError('Export record missing dedup.identity', 500);
    }
    return `stub-${id.slice(0, 32)}`;
}

/**
 * @param {object} exportRecord - full OB export payload from buildOpenBrainExportRecord
 * @returns {Promise<{ provider: string, thoughtId: string }>}
 */
export async function runOpenBrainLiveSync(exportRecord) {
    const provider = (process.env.OPEN_BRAIN_SYNC_PROVIDER || 'stub').toLowerCase();

    if (provider === 'stub') {
        return { provider: 'stub', thoughtId: stubThoughtId(exportRecord) };
    }

    if (provider === 'http') {
        const url = String(process.env.OPEN_BRAIN_SYNC_URL || '').trim();
        if (!url) {
            throw new OpenBrainSyncDispatchError(
                'OPEN_BRAIN_SYNC_URL is required when OPEN_BRAIN_SYNC_PROVIDER=http',
                503
            );
        }

        const timeoutMs = Math.min(
            Math.max(Number(process.env.OPEN_BRAIN_SYNC_TIMEOUT_MS) || 30_000, 3000),
            120_000
        );
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
        const apiKey = process.env.OPEN_BRAIN_SYNC_API_KEY;
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }

        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(exportRecord),
                signal: ac.signal
            });
        } catch (e) {
            if (e?.name === 'AbortError') {
                throw new OpenBrainSyncDispatchError(
                    `Open Brain sync HTTP timeout after ${timeoutMs}ms`,
                    504
                );
            }
            throw new OpenBrainSyncDispatchError(
                e?.message || 'Open Brain sync HTTP request failed',
                502,
                { cause: String(e) }
            );
        } finally {
            clearTimeout(timer);
        }

        const text = await res.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            // non-JSON body
        }

        if (!res.ok) {
            throw new OpenBrainSyncDispatchError(
                json?.error || `Open Brain sync HTTP ${res.status}`,
                502,
                { status: res.status, body: text.slice(0, 2000) }
            );
        }

        const thoughtId = json?.thoughtId ?? json?.id ?? json?.thought?.id;
        if (!thoughtId || typeof thoughtId !== 'string') {
            throw new OpenBrainSyncDispatchError(
                'Open Brain sync response missing thoughtId (expected JSON { thoughtId } or { id })',
                502,
                { json }
            );
        }
        return { provider: 'http', thoughtId: String(thoughtId) };
    }

    throw new OpenBrainSyncDispatchError(
        `Open Brain sync provider "${provider}" is not implemented`,
        501
    );
}
