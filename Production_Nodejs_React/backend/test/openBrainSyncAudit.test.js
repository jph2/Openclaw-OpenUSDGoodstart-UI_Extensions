import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyOpenBrainAuditEntriesToRecords } from '../services/openBrainSyncAudit.js';

describe('openBrainSyncAudit', () => {
    it('marks records synced when audit hash matches index hash', () => {
        const records = [
            {
                sourcePath: '050_Artifacts/A010/x.md',
                contentHash: 'abc123',
                openBrain: { syncStatus: 'not_synced', thoughtId: null, contentHash: null }
            }
        ];
        applyOpenBrainAuditEntriesToRecords(records, {
            '050_Artifacts/A010/x.md': {
                thoughtId: 'stub-xyz',
                contentHashAtSync: 'abc123',
                lastSyncedAt: '2026-04-26T12:00:00.000Z',
                provider: 'stub'
            }
        });
        assert.equal(records[0].openBrain.syncStatus, 'synced');
        assert.equal(records[0].openBrain.thoughtId, 'stub-xyz');
    });

    it('marks outdated_sync when content hash drifted', () => {
        const records = [
            {
                sourcePath: '050_Artifacts/A010/y.md',
                contentHash: 'newhash',
                openBrain: { syncStatus: 'not_synced', thoughtId: null, contentHash: null }
            }
        ];
        applyOpenBrainAuditEntriesToRecords(records, {
            '050_Artifacts/A010/y.md': {
                thoughtId: 'stub-old',
                contentHashAtSync: 'oldhash',
                lastSyncedAt: '2026-04-26T12:00:00.000Z',
                provider: 'stub'
            }
        });
        assert.equal(records[0].openBrain.syncStatus, 'outdated_sync');
    });
});
