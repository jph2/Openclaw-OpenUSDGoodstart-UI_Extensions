/**
 * Flatten a single OpenClaw content block into a plain string, for the
 * collapsed text payload of a tool result bubble. The gateway sometimes
 * nests the actual output under `content[]` (text blocks only for now).
 */
function flattenToolResultContent(block) {
    if (!block) return '';
    if (typeof block.content === 'string') return block.content;
    if (Array.isArray(block.content)) {
        return block.content
            .map((inner) => {
                if (inner?.type === 'text' && typeof inner.text === 'string') return inner.text;
                return '';
            })
            .filter(Boolean)
            .join('\n');
    }
    if (typeof block.text === 'string') return block.text;
    return '';
}

function mediaFilenameFromPath(p) {
    if (!p || typeof p !== 'string') return '';
    const norm = p.replace(/\\/g, '/');
    const idx = norm.lastIndexOf('/');
    return idx >= 0 ? norm.slice(idx + 1) : norm;
}

function isImageMime(mime) {
    return typeof mime === 'string' && mime.toLowerCase().startsWith('image/');
}

function imageMimeFromMediaPath(filePath, explicitMime) {
    const mime = explicitMime && String(explicitMime).trim()
        ? String(explicitMime).split(';')[0].trim().toLowerCase()
        : '';
    if (mime) return mime;
    const lower = String(filePath || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'application/octet-stream';
}

function appendOpenclawMediaParts(message, parts) {
    const paths =
        Array.isArray(message.MediaPaths) && message.MediaPaths.length > 0
            ? message.MediaPaths
            : message.MediaPath
              ? [message.MediaPath]
              : [];
    const types =
        Array.isArray(message.MediaTypes) && message.MediaTypes.length > 0
            ? message.MediaTypes
            : message.MediaType
              ? [message.MediaType]
              : [];

    for (let i = 0; i < paths.length; i++) {
        const id = mediaFilenameFromPath(paths[i]);
        if (!id) continue;
        const mime = imageMimeFromMediaPath(paths[i], types[i]);
        if (!isImageMime(mime)) continue;
        parts.push({
            type: 'image',
            mediaId: id,
            mimeType: mime,
            url: `/api/chat/media/inbound/${encodeURIComponent(id)}`
        });
    }
}

/**
 * Normalize text + media into `parts[]` (Channel Manager chat media v1).
 * @param {string} text
 * @param {Array<object>} parts
 */
function buildNormalizedParts(text, parts) {
    const out = [];
    const trimmed = String(text || '').trim();
    if (trimmed) {
        out.push({ type: 'text', text: trimmed });
    }
    for (const p of parts) {
        if (p?.type === 'image') out.push(p);
    }
    return out;
}

export function buildMsgObjFromGatewayLine(parsed) {
    if (!parsed || parsed.type !== 'message' || !parsed.message) return null;
    const data = parsed;
    const role = data.message.role;
    const rawContent = data.message.content;

    let text = '';
    const mediaParts = [];
    const toolCalls = [];
    const toolResults = [];

    if (typeof rawContent === 'string') {
        text = rawContent;
    } else if (Array.isArray(rawContent)) {
        rawContent.forEach((b) => {
            if (!b) return;
            if (b.type === 'text' && typeof b.text === 'string') {
                text += b.text + '\n';
            } else if (b.type === 'image') {
                const id =
                    (typeof b.mediaId === 'string' && b.mediaId) ||
                    (typeof b.id === 'string' && b.id) ||
                    '';
                const mime =
                    (typeof b.mimeType === 'string' && b.mimeType.split(';')[0].trim()) || 'image/png';
                if (!isImageMime(mime)) return;
                mediaParts.push({
                    type: 'image',
                    mediaId: id,
                    mimeType: mime,
                    url: typeof b.url === 'string' ? b.url : undefined
                });
            } else if (b.type === 'toolCall') {
                toolCalls.push({
                    id: b.id || null,
                    name: b.name || 'tool',
                    input: b.input ?? b.arguments ?? b.args ?? null
                });
            } else if (b.type === 'toolResult') {
                toolResults.push({
                    id: b.id || null,
                    toolUseId: b.toolUseId || null,
                    toolName: b.toolName || 'tool',
                    output: flattenToolResultContent(b),
                    isError: b.isError === true
                });
            }
        });
    }

    text = text.trim();
    appendOpenclawMediaParts(data.message, mediaParts);

    const normalizedParts = buildNormalizedParts(text, mediaParts);
    const hasImagePart = normalizedParts.some((p) => p.type === 'image');
    const cmAttachKind = hasImagePart ? 'image' : undefined;

    if (
        !text &&
        toolCalls.length === 0 &&
        toolResults.length === 0 &&
        normalizedParts.length === 0
    ) {
        return null;
    }

    return {
        id: data.id || `gen_${Math.random()}`,
        text,
        parts:
            normalizedParts.length > 0
                ? normalizedParts
                : text
                  ? [{ type: 'text', text }]
                  : [],
        cmAttachKind,
        toolCalls,
        toolResults,
        sender: role === 'assistant' ? 'TARS (Engine)' : role === 'toolResult' ? 'System (Tool)' : 'User (Telegram)',
        senderId: role,
        senderRole: role,
        date: Math.floor(new Date(data.timestamp || Date.now()).getTime() / 1000),
        isBot: role === 'assistant' || role === 'toolResult',
        metrics: data.message.usage || null,
        model: data.message.model || ''
    };
}
