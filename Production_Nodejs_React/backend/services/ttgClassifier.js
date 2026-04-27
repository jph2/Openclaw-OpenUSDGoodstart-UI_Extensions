import fs from 'fs/promises';
import path from 'path';
import { extractMarkdownFrontmatter } from './artifactHeaderBinding.js';

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'where',
    'when', 'what', 'your', 'lane', 'topic', 'group', 'telegram', 'ttg',
    'use', 'uses', 'using', 'status', 'active', 'version', 'date', 'time',
    'general', 'purpose', 'rules', 'related', 'artifact'
]);

function codeFromValue(value = '') {
    const match = String(value || '').match(/(?:^|[^A-Z0-9])T?TG\s*0*(\d{1,3})(?:[^0-9]|$)/i)
        || String(value || '').match(/TTG(\d{3})/i);
    return match ? match[1].padStart(3, '0') : '';
}

function tokenize(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[_/\\-]+/g, ' ')
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function unique(values) {
    return [...new Set(values.filter(Boolean).map(String))];
}

function scoreSignal(haystack, signals) {
    let score = 0;
    const evidence = [];
    for (const signal of signals) {
        if (haystack.includes(signal.term)) {
            score += signal.weight;
            evidence.push(signal.evidence);
        }
    }
    return { score, evidence };
}

function channelMapByCode(channelMappings = []) {
    const map = new Map();
    for (const row of Array.isArray(channelMappings) ? channelMappings : []) {
        const code = codeFromValue(row?.name || row?.label || row?.ttgName || '');
        if (code && row?.id) map.set(code, { id: String(row.id), name: String(row.name || row.label || '') });
    }
    return map;
}

export function buildChannelMappingsFromConfig(config = {}) {
    return (Array.isArray(config.channels) ? config.channels : [])
        .filter((row) => row?.id && row?.name)
        .map((row) => ({ id: String(row.id), name: String(row.name) }));
}

