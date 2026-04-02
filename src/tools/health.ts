import * as os from 'node:os';
import type { ServerResult } from '@modelcontextprotocol/sdk/types.js';
import { spawnAsync } from '../spawn.js';
import {
  DEBUG_MODE,
  HEARTBEAT_INTERVAL_MS,
  EXECUTION_TIMEOUT_MS,
  USE_ROO_MODES,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  HEALTH_CHECK_TIMEOUT_MS,
  debugLog,
} from '../config.js';

export async function handleHealth(
  claudeCliPath: string,
  packageVersion: string,
): Promise<ServerResult> {
  let claudeCliStatus = 'unknown';
  try {
    await spawnAsync(claudeCliPath, ['--version'], { timeout: HEALTH_CHECK_TIMEOUT_MS });
    claudeCliStatus = 'available';
  } catch {
    claudeCliStatus = 'unavailable';
  }

  const healthInfo = {
    status: 'ok',
    version: packageVersion,
    claudeCli: {
      path: claudeCliPath,
      status: claudeCliStatus,
    },
    config: {
      debugMode: DEBUG_MODE,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      executionTimeoutMs: EXECUTION_TIMEOUT_MS,
      useRooModes: USE_ROO_MODES,
      maxRetries: MAX_RETRIES,
      retryDelayMs: RETRY_DELAY_MS,
    },
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
        free: Math.round(os.freemem() / (1024 * 1024)) + 'MB',
      },
      uptime: Math.round(os.uptime() / 60) + ' minutes',
    },
    timestamp: new Date().toISOString(),
  };

  debugLog(`[Debug] Health check completed`);
  return { content: [{ type: 'text', text: JSON.stringify(healthInfo, null, 2) }] };
}
