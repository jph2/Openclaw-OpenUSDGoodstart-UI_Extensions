/**
 * Optional remote mount helper for IDE capture: run a site-specific script (SMB/sshfs)
 * when IDE_CAPTURE_REMOTE_MOUNT_SCRIPT is set. Never executes arbitrary user input.
 */
import fs from 'fs';
import path from 'path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function isSafeExecutableScript(p) {
    if (!p || typeof p !== 'string') return false;
    if (!path.isAbsolute(p)) return false;
    if (p.includes('..')) return false;
    try {
        const st = fs.statSync(p);
        return st.isFile();
    } catch {
        return false;
    }
}

/** Absolute path to hook script, or null if disabled / invalid. */
export function getRemoteMountScriptPath() {
    const raw = process.env.IDE_CAPTURE_REMOTE_MOUNT_SCRIPT?.trim();
    if (!raw) return null;
    return isSafeExecutableScript(raw) ? raw : null;
}

/** Optional: directory you mount the remote share onto (for status only). */
export function getWorkspaceMountPointEnv() {
    const raw = process.env.IDE_CAPTURE_WORKSPACE_MOUNT_POINT?.trim();
    if (!raw) return null;
    if (!path.isAbsolute(raw)) return null;
    return path.normalize(raw);
}

/**
 * @param {string} absPath
 * @returns {Promise<boolean>} true if findmnt/mountpoint says this path is on an active mount.
 */
export async function pathIsOnActiveMount(absPath) {
    if (!absPath || typeof absPath !== 'string') return false;
    const normalized = path.normalize(absPath);
    try {
        await execFileAsync('findmnt', ['-n', '-T', normalized], { timeout: 8000 });
        return true;
    } catch {
        /* fall through */
    }
    try {
        await execFileAsync('mountpoint', ['-q', normalized], { timeout: 8000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {string | null} workspaceRootResolved — effective capture path (POSIX)
 */
export async function buildRemoteMountStatus(workspaceRootResolved) {
    const scriptPath = getRemoteMountScriptPath();
    const mountPointEnv = getWorkspaceMountPointEnv();
    let mountPointIsActive = null;
    if (mountPointEnv) {
        mountPointIsActive = await pathIsOnActiveMount(mountPointEnv);
    }
    let workspaceRootOnActiveMount = null;
    if (workspaceRootResolved) {
        workspaceRootOnActiveMount = await pathIsOnActiveMount(workspaceRootResolved);
    }
    return {
        scriptConfigured: Boolean(scriptPath),
        scriptPath,
        mountPointEnv,
        mountPointIsActive,
        workspaceRootOnActiveMount
    };
}

const ALLOWED_ACTIONS = new Set(['mount', 'umount', 'status']);

/**
 * @param {string} action — mount | umount | status
 */
export function runRemoteMountScript(action) {
    const scriptPath = getRemoteMountScriptPath();
    if (!scriptPath) {
        const err = new Error(
            'Remote mount script not configured. Set IDE_CAPTURE_REMOTE_MOUNT_SCRIPT to an absolute path.'
        );
        err.status = 400;
        throw err;
    }
    if (!ALLOWED_ACTIONS.has(action)) {
        const err = new Error('Invalid mount action');
        err.status = 400;
        throw err;
    }
    const r = spawnSync(scriptPath, [action], {
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
        shell: false
    });
    return {
        ok: r.status === 0,
        exitCode: r.status === null ? -1 : r.status,
        signal: r.signal || null,
        stdout: (r.stdout || '').trimEnd(),
        stderr: (r.stderr || '').trimEnd()
    };
}
