import { describe, it, expect, beforeEach } from 'vitest';
import { handleGetTaskResult } from '../../src/tools/get-task-result.js';
import {
  createTask,
  completeTask,
  failTask,
  _resetForTesting,
} from '../../src/task-store.js';

describe('handleGetTaskResult', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  it('throws when taskId is missing', () => {
    expect(() => handleGetTaskResult({})).toThrow('taskId');
  });

  it('returns not_found for unknown taskId', () => {
    const result = handleGetTaskResult({ taskId: 'nonexistent' });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.status).toBe('not_found');
  });

  it('returns running status for active task', () => {
    createTask('t1', 'test');
    const result = handleGetTaskResult({ taskId: 't1' });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.status).toBe('running');
    expect(parsed.taskId).toBe('t1');
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns completed status with output', () => {
    createTask('t1', 'test');
    completeTask('t1', 'the result', '');
    const result = handleGetTaskResult({ taskId: 't1' });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.status).toBe('completed');
    expect(parsed.output).toBe('the result');
    expect(parsed.completedAt).toBeDefined();
  });

  it('returns failed status with error', () => {
    createTask('t1', 'test');
    failTask('t1', 'something broke', '', '');
    const result = handleGetTaskResult({ taskId: 't1' });
    const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(parsed.status).toBe('failed');
    expect(parsed.error).toBe('something broke');
  });

  it('returns valid JSON in all cases', () => {
    createTask('t1', 'test');
    const result = handleGetTaskResult({ taskId: 't1' });
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
