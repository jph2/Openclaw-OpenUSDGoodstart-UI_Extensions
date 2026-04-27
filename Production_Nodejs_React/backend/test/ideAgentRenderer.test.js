import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    composeAgentMarkdownFile,
    extractManagedRegion,
    extractPreservedSuffix,
    isChannelManagerIdeExportFile
} from '../../scripts/lib/ideAgentRenderer.mjs';

describe('ideAgentRenderer', () => {
    it('detects v1 and v2 CM export markers', () => {
        assert.equal(isChannelManagerIdeExportFile('<!-- cm-ide-export:v1 x -->\n'), true);
        assert.equal(isChannelManagerIdeExportFile('<!-- cm-ide-export:v2 x -->\n'), true);
        assert.equal(isChannelManagerIdeExportFile('# hello'), false);
    });

    it('extracts managed region and preserves suffix on round-trip', () => {
        const inner = '---\nname: foo\n---\n\n# Foo\n';
        const full = composeAgentMarkdownFile({
            managedInner: inner,
            preservedSuffix: 'My custom note.'
        });
        const managed = extractManagedRegion(full);
        assert.ok(managed && managed.includes('name: foo'));
        assert.ok(full.includes('My custom note.'));
        const suffix = extractPreservedSuffix(full);
        assert.ok(suffix.includes('My custom note.'));
    });
});
