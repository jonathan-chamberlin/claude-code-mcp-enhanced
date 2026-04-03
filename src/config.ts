// Environment-driven configuration and named constants

export const DEBUG_MODE = process.env.MCP_CLAUDE_DEBUG === 'true';
export const HEARTBEAT_INTERVAL_MS = parseInt(process.env.MCP_HEARTBEAT_INTERVAL_MS || '15000', 10);
export const EXECUTION_TIMEOUT_MS = parseInt(process.env.MCP_EXECUTION_TIMEOUT_MS || '1800000', 10);
export const USE_ROO_MODES = process.env.MCP_USE_ROOMODES === 'true';
export const MAX_RETRIES = parseInt(process.env.MCP_MAX_RETRIES || '3', 10);
export const RETRY_DELAY_MS = parseInt(process.env.MCP_RETRY_DELAY_MS || '1000', 10);
export const WATCH_ROO_MODES = process.env.MCP_WATCH_ROOMODES === 'true';

// Named constants (formerly magic numbers)
export const CACHE_TTL_MS = 60_000;
export const SHUTDOWN_TIMEOUT_MS = 10_000;
export const SHUTDOWN_POLL_MS = 100;
export const HEALTH_CHECK_TIMEOUT_MS = 5_000;
export const CONVERTER_TIMEOUT_MS = 30_000;
export const TASK_TTL_MS = parseInt(process.env.MCP_TASK_TTL_MS || '1800000', 10);
export const TASK_CLEANUP_INTERVAL_MS = 300_000;
export const TASK_PARTIAL_OUTPUT_LIMIT = 10_000;

// Tool name constants
export const TOOL_NAMES = {
  HEALTH: 'health',
  CLAUDE_CODE: 'claude_code',
  CONVERT_TASK: 'convert_task_markdown',
  GET_TASK_RESULT: 'get_task_result',
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];

// Shared types
export interface ClaudeCodeArgs {
  prompt: string;
  workFolder?: string;
  parentTaskId?: string;
  returnMode?: 'summary' | 'full';
  taskDescription?: string;
  mode?: string;
}

export interface RooMode {
  slug: string;
  roleDefinition: string;
  apiConfiguration?: {
    modelId?: string;
  };
}

export interface RooModesConfig {
  customModes: RooMode[];
}

export function debugLog(message?: unknown, ...optionalParams: unknown[]): void {
  if (DEBUG_MODE) {
    console.error(message, ...optionalParams);
  }
}
