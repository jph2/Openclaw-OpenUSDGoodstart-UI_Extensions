import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildChannelMappingsFromConfig,
    classifyArtifactTtg
} from '../services/ttgClassifier.js';

const DEFINITIONS = [
    {
        code: '000',
        ttgId: '-1003752539559',
        ttgName: 'TTG000_General_Chat',
        tokens: ['general', 'chat', 'quick', 'question', 'casual', 'unclear']
    },
    {
        code: '001',
        ttgId: '-1003732566515',
        ttgName: 'TTG001_Idea_Capture',
        tokens: ['idea', 'capture', 'brainstorming', 'quick', 'notes', 'thoughts']
    },
    {
        code: '010',
        ttgId: '-1003930983368',
        ttgName: 'TTG010_General_Discovery_Plus_Research',
        tokens: ['discovery', 'research', 'structured', 'analysis', 'documentation']
    }
];

describe('ttgClassifier', () => {
    it('classifies raw ideas toward TTG001 without confirming truth', () => {
        const res = classifyArtifactTtg({
            artifact: { title: 'Raw product idea', type: 'NOTE', tags: ['idea'] },
            markdown: '# Note\n\nHalf formed idea and note to self for later brainstorming.',
            ttgDefinitions: DEFINITIONS
        });

        assert.equal(res.method, 'agent_classification');
        assert.equal(res.ttgId, '-1003732566515');
        assert.equal(res.ttgName, 'TTG001_Idea_Capture');
        assert.match(['inferred', 'needs_review'].join('|'), new RegExp(res.status));
        assert.notEqual(res.status, 'confirmed');
    });

    it('classifies structured discovery and research toward TTG010', () => {
        const res = classifyArtifactTtg({
            artifact: { title: 'Open Brain discovery', type: 'DISCOVERY', tags: ['research'] },
            markdown: '# Research\n\nWe need structured discovery, analysis, and documentation.',
            ttgDefinitions: DEFINITIONS
        });

        assert.equal(res.ttgId, '-1003930983368');
        assert.equal(res.ttgName, 'TTG010_General_Discovery_Plus_Research');
        assert.equal(res.status, 'inferred');
        assert.equal(res.evidence.some((line) => line.includes('DISCOVERY')), true);
    });

    it('classifies unspecific meta chat toward TTG000 as reviewable', () => {
        const res = classifyArtifactTtg({
            artifact: { title: 'Quick question', type: 'NOTE', tags: ['general'] },
            markdown: '# Meta chat\n\nQuick question. I am unsure where this belongs.',
            ttgDefinitions: DEFINITIONS
        });

        assert.equal(res.ttgId, '-1003752539559');
        assert.equal(res.ttgName, 'TTG000_General_Chat');
        assert.notEqual(res.status, 'confirmed');
    });

    it('marks two close candidates as ambiguous', () => {
        const res = classifyArtifactTtg({
            artifact: { title: 'Idea research', type: 'NOTE', tags: ['idea', 'research'] },
            markdown: '# Idea research\n\nThis idea needs research.',
            ttgDefinitions: DEFINITIONS
        });

        assert.equal(res.status, 'ambiguous');
        assert.equal(res.ttgId, null);
        assert.equal(res.candidates.length >= 2, true);
    });

    it('keeps no useful match unknown', () => {
        const res = classifyArtifactTtg({
            artifact: { title: 'Receipt', type: 'NOTE', tags: [] },
            markdown: '# Receipt\n\nBanana invoice total.',
            ttgDefinitions: DEFINITIONS
        });

        assert.equal(res.status, 'unknown');
        assert.equal(res.ttgId, null);
    });

    it('builds channel mappings from legacy TG and canonical TTG names', () => {
        const mappings = buildChannelMappingsFromConfig({
            channels: [
                { id: '-1001', name: 'TG001_Idea_Capture' },
                { id: '-1002', name: 'TTG010_General_Discovery_Plus_Research' }
            ]
        });

        assert.deepEqual(mappings, [
            { id: '-1001', name: 'TG001_Idea_Capture' },
            { id: '-1002', name: 'TTG010_General_Discovery_Plus_Research' }
        ]);
    });
});
