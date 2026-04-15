/**
 * Channel Manager — workspace skill registry (filesystem)
 *
 * Scans ~/.openclaw/workspace/skills/<id>/SKILL.md and builds catalog entries for metadata.skills.
 * See CHANNEL_MANAGER_SKILLS_REGISTRY_SPEC.md in the same repo folder.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/** @typedef {{ desc: string, origin: string, cat: string, src: string, def: boolean }} SkillCatalogEntry */

const VALID_CATS = new Set(['utility', 'research', 'system', 'integration', 'orchestration', 'development', 'workspace']);

/**
 * Root: OPENCLAW_WORKSPACE or ~/.openclaw/workspace; skills live in <root>/skills.
 */
export function resolveWorkspaceRoot() {
    const fromEnv = process.env.OPENCLAW_WORKSPACE?.trim();
    if (fromEnv) return path.resolve(fromEnv);
    return path.join(os.homedir(), '.openclaw', 'workspace');
}

export function resolveWorkspaceSkillsDir() {
    return path.join(resolveWorkspaceRoot(), 'skills');
}

/**
 * Extract first YAML frontmatter block (between --- lines).
 * @param {string} markdown
 * @returns {string | null}
 */
function extractFrontmatterBlock(markdown) {
    const m = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s/);
    return m ? m[1] : null;
}

/**
 * @param {string} block
 * @returns {{ name?: string, description?: string, channel_manager_category?: string, cm_category?: string }}
 */
function parseFrontmatterFields(block) {
    const nameMatch = block.match(/^name:\s*(.+)$/m);
    let name;
    if (nameMatch) {
        name = nameMatch[1].trim();
        if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
            name = name.slice(1, -1);
        }
    }

    let description;

    // Quoted description (possibly long single line)
    const descQuoted = block.match(/^\s*description:\s*"/m);
    if (descQuoted) {
        const startIdx = block.indexOf(descQuoted[0]) + descQuoted[0].length;
        let out = '';
        for (let i = startIdx; i < block.length; i++) {
            const c = block[i];
            if (c === '\\' && i + 1 < block.length) {
                out += block[i + 1];
                i++;
                continue;
            }
            if (c === '"') break;
            out += c;
        }
        description = out.trim();
    } else {
        const descLine = block.match(/^\s*description:\s*(.+)$/m);
        if (descLine) {
            let rest = descLine[1].trim();
            if ((rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'"))) {
                rest = rest.slice(1, -1);
            }
            description = rest;
        }
    }

    const cmCat =
        block.match(/^\s*channel_manager_category:\s*(\S+)/m)?.[1] ||
        block.match(/^\s*cm_category:\s*(\S+)/m)?.[1];

    return { name, description, channel_manager_category: cmCat, cm_category: cmCat };
}

/**
 * Normalize category; unknown → 'workspace'.
 * @param {string | undefined} raw
 */
function normalizeCat(raw) {
    if (!raw) return 'workspace';
    const v = raw.toLowerCase().replace(/['"]/g, '');
    return VALID_CATS.has(v) ? v : 'workspace';
}

/**
 * Scan workspace skills directory. One entry per subdirectory containing SKILL.md.
 * @returns {Promise<Record<string, SkillCatalogEntry>>}
 */
export async function scanWorkspaceSkillsCatalog() {
    const root = resolveWorkspaceSkillsDir();
    const out = {};

    let entries;
    try {
        entries = await fs.readdir(root, { withFileTypes: true });
    } catch (e) {
        if (e.code === 'ENOENT') return out;
        console.warn('[workspaceSkillRegistry] Cannot read skills dir:', root, e.message);
        return out;
    }

    for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        const dirName = ent.name;
        if (dirName === 'dist' || dirName.startsWith('.')) continue;

        const skillPath = path.join(root, dirName, 'SKILL.md');
        let raw;
        try {
            raw = await fs.readFile(skillPath, 'utf8');
        } catch {
            continue;
        }

        const fm = extractFrontmatterBlock(raw);
        if (!fm) continue;

        const fields = parseFrontmatterFields(fm);
        const id = fields.name || dirName;
        const desc = fields.description?.trim() || `Workspace skill (${id})`;
        const cat = normalizeCat(fields.channel_manager_category || fields.cm_category);

        if (!id || id.includes('/') || id.includes('..')) {
            console.warn('[workspaceSkillRegistry] Skipping invalid skill name in', skillPath);
            continue;
        }

        out[id] = {
            desc,
            origin: 'workspace/skills',
            cat,
            src: 'workspace',
            def: false
        };
    }

    return out;
}
