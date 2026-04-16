import express from 'express';
import fs from 'fs/promises';
import { resolveSafe } from '../utils/security.js';
import {
    buildCanonicalSnapshot,
    buildOpenClawProjection,
    buildCursorProjection,
    buildIdeWorkbenchBundle
} from '../services/ideConfigBridge.js';

const router = express.Router();

async function loadChannelConfig() {
    const { resolved } = await resolveSafe(
        process.env.WORKSPACE_ROOT,
        'OpenClaw_Control_Center/Prototyp/channel_CHAT-manager/channel_config.json'
    );
    const raw = await fs.readFile(resolved, 'utf8');
    return JSON.parse(raw);
}

router.get('/canonical', async (req, res, next) => {
    try {
        const cfg = await loadChannelConfig();
        res.json({ ok: true, data: buildCanonicalSnapshot(cfg) });
    } catch (e) {
        next(e);
    }
});

router.get('/openclaw', async (req, res, next) => {
    try {
        const cfg = await loadChannelConfig();
        const snap = buildCanonicalSnapshot(cfg);
        res.json({ ok: true, data: buildOpenClawProjection(snap) });
    } catch (e) {
        next(e);
    }
});

router.get('/ide', async (req, res, next) => {
    try {
        const cfg = await loadChannelConfig();
        const snap = buildCanonicalSnapshot(cfg);
        res.json({ ok: true, data: buildIdeWorkbenchBundle(snap) });
    } catch (e) {
        next(e);
    }
});

router.get('/cursor', async (req, res, next) => {
    try {
        const cfg = await loadChannelConfig();
        const snap = buildCanonicalSnapshot(cfg);
        res.json({ ok: true, data: buildCursorProjection(snap) });
    } catch (e) {
        next(e);
    }
});

export default router;
