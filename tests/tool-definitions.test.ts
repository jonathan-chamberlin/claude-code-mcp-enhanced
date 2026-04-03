import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/tool-definitions.js';

describe('TOOL_DEFINITIONS', () => {
  it('has exactly 4 tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it('each tool has name, description, and inputSchema', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('health tool has no required params', () => {
    const health = TOOL_DEFINITIONS.find((t) => t.name === 'health');
    expect(health).toBeDefined();
    expect(health!.inputSchema.required).toEqual([]);
  });

  it('claude_code tool has required: ["prompt"]', () => {
    const claudeCode = TOOL_DEFINITIONS.find((t) => t.name === 'claude_code');
    expect(claudeCode).toBeDefined();
    expect(claudeCode!.inputSchema.required).toEqual(['prompt']);
  });

  it('convert_task_markdown has required: ["markdownPath"]', () => {
    const convertTask = TOOL_DEFINITIONS.find((t) => t.name === 'convert_task_markdown');
    expect(convertTask).toBeDefined();
    expect(convertTask!.inputSchema.required).toEqual(['markdownPath']);
  });

  it('get_task_result has required: [taskId]', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_task_result');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual(['taskId']);
  });
});
