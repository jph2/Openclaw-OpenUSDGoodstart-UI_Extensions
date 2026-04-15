import { z } from 'zod';
try {
const schema = z.object({
    availableModels: z.record(z.any()).optional()
}).passthrough();
schema.parse({});
console.log("Success 1");
} catch(e) { console.error("Error 1", e); }
