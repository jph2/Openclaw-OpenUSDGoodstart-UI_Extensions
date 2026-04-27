import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    isStoredWorkspaceStorageRootValid,
    normalizeWorkspaceStorageRootForFs
} from '../services/cursorWorkspacePath.js';

describe('cursorWorkspacePath', () => {
    it('accepts Windows absolute paths for storage validation', () => {
        assert.equal(isStoredWorkspaceStorageRootValid('C:\\Users\\jan\\AppData\\Roaming\\Cursor\\User\\workspaceStorage'), true);
        assert.equal(isStoredWorkspaceStorageRootValid('C:/Users/jan'), true);
        assert.equal(isStoredWorkspaceStorageRootValid('relative\\no'), false);
    });

    it('maps Windows drive paths to /mnt/<letter> on non-Windows', () => {
        if (process.platform === 'win32') return;
        delete process.env.IDE_CAPTURE_WIN_DRIVE_MNT;
        delete process.env.IDE_CAPTURE_WIN_DRIVE_C_MNT;
        const out = normalizeWorkspaceStorageRootForFs('C:\\Users\\jan\\AppData\\Roaming\\Cursor\\User\\workspaceStorage');
        assert.equal(out, '/mnt/c/Users/jan/AppData/Roaming/Cursor/User/workspaceStorage');
    });

    it('respects IDE_CAPTURE_WIN_DRIVE_C_MNT override on non-Windows', () => {
        if (process.platform === 'win32') return;
        process.env.IDE_CAPTURE_WIN_DRIVE_C_MNT = '/media/windows/c';
        try {
            const out = normalizeWorkspaceStorageRootForFs('C:\\foo\\bar');
            assert.equal(out, '/media/windows/c/foo/bar');
        } finally {
            delete process.env.IDE_CAPTURE_WIN_DRIVE_C_MNT;
        }
    });
});
