/**
 * Git operations module
 * Ported from Python specify_cli/__init__.py
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Check if the specified path is inside a git repository.
 *
 * @param path - Path to check (defaults to current working directory)
 * @returns True if inside a git repo, false otherwise
 */
export function isGitRepo(path?: string): boolean {
  const checkPath = path || process.cwd();

  if (!existsSync(checkPath)) {
    return false;
  }

  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: checkPath,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Result of git repository initialization
 */
export interface GitInitResult {
  success: boolean;
  error: string | null;
}

/**
 * Initialize a git repository in the specified path.
 *
 * @param projectPath - Path to initialize git repository in
 * @param quiet - If true, suppress console output (tracker handles status)
 * @returns Object with success boolean and optional error message
 */
export function initGitRepo(projectPath: string, _quiet = false): GitInitResult {
  try {
    execSync('git init', { cwd: projectPath, stdio: 'pipe' });
    execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit from Specify template"', {
      cwd: projectPath,
      stdio: 'pipe',
    });

    return { success: true, error: null };
  } catch (e) {
    const err = e as { cmd?: string; status?: number; stderr?: Buffer; stdout?: Buffer };
    let errorMsg = '';

    if (err.cmd) {
      errorMsg += `Command: ${err.cmd}\n`;
    }
    if (err.status !== undefined) {
      errorMsg += `Exit code: ${err.status}\n`;
    }
    if (err.stderr) {
      const stderr = err.stderr.toString().trim();
      if (stderr) {
        errorMsg += `Error: ${stderr}\n`;
      }
    } else if (err.stdout) {
      const stdout = err.stdout.toString().trim();
      if (stdout) {
        errorMsg += `Output: ${stdout}\n`;
      }
    }

    if (!errorMsg && e instanceof Error) {
      errorMsg = e.message;
    }

    return { success: false, error: errorMsg.trim() || 'Unknown error' };
  }
}
