import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import { resolveSafe } from '../utils/security.js';

export const OPEN_BRAIN_SYNC_AUDIT_SCHEMA = 'cm.open-brain-sync-audit.v1';

function portableSourcePath(sourcePath = '') {
    return String(sourcePath || '').split(path.sep).join('/').replace(/^\/+/, '');
}

export async function resolveOpenBrainAuditPath() {
    if (!process.env.WORKSPACE_ROOT) {
        throw new Error('WORKSPACE_ROOT is required for Open Brain sync audit');
    }
    const { resolved } = await resolveSafe(
        process.env.WORKSPACE_ROOT,
        'OpenClaw_Control_Center/Prototyp/channel_CHAT-manager/open_brain_sync_audit.json'
    );
    return resolved;
}

export async function readOpenBrainSyncAudit() {
    let filePath;
    try {
        filePath = await resolveOpenBrainAuditPath();
    } catch {
        return { schema: OPEN_BRAIN_SYNC_AUDIT_SCHEMA, entries: {} };
    }
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') {
            return { schema: OPEN_BRAIN_SYNC_AUDIT_SCHEMA, entries: {} };
        }
        return {
            schema: data.schema || OPEN_BRAIN_SYNC_AUDIT_SCHEMA,
            entries: typeof data.entries === 'object' && data.entries !== null ? data.entries : {}
        };
    } catch (e) {
        if (e.code === 'ENOENT') {
            return { schema: OPEN_BRAIN_SYNC_AUDIT_SCHEMA, entries: {} };
        }
        throw e;
    }
}

/**
 * @param {string} sourcePath - portable path under Studio_Framework
 * @param {object} entry - audit fields (thoughtId, provider, dedupIdentity, contentHashAtSync, …)
 */
export async function writeOpenBrainSyncAuditEntry(sourcePath, entry = {}) {
    const filePath = await resolveOpenBrainAuditPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const key = portableSourcePath(sourcePath);

    let release;
    try {
        try {
            await fs.access(filePath);
        } catch {
            const initial = { schema: OPEN_BRAIN_SYNC_AUDIT_SCHEMA, entries: {} };
            await fs.writeFile(filePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
        }
        release = await lockfile.lock(filePath, {
            stale: 30_000,
            retries: { retries: 6, minTimeout: 40 }
        });
        const raw = await fs.readFile(filePath, 'utf8');
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            data = { schema: OPEN_BRAIN_SYNC_AUDIT_SCHEMA, entries: {} };
        }
        if (!data.entries || typeof data.entries !== 'object') data.entries = {};
        data.schema = OPEN_BRAIN_SYNC_AUDIT_SCHEMA;
        data.entries[key] = {
            ...entry,
            sourcePath: key,
            updatedAt: new Date().toISOString()
        };
        const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
        await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        await fs.rename(tmp, filePath);
    } finally {
        if (release) await release();
    }
}

/**
 * Enrich in-memory index records from audit entries (Rule 13 drift).
 * @param {object[]} records
 * @param {Record<string, object>} entries
 */
export function applyOpenBrainAuditEntriesToRecords(records, entries = {}) {
    if (!Array.isArray(records) || !records.length) return;
    for (const record of records) {
        const sp = portableSourcePath(record.sourcePath || '');
        const row = entries[sp];
        if (!row) continue;
        const outdated = Boolean(
            row.contentHashAtSync
            && record.contentHash
            && row.contentHashAtSync !== record.contentHash
        );
        record.openBrain = {
            syncStatus: outdated ? 'outdated_sync' : 'synced',
            thoughtId: row.thoughtId ?? null,
            contentHash: row.contentHashAtSync ?? null,
            lastSyncedAt: row.lastSyncedAt ?? null,
            provider: row.provider ?? null
        };
    }
}

/**
 * Enrich in-memory index records with last stub/live sync audit (Rule 13 drift).
 * @param {object[]} records
 */
export async function mergeOpenBrainSyncIntoRecords(records) {
    let audit;
    try {
        audit = await readOpenBrainSyncAudit();
    } catch {
        return;
    }
    applyOpenBrainAuditEntriesToRecords(records, audit.entries || {});
}
