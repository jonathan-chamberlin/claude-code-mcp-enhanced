import { CLAUDE_CODE_DESCRIPTION } from './descriptions.js';
export { CLAUDE_CODE_DESCRIPTION } from './descriptions.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'health',
    description:
      'Returns health status, version information, and current configuration of the Claude Code MCP server.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'convert_task_markdown',
    description:
      'Converts markdown task files into Claude Code MCP-compatible JSON format. Returns an array of tasks that can be executed using the claude_code tool.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        markdownPath: {
          type: 'string',
          description: 'Path to the markdown task file to convert.',
        },
        outputPath: {
          type: 'string',
          description:
            'Optional path where to save the JSON output. If not provided, returns the JSON directly.',
        },
      },
      required: ['markdownPath'],
    },
  },
  {
    name: 'claude_code',
    description: CLAUDE_CODE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'The detailed natural language prompt for Claude to execute.',
        },
        workFolder: {
          type: 'string',
          description:
            'Mandatory when using file operations or referencing any file. The working directory for the Claude CLI execution.',
        },
        parentTaskId: {
          type: 'string',
          description:
            'Optional ID of the parent task that created this task (for task orchestration/boomerang).',
        },
        returnMode: {
          type: 'string',
          enum: ['summary', 'full'],
          description:
            'How results should be returned: summary (concise) or full (detailed). Defaults to full.',
        },
        taskDescription: {
          type: 'string',
          description:
            'Short description of the task for better organization and tracking in orchestrated workflows.',
        },
        mode: {
          type: 'string',
          description:
            'When MCP_USE_ROOMODES=true, specifies the mode from .roomodes to use (e.g., "boomerang-mode", "coder", "designer", etc.).',
        },
      },
      required: ['prompt'],
    },
  },
];
