/**
 * Cursor workspaceStorage paths may be saved as Windows `C:\...` while the API runs on Linux (WSL mount).
 */
import path from 'path';

/** `true` for empty (clear), POSIX absolute, or Windows absolute (`C:\...`). */
export function isStoredWorkspaceStorageRootValid(s) {
    if (s == null) return true;
    const t = String(s).trim();
    if (t === '') return true;
    if (path.isAbsolute(t)) return true;
    if (path.win32.isAbsolute(t)) return true;
    return false;
}

/**
 * Path used for `fs.*`. On non-Windows, a Windows drive path is mapped to WSL-style `/mnt/<drive>/...`.
 * Override mount base per drive: `IDE_CAPTURE_WIN_DRIVE_MNT=/mnt/c` (default for `C:` is `/mnt/c`).
 */
export function normalizeWorkspaceStorageRootForFs(input) {
    if (input == null) return null;
    const raw = String(input).trim();
    if (raw === '') return null;

    if (process.platform === 'win32') {
        return path.resolve(path.win32.normalize(raw));
    }

    const asPosixSlashes = raw.replace(/\\/g, '/');
    if (path.posix.isAbsolute(asPosixSlashes)) {
        return path.posix.normalize(asPosixSlashes);
    }

    if (path.win32.isAbsolute(raw)) {
        const m = /^([a-zA-Z]):(?:[/\\]|$)(.*)$/.exec(raw.replace(/\\/g, '/'));
        if (m) {
            const letter = m[1].toLowerCase();
            const rest = (m[2] || '').replace(/^\/+/, '');
            const envKey = `IDE_CAPTURE_WIN_DRIVE_${letter.toUpperCase()}_MNT`;
            const base = (process.env[envKey] || process.env.IDE_CAPTURE_WIN_DRIVE_MNT || `/mnt/${letter}`).replace(
                /\/$/,
                ''
            );
            const joined = rest ? `${base}/${rest}` : base;
            return path.posix.normalize(joined.replace(/\/+/g, '/'));
        }
    }

    return path.resolve(raw);
}
