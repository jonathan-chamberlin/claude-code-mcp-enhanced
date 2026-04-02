import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve as pathResolve } from 'node:path';
import { ErrorCode, McpError, type ServerResult } from '@modelcontextprotocol/sdk/types.js';
import retry from 'async-retry';
import { spawnAsync } from '../spawn.js';
import { loadRooModes } from '../roomodes.js';
import {
  USE_ROO_MODES,
  EXECUTION_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  debugLog,
  type ClaudeCodeArgs,
} from '../config.js';

export async function handleClaudeCode(
  toolArguments: Record<string, unknown>,
  claudeCliPath: string,
): Promise<ServerResult> {
  // --- Validate and extract args ---
  if (
    !toolArguments ||
    typeof toolArguments !== 'object' ||
    !('prompt' in toolArguments) ||
    typeof toolArguments.prompt !== 'string'
  ) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Missing or invalid required parameter: prompt (must be a string) for claude_code tool',
    );
  }

  let prompt: string = toolArguments.prompt;
  const parentTaskId =
    typeof toolArguments.parentTaskId === 'string' ? toolArguments.parentTaskId : undefined;
  const returnMode: 'summary' | 'full' =
    toolArguments.returnMode === 'summary' ? 'summary' : 'full';
  const taskDescription =
    typeof toolArguments.taskDescription === 'string' ? toolArguments.taskDescription : undefined;
  const mode =
    USE_ROO_MODES && typeof toolArguments.mode === 'string' ? toolArguments.mode : undefined;

  if (parentTaskId) debugLog(`[Debug] Task has parent ID: ${parentTaskId}`);
  if (taskDescription) debugLog(`[Debug] Task description: ${taskDescription}`);
  if (mode) debugLog(`[Debug] Using Roo mode: ${mode}`);

  // --- Resolve working directory ---
  let effectiveCwd = homedir();
  if (typeof toolArguments.workFolder === 'string') {
    const resolved = pathResolve(toolArguments.workFolder);
    if (existsSync(resolved)) {
      effectiveCwd = resolved;
      debugLog(`[Debug] Using workFolder as CWD: ${effectiveCwd}`);
    } else {
      debugLog(`[Warning] Specified workFolder does not exist: ${resolved}. Using default.`);
    }
  }

  // --- Prepend boomerang context ---
  if (parentTaskId) {
    const taskContext = `
# Boomerang Task
${taskDescription ? `## Task Description\n${taskDescription}\n\n` : ''}
## Parent Task ID
${parentTaskId}

## Return Instructions
You are part of a larger workflow. After completing your task, you should ${returnMode === 'summary' ? 'provide a BRIEF SUMMARY of the results' : 'return your FULL RESULTS'}.

${returnMode === 'summary' ? 'IMPORTANT: Keep your response concise and focused on key findings/changes only!' : ''}

---

`;
    prompt = taskContext + prompt;
    debugLog(`[Debug] Prepended boomerang task context to prompt`);
  }

  // --- Build CLI args ---
  const claudeProcessArgs = ['--dangerously-skip-permissions'];

  if (USE_ROO_MODES && mode) {
    const roomodes = loadRooModes();
    if (roomodes?.customModes) {
      const selectedMode = roomodes.customModes.find((m) => m.slug === mode);
      if (selectedMode) {
        debugLog(`[Debug] Found Roo mode configuration for: ${mode}`);
        claudeProcessArgs.push('--role', selectedMode.roleDefinition);
        if (selectedMode.apiConfiguration?.modelId) {
          claudeProcessArgs.push('--model', selectedMode.apiConfiguration.modelId);
        }
      } else {
        debugLog(`[Warning] Specified Roo mode not found: ${mode}`);
      }
    }
  }

  claudeProcessArgs.push('-p', prompt);
  debugLog(`[Debug] Invoking ${claudeCliPath} with args: ${claudeProcessArgs.join(' ')}`);

  // --- Execute with retry ---
  try {
    const { stdout } = await retry(
      async (bail: (err: Error) => void, attemptNumber: number) => {
        try {
          if (attemptNumber > 1) {
            debugLog(`[Retry] Attempt ${attemptNumber}/${MAX_RETRIES + 1} for Claude CLI execution`);
          }
          return await spawnAsync(claudeCliPath, claudeProcessArgs, {
            timeout: EXECUTION_TIMEOUT_MS,
            cwd: effectiveCwd,
          });
        } catch (err: unknown) {
          const error = err as Error;
          debugLog(`[Retry] Error during attempt ${attemptNumber}/${MAX_RETRIES + 1}: ${error.message}`);

          const isTransient =
            error.message.includes('ECONNRESET') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('429') ||
            error.message.includes('500');

          if (!isTransient) {
            debugLog(`[Retry] Non-retryable error. Bailing out.`);
            bail(error);
            return { stdout: '', stderr: '' };
          }
          throw err;
        }
      },
      {
        retries: MAX_RETRIES,
        minTimeout: RETRY_DELAY_MS,
        onRetry: (err: Error, attempt: number) => {
          console.error(`[Progress] Retry attempt ${attempt}/${MAX_RETRIES} due to: ${err.message}`);
        },
      },
    );

    // --- Build output ---
    let processedOutput = stdout;

    if (parentTaskId) {
      const boomerangInfo = {
        parentTaskId,
        returnMode,
        taskDescription: taskDescription || 'Unknown task',
        completed: new Date().toISOString(),
      };
      processedOutput += `\n\n<!-- BOOMERANG_RESULT ${JSON.stringify(boomerangInfo)} -->`;
      debugLog(`[Debug] Added boomerang marker for parent task: ${parentTaskId}`);
    }

    return { content: [{ type: 'text', text: processedOutput }] };
  } catch (error: unknown) {
    const err = error as Error & { signal?: string; code?: string; stderr?: string; stdout?: string };
    debugLog('[Error] Error executing Claude CLI:', err);

    let errorMessage = err.message || 'Unknown error';
    if (err.stderr) errorMessage += `\nStderr: ${err.stderr}`;
    if (err.stdout) errorMessage += `\nStdout: ${err.stdout}`;

    if (
      err.signal === 'SIGTERM' ||
      err.message?.includes('ETIMEDOUT') ||
      err.code === 'ETIMEDOUT'
    ) {
      throw new McpError(
        ErrorCode.InternalError,
        `Claude CLI command timed out after ${EXECUTION_TIMEOUT_MS / 1000}s. Details: ${errorMessage}`,
      );
    }

    throw new McpError(ErrorCode.InternalError, `Claude CLI execution failed: ${errorMessage}`);
  }
}
