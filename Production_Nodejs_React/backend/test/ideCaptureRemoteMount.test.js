import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getRemoteMountScriptPath } from '../services/ideCaptureRemoteMount.js';

describe('ideCaptureRemoteMount', () => {
    afterEach(() => {
        delete process.env.IDE_CAPTURE_REMOTE_MOUNT_SCRIPT;
    });

    it('rejects non-absolute script path', () => {
        process.env.IDE_CAPTURE_REMOTE_MOUNT_SCRIPT = './hook.sh';
        assert.equal(getRemoteMountScriptPath(), null);
    });

    it('rejects path containing ..', () => {
        process.env.IDE_CAPTURE_REMOTE_MOUNT_SCRIPT = '/safe/../hook.sh';
        assert.equal(getRemoteMountScriptPath(), null);
    });

    it('accepts existing absolute executable path', () => {
        const p = path.join(os.tmpdir(), `ide-cap-hook-${Date.now()}.sh`);
        fs.writeFileSync(p, '#!/bin/sh\nexit 0\n', 'utf8');
        fs.chmodSync(p, 0o755);
        process.env.IDE_CAPTURE_REMOTE_MOUNT_SCRIPT = p;
        assert.equal(getRemoteMountScriptPath(), p);
        fs.unlinkSync(p);
    });
});
