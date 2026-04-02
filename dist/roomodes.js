import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import * as path from 'node:path';
import { USE_ROO_MODES, WATCH_ROO_MODES, CACHE_TTL_MS, debugLog, } from './config.js';
let roomodesCache = null;
let watcher = null;
/** Initialize the .roomodes file watcher if enabled. Call once at startup. */
export function initRooModesWatcher() {
    if (!USE_ROO_MODES || !WATCH_ROO_MODES)
        return;
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
            try {
                watcher?.close();
            }
            catch { /* ignore during shutdown */ }
        });
        console.error(`[Setup] Watching .roomodes file for changes`);
    }
    catch (error) {
        console.error(`[Warning] Failed to set up watcher for .roomodes file:`, error);
    }
}
/** Load .roomodes configuration with file-stat-based caching. */
export function loadRooModes() {
    try {
        const roomodesPath = path.join(process.cwd(), '.roomodes');
        if (!existsSync(roomodesPath))
            return null;
        const fileModifiedTime = statSync(roomodesPath).mtimeMs;
        if (roomodesCache &&
            roomodesCache.timestamp > fileModifiedTime &&
            Date.now() - roomodesCache.timestamp < CACHE_TTL_MS) {
            debugLog('[Debug] Using cached .roomodes configuration');
            return roomodesCache.data;
        }
        const content = readFileSync(roomodesPath, 'utf8');
        const parsedData = JSON.parse(content);
        roomodesCache = { data: parsedData, timestamp: Date.now() };
        debugLog('[Debug] Loaded fresh .roomodes configuration');
        return parsedData;
    }
    catch (error) {
        debugLog('[Error] Failed to load .roomodes file:', error);
        return null;
    }
}
