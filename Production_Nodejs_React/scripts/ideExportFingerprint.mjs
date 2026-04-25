/**
 * Stable fingerprint for CM → IDE export bundles (B).
 * Used by apply-ide-export.mjs and check-ide-export-stale.mjs.
 */

import crypto from 'node:crypto';

/**
 * @param {object} bundle - ide_workbench_bundle from ideConfigBridge or API
 */
export function stablePayloadFromBundle(bundle) {
    const sub = (bundle.subagents || [])
        .map((s) => ({
            name: String(s.name || ''),
            parent: String(s.parentEngine || ''),
            skills: [...(s.skillIds || [])].map(String).sort()
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const eng = (bundle.engines || [])
        .map((e) => ({
            id: String(e.id || ''),
            name: String(e.name || ''),
            skills: [...(e.defaultSkills || [])].map(String).sort()
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    return { subagents: sub, engines: eng };
}

export function computeIdeExportFingerprint(bundle) {
    const json = JSON.stringify(stablePayloadFromBundle(bundle));
    return crypto.createHash('sha256').update(json).digest('hex');
}

export const FINGERPRINT_SCHEMA = 'cm.ide-export-fingerprint.v1';
