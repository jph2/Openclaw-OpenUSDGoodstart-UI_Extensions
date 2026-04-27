/**
 * Stable fingerprint for CM → IDE export bundles (B).
 * Used by apply-ide-export.mjs and check-ide-export-stale.mjs.
 */

import crypto from 'node:crypto';
import { buildRenderedAgentFiles, extractManagedRegion } from './lib/ideAgentRenderer.mjs';

/**
 * @param {object} bundle - ide_workbench_bundle from ideConfigBridge or API
 */
export function stablePayloadFromBundle(bundle) {
    const sub = (bundle.subagents || [])
        .map((s) => ({
            name: String(s.name || ''),
            parent: String(s.parentEngine ?? s.parent ?? ''),
            skills: [...(s.skillIds || s.effectiveSkillIds || [])].map(String).sort()
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const eng = (bundle.engines || [])
        .map((e) => ({
            id: String(e.id || ''),
            name: String(e.name || ''),
            skills: [...(e.effectiveDefaultSkills || e.defaultSkills || [])].map(String).sort()
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    return { subagents: sub, engines: eng };
}

export function computeIdeExportFingerprint(bundle) {
    const json = JSON.stringify(stablePayloadFromBundle(bundle));
    return crypto.createHash('sha256').update(json).digest('hex');
}

export const FINGERPRINT_SCHEMA = 'cm.ide-export-fingerprint.v1';

/** v2: hash of sorted { rel, sha256(managed-region only) } — custom prose below cm-managed:end ignored. */
export function computeIdeExportFingerprintV2(bundle) {
    const files = buildRenderedAgentFiles(bundle, { preservedByRel: {} });
    const manifest = files
        .map((f) => {
            const managed = extractManagedRegion(f.content);
            const payload = managed ?? f.content;
            return {
                rel: f.relativePath,
                sha256: crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
            };
        })
        .sort((a, b) => a.rel.localeCompare(b.rel));
    const json = JSON.stringify(manifest);
    return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Per-file managed-region hashes for on-disk verification.
 * @returns {{ rel: string, sha256: string }[]}
 */
export function ideExportManagedManifestV2(bundle) {
    const files = buildRenderedAgentFiles(bundle, { preservedByRel: {} });
    return files
        .map((f) => {
            const managed = extractManagedRegion(f.content);
            const payload = managed ?? f.content;
            return {
                rel: f.relativePath,
                sha256: crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
            };
        })
        .sort((a, b) => a.rel.localeCompare(b.rel));
}

export const FINGERPRINT_SCHEMA_V2 = 'cm.ide-export-fingerprint.v2';
