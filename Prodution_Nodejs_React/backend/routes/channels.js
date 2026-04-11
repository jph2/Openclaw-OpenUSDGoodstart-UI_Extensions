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
        inactiveSubAgents: z.array(z.string()).optional(),
        inactiveSkills: z.array(z.string()).optional()
    })),
    agents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        defaultSkills: z.array(z.string()).optional(),
        inactiveSkills: z.array(z.string()).optional()
    })).optional(),
    subAgents: z.array(z.any()).optional()
}).passthrough();

const UpdateChannelSchema = z.object({
    channelId: z.string().min(1),
    skills: z.array(z.string()).optional(),
    assignedAgent: z.string().optional(),
    model: z.string().optional(),
    inactiveSubAgents: z.array(z.string()).optional(),
    inactiveSkills: z.array(z.string()).optional()
});

const UpdateAgentSchema = z.object({
    agentId: z.string().min(1),
    defaultSkills: z.array(z.string()).optional(),
    inactiveSkills: z.array(z.string()).optional()
});

const UpdateSubAgentSchema = z.object({
    subAgentId: z.string().min(1),
    additionalSkills: z.array(z.string()).optional(),
    inactiveSkills: z.array(z.string()).optional()
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
 * Helper to gracefully parse external JSON files without crashing the server
 */
const readExternalJsonSafe = async (filePath) => {
    if (!filePath) return {};
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`[MARVIN-WARN] Failed to read or parse ${filePath}:`, err.message);
        return {};
    }
};

/**
 * GET /api/channels
 * Returns the current channel configuration merged with Live OpenClaw state.
 */
