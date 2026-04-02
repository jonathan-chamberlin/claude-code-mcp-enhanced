import { existsSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs';
import * as path from 'node:path';
import {
  USE_ROO_MODES,
  WATCH_ROO_MODES,
  CACHE_TTL_MS,
  debugLog,
  type RooModesConfig,
} from './config.js';

let roomodesCache: { data: RooModesConfig; timestamp: number } | null = null;
let watcher: FSWatcher | null = null;

/** Initialize the .roomodes file watcher if enabled. Call once at startup. */
export function initRooModesWatcher(): void {
  if (!USE_ROO_MODES || !WATCH_ROO_MODES) return;

  const roomodesPath = path.join(process.cwd(), '.roomodes');
  if (!existsSync(roomodesPath)) {
    console.error(`[Warning] Cannot watch .roomodes file as it doesn't exist at: ${roomodesPath}`);
    return;
  }

  try {
    watcher = watch(roomodesPath, (eventType) => {
      if (eventType === 'change') {
        roomodesCache = null;
        console.error(`[Info] .roomodes file changed, cache invalidated`);
      }
    });

    process.on('exit', () => {
      try { watcher?.close(); } catch { /* ignore during shutdown */ }
    });

    console.error(`[Setup] Watching .roomodes file for changes`);
  } catch (error) {
    console.error(`[Warning] Failed to set up watcher for .roomodes file:`, error);
  }
}

/** Load .roomodes configuration with file-stat-based caching. */
export function loadRooModes(): RooModesConfig | null {
  try {
    const roomodesPath = path.join(process.cwd(), '.roomodes');
    if (!existsSync(roomodesPath)) return null;

    const fileModifiedTime = statSync(roomodesPath).mtimeMs;

    if (
      roomodesCache &&
      roomodesCache.timestamp > fileModifiedTime &&
      Date.now() - roomodesCache.timestamp < CACHE_TTL_MS
    ) {
      debugLog('[Debug] Using cached .roomodes configuration');
      return roomodesCache.data;
    }

    const content = readFileSync(roomodesPath, 'utf8');
    const parsedData = JSON.parse(content) as RooModesConfig;

    roomodesCache = { data: parsedData, timestamp: Date.now() };
    debugLog('[Debug] Loaded fresh .roomodes configuration');
    return parsedData;
  } catch (error) {
    debugLog('[Error] Failed to load .roomodes file:', error);
    return null;
  }
}
