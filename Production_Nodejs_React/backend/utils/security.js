import path from 'path';
import fs from 'fs/promises';

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
