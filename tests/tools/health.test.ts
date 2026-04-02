import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/spawn.js', () => ({
  spawnAsync: vi.fn(),
}));

import { spawnAsync } from '../../src/spawn.js';
import { handleHealth } from '../../src/tools/health.js';

describe('handleHealth', () => {
  beforeEach(() => {
    vi.mocked(spawnAsync).mockResolvedValue({ stdout: 'claude 1.0.0', stderr: '' });
  });

  it('returns JSON with status "ok"', async () => {
    const result = await handleHealth('claude', '1.0.0');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('ok');
  });

  it('includes version string in response', async () => {
    const result = await handleHealth('claude', '2.5.0');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.version).toBe('2.5.0');
  });

  it('reports claudeCli status as "available" when spawnAsync succeeds', async () => {
    vi.mocked(spawnAsync).mockResolvedValue({ stdout: 'claude 1.0.0', stderr: '' });
    const result = await handleHealth('claude', '1.0.0');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.claudeCli.status).toBe('available');
  });

  it('reports claudeCli status as "unavailable" when spawnAsync throws', async () => {
    vi.mocked(spawnAsync).mockRejectedValue(new Error('spawn error'));
    const result = await handleHealth('claude', '1.0.0');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.claudeCli.status).toBe('unavailable');
  });

  it('includes system info with platform and arch', async () => {
    const result = await handleHealth('claude', '1.0.0');
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.system.platform).toBeDefined();
    expect(parsed.system.arch).toBeDefined();
  });
});
