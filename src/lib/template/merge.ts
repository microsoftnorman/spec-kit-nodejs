/**
 * JSON deep merge module
 * Ported from Python specify_cli/__init__.py merge_json_files
 */

import { readFileSync, existsSync } from 'fs';

/**
 * Recursively merge update dict into base dict.
 *
 * Performs a deep merge where:
 * - New keys are added
 * - Existing keys are preserved unless overwritten by new content
 * - Nested objects are merged recursively
 * - Arrays and other values are replaced (not merged)
 *
 * @param base - Base object to merge into
 * @param update - Object with updates to apply
 * @returns Merged object
 */
export function deepMerge(
  base: Record<string, unknown>,
  update: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };

  for (const [key, value] of Object.entries(update)) {
    if (
      key in result &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      // Add new key or replace existing value
      result[key] = value;
    }
  }

  return result;
}

/**
 * Merge new JSON content into existing JSON file.
 *
 * Performs a deep merge where:
 * - New keys are added
 * - Existing keys are preserved unless overwritten by new content
 * - Nested dictionaries are merged recursively
 * - Lists and other values are replaced (not merged)
 *
 * @param existingPath - Path to existing JSON file
 * @param newContent - New JSON content to merge in
 * @param verbose - Whether to print merge details (not used in Node.js version)
 * @returns Merged JSON content as object
 */
export function mergeJsonFiles(
  existingPath: string,
  newContent: Record<string, unknown>,
  _verbose = false
): Record<string, unknown> {
  // If file doesn't exist, just return new content
  if (!existsSync(existingPath)) {
    return newContent;
  }

  try {
    const fileContent = readFileSync(existingPath, 'utf-8');
    const existingContent = JSON.parse(fileContent) as Record<string, unknown>;
    return deepMerge(existingContent, newContent);
  } catch {
    // If file is invalid JSON, just use new content
    return newContent;
  }
}
