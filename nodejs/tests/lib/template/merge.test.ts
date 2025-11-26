/**
 * JSON merge tests - ported from test_json_merge.py
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { deepMerge, mergeJsonFiles } from '../../../src/lib/template/merge.js';

describe('deepMerge', () => {
  // test_deep_merge_returns_object
  it('should return an object', () => {
    const result = deepMerge({}, {});
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  // test_adds_new_keys
  it('should add new keys', () => {
    const base = { a: 1 };
    const update = { b: 2 };
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  // test_preserves_existing_keys
  it('should preserve existing keys not in update', () => {
    const base = { a: 1, b: 2 };
    const update = { c: 3 };
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  // test_overwrites_existing_keys
  it('should overwrite existing keys with update values', () => {
    const base = { a: 1 };
    const update = { a: 2 };
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: 2 });
  });

  // test_nested_objects_merged
  it('should merge nested objects recursively', () => {
    const base = { nested: { a: 1 } };
    const update = { nested: { b: 2 } };
    const result = deepMerge(base, update);
    expect(result).toEqual({ nested: { a: 1, b: 2 } });
  });

  // test_deeply_nested_merge
  it('should handle deeply nested merges', () => {
    const base = { level1: { level2: { level3: { a: 1 } } } };
    const update = { level1: { level2: { level3: { b: 2 } } } };
    const result = deepMerge(base, update);
    expect(result).toEqual({ level1: { level2: { level3: { a: 1, b: 2 } } } });
  });

  // test_arrays_replaced_not_merged
  it('should replace arrays, not merge them', () => {
    const base = { arr: [1, 2, 3] };
    const update = { arr: [4, 5] };
    const result = deepMerge(base, update);
    expect(result).toEqual({ arr: [4, 5] });
  });

  // test_null_values_merged
  it('should handle null values', () => {
    const base = { a: 1 };
    const update = { a: null };
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: null });
  });

  // test_boolean_values_merged
  it('should handle boolean values', () => {
    const base = { flag: true };
    const update = { flag: false };
    const result = deepMerge(base, update);
    expect(result).toEqual({ flag: false });
  });

  // test_numeric_values_merged
  it('should handle numeric values', () => {
    const base = { num: 10 };
    const update = { num: 20 };
    const result = deepMerge(base, update);
    expect(result).toEqual({ num: 20 });
  });

  // test_empty_base_returns_update
  it('should return update when base is empty', () => {
    const base = {};
    const update = { a: 1, b: 2 };
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  // test_empty_update_preserves_base
  it('should preserve base when update is empty', () => {
    const base = { a: 1, b: 2 };
    const update = {};
    const result = deepMerge(base, update);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  // test_vscode_prompt_recommendations_merged
  it('should merge VS Code chat.promptFiles recommendations', () => {
    const base = {
      'chat.promptFiles': true,
      'chat.promptFilesLocations': {
        '.github/prompts': true,
      },
    };
    const update = {
      'chat.promptFilesLocations': {
        '.speckit/prompts': true,
      },
    };
    const result = deepMerge(base, update);
    expect(result).toEqual({
      'chat.promptFiles': true,
      'chat.promptFilesLocations': {
        '.github/prompts': true,
        '.speckit/prompts': true,
      },
    });
  });

  // test_vscode_terminal_auto_approve_merged
  it('should merge VS Code terminal auto-approve commands', () => {
    const base = {
      'terminal.integrated.autoApprove': ['git status'],
    };
    const update = {
      'terminal.integrated.autoApprove': ['npm test', 'npm run build'],
    };
    const result = deepMerge(base, update);
    // Arrays are replaced, not merged
    expect(result).toEqual({
      'terminal.integrated.autoApprove': ['npm test', 'npm run build'],
    });
  });

  it('should not mutate the original base object', () => {
    const base = { a: 1, nested: { b: 2 } };
    const update = { a: 10, nested: { c: 3 } };
    const original = JSON.parse(JSON.stringify(base));
    deepMerge(base, update);
    expect(base).toEqual(original);
  });
});

describe('mergeJsonFiles', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `merge-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    testFilePath = join(tempDir, 'test.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // test_nonexistent_file_returns_update
  it('should return update when file does not exist', () => {
    const newContent = { a: 1, b: 2 };
    const result = mergeJsonFiles(join(tempDir, 'nonexistent.json'), newContent);
    expect(result).toEqual(newContent);
  });

  // test_invalid_json_returns_update
  it('should return update when file has invalid JSON', () => {
    writeFileSync(testFilePath, 'not valid json {{{');
    const newContent = { a: 1 };
    const result = mergeJsonFiles(testFilePath, newContent);
    expect(result).toEqual(newContent);
  });

  it('should merge content from existing file', () => {
    writeFileSync(testFilePath, JSON.stringify({ existing: 'value' }));
    const newContent = { new: 'value' };
    const result = mergeJsonFiles(testFilePath, newContent);
    expect(result).toEqual({ existing: 'value', new: 'value' });
  });

  it('should handle nested merge with file', () => {
    writeFileSync(testFilePath, JSON.stringify({ nested: { a: 1 } }));
    const newContent = { nested: { b: 2 } };
    const result = mergeJsonFiles(testFilePath, newContent);
    expect(result).toEqual({ nested: { a: 1, b: 2 } });
  });
});
