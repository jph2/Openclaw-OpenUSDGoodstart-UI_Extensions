import { z } from 'zod';

const ChannelConfigSchema = z.object({
    channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        model: z.string().nullish(),
        skills: z.array(z.string()).nullish(),
        require_mention: z.boolean().nullish(),
        assignedAgent: z.string().nullish(),
        ideOverride: z.boolean().nullish(),
        inactiveSubAgents: z.array(z.string()).nullish(),
        inactiveSkills: z.array(z.string()).nullish(),
        caseSkills: z.array(z.string()).nullish(),
        inactiveCaseSkills: z.array(z.string()).nullish(),
        status: z.string().nullish(),
        currentTask: z.string().nullish()
    })),
    agents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().nullish(),
        description: z.string().nullish(),
        color: z.string().nullish(),
        defaultSkills: z.array(z.string()).nullish(),
        inactiveSkills: z.array(z.string()).nullish()
    })).nullish(),
    subAgents: z.array(z.any()).nullish(),
    metadata: z.any().nullish(),
    availableModels: z.record(z.any()).optional()
}).passthrough();

try {
    const res = ChannelConfigSchema.parse({ channels: [] });
    console.log("Success", res);
} catch (e) {
    console.error("Error", e);
}
