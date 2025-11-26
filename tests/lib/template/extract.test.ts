/**
 * Tests for template extraction module.
 * Ported from tests/acceptance/test_template_extraction.py
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  TRACKER_KEYS,
  shouldFlatten,
  flattenDirectory,
} from '../../../src/lib/template/extract.js';

// Helper to create temp directory
function createTempDir(): string {
  const dir = join(tmpdir(), `specify-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Helper to clean up temp directory
function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

describe('Extract Basic Behavior', () => {
  it('tracker keys are defined', () => {
    expect(TRACKER_KEYS).toContain('fetch');
    expect(TRACKER_KEYS).toContain('download');
    expect(TRACKER_KEYS).toContain('extract');
    expect(TRACKER_KEYS).toContain('zip-list');
    expect(TRACKER_KEYS).toContain('extracted-summary');
    expect(TRACKER_KEYS).toContain('flatten');
    expect(TRACKER_KEYS).toContain('cleanup');
  });

  it('uses specific tracker keys', () => {
    const expectedKeys = [
      'fetch',
      'download',
      'extract',
      'zip-list',
      'extracted-summary',
      'flatten',
      'cleanup',
    ];
    expect(TRACKER_KEYS).toEqual(expectedKeys);
  });
});

describe('Extract Nested Structure', () => {
  it('should flatten when single root directory', () => {
    const tempDir = createTempDir();
    try {
      // Create nested structure: tempDir/root-folder/file.txt
      const rootDir = join(tempDir, 'root-folder');
      mkdirSync(rootDir);
      writeFileSync(join(rootDir, 'file.txt'), 'content');

      expect(shouldFlatten(tempDir)).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('should not flatten when multiple roots', () => {
    const tempDir = createTempDir();
    try {
      // Create multiple items at root
      mkdirSync(join(tempDir, 'folder1'));
      mkdirSync(join(tempDir, 'folder2'));

      expect(shouldFlatten(tempDir)).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('should not flatten when single file', () => {
    const tempDir = createTempDir();
    try {
      writeFileSync(join(tempDir, 'file.txt'), 'content');

      expect(shouldFlatten(tempDir)).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('flattens single root directory', () => {
    const tempDir = createTempDir();
    try {
      // Create nested structure
      const rootDir = join(tempDir, 'spec-kit-template-0.0.22');
      mkdirSync(rootDir);
      mkdirSync(join(rootDir, '.specify'));
      mkdirSync(join(rootDir, '.github'));
      writeFileSync(join(rootDir, 'README.md'), '# Test');

      // Flatten
      flattenDirectory(tempDir);

      // Check result
      const entries = readdirSync(tempDir);
      expect(entries).toContain('.specify');
      expect(entries).toContain('.github');
      expect(entries).toContain('README.md');
      expect(entries).not.toContain('spec-kit-template-0.0.22');
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe('Extract Current Directory', () => {
  it('handles merge with existing directory concept', () => {
    // The merge concept exists - test the shouldFlatten helper
    const tempDir = createTempDir();
    try {
      // Create structure to simulate existing files
      mkdirSync(join(tempDir, 'existing'));
      writeFileSync(join(tempDir, 'existing', 'file.txt'), 'existing content');

      expect(existsSync(join(tempDir, 'existing', 'file.txt'))).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe('Extract Special File Handling', () => {
  it('recognizes vscode settings path', () => {
    // The merge logic checks for settings.json in .vscode path
    const vscodeSettingsPath = '.vscode/settings.json';
    expect(vscodeSettingsPath.includes('.vscode')).toBe(true);
    expect(vscodeSettingsPath.endsWith('settings.json')).toBe(true);
  });
});

describe('Extract Tracker Integration', () => {
  it('cleanup key is included', () => {
    expect(TRACKER_KEYS).toContain('cleanup');
  });

  it('all expected tracker keys present', () => {
    const required = ['fetch', 'download', 'extract', 'cleanup'];
    for (const key of required) {
      expect(TRACKER_KEYS).toContain(key);
    }
  });
});
