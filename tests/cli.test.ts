import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node:fs before importing cli module
vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    existsSync: vi.fn(),
  };
});

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

describe('findClaudeCli', () => {
  let findClaudeCli: () => string;
  const localPath = join(homedir(), '.claude', 'local', 'claude');

  beforeEach(async () => {
    vi.resetModules();
    // Re-import after resetting modules so the mock is applied fresh
    const mod = await import('../src/cli.js?t=' + Date.now());
    findClaudeCli = mod.findClaudeCli;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns local path when ~/.claude/local/claude exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const result = findClaudeCli();
    expect(result).toBe(localPath);
  });

  it('returns "claude" when local path does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const result = findClaudeCli();
    expect(result).toBe('claude');
  });
});
