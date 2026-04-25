#!/usr/bin/env node
/**
 * Exit 0 if .cursor/cm-ide-export-fingerprint.json matches current channel_config / API bundle.
 * Exit 1 if stale or mismatch. Exit 2 if no fingerprint file (never applied).
 *
 *   node scripts/check-ide-export-stale.mjs --target /path/to/Studio_Framework
 *   WORKSPACE_ROOT=... node scripts/check-ide-export-stale.mjs --target ...
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildCanonicalSnapshot, buildIdeWorkbenchBundle } from '../backend/services/ideConfigBridge.js';
import { computeIdeExportFingerprint, FINGERPRINT_SCHEMA } from './ideExportFingerprint.mjs';

function parseArgs(argv) {
    const out = { target: '', apiBase: '', config: '' };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--target' && argv[i + 1]) out.target = argv[++i];
        else if (a === '--api-base' && argv[i + 1]) out.apiBase = argv[++i];
        else if (a === '--config' && argv[i + 1]) out.config = argv[++i];
        else if (a === '--help' || a === '-h') out.help = true;
    }
    return out;
}

function defaultConfigPath() {
    const root = process.env.WORKSPACE_ROOT;
    if (!root) return '';
    return path.join(
        root,
        'OpenClaw_Control_Center',
        'Prototyp',
        'channel_CHAT-manager',
        'channel_config.json'
    );
}

async function loadBundle({ apiBase, configPath }) {
    if (apiBase) {
        const base = apiBase.replace(/\/$/, '');
        const url = `${base}/api/exports/ide`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
            throw new Error(`GET ${url} failed: HTTP ${res.status}`);
        }
        const body = await res.json();
        if (!body.ok || !body.data) throw new Error('Unexpected API response');
        return body.data;
    }
    const cfgResolved = configPath || defaultConfigPath();
    if (!cfgResolved) {
        throw new Error('Set WORKSPACE_ROOT or pass --config or --api-base');
    }
    const raw = JSON.parse(await fs.readFile(cfgResolved, 'utf8'));
    return buildIdeWorkbenchBundle(buildCanonicalSnapshot(raw));
}

async function pathExists(p) {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log(`check-ide-export-stale.mjs

  --target <dir>   Repo root that contains .cursor/cm-ide-export-fingerprint.json
  --api-base URL   Optional: compare against live /api/exports/ide
  --config PATH    Optional: channel_config.json

Env: WORKSPACE_ROOT (for default config when not using --api-base)
`);
        process.exit(0);
    }
    if (!args.target) {
        console.error('Error: --target required');
        process.exit(2);
    }

    const targetRoot = path.resolve(args.target);
    const fpPath = path.join(targetRoot, '.cursor', 'cm-ide-export-fingerprint.json');

    if (!(await pathExists(fpPath))) {
        console.error(`No fingerprint at ${fpPath} — run apply-ide-export.mjs --write first.`);
        process.exit(2);
    }

    const bundle = await loadBundle({ apiBase: args.apiBase, configPath: args.config });
    const current = computeIdeExportFingerprint(bundle);

    let stored;
    try {
        stored = JSON.parse(await fs.readFile(fpPath, 'utf8'));
    } catch (e) {
        console.error(`Invalid fingerprint file: ${e.message}`);
        process.exit(1);
    }

    if (stored.schema && stored.schema !== FINGERPRINT_SCHEMA) {
        console.warn(`Warning: fingerprint schema ${stored.schema} !== ${FINGERPRINT_SCHEMA}`);
    }

    if (stored.fingerprint === current) {
        console.log(`OK: IDE export fingerprint matches Channel Manager (${current.slice(0, 12)}…).`);
        process.exit(0);
    }

    console.error('STALE: channel_config (or API bundle) differs from last apply-ide-export.');
    console.error(`  stored:   ${stored.fingerprint}`);
    console.error(`  current:  ${current}`);
    console.error('  Run: npm run apply-ide-export -- --dry-run --target … then --write');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch((e) => {
        console.error(e.message || e);
        process.exit(1);
    });
}
