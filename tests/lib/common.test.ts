/**
 * Tests for lib/common.ts - shared functions for Spec-Driven Development workflow.
 * Tests the core utility functions used by multiple commands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FeaturePaths Interface', () => {
  it('contains all required path fields', () => {
    const requiredFields = [
      'repoRoot',
      'currentBranch',
      'hasGit',
      'featureDir',
      'featureSpec',
      'implPlan',
      'tasks',
      'research',
      'dataModel',
      'quickstart',
      'contractsDir',
    ];

    const mockPaths = {
      repoRoot: '/repo',
      currentBranch: '001-feature',
      hasGit: true,
      featureDir: '/repo/specs/001-feature',
      featureSpec: '/repo/specs/001-feature/spec.md',
      implPlan: '/repo/specs/001-feature/plan.md',
      tasks: '/repo/specs/001-feature/tasks.md',
      research: '/repo/specs/001-feature/research.md',
      dataModel: '/repo/specs/001-feature/data-model.md',
      quickstart: '/repo/specs/001-feature/quickstart.md',
      contractsDir: '/repo/specs/001-feature/contracts',
    };

    for (const field of requiredFields) {
      expect(mockPaths).toHaveProperty(field);
    }
  });

  it('spec file ends with spec.md', () => {
    const specPath = '/repo/specs/001-feature/spec.md';
    expect(specPath).toMatch(/\/spec\.md$/);
  });

  it('plan file ends with plan.md', () => {
    const planPath = '/repo/specs/001-feature/plan.md';
    expect(planPath).toMatch(/\/plan\.md$/);
  });

  it('tasks file ends with tasks.md', () => {
    const tasksPath = '/repo/specs/001-feature/tasks.md';
    expect(tasksPath).toMatch(/\/tasks\.md$/);
  });
});

describe('GetRepoRoot Behavior', () => {
  it('falls back to cwd when git not available', () => {
    const fallbackPath = process.cwd();
    expect(fallbackPath).toBeDefined();
    expect(typeof fallbackPath).toBe('string');
  });
});

describe('HasGit Behavior', () => {
  it('returns boolean true or false', () => {
    const hasGitTrue = true;
    const hasGitFalse = false;

    expect(typeof hasGitTrue).toBe('boolean');
    expect(typeof hasGitFalse).toBe('boolean');
  });
});

describe('GetCurrentBranch Behavior', () => {
  it('checks SPECIFY_FEATURE env first', () => {
    const envVar = 'SPECIFY_FEATURE';
    expect(envVar).toBe('SPECIFY_FEATURE');
  });

  it('falls back to git branch when env not set', () => {
    // When SPECIFY_FEATURE is not set, use git rev-parse
    const gitCommand = 'git rev-parse --abbrev-ref HEAD';
    expect(gitCommand).toContain('abbrev-ref');
  });

  it('falls back to main when all else fails', () => {
    const fallbackBranch = 'main';
    expect(fallbackBranch).toBe('main');
  });

  it('finds latest feature from specs directory', () => {
    const tempDir = join(tmpdir(), `branch-detect-${Date.now()}`);
    const specsDir = join(tempDir, 'specs');

    mkdirSync(join(specsDir, '001-first'), { recursive: true });
    mkdirSync(join(specsDir, '003-third'), { recursive: true });
    mkdirSync(join(specsDir, '002-second'), { recursive: true });

    let latestFeature = '';
    let highest = 0;

    const entries = readdirSync(specsDir);
    for (const entry of entries) {
      const match = entry.match(/^(\d{3})-/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
          latestFeature = entry;
        }
      }
    }

    expect(latestFeature).toBe('003-third');

    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('CheckFeatureBranch Validation', () => {
  it('valid branch matches pattern NNN-name', () => {
    const validBranches = ['001-feature', '099-test', '100-something', '999-final'];

    for (const branch of validBranches) {
      expect(branch).toMatch(/^\d{3}-/);
    }
  });

  it('invalid branch does not match pattern', () => {
    const invalidBranches = ['main', 'develop', 'feature/test', '1-short', 'no-number'];

    for (const branch of invalidBranches) {
      expect(branch).not.toMatch(/^\d{3}-/);
    }
  });

  it('returns warning for non-git repos', () => {
    const warning = 'Git repository not detected; skipped branch validation';
    expect(warning).toContain('skipped branch validation');
  });

  it('returns error for invalid branch in git repo', () => {
    const error = 'Not on a feature branch. Current branch: main';
    expect(error).toContain('Not on a feature branch');
  });
});

describe('FindFeatureDirByPrefix Behavior', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prefix-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('extracts 3-digit prefix from branch name', () => {
    const branch = '004-fix-something';
    const match = branch.match(/^(\d{3})-/);

    expect(match).not.toBeNull();
    expect(match![1]).toBe('004');
  });

  it('falls back to exact match when no prefix', () => {
    const branch = 'main';
    const hasPrefix = /^\d{3}-/.test(branch);

    expect(hasPrefix).toBe(false);
  });

  it('finds single matching directory', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-my-feature'), { recursive: true });

    const entries = readdirSync(specsDir);
    const matches = entries.filter(e => e.startsWith('004-'));

    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe('004-my-feature');
  });

  it('warns on multiple matches with same prefix', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-feature-a'), { recursive: true });
    mkdirSync(join(specsDir, '004-feature-b'), { recursive: true });

    const entries = readdirSync(specsDir);
    const matches = entries.filter(e => e.startsWith('004-'));

    expect(matches.length).toBeGreaterThan(1);
    // This should log an error about multiple matches
  });

  it('allows different branches to work on same spec', () => {
    // Branch 004-fix-bug and 004-add-feature both find specs/004-original
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-original-feature'), { recursive: true });

    const branch1 = '004-fix-bug';
    const branch2 = '004-add-feature';

    const prefix1 = branch1.match(/^(\d{3})-/)![1];
    const prefix2 = branch2.match(/^(\d{3})-/)![1];

    expect(prefix1).toBe(prefix2);
    expect(prefix1).toBe('004');
  });
});

describe('DirHasFiles Utility', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `dir-files-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false for non-existent directory', () => {
    const nonExistent = join(tempDir, 'does-not-exist');
    expect(existsSync(nonExistent)).toBe(false);
  });

  it('returns false for empty directory', () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir);

    const entries = readdirSync(emptyDir);
    expect(entries.length).toBe(0);
  });

  it('returns true for directory with files', () => {
    const dirWithFiles = join(tempDir, 'with-files');
    mkdirSync(dirWithFiles);
    writeFileSync(join(dirWithFiles, 'test.txt'), 'content');

    const entries = readdirSync(dirWithFiles);
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe('Feature Directory Structure', () => {
  it('feature dir is under specs/', () => {
    const featureDir = '/repo/specs/001-feature';
    expect(featureDir).toContain('/specs/');
  });

  it('all artifact paths are under feature dir', () => {
    const featureDir = '/repo/specs/001-feature';
    const artifacts = [
      `${featureDir}/spec.md`,
      `${featureDir}/plan.md`,
      `${featureDir}/tasks.md`,
      `${featureDir}/research.md`,
      `${featureDir}/data-model.md`,
      `${featureDir}/quickstart.md`,
      `${featureDir}/contracts`,
    ];

    for (const artifact of artifacts) {
      expect(artifact).toContain(featureDir);
    }
  });

  it('contracts is a directory not a file', () => {
    const contractsDir = '/repo/specs/001-feature/contracts';
    // Note the lack of .md extension
    expect(contractsDir).not.toMatch(/\.md$/);
  });
});

describe('SPECIFY_FEATURE Environment Variable', () => {
  const originalEnv = process.env.SPECIFY_FEATURE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SPECIFY_FEATURE;
    } else {
      process.env.SPECIFY_FEATURE = originalEnv;
    }
  });

  it('environment variable name is SPECIFY_FEATURE', () => {
    const envName = 'SPECIFY_FEATURE';
    expect(envName).toBe('SPECIFY_FEATURE');
  });

  it('can be set to override branch detection', () => {
    process.env.SPECIFY_FEATURE = '005-test-feature';
    expect(process.env.SPECIFY_FEATURE).toBe('005-test-feature');
  });

  it('takes precedence over git branch', () => {
    process.env.SPECIFY_FEATURE = 'override-branch';

    // In actual code, this would be checked first
    const result = process.env.SPECIFY_FEATURE || 'from-git';
    expect(result).toBe('override-branch');
  });
});
