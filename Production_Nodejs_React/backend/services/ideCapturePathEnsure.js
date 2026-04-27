/**
 * Create workspaceStorage directory tree on the API host (mkdir -p).
 * Only allowed under the same path prefixes as SMB simple-mount (default /media, /mnt, /run/user).
 */
import fs from 'fs/promises';
import { assertMountPointAllowed } from './ideCaptureSimpleMount.js';

export function isEnsurePathEnabled() {
    return process.env.IDE_CAPTURE_ENSURE_PATH !== 'false';
}

/**
 * @param {string} absPath — resolved POSIX path (e.g. workspaceStorage root)
 */
export async function ensureIdeCaptureWorkspaceDir(absPath) {
    if (!isEnsurePathEnabled()) {
        const e = new Error('Creating capture paths from the UI is disabled (IDE_CAPTURE_ENSURE_PATH=false)');
        e.status = 403;
        throw e;
    }
    assertMountPointAllowed(absPath);
    const normalized = String(absPath).trim();
    await fs.mkdir(normalized, { recursive: true });
    try {
        await fs.access(normalized);
    } catch (err) {
        const e = new Error(`mkdir succeeded but path is not accessible: ${err?.message || err}`);
        e.status = 500;
        throw e;
    }
    return { path: normalized };
}
