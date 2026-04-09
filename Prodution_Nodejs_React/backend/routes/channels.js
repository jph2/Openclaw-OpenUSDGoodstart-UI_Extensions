import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import { z } from 'zod';
import { resolveSafe } from '../utils/security.js';

const router = express.Router();

/**
 * G4 Security Fix-Gate: Zod Input Validation Schemas
 * We rigidly type all incoming API data to prevent injection and state corruption.
 */
const ChannelConfigSchema = z.object({
    channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        model: z.string().optional(),
        skills: z.array(z.string()).optional(),
        require_mention: z.boolean().optional(),
        assignedAgent: z.string().optional(),
        inactiveSubAgents: z.array(z.string()).optional()
    })),
    agents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        defaultSkills: z.array(z.string()).optional()
    })).optional(),
    subAgents: z.array(z.any()).optional()
}).passthrough();

const UpdateChannelSchema = z.object({
    channelId: z.string().min(1),
    skills: z.array(z.string()).optional(),
    assignedAgent: z.string().optional()
});

/**
 * Helper to safely get the config path.
 */
const getConfigPath = async () => {
    // Legacy configs are stored in the prototypes folder
    const { resolved } = await resolveSafe(process.env.WORKSPACE_ROOT, 'channel_CHAT-manager/channel_config.json');
    return resolved;
};

/**
 * Ensures the config directory and file exists.
 */
const ensureConfigExists = async (configPath) => {
    try {
        await fs.access(configPath);
    } catch {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify({ channels: {} }, null, 2), 'utf8');
    }
};

/**
 * GET /api/channels
 * Returns the current channel configuration.
 */
router.get('/', async (req, res, next) => {
    try {
        const configPath = await getConfigPath();
        await ensureConfigExists(configPath);
        
        const raw = await fs.readFile(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        
        // Output validation (optional, but good practice to ensure state isn't poisoned)
        const validated = ChannelConfigSchema.parse(parsed);
        res.json({ ok: true, data: validated });
    } catch (error) {
        next(error); // Passes to G5 central error handler
    }
});

/**
 * POST /api/channels/update
 * G3 Security Fix-Gate: Atomic Writes with `proper-lockfile`
 * Updates specific channels and prevents race conditions if multiple requests hit simultaneously.
 */
router.post('/update', async (req, res, next) => {
    try {
        // G4: Strict input validation
        const payload = UpdateChannelSchema.parse(req.body);
        
        const configPath = await getConfigPath();
        await ensureConfigExists(configPath);

        // G3: Acquire file lock before read-modify-write cycle
        const release = await lockfile.lock(configPath, { retries: 5 });

        try {
            const raw = await fs.readFile(configPath, 'utf8');
            const parsed = JSON.parse(raw);
            
            if (!parsed.channels) {
                parsed.channels = [];
            }

            const channelIndex = parsed.channels.findIndex(c => c.id === payload.channelId);
            
            if (channelIndex > -1) {
                if (payload.skills !== undefined) {
                    parsed.channels[channelIndex].skills = payload.skills;
                }
                if (payload.assignedAgent !== undefined) {
                    parsed.channels[channelIndex].assignedAgent = payload.assignedAgent;
                }
            } else {
                parsed.channels.push({
                    id: payload.channelId,
                    name: `New Channel ${payload.channelId}`,
                    skills: payload.skills || [],
                    assignedAgent: payload.assignedAgent || 'tars'
                });
            }

            // G4 Secondary check: ensure our modifications didn't break the global schema
            const finalState = ChannelConfigSchema.parse(parsed);

            await fs.writeFile(configPath, JSON.stringify(finalState, null, 2), 'utf8');
            
            res.json({ ok: true, message: 'Channel configuration updated atomically.' });
        } finally {
            // ALWAYS release the lock whether success or error
            await release();
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            error.status = 400; // Bad request for validation errors
        }
        next(error);
    }
});

export default router;
