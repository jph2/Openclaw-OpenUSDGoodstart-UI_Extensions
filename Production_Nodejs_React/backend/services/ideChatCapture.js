/**
 * IDE chat capture (Cursor workspaceStorage → A070 capture/) — SPEC_8B5 §15.
 * Runs on the same host as the Channel Manager backend (local PC with Cursor).
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { writeJsonAtomic } from './ideWorkUnit.js';
import { readIdeCaptureSettings, resolveIdeCaptureSettingsPath } from './ideCaptureSettingsStore.js';
import { normalizeWorkspaceStorageRootForFs } from './cursorWorkspacePath.js';
import { buildRemoteMountStatus } from './ideCaptureRemoteMount.js';
import { isSimpleMountEnabled } from './ideCaptureSimpleMount.js';
import { isEnsurePathEnabled } from './ideCapturePathEnsure.js';

const SNAPSHOT_SCHEMA = 'studio.ide-capture.snapshot.v1';
const MANIFEST_SCHEMA = 'studio.ide-capture.manifest.v1';
const CM_STATE_SCHEMA = 'studio.ide-capture.cm-state.v1';

const execFileAsync = promisify(execFile);

const CURSOR_ITEM_KEYS = [
    'aiService.prompts',
    'workbench.panel.aichat.view.aichat.chatdata'
];

async function isDirReadable(p) {
    try {
        const st = await fs.stat(p);
        return st.isDirectory();
    } catch {
        return false;
    }
}

async function isMountPointActive(dir) {
    try {
        await execFileAsync('findmnt', ['-n', '-T', dir], { timeout: 5000 });
        return true;
    } catch {
        try {
            await execFileAsync('mountpoint', ['-q', dir], { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * When workspaceStorage path is missing: where the walk stops and whether /media/&lt;name&gt; looks mounted.
 */
async function buildWorkspacePathDiagnostics(workspaceRoot) {
    if (!workspaceRoot || typeof workspaceRoot !== 'string' || process.platform === 'win32') {
        return null;
    }
    const normalized = path.resolve(workspaceRoot);
    const parts = normalized.split(path.sep).filter(Boolean);

    let deepest = null;
    let cur = '/';
    for (let i = 0; i < parts.length; i++) {
        const tryPath = path.join(cur, parts[i]);
        if (await isDirReadable(tryPath)) {
            deepest = tryPath;
            cur = tryPath;
        } else {
            const mediaMountPoint =
                parts[0] === 'media' && parts.length >= 2 ? path.join('/', parts[0], parts[1]) : null;
            const mediaMountActive = mediaMountPoint ? await isMountPointActive(mediaMountPoint) : null;
            return {
                mediaMountPoint,
                mediaMountActive,
                deepestExistingDir: deepest,
                firstMissingSuffix: parts.slice(i).join('/')
            };
        }
    }
    const mediaMountPoint = parts[0] === 'media' && parts.length >= 2 ? path.join('/', parts[0], parts[1]) : null;
    const mediaMountActive = mediaMountPoint ? await isMountPointActive(mediaMountPoint) : null;
    return {
        mediaMountPoint,
        mediaMountActive,
        deepestExistingDir: normalized,
        firstMissingSuffix: null
    };
}

export function isIdeCaptureEnabled() {
    return process.env.IDE_CAPTURE_ENABLED !== 'false';
}

/** OS default when env + saved settings are unset. */
export function getDefaultCursorWorkspaceStorageRoot() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.resolve(path.join(appData, 'Cursor', 'User', 'workspaceStorage'));
    }
    return path.resolve(path.join(os.homedir(), '.config', 'Cursor', 'User', 'workspaceStorage'));
}

/**
 * Resolution order: `CURSOR_WORKSPACE_STORAGE_ROOT` env → `ide_capture_settings.json` → OS default.
 */
export async function resolveWorkspaceStorageRoot() {
    const env = process.env.CURSOR_WORKSPACE_STORAGE_ROOT?.trim();
    if (env) {
        return { path: normalizeWorkspaceStorageRootForFs(env), source: 'env' };
    }
    const settings = await readIdeCaptureSettings();
    if (settings.workspaceStorageRoot) {
        return {
            path: normalizeWorkspaceStorageRootForFs(settings.workspaceStorageRoot),
            source: 'settings'
        };
    }
    return {
        path: normalizeWorkspaceStorageRootForFs(getDefaultCursorWorkspaceStorageRoot()),
        source: 'default'
    };
}

function safeWorkspaceId(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
    return /^[a-zA-Z0-9_-]+$/.test(name);
}

