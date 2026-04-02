import { describe, it, expect } from 'vitest';
import { requireStringParam } from '../src/validation.js';

describe('requireStringParam', () => {
  it('returns the string value when param exists and is a string', () => {
    const result = requireStringParam({ prompt: 'hello' }, 'prompt', 'my_tool');
    expect(result).toBe('hello');
  });

  it('throws when param is missing from toolArguments', () => {
    expect(() => requireStringParam({}, 'prompt', 'my_tool')).toThrow();
  });

  it('throws McpError when param is a number', () => {
    expect(() => requireStringParam({ prompt: 42 } as Record<string, unknown>, 'prompt', 'my_tool')).toThrow();
  });

  it('throws McpError when param is a boolean', () => {
    expect(() => requireStringParam({ prompt: true } as Record<string, unknown>, 'prompt', 'my_tool')).toThrow();
  });

  it('throws McpError when param is null', () => {
    expect(() => requireStringParam({ prompt: null } as Record<string, unknown>, 'prompt', 'my_tool')).toThrow();
  });

  it('error message includes param name', () => {
    try {
      requireStringParam({}, 'prompt', 'my_tool');
    } catch (e) {
      expect((e as Error).message).toContain('prompt');
    }
  });

  it('error message includes tool name', () => {
    try {
      requireStringParam({}, 'prompt', 'my_tool');
    } catch (e) {
      expect((e as Error).message).toContain('my_tool');
    }
  });
});