router.get('/', async (req, res, next) => {
    try {
        // 1. Get Local UI State
        const configPath = await getConfigPath();
        await ensureConfigExists(configPath);
        const rawLocal = await fs.readFile(configPath, 'utf8');
        const localState = JSON.parse(rawLocal);
        const localChannelsMap = new Map((localState.channels || []).map(c => [c.id, c]));

        // 2. Fetch OpenClaw Sovereign State (Point of Truth for Telegram Connections)
        const openclawState = await readExternalJsonSafe(process.env.OPENCLAW_CONFIG_PATH);
        const liveTelegramGroups = openclawState?.channels?.telegram?.groups || {};

        // 3. Fetch Documentation / Dictionary State
        const routingState = await readExternalJsonSafe(process.env.TELEGRAM_ROUTING_PATH);
        const routingChannels = routingState?.channels || {};

        // 4. Merge Engine
        const mergedChannels = [];
        
        // Ensure every live OpenClaw group exists locally
        for (const [groupId, settings] of Object.entries(liveTelegramGroups)) {
            // Ignore wildcard entry
            if (groupId === '*') continue;

            const routingInfo = routingChannels[groupId] || {};
            const localInfo = localChannelsMap.get(groupId) || {};

            mergedChannels.push({
                id: groupId,
                name: routingInfo.name || localInfo.name || `TG Unknown (${groupId})`,
                model: localInfo.model || 'local-pc/google/gemma-4-26b-a4b',
                skills: localInfo.skills || [],
                assignedAgent: localInfo.assignedAgent || undefined,
                inactiveSubAgents: localInfo.inactiveSubAgents || [],
                inactiveSkills: localInfo.inactiveSkills || [],
                require_mention: settings.requireMention || false,
                currentTask: routingInfo.purpose || "Live Channel",
                status: "active"
            });
            
            localChannelsMap.delete(groupId);
        }

        // Add any local orphan channels that are NOT in live OpenClaw yet (for robustness)
        for (const [groupId, localInfo] of localChannelsMap.entries()) {
             mergedChannels.push({
                 id: groupId,
                 name: localInfo.name || `Orphan (${groupId})`,
                 model: localInfo.model || 'local-pc/google/gemma-4-26b-a4b',
                 skills: localInfo.skills || [],
                 assignedAgent: localInfo.assignedAgent || undefined,
                 inactiveSubAgents: localInfo.inactiveSubAgents || [],
                 inactiveSkills: localInfo.inactiveSkills || [],
                 currentTask: "Offline/Disconnected",
                 status: "offline"
             });
        }

        // Return unified schema
        const unifiedData = {
            channels: mergedChannels,
            agents: localState.agents,
            subAgents: localState.subAgents
        };
        
        // We use .parse() here to strip out any rogue fields introduced by the dictionary
        const validated = ChannelConfigSchema.parse(unifiedData);
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
                if (payload.model !== undefined) {
                    parsed.channels[channelIndex].model = payload.model;
                }
                if (payload.inactiveSubAgents !== undefined) {
                    parsed.channels[channelIndex].inactiveSubAgents = payload.inactiveSubAgents;
                }
                if (payload.inactiveSkills !== undefined) {
                    parsed.channels[channelIndex].inactiveSkills = payload.inactiveSkills;
                }
            } else {
                parsed.channels.push({
                    id: payload.channelId,
                    name: `New Channel ${payload.channelId}`,
                    skills: payload.skills || [],
                    assignedAgent: payload.assignedAgent || 'tars',
                    model: payload.model || 'local-pc/google/gemma-4-26b-a4b',
                    inactiveSubAgents: payload.inactiveSubAgents || [],
                    inactiveSkills: payload.inactiveSkills || []
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

/**
 * POST /api/channels/updateAgent
 * Updates Main Agent properties atomically.
 */
router.post('/updateAgent', async (req, res, next) => {
    try {
        const payload = UpdateAgentSchema.parse(req.body);
        const configPath = await getConfigPath();
        await ensureConfigExists(configPath);
        const release = await lockfile.lock(configPath, { retries: 5 });

        try {
            const raw = await fs.readFile(configPath, 'utf8');
            const parsed = JSON.parse(raw);
            
            if (!parsed.agents) parsed.agents = [];

            const agentIndex = parsed.agents.findIndex(a => a.id === payload.agentId);
            if (agentIndex > -1) {
                if (payload.defaultSkills !== undefined) parsed.agents[agentIndex].defaultSkills = payload.defaultSkills;
                if (payload.inactiveSkills !== undefined) parsed.agents[agentIndex].inactiveSkills = payload.inactiveSkills;
            }

            const finalState = ChannelConfigSchema.parse(parsed);
            await fs.writeFile(configPath, JSON.stringify(finalState, null, 2), 'utf8');
            res.json({ ok: true, message: 'Agent configuration updated atomically.' });
        } finally {
            await release();
        }
    } catch (error) {
        if (error instanceof z.ZodError) error.status = 400;
        next(error);
    }
});

/**
 * POST /api/channels/updateSubAgent
 * Updates SubAgent properties atomically.
 */
router.post('/updateSubAgent', async (req, res, next) => {
    try {
        const payload = UpdateSubAgentSchema.parse(req.body);
        const configPath = await getConfigPath();
        await ensureConfigExists(configPath);
        const release = await lockfile.lock(configPath, { retries: 5 });

        try {
            const raw = await fs.readFile(configPath, 'utf8');
            const parsed = JSON.parse(raw);
            
            if (!parsed.subAgents) parsed.subAgents = [];

            const subAgentIndex = parsed.subAgents.findIndex(a => a.id === payload.subAgentId);
            if (subAgentIndex > -1) {
                if (payload.additionalSkills !== undefined) parsed.subAgents[subAgentIndex].additionalSkills = payload.additionalSkills;
                if (payload.inactiveSkills !== undefined) parsed.subAgents[subAgentIndex].inactiveSkills = payload.inactiveSkills;
            }

            const finalState = ChannelConfigSchema.parse(parsed);
            await fs.writeFile(configPath, JSON.stringify(finalState, null, 2), 'utf8');
            res.json({ ok: true, message: 'SubAgent configuration updated atomically.' });
        } finally {
            await release();
        }
    } catch (error) {
        if (error instanceof z.ZodError) error.status = 400;
        next(error);
    }
});

export default router;
