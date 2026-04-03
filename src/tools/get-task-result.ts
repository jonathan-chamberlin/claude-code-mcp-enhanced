import type { ServerResult } from '@modelcontextprotocol/sdk/types.js';
import { requireStringParam } from '../validation.js';
import { getTask } from '../task-store.js';
import { TASK_PARTIAL_OUTPUT_LIMIT, debugLog } from '../config.js';

export function handleGetTaskResult(
  toolArguments: Record<string, unknown>,
): ServerResult {
  const taskId = requireStringParam(toolArguments, 'taskId', 'get_task_result');
  const task = getTask(taskId);

  if (!task) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ taskId, status: 'not_found', error: `No task found with ID: ${taskId}` }),
      }],
    };
  }

  const durationMs = (task.completedAt ?? Date.now()) - task.createdAt;

  if (task.status === 'running') {
    const partialOutput = task.stdout.length > TASK_PARTIAL_OUTPUT_LIMIT
      ? task.stdout.slice(-TASK_PARTIAL_OUTPUT_LIMIT)
      : task.stdout;
    debugLog(`[GetTaskResult] Task ${taskId} still running, ${durationMs}ms elapsed`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          taskId,
          status: 'running',
          createdAt: new Date(task.createdAt).toISOString(),
          durationMs,
          partialOutput: partialOutput || '(no output yet)',
        }),
      }],
    };
  }

  if (task.status === 'completed') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          taskId,
          status: 'completed',
          createdAt: new Date(task.createdAt).toISOString(),
          completedAt: new Date(task.completedAt!).toISOString(),
          durationMs,
          output: task.stdout,
        }),
      }],
    };
  }

  // status === 'failed'
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        taskId,
        status: 'failed',
        createdAt: new Date(task.createdAt).toISOString(),
        completedAt: new Date(task.completedAt!).toISOString(),
        durationMs,
        error: task.error,
        output: task.stdout || undefined,
      }),
    }],
  };
}
