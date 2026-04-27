#!/usr/bin/env node
/**
 * Exit 0 if .cursor/cm-ide-export-fingerprint.json matches current channel_config / API bundle.
 * Exit 1 if stale or mismatch. Exit 2 if no fingerprint file (never applied).
 *
 * v2: compares managed-region hashes per file; custom prose below cm-managed:end ignored.
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildCanonicalSnapshot, buildIdeWorkbenchBundle } from '../backend/services/ideConfigBridge.js';
import {
    computeIdeExportFingerprint,
    computeIdeExportFingerprintV2,
    FINGERPRINT_SCHEMA,
    FINGERPRINT_SCHEMA_V2,
    ideExportManagedManifestV2
} from './ideExportFingerprint.mjs';
import { extractManagedRegion, isChannelManagerIdeExportFile } from './lib/ideAgentRenderer.mjs';

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

async function hashManagedOnDisk(targetRoot, rel) {
    const abs = path.join(targetRoot, rel.split('/').join(path.sep));
    if (!(await pathExists(abs))) return { rel, missing: true, sha256: null };
    const txt = await fs.readFile(abs, 'utf8');
    const managed = extractManagedRegion(txt);
    const sha = crypto.createHash('sha256').update(managed ?? txt, 'utf8').digest('hex');
    return { rel, missing: false, sha256: sha };
}

async function listOrphanCmAgentMarkdown(targetRoot, expectedRels) {
    const agentsDir = path.join(targetRoot, '.cursor', 'agents');
    const expected = new Set(expectedRels);
    const orphans = [];
    if (!(await pathExists(agentsDir))) return orphans;
    const names = await fs.readdir(agentsDir);
    for (const n of names) {
        if (!n.endsWith('.md')) continue;
        const rel = path.posix.join('.cursor/agents', n);
        if (expected.has(rel)) continue;
        const abs = path.join(agentsDir, n);
        let txt = '';
        try {
            txt = await fs.readFile(abs, 'utf8');
        } catch {
            continue;
        }
        if (isChannelManagerIdeExportFile(txt)) {
            orphans.push(rel);
        }
    }
    return orphans.sort();
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
    const currentV1 = computeIdeExportFingerprint(bundle);
    const currentV2 = computeIdeExportFingerprintV2(bundle);
    const expectedManifest = ideExportManagedManifestV2(bundle);

    let stored;
    try {
        stored = JSON.parse(await fs.readFile(fpPath, 'utf8'));
    } catch (e) {
        console.error(`Invalid fingerprint file: ${e.message}`);
        process.exit(1);
    }

    if (stored.schema === FINGERPRINT_SCHEMA_V2) {
        if (stored.fingerprint !== currentV2) {
            console.error('STALE: CM bundle changed (fingerprint v2 mismatch).');
            console.error(`  stored:   ${stored.fingerprint}`);
            console.error(`  current:  ${currentV2}`);
            console.error('  Run: npm run apply-ide-export -- --dry-run --target … then --write');
            process.exit(1);
        }

        const diskChecks = [];
        for (const entry of expectedManifest) {
            diskChecks.push(await hashManagedOnDisk(targetRoot, entry.rel));
        }
        for (let i = 0; i < expectedManifest.length; i++) {
            const exp = expectedManifest[i];
            const got = diskChecks[i];
            if (got.missing) {
                console.error(`STALE: missing file ${exp.rel}`);
                process.exit(1);
            }
            if (got.sha256 !== exp.sha256) {
                console.error(`STALE: managed region drift in ${exp.rel}`);
                console.error(`  expected: ${exp.sha256}`);
                console.error(`  on disk:  ${got.sha256}`);
                process.exit(1);
            }
        }

        const orphans = await listOrphanCmAgentMarkdown(
            targetRoot,
            expectedManifest.map((x) => x.rel)
        );
        if (orphans.length > 0) {
            console.error('STALE: orphan CM-managed Cursor agent files exist:');
            for (const rel of orphans) console.error(`  - ${rel}`);
            console.error('  Remove them manually or add an explicit prune workflow.');
            process.exit(1);
        }

        console.log(`OK: IDE export v2 matches Channel Manager and on-disk managed regions (${currentV2.slice(0, 12)}…).`);
        process.exit(0);
    }

    if (stored.schema && stored.schema !== FINGERPRINT_SCHEMA) {
        console.warn(`Warning: fingerprint schema ${stored.schema} !== ${FINGERPRINT_SCHEMA}`);
    }

    if (stored.fingerprint === currentV1) {
        console.log(
            `OK: IDE export fingerprint v1 matches Channel Manager (${currentV1.slice(0, 12)}…). Re-run apply --write to upgrade to v2.`
        );
        process.exit(0);
    }

    console.error('STALE: channel_config (or API bundle) differs from last apply-ide-export.');
    console.error(`  stored:   ${stored.fingerprint}`);
    console.error(`  current:  ${currentV1}`);
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
