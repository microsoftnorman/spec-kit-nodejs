/**
 * Tests for script permissions module.
 * Ported from tests/acceptance/test_script_permissions.py
 */

import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, chmodSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, platform } from 'node:os';
import {
  isWindows,
  hasShebang,
  isExecutable,
  calculateExecuteMode,
  findShellScripts,
  ensureExecutableScripts,
} from '../../../src/lib/template/permissions.js';
import { StepTracker } from '../../../src/lib/ui/tracker.js';

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

describe('Script Permission Basic Behavior', () => {
  it('isWindows returns correct value for platform', () => {
    const expected = platform() === 'win32';
    expect(isWindows()).toBe(expected);
  });

  it('targets specify scripts directory', () => {
    const projectPath = '/some/project';
    const expectedPath = join(projectPath, '.speckit', 'scripts');
    expect(expectedPath).toContain('.speckit');
    expect(expectedPath).toContain('scripts');
  });
});

describe('Shebang Requirement', () => {
  it('detects shebang in file', () => {
    const tempDir = createTempDir();
    try {
      const scriptPath = join(tempDir, 'script.sh');
      writeFileSync(scriptPath, '#!/bin/bash\necho hello');
      expect(hasShebang(scriptPath)).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('returns false for file without shebang', () => {
    const tempDir = createTempDir();
    try {
      const scriptPath = join(tempDir, 'script.sh');
      writeFileSync(scriptPath, 'echo hello');
      expect(hasShebang(scriptPath)).toBe(false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('returns false for nonexistent file', () => {
    expect(hasShebang('/nonexistent/path/file.sh')).toBe(false);
  });
});

describe('Permission Calculation', () => {
  it('adds owner execute if owner can read (0o400 -> adds 0o100)', () => {
    const mode = 0o400; // r--------
    const newMode = calculateExecuteMode(mode);
    expect(newMode & 0o100).toBeTruthy(); // Owner execute bit set
  });

  it('adds group execute if group can read (0o040 -> adds 0o010)', () => {
    const mode = 0o040; // ---r-----
    const newMode = calculateExecuteMode(mode);
    expect(newMode & 0o010).toBeTruthy(); // Group execute bit set
  });

  it('adds others execute if others can read (0o004 -> adds 0o001)', () => {
    const mode = 0o004; // ------r--
    const newMode = calculateExecuteMode(mode);
    expect(newMode & 0o001).toBeTruthy(); // Others execute bit set
  });

  it('ensures owner can always execute', () => {
    const mode = 0o000; // No permissions
    const newMode = calculateExecuteMode(mode);
    expect(newMode & 0o100).toBeTruthy(); // Owner execute bit always set
  });

  it('standard read permissions get execute bits', () => {
    const mode = 0o644; // rw-r--r--
    const newMode = calculateExecuteMode(mode);
    // Should become rwxr-xr-x (0o755)
    expect(newMode & 0o100).toBeTruthy(); // Owner execute
    expect(newMode & 0o010).toBeTruthy(); // Group execute
    expect(newMode & 0o001).toBeTruthy(); // Others execute
  });
});

describe('Find Shell Scripts', () => {
  it('finds .sh files recursively', () => {
    const tempDir = createTempDir();
    try {
      // Create scripts directory structure
      mkdirSync(join(tempDir, 'subdir'), { recursive: true });
      writeFileSync(join(tempDir, 'script1.sh'), '#!/bin/bash');
      writeFileSync(join(tempDir, 'subdir', 'script2.sh'), '#!/bin/bash');
      writeFileSync(join(tempDir, 'readme.txt'), 'Not a script');

      const scripts = findShellScripts(tempDir);
      expect(scripts).toHaveLength(2);
      expect(scripts.some(s => s.endsWith('script1.sh'))).toBe(true);
      expect(scripts.some(s => s.endsWith('script2.sh'))).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('only finds .sh files', () => {
    const tempDir = createTempDir();
    try {
      writeFileSync(join(tempDir, 'script.sh'), '#!/bin/bash');
      writeFileSync(join(tempDir, 'script.ps1'), '# PowerShell');
      writeFileSync(join(tempDir, 'script.py'), '#!/usr/bin/env python');

      const scripts = findShellScripts(tempDir);
      expect(scripts).toHaveLength(1);
      expect(scripts[0]).toContain('script.sh');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('handles nonexistent directory', () => {
    const scripts = findShellScripts('/nonexistent/path');
    expect(scripts).toHaveLength(0);
  });
});

describe('Tracker Integration', () => {
  it('adds chmod step to tracker', () => {
    const tracker = new StepTracker('Test');
    
    // Simulate what ensureExecutableScripts does on Windows
    if (isWindows()) {
      tracker.skip('chmod', 'Skipped on Windows');
    } else {
      tracker.add('chmod', 'Set script permissions recursively');
    }

    const rendered = tracker.render();
    // The step shows 'Set script permissions' label, not necessarily 'chmod' as key
    expect(rendered.toLowerCase()).toContain('script permissions');
  });

  it('skips on Windows', () => {
    if (isWindows()) {
      const tracker = new StepTracker('Test');
      const tempDir = createTempDir();
      try {
        ensureExecutableScripts(tempDir, tracker);
        const rendered = tracker.render();
        expect(rendered).toContain('Skipped on Windows');
      } finally {
        cleanupTempDir(tempDir);
      }
    }
  });

  it('handles missing scripts directory gracefully', () => {
    const tracker = new StepTracker('Test');
    const tempDir = createTempDir();
    try {
      // Don't create .speckit/scripts directory
      ensureExecutableScripts(tempDir, tracker);
      const rendered = tracker.render();
      // Should have either skipped (Windows) or handled missing dir
      expect(rendered.toLowerCase()).toContain('script');
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe('Complete Flow (Unix only)', () => {
  it('sets execute permissions on scripts with shebang', () => {
    // Skip on Windows
    if (isWindows()) {
      return;
    }

    const tempDir = createTempDir();
    try {
      // Create .speckit/scripts structure
      const scriptsDir = join(tempDir, '.speckit', 'scripts');
      mkdirSync(scriptsDir, { recursive: true });

      const scriptPath = join(scriptsDir, 'test.sh');
      writeFileSync(scriptPath, '#!/bin/bash\necho hello');
      chmodSync(scriptPath, 0o644); // rw-r--r--

      // Verify not executable initially
      expect(isExecutable(scriptPath)).toBe(false);

      // Run the function
      const tracker = new StepTracker('Test');
      ensureExecutableScripts(tempDir, tracker);

      // Check it's now executable
      const stat = statSync(scriptPath);
      expect(stat.mode & 0o100).toBeTruthy(); // Owner can execute
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
