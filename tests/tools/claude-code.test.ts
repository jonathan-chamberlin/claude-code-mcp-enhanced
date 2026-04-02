import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/spawn.js', () => ({
  spawnAsync: vi.fn(),
}));

vi.mock('../../src/roomodes.js', () => ({
  loadRooModes: vi.fn().mockReturnValue(null),
}));

// Mock async-retry to call fn directly (no delay, no retries) for test speed
vi.mock('async-retry', () => ({
  default: vi.fn(async (fn: (bail: (e: Error) => void, attempt: number) => Promise<unknown>) => {
    const bail = (e: Error) => { throw e; };
    return fn(bail, 1);
  }),
}));

import { spawnAsync } from '../../src/spawn.js';
import { handleClaudeCode } from '../../src/tools/claude-code.js';
import { homedir } from 'node:os';

describe('handleClaudeCode', () => {
  beforeEach(() => {
    vi.mocked(spawnAsync).mockResolvedValue({ stdout: 'mock output', stderr: '' });
  });

  it('throws McpError when prompt is missing', async () => {
    await expect(handleClaudeCode({}, 'claude')).rejects.toThrow();
  });

  it('throws McpError when prompt is not a string', async () => {
    await expect(
      handleClaudeCode({ prompt: 123 } as Record<string, unknown>, 'claude'),
    ).rejects.toThrow();
  });

  it('calls spawnAsync with correct positional args', async () => {
    await handleClaudeCode({ prompt: 'say hello' }, 'claude');
    expect(vi.mocked(spawnAsync)).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', 'say hello']),
      expect.any(Object),
    );
  });

  it('includes --dangerously-skip-permissions in args', async () => {
    await handleClaudeCode({ prompt: 'do something' }, 'claude');
    const [, args] = vi.mocked(spawnAsync).mock.calls[0];
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('uses homedir() when workFolder is not specified', async () => {
    await handleClaudeCode({ prompt: 'test' }, 'claude');
    const [, , options] = vi.mocked(spawnAsync).mock.calls[0];
    expect(options?.cwd).toBe(homedir());
  });

  it('prepends boomerang context when parentTaskId is provided', async () => {
    vi.mocked(spawnAsync).mockClear();
    await handleClaudeCode({ prompt: 'do task', parentTaskId: 'parent-123' }, 'claude');
    const [, args] = vi.mocked(spawnAsync).mock.calls[0];
    const promptArg = args[args.indexOf('-p') + 1];
    expect(promptArg).toContain('Boomerang Task');
    expect(promptArg).toContain('parent-123');
  });

  it('returns text content on success', async () => {
    const result = await handleClaudeCode({ prompt: 'test' }, 'claude');
    expect(result.content).toHaveLength(1);
    expect((result.content as Array<{ type: string; text: string }>)[0].type).toBe('text');
    expect((result.content as Array<{ type: string; text: string }>)[0].text).toContain('mock output');
  });

  it('appends BOOMERANG_RESULT comment when parentTaskId is set', async () => {
    const result = await handleClaudeCode(
      { prompt: 'task', parentTaskId: 'task-abc' },
      'claude',
    );
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('BOOMERANG_RESULT');
    expect(text).toContain('task-abc');
  });

  it('throws timeout McpError when spawn fails with ETIMEDOUT', async () => {
    const timeoutError = new Error('ETIMEDOUT connection timed out') as Error & { code: string };
    timeoutError.code = 'ETIMEDOUT';
    vi.mocked(spawnAsync).mockRejectedValue(timeoutError);

    await expect(handleClaudeCode({ prompt: 'test' }, 'claude')).rejects.toThrow(/timed out/i);
  });
});
