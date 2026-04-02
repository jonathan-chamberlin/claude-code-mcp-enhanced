import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { debugLog } from './config.js';
/**
 * Determine the Claude CLI command/path.
 * 1. Checks ~/.claude/local/claude
 * 2. Falls back to 'claude' on PATH
 */
export function findClaudeCli() {
    debugLog('[Debug] Attempting to find Claude CLI...');
    const userPath = join(homedir(), '.claude', 'local', 'claude');
    debugLog(`[Debug] Checking for Claude CLI at local user path: ${userPath}`);
    if (existsSync(userPath)) {
        debugLog(`[Debug] Found Claude CLI at local user path: ${userPath}. Using this path.`);
        return userPath;
    }
    debugLog('[Debug] Falling back to "claude" command name, relying on spawn/PATH lookup.');
    console.warn('[Warning] Claude CLI not found at ~/.claude/local/claude. Falling back to "claude" in PATH.');
    return 'claude';
}
