import { TASK_TTL_MS, TASK_CLEANUP_INTERVAL_MS, debugLog } from './config.js';
const tasks = new Map();
const processes = new Map();
let cleanupTimer = null;
export function createTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
export function createTask(taskId, promptSnippet) {
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
export function registerProcess(taskId, child) {
    processes.set(taskId, child);
}
export function appendOutput(taskId, stdoutChunk) {
    const task = tasks.get(taskId);
    if (task) {
        tasks.set(taskId, { ...task, stdout: task.stdout + stdoutChunk });
    }
}
export function completeTask(taskId, stdout, stderr) {
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
export function failTask(taskId, error, stdout, stderr) {
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
export function getTask(taskId) {
    const task = tasks.get(taskId);
    return task ? { ...task } : undefined;
}
export function getRunningTaskCount() {
    let count = 0;
    for (const task of tasks.values()) {
        if (task.status === 'running')
            count++;
    }
    return count;
}
export function cleanupExpiredTasks() {
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
export function killAllRunningTasks() {
    for (const [taskId, task] of tasks) {
        if (task.status === 'running') {
            const child = processes.get(taskId);
            if (child) {
                try {
                    child.kill('SIGTERM');
                }
                catch { /* ignore */ }
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
export function startCleanupTimer() {
    if (cleanupTimer)
        return;
    cleanupTimer = setInterval(cleanupExpiredTasks, TASK_CLEANUP_INTERVAL_MS);
}
export function stopCleanupTimer() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}
/** Reset all state — for testing only */
export function _resetForTesting() {
    tasks.clear();
    processes.clear();
    stopCleanupTimer();
}
