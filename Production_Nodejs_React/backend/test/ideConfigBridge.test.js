import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCanonicalSnapshot,
    buildOpenClawProjection,
    buildCursorProjection,
    buildIdeWorkbenchBundle,
    collectChannelConfigApplyWarnings,
    isSafeCursorAgentId
} from '../services/ideConfigBridge.js';

describe('ideConfigBridge', () => {
    it('builds canonical snapshot', () => {
        const snap = buildCanonicalSnapshot({
            channels: [{ id: 'x', name: 'N', skills: [] }],
            agents: [{ id: 'tars', name: 'TARS', defaultSkills: ['a'] }],
            subAgents: [{ id: 'researcher', name: 'Researcher', parent: 'tars' }]
        });
        assert.equal(snap.channels.length, 1);
        assert.equal(snap.subAgents[0].id, 'researcher');
    });

    it('projects cursor bundle with agent file paths (legacy kind)', () => {
        const snap = buildCanonicalSnapshot({
            channels: [],
            agents: [],
            subAgents: [{ id: 'coder', name: 'Coder', parent: 'case', additionalSkills: ['x'] }]
        });
        const cur = buildCursorProjection(snap);
        assert.equal(cur.kind, 'cursor_bundle');
        assert.equal(cur.bundleSchemaVersion, 2);
        assert.equal(cur.subagents[0].relativePath, '.cursor/agents/coder.md');
    });

    it('projects IDE workbench bundle v2 with inactive skill filtering', () => {
        const snap = buildCanonicalSnapshot({
            channels: [],
            agents: [],
            subAgents: [
                {
                    id: 'coder',
                    name: 'Coder',
                    parent: 'case',
                    additionalSkills: ['x', 'y'],
                    inactiveSkills: ['y']
                }
            ]
        });
        const ide = buildIdeWorkbenchBundle(snap);
        assert.equal(ide.kind, 'ide_workbench_bundle');
        assert.equal(ide.bundleSchemaVersion, 2);
        assert.deepEqual(ide.subagents[0].effectiveSkillIds, ['x']);
    });

    it('collectChannelConfigApplyWarnings flags unknown parent', () => {
        const w = collectChannelConfigApplyWarnings({
            channels: [{ id: '1', assignedAgent: 'ghost' }],
            agents: [{ id: 'tars', name: 'T' }],
            subAgents: [{ id: 'r', name: 'R', parent: 'nope' }]
        });
        assert.ok(w.some((x) => x.code === 'subagent_parent_missing'));
        assert.ok(w.some((x) => x.code === 'channel_assigned_agent_unknown'));
    });

    it('isSafeCursorAgentId rejects uppercase', () => {
        assert.equal(isSafeCursorAgentId('tars'), true);
        assert.equal(isSafeCursorAgentId('TARS'), false);
    });

    it('buildOpenClawProjection still returns hints', () => {
        const snap = buildCanonicalSnapshot({ channels: [], agents: [], subAgents: [] });
        const p = buildOpenClawProjection(snap);
        assert.equal(p.kind, 'openclaw_merge_hints');
    });
});
