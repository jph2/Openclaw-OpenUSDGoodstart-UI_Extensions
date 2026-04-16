import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCanonicalSnapshot,
    buildOpenClawProjection,
    buildCursorProjection,
    buildIdeWorkbenchBundle
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
        assert.equal(cur.subagents[0].relativePath, '.cursor/agents/coder.md');
    });

    it('projects IDE workbench bundle', () => {
        const snap = buildCanonicalSnapshot({
            channels: [],
            agents: [],
            subAgents: [{ id: 'coder', name: 'Coder', parent: 'case', additionalSkills: ['x'] }]
        });
        const ide = buildIdeWorkbenchBundle(snap);
        assert.equal(ide.kind, 'ide_workbench_bundle');
        assert.equal(ide.subagents[0].relativePath, '.cursor/agents/coder.md');
    });
});
