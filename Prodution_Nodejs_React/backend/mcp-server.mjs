import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';

// Sovereign Channel Manager Bridge - MCP Server
// This MCP server wraps the OpenClaw Channel Manager configuration and telegram functionalities,
// presenting them to the local IDE (AntiGravity) securely over stdio.

const server = new Server({
    name: "sovereign-channel-bridge",
    version: "1.0.0"
}, {
    capabilities: {
        resources: {},
        tools: {}
    }
});

// Resource Handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "config://channels",
                name: "Sovereign Channel Architecture (YAML/JSON)",
                description: "Provides the overarching system context (all channels, rules, deployed sub-agents) managed by the local Channel Manager.",
                mimeType: "application/json"
            }
        ]
    };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
        resourceTemplates: [
            {
                uriTemplate: "memory://{telegram_id}",
                name: "Telegram Channel Memory Transcript",
                description: "Reads the physical conversation memory transcript for a given telegram channel.",
                mimeType: "text/markdown"
            },
            {
                uriTemplate: "config://{telegram_id}",
                name: "Channel Config specific to CASE",
                description: "Reads the allowed CASE SKILLS and metadata for a given telegram channel.",
                mimeType: "application/json"
            }
        ]
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "config://channels") {
        try {
            const configPath = path.resolve(process.env.WORKSPACE_ROOT || '/media/claw-agentbox/data/9999_LocalRepo/', 'Openclaw-OpenUSDGoodtstart-Extension/channel_CHAT-manager/channel_config.json');
            const data = await fs.readFile(configPath, 'utf8');
            return {
                contents: [{
                    uri: request.params.uri,
                    text: data,
                    mimeType: "application/json"
                }]
            };
        } catch (e) {
            throw new Error(`[MCP] Failed to construct system context: ${e.message}`);
        }
    }
    
    // Check if memory:// resource
    if (request.params.uri.startsWith("memory://")) {
        const id = request.params.uri.replace("memory://", "");
        try {
            // Memory is usually stored in /workspace/memory/TGXXX_name.md
            // Since we know the id (e.g. -1005752539559), we can search the memory dir for a file containing the id
            const memoryDir = path.resolve(process.env.WORKSPACE_ROOT || '/media/claw-agentbox/data/9999_LocalRepo/', 'Openclaw-OpenUSDGoodtstart-Extension/channel_CHAT-manager/memory');
            const files = await fs.readdir(memoryDir);
            const targetFile = files.find(f => f.includes(id));
            if (!targetFile) throw new Error("Transcript file not found for this channel ID.");
            
            const data = await fs.readFile(path.join(memoryDir, targetFile), 'utf8');
            return {
                contents: [{
                    uri: request.params.uri,
                    text: data,
                    mimeType: "text/markdown"
                }]
            };
        } catch (e) {
            throw new Error(`[MCP] Failed to read channel memory: ${e.message}`);
        }
    }

    // Check if config:// specific resource
    if (request.params.uri.startsWith("config://") && request.params.uri !== "config://channels") {
        const id = request.params.uri.replace("config://", "");
        try {
            const configPath = path.resolve(process.env.WORKSPACE_ROOT || '/media/claw-agentbox/data/9999_LocalRepo/', 'Openclaw-OpenUSDGoodtstart-Extension/channel_CHAT-manager/channel_config.json');
            const data = JSON.parse(await fs.readFile(configPath, 'utf8'));
            const channel = data.channels.find(c => c.id === id);
            if (!channel) throw new Error("Channel configuration not found.");
            
            return {
                contents: [{
                    uri: request.params.uri,
                    text: JSON.stringify(channel, null, 2),
                    mimeType: "application/json"
                }]
            };
        } catch (e) {
            throw new Error(`[MCP] Failed to configure CASE channel context: ${e.message}`);
        }
    }

    throw new Error(`Resource not found: ${request.params.uri}`);
});

// Tool Handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "send_telegram_reply",
                description: "Injects a message safely into a Telegram Channel via the local Sovereign Hub Backend.",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: { type: "string", description: "The telegram channel/chat numeric string ID" },
                        message: { type: "string", description: "The message payload" }
                    },
                    required: ["channel_id", "message"]
                }
            },
            {
                name: "change_agent_mode",
                description: "Temporarily assigns a different Engine Agent (TARS, MARVIN, SONIC) to a specific channel via the Channel Manager.",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: { type: "string", description: "The telegram channel/chat numeric string ID" },
                        agent_key: { type: "string", description: "The engine to assign (tars, marvin, sonic, case)" }
                    },
                    required: ["channel_id", "agent_key"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "send_telegram_reply") {
        const { channel_id, message } = request.params.arguments;
        // In reality, this communicates with the backend HTTP API or directly calls telegramService.
        // For MVP, we will issue a direct API call to the Node.js backend.
        try {
            const response = await fetch(`http://localhost:3000/api/telegram/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: channel_id, text: message })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { content: [{ type: "text", text: `Message injected successfully into ${channel_id}` }], isError: false };
        } catch (e) {
            return { content: [{ type: "text", text: `Injection failed: ${e.message}` }], isError: true };
        }
    }
    
    if (request.params.name === "change_agent_mode") {
        const { channel_id, agent_key } = request.params.arguments;
        try {
            // Channel routing update via the backend settings API
            const response = await fetch(`http://localhost:3000/api/channels/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId: channel_id, assignedAgent: agent_key })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { content: [{ type: "text", text: `Agent mode for ${channel_id} successfully changed to ${agent_key}` }], isError: false };
        } catch (e) {
            return { content: [{ type: "text", text: `Agent reassignment failed: ${e.message}` }], isError: true };
        }
    }
    
    throw new Error(`Tool not found: ${request.params.name}`);
});

// Run Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] Sovereign Channel Bridge running on Stdio");
}

run().catch(console.error);
