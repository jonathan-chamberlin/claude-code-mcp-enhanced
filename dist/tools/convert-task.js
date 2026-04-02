import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { resolve as pathResolve } from 'node:path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { spawnAsync } from '../spawn.js';
import { CONVERTER_TIMEOUT_MS, debugLog } from '../config.js';
export async function handleConvertTask(toolArguments) {
    if (!toolArguments ||
        typeof toolArguments !== 'object' ||
        !('markdownPath' in toolArguments) ||
        typeof toolArguments.markdownPath !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required parameter: markdownPath for convert_task_markdown tool');
    }
    const markdownPath = toolArguments.markdownPath;
    const outputPath = typeof toolArguments.outputPath === 'string' ? toolArguments.outputPath : undefined;
    debugLog(`[Debug] Converting markdown task file: ${markdownPath}`);
    let stderr = '';
    try {
        const converterPath = pathResolve(__dirname, '../docs/task_converter.py');
        const result = await spawnAsync('python3', [converterPath, '--json-output', markdownPath], {
            cwd: homedir(),
            timeout: CONVERTER_TIMEOUT_MS,
        });
        const stdout = result.stdout;
        stderr = result.stderr;
        // Separate progress messages from real errors
        const stderrLines = stderr.split('\n');
        const progressMessages = stderrLines.filter((line) => line.includes('[Progress]'));
        const errorMessages = stderrLines.filter((line) => !line.includes('[Progress]') && line.trim());
        progressMessages.forEach((msg) => {
            console.error(msg);
            debugLog(msg);
        });
        if (errorMessages.length > 0) {
            stderr = errorMessages.join('\n');
            debugLog(`[Debug] Task converter stderr: ${stderr}`);
        }
        if (stderr && stderr.includes('Markdown format validation failed')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'error',
                            error: 'Markdown format validation failed',
                            details: stderr,
                            helpUrl: 'https://github.com/grahama1970/claude-code-mcp/blob/main/README.md#markdown-task-file-format',
                        }, null, 2),
                    },
                ],
            };
        }
        const tasks = JSON.parse(stdout);
        if (outputPath) {
            await fs.writeFile(outputPath, JSON.stringify(tasks, null, 2));
            debugLog(`[Debug] Saved converted tasks to: ${outputPath}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ status: 'success', tasksCount: tasks.length, outputPath: outputPath || 'none', tasks }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('JSON') && stderr) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'error',
                            error: 'Task conversion failed',
                            details: stderr || errorMessage,
                            helpUrl: 'https://github.com/grahama1970/claude-code-mcp/blob/main/README.md#markdown-task-file-format',
                        }, null, 2),
                    },
                ],
            };
        }
        throw new McpError(ErrorCode.InternalError, `Failed to convert markdown tasks: ${errorMessage}`);
    }
}
