/**
 * Tool detection module
 * Ported from Python specify_cli/__init__.py
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { CLAUDE_LOCAL_PATH } from '../config.js';
import type { StepTracker } from '../ui/tracker.js';

/**
 * Check if a tool is installed.
 *
 * @param tool - Name of the tool to check
 * @param tracker - Optional StepTracker to update with results
 * @returns True if tool is found, False otherwise
 */
export function checkTool(tool: string, tracker?: StepTracker): boolean {
  // Special handling for Claude CLI after `claude migrate-installer`
  // See: https://github.com/github/spec-kit/issues/123
  // The migrate-installer command REMOVES the original executable from PATH
  // and creates an alias at ~/.claude/local/claude instead
  // This path should be prioritized over other claude executables in PATH
  if (tool === 'claude') {
    try {
      if (existsSync(CLAUDE_LOCAL_PATH)) {
        const stat = statSync(CLAUDE_LOCAL_PATH);
        if (stat.isFile()) {
          if (tracker) {
            tracker.complete(tool, 'available');
          }
          return true;
        }
      }
    } catch {
      // Fall through to regular path check
    }
  }

  // Use 'where' on Windows, 'which' on Unix
  const cmd = process.platform === 'win32' ? `where ${tool}` : `which ${tool}`;

  try {
    execSync(cmd, { stdio: 'ignore' });
    if (tracker) {
      tracker.complete(tool, 'available');
    }
    return true;
  } catch {
    if (tracker) {
      tracker.error(tool, 'not found');
    }
    return false;
  }
}

/**
 * Check for a tool and update tracker with results.
 * Alias for checkTool that always requires a tracker.
 *
 * @param tool - Name of the tool to check
 * @param installUrl - URL for installation instructions (not used, for compatibility)
 * @param tracker - StepTracker to update with results
 * @returns True if tool is found, False otherwise
 */
export function checkToolForTracker(
  tool: string,
  _installUrl: string,
  tracker: StepTracker
): boolean {
  return checkTool(tool, tracker);
}
