import { existsSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs';
import * as path from 'node:path';
import {
  USE_ROO_MODES,
  WATCH_ROO_MODES,
  CACHE_TTL_MS,
  debugLog,
  type RooModesConfig,
} from './config.js';

interface RooModesManager {
  init(): void;
  load(): RooModesConfig | null;
}

export function createRooModesManager(): RooModesManager {
  let cache: { data: RooModesConfig; timestamp: number } | null = null;
  let watcher: FSWatcher | null = null;

  function init(): void {
    if (!USE_ROO_MODES || !WATCH_ROO_MODES) return;

    const roomodesPath = path.join(process.cwd(), '.roomodes');
    if (!existsSync(roomodesPath)) {
      console.error(`[Warning] Cannot watch .roomodes file as it doesn't exist at: ${roomodesPath}`);
      return;
    }

    try {
      watcher = watch(roomodesPath, (eventType) => {
        if (eventType === 'change') {
          cache = null;
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

  function load(): RooModesConfig | null {
    try {
      const roomodesPath = path.join(process.cwd(), '.roomodes');
      if (!existsSync(roomodesPath)) return null;

      const fileModifiedTime = statSync(roomodesPath).mtimeMs;

      if (
        cache &&
        cache.timestamp > fileModifiedTime &&
        Date.now() - cache.timestamp < CACHE_TTL_MS
      ) {
        debugLog('[Debug] Using cached .roomodes configuration');
        return cache.data;
      }

      const content = readFileSync(roomodesPath, 'utf8');
      const parsedData = JSON.parse(content) as RooModesConfig;

      cache = { data: parsedData, timestamp: Date.now() };
      debugLog('[Debug] Loaded fresh .roomodes configuration');
      return parsedData;
    } catch (error) {
      debugLog('[Error] Failed to load .roomodes file:', error);
      return null;
    }
  }

  return { init, load };
}

// Default singleton for backward compatibility
const defaultManager = createRooModesManager();
export const initRooModesWatcher = defaultManager.init;
export const loadRooModes = defaultManager.load;
