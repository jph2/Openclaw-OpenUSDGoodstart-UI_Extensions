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

function testProp(name, obj) {
    try {
        ChannelConfigSchema.parse({ channels: [], [name]: obj });
        console.log(name, 'Success');
    } catch (e) {
        console.log(name, 'Failed:', e.message);
    }
}

testProp('agents', [{id: '2', name: 'A'}]);
testProp('subAgents', []);
testProp('metadata', { test: 1 });
testProp('availableModels', { 'modelA': {} });

// Wait! What if there's a specific object in metadata or something?
// Let's also test the exact data normalized in channels.js
const modelsObject = {};
const dynamicModels = [];
const metadataObj = {
    models: dynamicModels,
    mainAgents: {
        tars: { name: "TARS"}
    },
    subAgentsDict: {
        researcher: { name: "Researcher" }
    },
    skills: {
        "weather": { desc: "Get current weather" }
    }
};

testProp('metadata', metadataObj);
