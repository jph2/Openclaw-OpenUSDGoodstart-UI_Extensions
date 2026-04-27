import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalSnapshot, buildIdeWorkbenchBundle } from '../services/ideConfigBridge.js';
import { computeIdeExportFingerprintV2, ideExportManagedManifestV2 } from '../../scripts/ideExportFingerprint.mjs';

describe('ideExportFingerprint v2', () => {
    it('produces stable managed manifest for a bundle', () => {
        const snap = buildCanonicalSnapshot({
            channels: [],
            agents: [{ id: 'tars', name: 'TARS', defaultSkills: ['a'], inactiveSkills: [] }],
            subAgents: [{ id: 'coder', name: 'Coder', parent: 'tars', additionalSkills: ['x'] }]
        });
        const bundle = buildIdeWorkbenchBundle(snap);
        const m1 = ideExportManagedManifestV2(bundle);
        const m2 = ideExportManagedManifestV2(bundle);
        assert.deepEqual(m1, m2);
        const fp1 = computeIdeExportFingerprintV2(bundle);
        const fp2 = computeIdeExportFingerprintV2(bundle);
        assert.equal(fp1, fp2);
    });
});
