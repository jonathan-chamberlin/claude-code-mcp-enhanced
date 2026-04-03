import type { ChildProcess } from 'node:child_process';
import { TASK_TTL_MS, TASK_CLEANUP_INTERVAL_MS, debugLog } from './config.js';

export interface TaskState {
  readonly taskId: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly createdAt: number;
  readonly completedAt?: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: string;
  readonly promptSnippet: string;
}

const tasks = new Map<string, TaskState>();
const processes = new Map<string, ChildProcess>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function createTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createTask(taskId: string, promptSnippet: string): void {
  tasks.set(taskId, {
    taskId,
    status: 'running',
    createdAt: Date.now(),
    stdout: '',
    stderr: '',
    promptSnippet: promptSnippet.slice(0, 100),
  });
  debugLog(`[TaskStore] Created task ${taskId}`);
}

export function registerProcess(taskId: string, child: ChildProcess): void {
  processes.set(taskId, child);
}

export function appendOutput(taskId: string, stdoutChunk: string): void {
  const task = tasks.get(taskId);
  if (task) {
    tasks.set(taskId, { ...task, stdout: task.stdout + stdoutChunk });
  }
}

export function completeTask(taskId: string, stdout: string, stderr: string): void {
  const task = tasks.get(taskId);
  if (task) {
    tasks.set(taskId, {
      ...task,
      status: 'completed',
      completedAt: Date.now(),
      stdout,
      stderr,
    });
    processes.delete(taskId);
    debugLog(`[TaskStore] Task ${taskId} completed`);
  }
}

export function failTask(taskId: string, error: string, stdout: string, stderr: string): void {
  const task = tasks.get(taskId);
  if (task) {
    tasks.set(taskId, {
      ...task,
      status: 'failed',
      completedAt: Date.now(),
      error,
      stdout,
      stderr,
    });
    processes.delete(taskId);
    debugLog(`[TaskStore] Task ${taskId} failed: ${error}`);
  }
}

export function getTask(taskId: string): TaskState | undefined {
  const task = tasks.get(taskId);
  return task ? { ...task } : undefined;
}

export function getRunningTaskCount(): number {
  let count = 0;
  for (const task of tasks.values()) {
    if (task.status === 'running') count++;
  }
  return count;
}

export function cleanupExpiredTasks(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [taskId, task] of tasks) {
    if (now - task.createdAt > TASK_TTL_MS) {
      tasks.delete(taskId);
      processes.delete(taskId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    debugLog(`[TaskStore] Cleaned up ${cleaned} expired task(s)`);
  }
  return cleaned;
}

export function killAllRunningTasks(): void {
  for (const [taskId, task] of tasks) {
    if (task.status === 'running') {
      const child = processes.get(taskId);
      if (child) {
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
      }
      tasks.set(taskId, {
        ...task,
        status: 'failed',
        completedAt: Date.now(),
        error: 'Server shutdown',
      });
      processes.delete(taskId);
    }
  }
}

export function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredTasks, TASK_CLEANUP_INTERVAL_MS);
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/** Reset all state — for testing only */
export function _resetForTesting(): void {
  tasks.clear();
  processes.clear();
  stopCleanupTimer();
}
