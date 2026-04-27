import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildRenderedAgentFiles,
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

    it('parses delimiter markers only as standalone lines', () => {
        const full = composeAgentMarkdownFile({
            managedInner: `# Foo\n\nThis text mentions ${'<!-- cm-managed:end -->'} inline.`,
            preservedSuffix: 'Keep me.'
        });
        const managed = extractManagedRegion(full);
        assert.ok(managed?.includes('mentions <!-- cm-managed:end --> inline'));
        const suffix = extractPreservedSuffix(full);
        assert.equal(suffix, 'Keep me.');
    });

    it('double-render preserves only custom suffix, not marker fragments', () => {
        const bundle = {
            engines: [],
            subagents: [
                {
                    name: 'coder',
                    displayName: 'Coder',
                    parentEngine: 'case',
                    effectiveSkillIds: ['x'],
                    suggestedFrontmatter: { name: 'coder', description: 'Coder', model: 'inherit' }
                }
            ]
        };
        const first = buildRenderedAgentFiles(bundle, { preservedByRel: {} })[0];
        const withCustom = `${first.content}\nCustom line.\n`;
        const preserved = extractPreservedSuffix(withCustom);
        const second = buildRenderedAgentFiles(bundle, {
            preservedByRel: { [first.relativePath]: preserved }
        })[0];
        assert.equal((second.content.match(/<!-- cm-managed:end -->/g) || []).length, 1);
        assert.ok(second.content.includes('Custom line.'));
    });

    it('drops legacy generated placeholder suffixes', () => {
        const legacy = composeAgentMarkdownFile({
            managedInner: '# Managed',
            preservedSuffix:
                '_Add workflow-specific instructions below this line (preserved only if you maintain them outside the generated block — this file is fully replaced when the script runs with `--force` or when the CM marker is present)._'
        });
        assert.equal(extractPreservedSuffix(legacy), '');
    });
});
