import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    watch: vi.fn(),
  };
});

import { existsSync, readFileSync, statSync } from 'node:fs';

describe('createRooModesManager', () => {
  let createRooModesManager: () => { init(): void; load(): unknown };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import('../src/roomodes.js?t=' + Date.now());
    createRooModesManager = mod.createRooModesManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('load() returns null when .roomodes file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const manager = createRooModesManager();
    const result = manager.load();
    expect(result).toBeNull();
  });

  it('load() parses valid JSON file', () => {
    const mockData = { customModes: [{ slug: 'coder', roleDefinition: 'You are a coder' }] };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ mtimeMs: Date.now() - 5000 } as ReturnType<typeof statSync>);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

    const manager = createRooModesManager();
    const result = manager.load();
    expect(result).toEqual(mockData);
  });

  it('load() returns cached data on second call within TTL', () => {
    const mockData = { customModes: [] };
    const now = Date.now();

    vi.mocked(existsSync).mockReturnValue(true);
    // mtimeMs older than cache timestamp — simulated by making mtime in the past
    vi.mocked(statSync).mockReturnValue({ mtimeMs: now - 10_000 } as ReturnType<typeof statSync>);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

    const manager = createRooModesManager();
    manager.load(); // first call — populates cache
    const result = manager.load(); // second call — should hit cache

    // readFileSync should only have been called once because second call uses cache
    expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
  });

  it('load() returns null on JSON parse error', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ mtimeMs: Date.now() - 5000 } as ReturnType<typeof statSync>);
    vi.mocked(readFileSync).mockReturnValue('not valid json {{');

    const manager = createRooModesManager();
    const result = manager.load();
    expect(result).toBeNull();
  });
});
