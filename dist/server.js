#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../package.json' with { type: 'json' };
import { TOOL_NAMES, SHUTDOWN_TIMEOUT_MS, SHUTDOWN_POLL_MS, debugLog } from './config.js';
import { findClaudeCli } from './cli.js';
import { initRooModesWatcher } from './roomodes.js';
import { startCleanupTimer, stopCleanupTimer, killAllRunningTasks } from './task-store.js';
import { handleHealth } from './tools/health.js';
import { handleConvertTask } from './tools/convert-task.js';
import { handleClaudeCode } from './tools/claude-code.js';
import { handleGetTaskResult } from './tools/get-task-result.js';
import { TOOL_DEFINITIONS } from './tool-definitions.js';
// Initialize optional .roomodes file watcher
initRooModesWatcher();
// ─── Request tracking helper ────────────────────────────────────
async function withRequestTracking(activeRequests, fn) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeRequests.add(requestId);
    try {
        return await fn();
    }
    finally {
        activeRequests.delete(requestId);
        debugLog(`[Debug] Request ${requestId} completed`);
    }
}
// ─── Server ─────────────────────────────────────────────────────
class ClaudeCodeServer {
    server;
    claudeCliPath;
    packageVersion;
    activeRequests = new Set();
    constructor() {
        this.claudeCliPath = findClaudeCli();
        console.error(`[Setup] Using Claude CLI command/path: ${this.claudeCliPath}`);
        this.packageVersion = packageJson.version;
        this.server = new Server({ name: 'claude_code', version: '1.0.0' }, { capabilities: { tools: {} } });
        this.setupToolHandlers();
        this.setupShutdown();
        startCleanupTimer();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: TOOL_DEFINITIONS,
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (args) => {
            const fullToolName = args.params.name;
            const toolName = fullToolName.includes(':') ? fullToolName.split(':')[1] : fullToolName;
            const toolArguments = (args.params.arguments ?? {});
            debugLog(`[Debug] Tool request: ${fullToolName}, Local tool name: ${toolName}`);
            return withRequestTracking(this.activeRequests, async () => {
                switch (toolName) {
                    case TOOL_NAMES.HEALTH:
                        return handleHealth(this.claudeCliPath, this.packageVersion);
                    case TOOL_NAMES.CONVERT_TASK:
                        return handleConvertTask(toolArguments);
                    case TOOL_NAMES.CLAUDE_CODE:
                        return handleClaudeCode(toolArguments, this.claudeCliPath);
                    case TOOL_NAMES.GET_TASK_RESULT:
                        return handleGetTaskResult(toolArguments);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Tool ${toolName} not found`);
                }
            });
        });
    }
    setupShutdown() {
        this.server.onerror = (error) => console.error('[Error]', error);
        const handleShutdown = async (signal) => {
            console.error(`[Shutdown] Received ${signal}. Graceful shutdown initiated.`);
            stopCleanupTimer();
            killAllRunningTasks();
            if (this.activeRequests.size > 0) {
                console.error(`[Shutdown] Waiting for ${this.activeRequests.size} active requests...`);
                const start = Date.now();
                while (this.activeRequests.size > 0 && Date.now() - start < SHUTDOWN_TIMEOUT_MS) {
                    await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_POLL_MS));
                }
                if (this.activeRequests.size > 0) {
                    console.error(`[Shutdown] ${this.activeRequests.size} requests still active. Proceeding.`);
                }
            }
            await this.server.close();
            console.error('[Shutdown] Server closed.');
            process.exit(0);
        };
        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Claude Code MCP server running on stdio');
    }
}
const server = new ClaudeCodeServer();
server.run().catch(console.error);