async function readJsonIfExists(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function isoFilenameUtc(d = new Date()) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * @param {string} a070Base — absolute path to A070_ide_cursor_summaries
 */
export async function readIdeCaptureStatus(a070Base) {
    const enabled = isIdeCaptureEnabled();
    const resolved = await resolveWorkspaceStorageRoot();
    const workspaceRoot = resolved.path;
    const settings = await readIdeCaptureSettings();
    const rawSaved = settings.workspaceStorageRoot?.trim() || null;
    const pathMappingApplied = Boolean(
        rawSaved &&
            process.platform !== 'win32' &&
            path.win32.isAbsolute(rawSaved) &&
            workspaceRoot &&
            workspaceRoot !== rawSaved.replace(/\\/g, '/')
    );
    const settingsFilePath = await resolveIdeCaptureSettingsPath();
    let workspaceRootExists = false;
    try {
        await fs.access(workspaceRoot);
        workspaceRootExists = true;
    } catch {
        /* missing */
    }
    const statePath = path.join(a070Base, 'capture', 'cm-capture-state.json');
    const lastRun = await readJsonIfExists(statePath);
    const last = lastRun && typeof lastRun === 'object' ? lastRun : null;
    const summary =
        last && Array.isArray(last.results)
            ? {
                  updatedAt: last.updatedAt,
                  lastTrigger: last.lastTrigger,
                  lastOutcome: last.lastOutcome,
                  okCount: last.results.filter((r) => r.outcome === 'ok').length,
                  skippedCount: last.results.filter((r) => r.outcome === 'skipped_no_change').length,
                  errorCount: last.results.filter((r) => r.outcome === 'error').length,
                  lastPayloadPath: [...last.results].reverse().find((r) => r.payloadRelativePath)?.payloadRelativePath || null,
                  lastError: [...last.results].reverse().find((r) => r.error)?.error || null
              }
            : null;

    const remoteMount = await buildRemoteMountStatus(workspaceRoot);
    const workspacePathDiagnostics = workspaceRootExists ? null : await buildWorkspacePathDiagnostics(workspaceRoot);

    return {
        ok: true,
        enabled,
        workspaceRoot,
        workspaceRootExists,
        workspaceRootSource: resolved.source,
        pathMappingApplied,
        envOverrideActive: Boolean(process.env.CURSOR_WORKSPACE_STORAGE_ROOT?.trim()),
        savedWorkspaceStorageRoot: settings.workspaceStorageRoot,
        settingsFilePath,
        settingsUpdatedAt: settings.updatedAt,
        lastRun: last,
        summary,
        remoteMount,
        workspacePathDiagnostics,
        simpleMountEnabled: isSimpleMountEnabled(),
        ensurePathEnabled: isEnsurePathEnabled(),
        /** Where capture actually runs (helps debug “localhost:5173” + SSH port-forward). */
        captureBackend: {
            hostname: os.hostname(),
            platform: process.platform,
            nodeEnv: process.env.NODE_ENV || 'development'
        }
    };
}

/**
 * @param {object} opts
 * @param {string} opts.a070Base — absolute A070 root
 * @param {boolean} [opts.force]
 * @param {string} [opts.trigger] — override manifest trigger (`cm_force`, `manual`, …)
 */
export async function runIdeChatCapture({ a070Base, force = false, trigger: triggerOverride = null }) {
    if (!isIdeCaptureEnabled()) {
        const err = new Error('IDE capture is disabled (IDE_CAPTURE_ENABLED=false)');
        err.status = 403;
        throw err;
    }

    const base = path.resolve(a070Base);
    const captureDir = path.join(base, 'capture');
    await fs.mkdir(captureDir, { recursive: true });

    const { path: workspaceRoot } = await resolveWorkspaceStorageRoot();
    let entries = [];
    try {
        entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
    } catch (e) {
        const err = new Error(`Cursor workspaceStorage not readable: ${workspaceRoot} (${e?.message || e})`);
        err.status = 400;
        throw err;
    }

    const maxWs = Math.max(1, Math.min(200, Number(process.env.IDE_CAPTURE_MAX_WORKSPACES || 50) || 50));
    const dirs = entries.filter((e) => e.isDirectory() && safeWorkspaceId(e.name)).map((e) => e.name).slice(0, maxWs);

    const watermarksPath = path.join(captureDir, 'watermarks.json');
    const manifestPath = path.join(captureDir, 'manifest.jsonl');
    /** @type {Record<string, { contentSha256: string, capturedAt: string }>} */
    const watermarks = (await readJsonIfExists(watermarksPath)) || {};

    /** @type {Array<{ workspaceStorageId: string, outcome: string, contentSha256?: string, payloadRelativePath?: string, error?: string }>} */
    const results = [];

    for (const id of dirs) {
        const dbSrc = path.join(workspaceRoot, id, 'state.vscdb');
        try {
            await fs.access(dbSrc);
        } catch {
            continue;
        }

        const tmpDb = path.join(os.tmpdir(), `ide-capture-${id}-${Date.now()}.vscdb`);
        try {
            await fs.copyFile(dbSrc, tmpDb);
        } catch (e) {
            results.push({
                workspaceStorageId: id,
                outcome: 'error',
                error: `copy failed: ${e?.message || e}`
            });
            continue;
        }

        let db;
        try {
            db = new Database(tmpDb, { readonly: true, fileMustExist: true });
        } catch (e) {
            await fs.unlink(tmpDb).catch(() => {});
            results.push({
                workspaceStorageId: id,
                outcome: 'error',
                error: `sqlite open: ${e?.message || e}`
            });
            continue;
        }

        let rows = [];
        try {
            const stmt = db.prepare(
                `SELECT key, value FROM ItemTable WHERE key IN (${CURSOR_ITEM_KEYS.map(() => '?').join(', ')})`
            );
            rows = stmt.all(...CURSOR_ITEM_KEYS);
        } catch (e) {
            db.close();
            await fs.unlink(tmpDb).catch(() => {});
            results.push({
                workspaceStorageId: id,
                outcome: 'error',
                error: `query: ${e?.message || e}`
            });
            continue;
        }
        db.close();
        await fs.unlink(tmpDb).catch(() => {});

        const keysPayload = {};
        for (const row of rows) {
            let v = row.value;
            if (Buffer.isBuffer(v)) v = v.toString('utf8');
            try {
                keysPayload[row.key] = JSON.parse(v);
            } catch {
                keysPayload[row.key] = v;
            }
        }

        const st = await fs.stat(dbSrc);
        const extractedAt = new Date().toISOString();
        const payload = {
            schema: SNAPSHOT_SCHEMA,
            surface: 'cursor',
            workspaceStorageId: id,
            extractedAt,
            keys: keysPayload,
            sourceDb: {
                path: dbSrc,
                byteLength: st.size,
                mtimeUtc: new Date(st.mtimeMs).toISOString()
            }
        };

        const json = JSON.stringify(payload);
        const contentSha256 = createHash('sha256').update(json).digest('hex');
        const wmKey = `cursor:${id}`;
        const prev = watermarks[wmKey]?.contentSha256 ?? null;

        if (prev === contentSha256 && !force) {
            results.push({
                workspaceStorageId: id,
                outcome: 'skipped_no_change',
                contentSha256
            });
            continue;
        }

        const short = contentSha256.slice(0, 8);
        const ts = isoFilenameUtc();
        const relDirSeg = ['capture', 'cursor', id];
        const fileName = `${ts}__${short}__snapshot.json`;
        const outDir = path.join(base, ...relDirSeg);
        await fs.mkdir(outDir, { recursive: true });
        const outFile = path.join(outDir, fileName);
        await fs.writeFile(outFile, json, 'utf8');

        const payloadRelativePath = [...relDirSeg, fileName].join('/');

        const trigger =
            triggerOverride ||
            (force ? 'cm_force' : prev ? 'hash_change' : 'manual');

        const manifestEntry = {
            schema: MANIFEST_SCHEMA,
            capturedAt: extractedAt,
            surface: 'cursor',
            workspaceStorageId: id,
            sourceHost: os.hostname(),
            sourceDb: {
                path: dbSrc,
                byteLength: st.size,
                mtimeUtc: new Date(st.mtimeMs).toISOString()
            },
            contentSha256,
            payloadRelativePath,
            summaryRelativePath: null,
            watermarkKey: wmKey,
            previousSha256: prev,
            trigger
        };

        await fs.appendFile(manifestPath, `${JSON.stringify(manifestEntry)}\n`, 'utf8');

        watermarks[wmKey] = {
            contentSha256,
            capturedAt: extractedAt
        };
        await writeJsonAtomic(watermarksPath, watermarks);

        results.push({
            workspaceStorageId: id,
            outcome: 'ok',
            contentSha256,
            payloadRelativePath
        });
    }

    const lastOutcome = results.some((r) => r.outcome === 'ok')
        ? 'ok'
        : results.some((r) => r.outcome === 'error')
          ? 'error'
          : 'skipped_no_change';

    const state = {
        schema: CM_STATE_SCHEMA,
        updatedAt: new Date().toISOString(),
        lastTrigger: triggerOverride || (force ? 'cm_force' : 'manual'),
        lastOutcome,
        results
    };
    await writeJsonAtomic(path.join(captureDir, 'cm-capture-state.json'), state);

    return state;
}
