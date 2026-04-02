import { spawn } from 'node:child_process';
import { HEARTBEAT_INTERVAL_MS, debugLog } from './config.js';

/**
 * Execute a command asynchronously with heartbeat progress reporting.
 * Sends heartbeat messages to stderr at the configured interval to keep
 * the MCP connection alive during long-running operations.
 */
export async function spawnAsync(
  command: string,
  args: string[],
  options?: { timeout?: number; cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    debugLog(`[Spawn] Running command: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      shell: false,
      timeout: options?.timeout,
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const executionStartTime = Date.now();
    let heartbeatCounter = 0;

    const progressReporter = setInterval(() => {
      heartbeatCounter++;
      const elapsedSeconds = Math.floor((Date.now() - executionStartTime) / 1000);
      const heartbeatMessage = `[Progress] Claude Code execution in progress: ${elapsedSeconds}s elapsed (heartbeat #${heartbeatCounter})`;
      console.error(heartbeatMessage);
      debugLog(heartbeatMessage);
    }, HEARTBEAT_INTERVAL_MS);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      debugLog(`[Spawn Stderr Chunk] ${data.toString()}`);
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      clearInterval(progressReporter);
      debugLog(`[Spawn Error Event] Full error object:`, error);
      let errorMessage = `Spawn error: ${error.message}`;
      if (error.path) errorMessage += ` | Path: ${error.path}`;
      if (error.syscall) errorMessage += ` | Syscall: ${error.syscall}`;
      errorMessage += `\nStderr: ${stderr.trim()}`;
      reject(new Error(errorMessage));
    });

    child.on('close', (code) => {
      clearInterval(progressReporter);
      const executionTimeMs = Date.now() - executionStartTime;
      debugLog(`[Spawn Close] Exit code: ${code}, Execution time: ${executionTimeMs}ms`);
      debugLog(`[Spawn Stderr Full] ${stderr.trim()}`);
      debugLog(`[Spawn Stdout Full] ${stdout.trim()}`);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `Command failed with exit code ${code}\nStderr: ${stderr.trim()}\nStdout: ${stdout.trim()}`
          )
        );
      }
    });
  });
}
