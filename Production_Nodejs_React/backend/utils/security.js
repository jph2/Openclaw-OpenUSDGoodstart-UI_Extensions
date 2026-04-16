import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';

/**
 * G1 Security Fix-Gate: Airtight resolveSafe
 * Replaces the vulnerable string-based checking with strict path.resolve()
 * and startsWith() boundary validation.
 */
export const resolveSafe = async (baseRootPath, targetRelativePath = '') => {
    // 1. Normalize the base root explicitly
    const normalizedRoot = path.normalize(baseRootPath);
    const absoluteRoot = path.resolve(normalizedRoot); // e.g. /home/user/...

    // 2. Resolve the target path against the absolute root
    // path.resolve automatically handles neutralizing ../../ payloads
    const resolvedTarget = path.resolve(absoluteRoot, targetRelativePath);

    // 3. Absolute Boundary Check
    // We add a trailing separator to the root to prevent partial name directory matching
    // (e.g. escaping /data/workspace into /data/workspace_secrets)
    const rootWithTrailingSlash = absoluteRoot.endsWith(path.sep) ? absoluteRoot : `${absoluteRoot}${path.sep}`;
    const targetWithTrailingSlash = resolvedTarget.endsWith(path.sep) ? resolvedTarget : `${resolvedTarget}${path.sep}`;

    if (resolvedTarget !== absoluteRoot && !targetWithTrailingSlash.startsWith(rootWithTrailingSlash)) {
        console.error(`[SECURITY] Path traversal blocked. Attempted to reach ${resolvedTarget} escaping ${absoluteRoot}`);
        const err = new Error('Path traversal sequence detected and blocked.');
        err.status = 403;
        throw err;
    }

    // 4. Calculate final relative path mathematically
    const relativeTarget = path.relative(absoluteRoot, resolvedTarget);

    return {
        rootPath: absoluteRoot,
        resolved: resolvedTarget,
        relative: relativeTarget === '' ? '.' : relativeTarget
    };
};

/**
 * Allowed roots for Workbench (read tree / file / write): primary workspace plus optional extra dirs
 * (e.g. npm-global bundled openclaw skills). Used instead of resolveSafe() when the client sends absolute paths.
 */
export function getWorkbenchAllowedRoots() {
    const roots = [];
    if (process.env.WORKSPACE_ROOT) {
        roots.push(path.resolve(process.env.WORKSPACE_ROOT));
    }
    const extra = (process.env.WORKBENCH_EXTRA_ROOTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    for (const e of extra) {
        roots.push(path.resolve(e));
    }
    if (process.env.WORKBENCH_DISABLE_BUNDLED_SKILLS_ROOT !== '1') {
        const bundled = path.join(homedir(), '.npm-global/lib/node_modules/openclaw/skills');
        try {
            if (existsSync(bundled)) {
                roots.push(path.resolve(bundled));
            }
        } catch {
            /* ignore */
        }
    }
    if (process.env.WORKBENCH_DISABLE_HOME_ROOT !== '1') {
        try {
            const h = path.resolve(homedir());
            if (existsSync(h)) {
                roots.push(h);
            }
        } catch {
            /* ignore */
        }
    }
    if (process.env.WORKBENCH_ALLOW_FS_ROOT === '1') {
        roots.push(path.resolve('/'));
    }
    return [...new Set(roots)];
}

/**
 * @param {string} [inputPath] - Absolute path, or relative to WORKSPACE_ROOT, or '' / 'workspace' for workspace root
 */
export function resolveWorkbenchPath(inputPath) {
    const roots = getWorkbenchAllowedRoots();
    if (!roots.length) {
        const err = new Error('WORKSPACE_ROOT is not configured.');
        err.status = 500;
        throw err;
    }

    const raw = inputPath === undefined || inputPath === null ? '' : String(inputPath);

    if (raw === '' || raw === 'workspace') {
        const root = roots[0];
        return { rootPath: root, resolved: root, relative: '.' };
    }

    let candidate;
    if (path.isAbsolute(raw)) {
        candidate = path.resolve(raw);
    } else {
        candidate = path.resolve(roots[0], raw);
    }

    for (const root of roots) {
        const rootSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
        if (candidate === root || candidate.startsWith(rootSep)) {
            let relative = path.relative(root, candidate);
            if (relative === '') relative = '.';
            return { rootPath: root, resolved: candidate, relative };
        }
    }

    const err = new Error('Path not under allowed workbench roots.');
    err.status = 403;
    throw err;
}
