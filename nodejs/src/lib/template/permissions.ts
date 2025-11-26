/**
 * Script permissions module - sets execute permissions on Unix systems.
 */

import { existsSync, readdirSync, readFileSync, statSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import type { StepTracker } from '../ui/tracker.js';

/**
 * Check if running on Windows.
 */
export function isWindows(): boolean {
  return platform() === 'win32';
}

/**
 * Check if a file has a shebang (#!) at the start.
 */
export function hasShebang(filePath: string): boolean {
  try {
    const content = readFileSync(filePath);
    return content.slice(0, 2).toString() === '#!';
  } catch {
    return false;
  }
}

/**
 * Check if a file is already executable (any execute bit set).
 */
export function isExecutable(filePath: string): boolean {
  const stat = statSync(filePath);
  return (stat.mode & 0o111) !== 0;
}

/**
 * Check if a file is a symbolic link.
 */
export function isSymlink(filePath: string): boolean {
  try {
    const stat = statSync(filePath, { throwIfNoEntry: false });
    return stat ? false : false; // statSync follows symlinks, so we need lstatSync
  } catch {
    return false;
  }
}

/**
 * Calculate new mode with execute permissions based on read permissions.
 * 
 * @param mode - Current file mode
 * @returns New mode with execute bits set
 */
export function calculateExecuteMode(mode: number): number {
  let newMode = mode;

  // Add owner execute if owner can read
  if (mode & 0o400) {
    newMode |= 0o100;
  }

  // Add group execute if group can read
  if (mode & 0o040) {
    newMode |= 0o010;
  }

  // Add others execute if others can read
  if (mode & 0o004) {
    newMode |= 0o001;
  }

  // Ensure owner can always execute
  if (!(newMode & 0o100)) {
    newMode |= 0o100;
  }

  return newMode;
}

/**
 * Find all .sh files recursively in a directory.
 */
export function findShellScripts(dir: string): string[] {
  const scripts: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.sh')) {
        scripts.push(fullPath);
      }
    }
  }

  if (existsSync(dir)) {
    walk(dir);
  }

  return scripts;
}

/**
 * Set execute permissions on shell scripts.
 * 
 * @param projectPath - Path to the project directory
 * @param tracker - Optional step tracker for progress display
 */
export function ensureExecutableScripts(
  projectPath: string,
  tracker?: StepTracker
): void {
  // Skip on Windows
  if (isWindows()) {
    tracker?.skip('chmod', 'Skipped on Windows');
    return;
  }

  const scriptsDir = join(projectPath, '.speckit', 'scripts');
  
  // Handle missing scripts directory gracefully
  if (!existsSync(scriptsDir)) {
    tracker?.skip('chmod', 'No scripts directory');
    return;
  }

  tracker?.add('chmod', 'Set script permissions recursively');
  tracker?.start('chmod', 'Setting permissions...');

  const scripts = findShellScripts(scriptsDir);
  let updated = 0;
  const failures: string[] = [];

  for (const scriptPath of scripts) {
    try {
      // Skip symlinks
      const lstat = statSync(scriptPath);
      if (lstat.isSymbolicLink()) {
        continue;
      }

      // Skip files without shebang
      if (!hasShebang(scriptPath)) {
        continue;
      }

      // Skip already executable files
      if (isExecutable(scriptPath)) {
        continue;
      }

      // Calculate and set new mode
      const stat = statSync(scriptPath);
      const newMode = calculateExecuteMode(stat.mode);
      chmodSync(scriptPath, newMode);
      updated++;

    } catch (error) {
      const fileName = scriptPath.split('/').pop() ?? scriptPath;
      failures.push(`${fileName}: ${error}`);
    }
  }

  // Update tracker with results
  const detail = `${updated} updated${failures.length ? `, ${failures.length} failed` : ''}`;
  
  if (failures.length > 0) {
    tracker?.error('chmod', detail);
  } else {
    tracker?.complete('chmod', detail);
  }
}
