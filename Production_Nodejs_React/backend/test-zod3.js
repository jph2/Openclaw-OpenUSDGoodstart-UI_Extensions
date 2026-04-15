import { z } from 'zod';
const ChannelConfigSchema = z.object({
  channels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    model: z.string().nullish(),
    skills: z.array(z.string()).nullish(),
  })),
  agents: z.array(z.object({})).nullish(),
  subAgents: z.array(z.any()).nullish(),
  metadata: z.any().nullish(),
  availableModels: z.record(z.any()).optional()
}).passthrough();

const normalizedData = {
  channels: [ { id: "123", name: "abc", status: "active" } ],
  agents: [],
  subAgents: [],
  metadata: {},
  availableModels: {}
};

try {
  ChannelConfigSchema.parse(normalizedData);
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message, e.stack);
}
