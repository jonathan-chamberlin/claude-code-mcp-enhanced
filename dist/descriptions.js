// Claude Code tool description — separated to keep tool schema definitions scannable
export const CLAUDE_CODE_DESCRIPTION = `ASYNC Claude Code Agent for code, file, Git, and terminal operations via Claude CLI.

IMPORTANT — THIS TOOL IS ASYNCHRONOUS:
This tool returns IMMEDIATELY with a taskId. It does NOT return the result directly.
You MUST poll get_task_result with that taskId to get the actual result.

REQUIRED WORKFLOW:
1. Call claude_code with your prompt → receives {"taskId": "...", "status": "running"}
2. Call get_task_result with {"taskId": "..."} (wait ~30 seconds between polls)
3. If status is "running", go back to step 2
4. If status is "completed", the "output" field contains the full result
5. If status is "failed", the "error" field explains what went wrong

NEVER assume the task is done after calling claude_code. ALWAYS poll get_task_result.
NEVER fabricate or guess results. ONLY use the output from get_task_result.

Capabilities:
• File ops: Create, read, edit, move, copy, delete, list, analyze images
• Code: Generate, analyse, refactor, fix
• Git: Stage, commit, push, tag, create PRs
• Terminal: Run any CLI command
• Web search + summarise
• Multi-step workflows (version bumps, changelogs, releases)

Prompt tips:
1. Be concise and explicit. Step-by-step for complex tasks.
2. Set workFolder to the project path, then use relative paths.
3. For analysis only, state "no file modifications" in your prompt.
4. For task orchestration, use parentTaskId and returnMode: "summary".`;
export const GET_TASK_RESULT_DESCRIPTION = `Poll for the result of an async claude_code task.

Returns the current status and output of a task started by claude_code.

Statuses:
- "running": Task is still executing. partialOutput shows recent output.
- "completed": Task finished successfully. output contains the full result.
- "failed": Task encountered an error. error explains what went wrong.
- "not_found": No task with this ID exists (expired or invalid).

Call this tool every 30 seconds after starting a task with claude_code until status is "completed" or "failed".`;
