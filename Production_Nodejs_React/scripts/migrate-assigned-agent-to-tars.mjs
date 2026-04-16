#!/usr/bin/env node
/**
 * One-time migration: set every channel's `assignedAgent` to `tars` in channel_config.json.
 * Path matches backend getConfigPath(): WORKSPACE_ROOT + OpenClaw_Control_Center/Prototyp/channel_CHAT-manager/channel_config.json
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../..');
const configPath = path.join(
    workspaceRoot,
    'OpenClaw_Control_Center/Prototyp/channel_CHAT-manager/channel_config.json'
);

async function main() {
    const raw = await fs.readFile(configPath, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.channels)) {
        console.error('Invalid config: expected top-level `channels` array.');
        process.exit(1);
    }
    let n = 0;
    data.channels = data.channels.map((c) => {
        if (c && c.assignedAgent !== 'tars') {
            n += 1;
            return { ...c, assignedAgent: 'tars' };
        }
        return c;
    });
    if (n === 0) {
        console.log(`[migrate-assigned-agent] OK — no changes (${configPath}).`);
        return;
    }
    await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[migrate-assigned-agent] Updated ${n} channel(s) → assignedAgent: "tars" (${configPath}).`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
