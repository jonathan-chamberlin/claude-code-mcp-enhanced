// MCP tool definitions — schemas and descriptions for ListTools responses
export const CLAUDE_CODE_DESCRIPTION = `Claude Code Agent: Your versatile multi-modal assistant for code, file, Git, and terminal operations via Claude CLI. Use \`workFolder\` for contextual execution.

• File ops: Create, read, (fuzzy) edit, move, copy, delete, list files, analyze/ocr images, file content analysis
    └─ e.g., "Create /tmp/log.txt with 'system boot'", "Edit main.py to replace 'debug_mode = True' with 'debug_mode = False'", "List files in /src", "Move a specific section somewhere else"

• Code: Generate / analyse / refactor / fix
    └─ e.g. "Generate Python to parse CSV→JSON", "Find bugs in my_script.py"

• Git: Stage ▸ commit ▸ push ▸ tag (any workflow)
    └─ "Commit '/workspace/src/main.java' with 'feat: user auth' to develop."

• Terminal: Run any CLI cmd or open URLs
    └─ "npm run build", "Open https://developer.mozilla.org"

• Web search + summarise content on-the-fly

• Multi-step workflows  (Version bumps, changelog updates, release tagging, etc.)

• GitHub integration  Create PRs, check CI status

• Confused or stuck on an issue? Ask Claude Code for a second opinion, it might surprise you!

• Task Orchestration with "Boomerang" pattern
    └─ Break down complex tasks into subtasks for Claude Code to execute separately
    └─ Pass parent task ID and get results back for complex workflows
    └─ Specify return mode (summary or full) for tailored responses

**Prompt tips**

1. Be concise, explicit & step-by-step for complex tasks. No need for niceties, this is a tool to get things done.
2. For multi-line text, write it to a temporary file in the project root, use that file, then delete it.
3. If you get a timeout, split the task into smaller steps.
4. **Seeking a second opinion/analysis**: If you're stuck or want advice, you can ask \`claude_code\` to analyze a problem and suggest solutions. Clearly state in your prompt that you are looking for analysis only and no actual file modifications should be made.
5. If workFolder is set to the project path, there is no need to repeat that path in the prompt and you can use relative paths for files.
6. Claude Code is really good at complex multi-step file operations and refactorings and faster than your native edit features.
7. Combine file operations, README updates, and Git commands in a sequence.
8. **Task Orchestration**: For complex workflows, use \`parentTaskId\` to create subtasks and \`returnMode: "summary"\` to get concise results back.
9. Claude can do much more, just ask it!`;
export const TOOL_DEFINITIONS = [
    {
        name: 'health',
        description: 'Returns health status, version information, and current configuration of the Claude Code MCP server.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'convert_task_markdown',
        description: 'Converts markdown task files into Claude Code MCP-compatible JSON format. Returns an array of tasks that can be executed using the claude_code tool.',
        inputSchema: {
            type: 'object',
            properties: {
                markdownPath: {
                    type: 'string',
                    description: 'Path to the markdown task file to convert.',
                },
                outputPath: {
                    type: 'string',
                    description: 'Optional path where to save the JSON output. If not provided, returns the JSON directly.',
                },
            },
            required: ['markdownPath'],
        },
    },
    {
        name: 'claude_code',
        description: CLAUDE_CODE_DESCRIPTION,
        inputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The detailed natural language prompt for Claude to execute.',
                },
                workFolder: {
                    type: 'string',
                    description: 'Mandatory when using file operations or referencing any file. The working directory for the Claude CLI execution.',
                },
                parentTaskId: {
                    type: 'string',
                    description: 'Optional ID of the parent task that created this task (for task orchestration/boomerang).',
                },
                returnMode: {
                    type: 'string',
                    enum: ['summary', 'full'],
                    description: 'How results should be returned: summary (concise) or full (detailed). Defaults to full.',
                },
                taskDescription: {
                    type: 'string',
                    description: 'Short description of the task for better organization and tracking in orchestrated workflows.',
                },
                mode: {
                    type: 'string',
                    description: 'When MCP_USE_ROOMODES=true, specifies the mode from .roomodes to use (e.g., "boomerang-mode", "coder", "designer", etc.).',
                },
            },
            required: ['prompt'],
        },
    },
];
