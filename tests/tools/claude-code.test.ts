import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the spawn module
vi.mock('../../src/spawn.js', () => ({
  spawnWithHandle: vi.fn(() => ({
    childProcess: { kill: vi.fn(), pid: 12345 },
    result: Promise.resolve({ stdout: 'mock output', stderr: '' }),
    getPartialStdout: () => '',
    getPartialStderr: () => '',
  })),
  spawnAsync: vi.fn().mockResolvedValue({ stdout: 'mock output', stderr: '' }),
}));

// Mock task store to track calls
vi.mock('../../src/task-store.js', () => ({
  createTaskId: vi.fn(() => 'test-task-123'),
  createTask: vi.fn(),
  registerProcess: vi.fn(),
  completeTask: vi.fn(),
  failTask: vi.fn(),
}));

// Mock async-retry to execute immediately without retries
vi.mock('async-retry', () => ({
  default: vi.fn(async (fn: Function) => fn(() => {}, 1)),
}));

import { handleClaudeCode } from '../../src/tools/claude-code.js';
import { createTaskId, createTask } from '../../src/task-store.js';

describe('handleClaudeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws McpError when prompt is missing', async () => {
    await expect(handleClaudeCode({}, 'claude')).rejects.toThrow('prompt');
  });

  it('throws McpError when prompt is not a string', async () => {
    await expect(handleClaudeCode({ prompt: 123 }, 'claude')).rejects.toThrow('prompt');
  });

  it('returns taskId and running status immediately', async () => {
    const result = await handleClaudeCode({ prompt: 'say hello' }, 'claude');
    expect(result.content).toHaveLength(1);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.taskId).toBe('test-task-123');
    expect(parsed.status).toBe('running');
  });

  it('creates a task in the store', async () => {
    await handleClaudeCode({ prompt: 'do something' }, 'claude');
    expect(createTaskId).toHaveBeenCalled();
    expect(createTask).toHaveBeenCalledWith('test-task-123', 'do something');
  });

  it('returns valid JSON in response text', async () => {
    const result = await handleClaudeCode({ prompt: 'test' }, 'claude');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
