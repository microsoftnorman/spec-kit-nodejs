/**
 * Template extraction module - extracts ZIP templates to project directories.
 */

import { existsSync, mkdirSync, rmSync, readdirSync, statSync, renameSync, copyFileSync, unlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import type { StepTracker } from '../ui/tracker.js';
import { mergeJsonFiles } from './merge.js';

/**
 * Tracker keys used during extraction.
 */
export const TRACKER_KEYS = [
  'fetch',
  'download',
  'extract',
  'zip-list',
  'extracted-summary',
  'flatten',
  'cleanup',
] as const;

/**
 * Extract options.
 */
export interface ExtractOptions {
  here?: boolean;
  verbose?: boolean;
  tracker?: StepTracker;
}

/**
 * Check if a ZIP has a single root directory that should be flattened.
 */
export function shouldFlatten(extractedDir: string): boolean {
  const entries = readdirSync(extractedDir);
  if (entries.length !== 1) {
    return false;
  }
  const firstEntry = entries[0];
  if (!firstEntry) {
    return false;
  }
  const firstPath = join(extractedDir, firstEntry);
  return statSync(firstPath).isDirectory();
}

/**
 * Flatten a single root directory by moving its contents up.
 */
export function flattenDirectory(extractedDir: string): void {
  const entries = readdirSync(extractedDir);
  if (entries.length !== 1 || !entries[0]) {
    return;
  }

  const rootDir = join(extractedDir, entries[0]);
  const rootContents = readdirSync(rootDir);

  // Move each item up
  for (const item of rootContents) {
    const srcPath = join(rootDir, item);
    const destPath = join(extractedDir, item);
    renameSync(srcPath, destPath);
  }

  // Remove the now-empty root directory
  rmSync(rootDir, { recursive: true });
}

/**
 * Merge template contents with existing directory.
 */
export async function mergeWithExisting(
  srcDir: string,
  destDir: string,
  options?: { tracker?: StepTracker }
): Promise<void> {
  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Create directory if it doesn't exist
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      // Recursively merge
      await mergeWithExisting(srcPath, destPath, options);
    } else {
      // Special handling for .vscode/settings.json
      if (entry.name === 'settings.json' && srcPath.includes('.vscode')) {
        // Read the new content from source file
        const newContent = JSON.parse(readFileSync(srcPath, 'utf-8')) as Record<string, unknown>;
        // Merge with existing or use new if doesn't exist
        const merged = mergeJsonFiles(destPath, newContent);
        // Ensure parent directory exists
        const parentDir = dirname(destPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }
        // Write the merged content
        writeFileSync(destPath, JSON.stringify(merged, null, 2) + '\n');
      } else {
        // Ensure parent directory exists
        const parentDir = dirname(destPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }
        // Copy file (overwrites existing)
        copyFileSync(srcPath, destPath);
      }
    }
  }
}

/**
 * Extract a ZIP template to a project directory.
 * 
 * @param zipPath - Path to the ZIP file
 * @param destPath - Destination directory
 * @param options - Extract options
 */
export async function extractTemplate(
  zipPath: string,
  destPath: string,
  options?: ExtractOptions
): Promise<void> {
  const { here, tracker } = options ?? {};

  tracker?.start('extract', 'Extracting template...');

  // Import adm-zip dynamically
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(zipPath);

  // Create temp directory for extraction
  const tempDir = `${destPath}.temp`;
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
  mkdirSync(tempDir, { recursive: true });

  try {
    // Extract to temp directory
    tracker?.add('zip-list', 'Reading ZIP contents');
    zip.extractAllTo(tempDir, true);
    tracker?.complete('zip-list', 'ZIP contents read');

    // Flatten if needed
    if (shouldFlatten(tempDir)) {
      tracker?.add('flatten', 'Flattening directory structure');
      flattenDirectory(tempDir);
      tracker?.complete('flatten', 'Directory flattened');
    }

    tracker?.add('extracted-summary', 'Processing extracted files');

    if (here && existsSync(destPath)) {
      // Merge with existing directory
      await mergeWithExisting(tempDir, destPath, { tracker });
    } else {
      // Create destination and move contents
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      
      const entries = readdirSync(tempDir);
      for (const entry of entries) {
        const srcPath = join(tempDir, entry);
        const targetPath = join(destPath, entry);
        renameSync(srcPath, targetPath);
      }
    }

    tracker?.complete('extracted-summary', 'Files processed');

    // Cleanup temp directory
    tracker?.add('cleanup', 'Cleaning up');
    rmSync(tempDir, { recursive: true });
    
    // Remove ZIP file
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
    
    tracker?.complete('cleanup', 'Cleanup complete');
    tracker?.complete('extract', 'Template extracted');

  } catch (error) {
    // Cleanup on error
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    
    // Only remove destination if we created it (not --here mode)
    if (!here && existsSync(destPath)) {
      rmSync(destPath, { recursive: true });
    }

    tracker?.error('extract', 'Extraction failed');
    throw error;
  }
}
