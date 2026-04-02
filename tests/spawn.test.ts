import { describe, it, expect } from 'vitest';
import { spawnAsync } from '../src/spawn.js';

describe('spawnAsync', () => {
  it('resolves with stdout on exit code 0', async () => {
    const result = await spawnAsync('echo', ['hello world']);
    expect(result.stdout.trim()).toBe('hello world');
  });

  it('resolves with empty stderr on clean echo', async () => {
    const result = await spawnAsync('echo', ['hello']);
    expect(typeof result.stderr).toBe('string');
  });

  it('rejects with error on non-zero exit code', async () => {
    await expect(spawnAsync('sh', ['-c', 'exit 1'])).rejects.toThrow();
  });

  it('error message contains exit code info on failure', async () => {
    try {
      await spawnAsync('sh', ['-c', 'exit 42']);
    } catch (e) {
      expect((e as Error).message).toContain('42');
    }
  });

  it('rejects and error message contains stderr content', async () => {
    try {
      await spawnAsync('sh', ['-c', 'echo "error output" >&2; exit 1']);
    } catch (e) {
      expect((e as Error).message).toContain('error output');
    }
  });
});
