import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
    assertHostSafe,
    assertShareSafe,
    assertMountPointAllowed,
    isSimpleMountEnabled
} from '../services/ideCaptureSimpleMount.js';

describe('ideCaptureSimpleMount validation', () => {
    afterEach(() => {
        delete process.env.IDE_CAPTURE_SIMPLE_MOUNT;
        delete process.env.IDE_CAPTURE_SIMPLE_MOUNT_PREFIXES;
    });

    it('assertHostSafe accepts IPv4 and hostnames', () => {
        assertHostSafe('192.168.1.10');
        assertHostSafe('pc-laptop');
        assertHostSafe('file.server.local');
    });

    it('assertHostSafe rejects injection-like host', () => {
        assert.throws(() => assertHostSafe('evil;rm'), /invalid host/);
    });

    it('assertShareSafe rejects path segments', () => {
        assert.throws(() => assertShareSafe('foo/bar'), /invalid share/);
    });

    it('assertMountPointAllowed respects IDE_CAPTURE_SIMPLE_MOUNT_PREFIXES', () => {
        const base = path.join(os.tmpdir(), `ide-cap-prefix-${Date.now()}`);
        process.env.IDE_CAPTURE_SIMPLE_MOUNT_PREFIXES = base;
        assertMountPointAllowed(path.join(base, 'ws'));
        assert.throws(() => assertMountPointAllowed('/etc/passwd'), /mount point must be under/);
    });

    it('isSimpleMountEnabled: explicit false/true; production default off when unset', () => {
        if (process.platform === 'win32') {
            assert.equal(isSimpleMountEnabled(), false);
            return;
        }
        process.env.IDE_CAPTURE_SIMPLE_MOUNT = 'false';
        assert.equal(isSimpleMountEnabled(), false);
        process.env.IDE_CAPTURE_SIMPLE_MOUNT = 'true';
        assert.equal(isSimpleMountEnabled(), true);
        const oldNodeEnv = process.env.NODE_ENV;
        try {
            delete process.env.IDE_CAPTURE_SIMPLE_MOUNT;
            process.env.NODE_ENV = 'production';
            assert.equal(isSimpleMountEnabled(), false);
        } finally {
            process.env.NODE_ENV = oldNodeEnv;
        }
    });
});
