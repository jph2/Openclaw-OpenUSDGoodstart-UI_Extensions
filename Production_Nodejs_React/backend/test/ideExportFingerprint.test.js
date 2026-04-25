import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    computeIdeExportFingerprint,
    stablePayloadFromBundle
} from '../../scripts/ideExportFingerprint.mjs';

describe('ideExportFingerprint', () => {
    it('is stable for same bundle shape', () => {
        const bundle = {
            subagents: [
                { name: 'a', parentEngine: 'tars', skillIds: ['z', 'y'] },
                { name: 'b', parentEngine: 'tars', skillIds: [] }
            ],
            engines: [{ id: 'tars', name: 'T', defaultSkills: ['s2', 's1'] }]
        };
        const a = computeIdeExportFingerprint(bundle);
        const b = computeIdeExportFingerprint(bundle);
        assert.equal(a, b);
        assert.equal(a.length, 64);
    });

    it('sorts ids so order in CM file does not change fingerprint', () => {
        const b1 = {
            engines: [
                { id: 'marvin', name: 'M', defaultSkills: [] },
                { id: 'tars', name: 'T', defaultSkills: ['x'] }
            ],
            subagents: []
        };
        const b2 = {
            engines: [
                { id: 'tars', name: 'T', defaultSkills: ['x'] },
                { id: 'marvin', name: 'M', defaultSkills: [] }
            ],
            subagents: []
        };
        assert.equal(computeIdeExportFingerprint(b1), computeIdeExportFingerprint(b2));
    });

    it('stablePayload normalizes structure', () => {
        const p = stablePayloadFromBundle({
            subagents: [{ name: 'z', parentEngine: 'p', skillIds: ['b', 'a'] }],
            engines: []
        });
        assert.equal(p.subagents[0].skills[0], 'a');
        assert.equal(p.subagents[0].skills[1], 'b');
    });
});
