import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import { z } from 'zod';
import { resolveChannelConfigPath } from './projectMappingStore.js';
import { writeJsonAtomic } from './ideWorkUnit.js';
import { isStoredWorkspaceStorageRootValid } from './cursorWorkspacePath.js';

const SCHEMA = 'channel-manager.ide-capture-settings.v1';

const SettingsSchema = z.object({
    schema: z.literal(SCHEMA).optional(),
    workspaceStorageRoot: z.string().max(4096).nullable().optional(),
    updatedAt: z.string().optional()
});

export async function resolveIdeCaptureSettingsPath() {
    const channelCfg = await resolveChannelConfigPath();
    return path.join(path.dirname(channelCfg), 'ide_capture_settings.json');
}

async function readRaw(settingsPath) {
    try {
        const raw = await fs.readFile(settingsPath, 'utf8');
        const parsed = JSON.parse(raw);
        return SettingsSchema.safeParse(parsed).success ? SettingsSchema.parse(parsed) : {};
    } catch {
        return {};
    }
}

export async function readIdeCaptureSettings() {
    const settingsPath = await resolveIdeCaptureSettingsPath();
    const data = await readRaw(settingsPath);
    return {
        workspaceStorageRoot:
            typeof data.workspaceStorageRoot === 'string' && data.workspaceStorageRoot.trim()
                ? data.workspaceStorageRoot.trim()
                : null,
        updatedAt: data.updatedAt || null
    };
}

const BodySchema = z
    .object({
        workspaceStorageRoot: z.union([z.string().max(4096), z.literal(''), z.null()])
    })
    .transform((o) => ({
        workspaceStorageRoot:
            o.workspaceStorageRoot === '' || o.workspaceStorageRoot === null ? null : o.workspaceStorageRoot
    }))
    .refine((o) => isStoredWorkspaceStorageRootValid(o.workspaceStorageRoot), {
        message:
            'workspaceStorageRoot must be null, empty, a POSIX absolute path, or a Windows absolute path (e.g. C:\\Users\\…)',
        path: ['workspaceStorageRoot']
    });

/**
 * Persist operator path (used when CURSOR_WORKSPACE_STORAGE_ROOT is unset).
 */
export async function writeIdeCaptureSettings(body) {
    const parsed = BodySchema.parse(body);
    const settingsPath = await resolveIdeCaptureSettingsPath();
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    try {
        await fs.access(settingsPath);
    } catch {
        await fs.writeFile(settingsPath, '{}\n', 'utf8');
    }
    const release = await lockfile.lock(settingsPath, { retries: 5 });
    try {
        const next = {
            schema: SCHEMA,
            workspaceStorageRoot: parsed.workspaceStorageRoot ?? null,
            updatedAt: new Date().toISOString()
        };
        await writeJsonAtomic(settingsPath, next);
        return next;
    } finally {
        await release();
    }
}
