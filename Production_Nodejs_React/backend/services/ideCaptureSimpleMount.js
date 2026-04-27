/**
 * Guided SMB mount from the Channel Manager UI (Linux API host only).
 * Credentials are written to a short-lived root-only-readable file; password is never persisted in settings.
 * `IDE_CAPTURE_SIMPLE_MOUNT`: explicit `true`/`false`, or omit — in **production** defaults off; in **dev/test** defaults on unless `false`.
 * Use only on trusted networks / HTTPS.
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function isSimpleMountEnabled() {
    if (process.platform === 'win32') return false;
    const v = process.env.IDE_CAPTURE_SIMPLE_MOUNT?.trim();
    if (v === 'false') return false;
    if (v === 'true') return true;
    return process.env.NODE_ENV === 'production' ? false : true;
}

function err400(msg) {
    const e = new Error(msg);
    e.status = 400;
    return e;
}

function assertSafeCredentialField(value, name) {
    if (value == null) return;
    const s = String(value);
    if (s.length > 512) throw err400(`${name} too long`);
    if (/[\r\n\x00]/.test(s)) throw err400(`invalid ${name}`);
}

export function assertHostSafe(host) {
    const h = String(host).trim();
    if (!h || h.length > 253) throw err400('invalid host');
    if (/[\s/\\:*|"<>|;&$`'()]/.test(h)) throw err400('invalid host characters');
    if (IPV4_RE.test(h)) {
        const parts = h.split('.').map((x) => Number(x));
        if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) throw err400('invalid IPv4');
        return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(h)) throw err400('invalid hostname');
}

export function assertShareSafe(share) {
    const s = String(share).trim();
    if (!s || s.length > 80) throw err400('invalid share');
    if (s.includes('/') || s.includes('\\') || s.includes('..')) throw err400('invalid share');
    if (!/^[a-zA-Z0-9._$-]+$/.test(s)) throw err400('invalid share characters');
}

export function assertMountPointAllowed(mp) {
    const n = path.resolve(String(mp).trim());
    if (!path.isAbsolute(n)) throw err400('mount point must be absolute');
    const prefixes = (process.env.IDE_CAPTURE_SIMPLE_MOUNT_PREFIXES || '/media,/mnt,/run/user')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => path.resolve(p));
    const ok = prefixes.some((pre) => n === pre || n.startsWith(pre + path.sep));
    if (!ok) {
        throw err400(`mount point must be under one of: ${prefixes.join(', ')}`);
    }
}

function mountCifsUidGid() {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const gid = typeof process.getgid === 'function' ? process.getgid() : 1000;
    return { uid, gid };
}

/**
 * @param {object} opts
 * @param {string} opts.host
 * @param {string} opts.share
 * @param {string} opts.username
 * @param {string} opts.password
 * @param {string} opts.mountPoint
 * @param {string} [opts.domain]
 */
export async function runSimpleSmbMount(opts) {
    assertHostSafe(opts.host);
    assertShareSafe(opts.share);
    assertMountPointAllowed(opts.mountPoint);
    assertSafeCredentialField(opts.username, 'username');
    assertSafeCredentialField(opts.password, 'password');
    assertSafeCredentialField(opts.domain, 'domain');

    const mountPoint = path.resolve(opts.mountPoint);
    try {
        await fs.mkdir(mountPoint, { recursive: true });
    } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
        const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
        throw err400(`cannot create mount point ${mountPoint}${code ? ` (${code})` : ''}: ${msg}`);
    }

    const credPath = path.join(os.tmpdir(), `ide-cap-smb-${Date.now()}-${randomBytes(8).toString('hex')}.cred`);
    const lines = [`username=${opts.username}`, `password=${opts.password}`];
    if (opts.domain && String(opts.domain).trim()) {
        lines.push(`domain=${String(opts.domain).trim()}`);
    }
    try {
        await fs.writeFile(credPath, `${lines.join('\n')}\n`, 'utf8');
        await fs.chmod(credPath, 0o600);
    } catch (err) {
        await fs.unlink(credPath).catch(() => {});
        const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
        throw err400(`cannot write SMB credentials file: ${msg}`);
    }

    const { uid, gid } = mountCifsUidGid();
    const unc = `//${String(opts.host).trim()}/${String(opts.share).trim()}`;
    const parts = [
        'vers=3.0',
        'noserverino',
        `uid=${uid}`,
        `gid=${gid}`,
        `credentials=${credPath}`,
        'file_mode=0640',
        'dir_mode=0750'
    ];
    const extra = process.env.IDE_CAPTURE_SIMPLE_MOUNT_CIFS_OPTS?.trim();
    if (extra) {
        parts.push(extra);
    }
    const mountOpts = parts.join(',');

    try {
        const r = spawnSync('mount', ['-t', 'cifs', unc, mountPoint, '-o', mountOpts], {
            encoding: 'utf8',
            timeout: 120_000,
            shell: false,
            maxBuffer: 2 * 1024 * 1024
        });
        return {
            ok: r.status === 0,
            exitCode: r.status === null ? -1 : r.status,
            signal: r.signal || null,
            stdout: (r.stdout || '').trimEnd(),
            stderr: (r.stderr || '').trimEnd()
        };
    } finally {
        await fs.unlink(credPath).catch(() => {});
    }
}

/**
 * @param {string} mountPoint
 */
export function runSimpleUmount(mountPoint) {
    assertMountPointAllowed(mountPoint);
    const mp = path.resolve(mountPoint);
    const r = spawnSync('umount', [mp], {
        encoding: 'utf8',
        timeout: 60_000,
        shell: false,
        maxBuffer: 1024 * 1024
    });
    return {
        ok: r.status === 0,
        exitCode: r.status === null ? -1 : r.status,
        signal: r.signal || null,
        stdout: (r.stdout || '').trimEnd(),
        stderr: (r.stderr || '').trimEnd()
    };
}