export async function loadTtgDefinitions({ studioRoot, channelMappings = [] } = {}) {
    if (!studioRoot) return [];
    const dir = path.join(studioRoot, '000_TelegramTopicGroups_Def');
    const channelsByCode = channelMapByCode(channelMappings);
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const definitions = [];
    for (const ent of entries) {
        if (!ent.isFile() || !/^TTG.*\.md$/i.test(ent.name)) continue;
        const filePath = path.join(dir, ent.name);
        const markdown = await fs.readFile(filePath, 'utf8');
        const { frontmatter, body } = extractMarkdownFrontmatter(markdown);
        const code = codeFromValue(ent.name) || codeFromValue(frontmatter.title || body);
        const mapped = channelsByCode.get(code);
        definitions.push({
            code,
            ttgId: mapped?.id || '',
            ttgName: mapped?.name || String(frontmatter.title || '').replace(/\s+/g, '_') || `TTG${code}`,
            title: String(frontmatter.title || ''),
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
            markdown,
            tokens: unique([
                ...tokenize(frontmatter.title || ''),
                ...tokenize(Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') : ''),
                ...tokenize(body)
            ])
        });
    }
    return definitions.sort((a, b) => a.code.localeCompare(b.code));
}

const MIN_CLASSIFIER_SCORE = 3;
const INFER_TOP_PERCENT = 70;
const INFER_GAP_PERCENT = 20;

/** Largest-remainder percent shares that sum to 100. */
function buildPercentDistribution(candidates) {
    const sum = candidates.reduce((s, c) => s + c.score, 0);
    if (sum <= 0) return [];
    const rows = candidates.map((c) => {
        const exact = (100 * c.score) / sum;
        return {
            ttgId: c.ttgId || null,
            ttgName: c.ttgName,
            code: c.code,
            score: c.score,
            evidence: Array.isArray(c.evidence) ? [...c.evidence] : [],
            exact,
            percent: Math.floor(exact)
        };
    });
    let remainder = 100 - rows.reduce((s, r) => s + r.percent, 0);
    const order = rows
        .map((r, i) => ({ i, frac: r.exact - r.percent }))
        .sort((a, b) => b.frac - a.frac || rows[b.i].score - rows[a.i].score);
    for (let k = 0; k < remainder; k++) {
        rows[order[k].i].percent += 1;
    }
    return rows.map(({ exact, ...rest }) => rest);
}

function foundationBoosts(definition, haystack, artifactType) {
    const code = definition.code;
    if (code === '001') {
        return scoreSignal(haystack, [
            { term: 'idea', weight: 4, evidence: 'artifact contains idea-capture language' },
            { term: 'brainstorm', weight: 3, evidence: 'artifact contains brainstorming language' },
            { term: 'note to self', weight: 4, evidence: 'artifact contains note-to-self language' },
            { term: 'raw thought', weight: 4, evidence: 'artifact contains raw-thought language' },
            { term: 'half formed', weight: 3, evidence: 'artifact contains half-formed concept language' }
        ]);
    }
    if (code === '010') {
        const base = scoreSignal(haystack, [
            { term: 'discovery', weight: 5, evidence: 'artifact contains discovery language' },
            { term: 'research', weight: 5, evidence: 'artifact contains research language' },
            { term: 'structured', weight: 2, evidence: 'artifact asks for structured work' },
            { term: 'investigate', weight: 3, evidence: 'artifact asks to investigate' },
            { term: 'analysis', weight: 2, evidence: 'artifact contains analysis language' }
        ]);
        if (artifactType === 'DISCOVERY' || artifactType === 'RESEARCH') {
            base.score += 5;
            base.evidence.push(`artifact type is ${artifactType}`);
        }
        return base;
    }
    if (code === '000') {
        return scoreSignal(haystack, [
            { term: 'general chat', weight: 4, evidence: 'artifact contains general-chat language' },
            { term: 'quick question', weight: 3, evidence: 'artifact contains quick-question language' },
            { term: 'casual', weight: 2, evidence: 'artifact contains casual conversation language' },
            { term: 'unsure where', weight: 3, evidence: 'artifact says routing is unclear' },
            { term: 'meta chat', weight: 3, evidence: 'artifact contains meta-chat language' }
        ]);
    }
    return { score: 0, evidence: [] };
}

export function classifyArtifactTtg({ artifact = {}, markdown = '', ttgDefinitions = [] } = {}) {
    const { body } = extractMarkdownFrontmatter(markdown);
    const artifactType = String(artifact.type || '').toUpperCase();
    const haystack = [
        artifact.title,
        artifactType,
        Array.isArray(artifact.tags) ? artifact.tags.join(' ') : '',
        body.slice(0, 4000)
    ].join('\n').toLowerCase().replace(/[_/\\-]+/g, ' ');
    const contentTokens = new Set(tokenize(haystack));

    const candidates = [];
    for (const definition of ttgDefinitions) {
        let score = 0;
        const evidence = [];
        const overlap = definition.tokens.filter((token) => contentTokens.has(token)).slice(0, 8);
        if (overlap.length) {
            score += Math.min(overlap.length, 6);
            evidence.push(`matched TTG definition terms: ${overlap.join(', ')}`);
        }
        const boosted = foundationBoosts(definition, haystack, artifactType);
        score += boosted.score;
        evidence.push(...boosted.evidence);
        if (score > 0) {
            candidates.push({
                ttgId: definition.ttgId || null,
                ttgName: definition.ttgName,
                code: definition.code,
                score,
                evidence
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
    if (!candidates.length || candidates[0].score < MIN_CLASSIFIER_SCORE) {
        return {
            status: 'unknown',
            method: 'agent_classification',
            ttgId: null,
            ttgName: '',
            confidence: 0,
            evidence: ['no useful TTG definition match'],
            candidates: [],
            distribution: []
        };
    }

    const distribution = buildPercentDistribution(candidates);
    const top = distribution[0];
    const second = distribution[1];
    const topPercent = top.percent;
    const secondPercent = second ? second.percent : 0;
    const gapPercent = topPercent - secondPercent;
    const scoreTie = Boolean(candidates[1] && candidates[0].score - candidates[1].score <= 1);

    if (
        (second && gapPercent < INFER_GAP_PERCENT)
        || (second && scoreTie && topPercent < 85)
    ) {
        return {
            status: 'ambiguous',
            method: 'agent_classification',
            ttgId: null,
            ttgName: '',
            confidence: Math.min(0.69, top.score / 14),
            evidence: ['multiple TTG definitions are similarly plausible by score or percentage gap'],
            candidates: candidates.slice(0, 8),
            distribution
        };
    }

    if (topPercent >= INFER_TOP_PERCENT && gapPercent >= INFER_GAP_PERCENT) {
        const topCand = candidates[0];
        const confidence = Math.min(0.95, topCand.score / 14);
        return {
            status: 'inferred',
            method: 'agent_classification',
            ttgId: topCand.ttgId,
            ttgName: topCand.ttgName,
            confidence,
            evidence: topCand.evidence,
            candidates: candidates.slice(0, 8),
            distribution
        };
    }

    const topCand = candidates[0];
    const confidence = Math.min(0.95, topCand.score / 14);
    return {
        status: 'needs_review',
        method: 'agent_classification',
        ttgId: topCand.ttgId,
        ttgName: topCand.ttgName,
        confidence,
        evidence: topCand.evidence,
        candidates: candidates.slice(0, 8),
        distribution
    };
}
