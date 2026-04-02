import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HEARTBEAT_INTERVAL_MS,
  EXECUTION_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  CACHE_TTL_MS,
  SHUTDOWN_TIMEOUT_MS,
  SHUTDOWN_POLL_MS,
  HEALTH_CHECK_TIMEOUT_MS,
  CONVERTER_TIMEOUT_MS,
  TOOL_NAMES,
  debugLog,
  type ClaudeCodeArgs,
} from '../src/config.js';

describe('config constants', () => {
  it('HEARTBEAT_INTERVAL_MS is a positive number', () => {
    expect(typeof HEARTBEAT_INTERVAL_MS).toBe('number');
    expect(HEARTBEAT_INTERVAL_MS).toBeGreaterThan(0);
  });

  it('EXECUTION_TIMEOUT_MS is a positive number', () => {
    expect(typeof EXECUTION_TIMEOUT_MS).toBe('number');
    expect(EXECUTION_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('MAX_RETRIES is a non-negative number', () => {
    expect(typeof MAX_RETRIES).toBe('number');
    expect(MAX_RETRIES).toBeGreaterThanOrEqual(0);
  });

  it('RETRY_DELAY_MS is a positive number', () => {
    expect(typeof RETRY_DELAY_MS).toBe('number');
    expect(RETRY_DELAY_MS).toBeGreaterThan(0);
  });

  it('CACHE_TTL_MS equals 60000', () => {
    expect(CACHE_TTL_MS).toBe(60_000);
  });

  it('SHUTDOWN_TIMEOUT_MS equals 10000', () => {
    expect(SHUTDOWN_TIMEOUT_MS).toBe(10_000);
  });

  it('SHUTDOWN_POLL_MS equals 100', () => {
    expect(SHUTDOWN_POLL_MS).toBe(100);
  });

  it('HEALTH_CHECK_TIMEOUT_MS equals 5000', () => {
    expect(HEALTH_CHECK_TIMEOUT_MS).toBe(5_000);
  });

  it('CONVERTER_TIMEOUT_MS equals 30000', () => {
    expect(CONVERTER_TIMEOUT_MS).toBe(30_000);
  });
});

describe('TOOL_NAMES', () => {
  it('has HEALTH key with value "health"', () => {
    expect(TOOL_NAMES.HEALTH).toBe('health');
  });

  it('has CLAUDE_CODE key with value "claude_code"', () => {
    expect(TOOL_NAMES.CLAUDE_CODE).toBe('claude_code');
  });

  it('has CONVERT_TASK key with value "convert_task_markdown"', () => {
    expect(TOOL_NAMES.CONVERT_TASK).toBe('convert_task_markdown');
  });
});

describe('debugLog', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('does not call console.error when DEBUG_MODE is false', () => {
    // DEBUG_MODE is based on process.env.MCP_CLAUDE_DEBUG which is not set in test
    // so it defaults to false; debugLog should be a no-op
    debugLog('test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('ClaudeCodeArgs type shape', () => {
  it('accepts a valid ClaudeCodeArgs object', () => {
    // Type-level verification via satisfies — if this compiles the shape is correct
    const args = {
      prompt: 'do something',
      workFolder: '/tmp',
      parentTaskId: 'task-1',
      returnMode: 'full' as const,
      taskDescription: 'desc',
      mode: 'coder',
    } satisfies ClaudeCodeArgs;

    expect(args.prompt).toBe('do something');
    expect(args.returnMode).toBe('full');
  });

  it('accepts ClaudeCodeArgs with only required prompt field', () => {
    const args: ClaudeCodeArgs = { prompt: 'minimal' };
    expect(args.prompt).toBe('minimal');
  });
});
