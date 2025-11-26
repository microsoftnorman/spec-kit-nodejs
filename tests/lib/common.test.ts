/**
 * Tests for lib/common.ts - shared functions for Spec-Driven Development workflow.
 * Tests the actual exported functions from the common module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Mock child_process before importing the module
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Import the actual functions after mocking
import {
  getRepoRoot,
  hasGit,
  getCurrentBranch,
  getFeaturePaths,
  checkFeatureBranch,
  findFeatureDirByPrefix,
  dirHasFiles,
  type FeaturePaths,
} from '../../src/lib/common.js';

describe('getRepoRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns git root when in a git repository', () => {
    vi.mocked(execSync).mockReturnValue('/home/user/project\n');

    const result = getRepoRoot();

    expect(result).toBe('/home/user/project');
    expect(execSync).toHaveBeenCalledWith('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  });

  it('returns trimmed path without trailing newline', () => {
    vi.mocked(execSync).mockReturnValue('  /path/to/repo  \n');

    const result = getRepoRoot();

    expect(result).toBe('/path/to/repo');
  });

  it('falls back to cwd when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = getRepoRoot();

    expect(result).toBe(process.cwd());
  });

  it('falls back to cwd when not in a git repository', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    const result = getRepoRoot();

    expect(result).toBe(process.cwd());
  });
});

describe('hasGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when in a git repository', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('/path/to/repo'));

    const result = hasGit();

    expect(result).toBe(true);
  });

  it('returns false when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = hasGit();

    expect(result).toBe(false);
  });

  it('returns false when not in a git repository', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    const result = hasGit();

    expect(result).toBe(false);
  });
});

describe('getCurrentBranch', () => {
  const originalEnv = process.env.SPECIFY_FEATURE;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPECIFY_FEATURE;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SPECIFY_FEATURE;
    } else {
      process.env.SPECIFY_FEATURE = originalEnv;
    }
  });

  it('returns SPECIFY_FEATURE env var when set', () => {
    process.env.SPECIFY_FEATURE = '005-my-feature';

    const result = getCurrentBranch();

    expect(result).toBe('005-my-feature');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('returns git branch when env var not set', () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('abbrev-ref')) {
        return 'feature-branch\n';
      }
      return '/repo\n';
    });

    const result = getCurrentBranch();

    expect(result).toBe('feature-branch');
  });

  it('trims whitespace from git branch name', () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('abbrev-ref')) {
        return '  my-branch  \n';
      }
      return '/repo\n';
    });

    const result = getCurrentBranch();

    expect(result).toBe('my-branch');
  });

  it('falls back to main when git fails and no specs dir', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = getCurrentBranch();

    expect(result).toBe('main');
  });
});

describe('getCurrentBranch with specs directory', () => {
  let tempDir: string;
  const originalEnv = process.env.SPECIFY_FEATURE;
  const originalCwd = process.cwd;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPECIFY_FEATURE;
    tempDir = join(tmpdir(), `branch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });

    // Mock cwd to return tempDir
    process.cwd = () => tempDir;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SPECIFY_FEATURE;
    } else {
      process.env.SPECIFY_FEATURE = originalEnv;
    }
    process.cwd = originalCwd;
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('finds latest feature from specs directory when git fails', () => {
    // Setup: create specs directory with features
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '001-first'), { recursive: true });
    mkdirSync(join(specsDir, '003-third'), { recursive: true });
    mkdirSync(join(specsDir, '002-second'), { recursive: true });

    // Mock git to fail
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = getCurrentBranch();

    expect(result).toBe('003-third');
  });

  it('returns main when specs dir is empty', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = getCurrentBranch();

    expect(result).toBe('main');
  });

  it('ignores non-feature directories in specs', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, 'templates'), { recursive: true });
    mkdirSync(join(specsDir, 'archive'), { recursive: true });
    mkdirSync(join(specsDir, '002-feature'), { recursive: true });

    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = getCurrentBranch();

    expect(result).toBe('002-feature');
  });
});

describe('checkFeatureBranch', () => {
  it('returns valid for feature branch pattern NNN-name', () => {
    const result = checkFeatureBranch('001-my-feature', true);

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.warning).toBeUndefined();
  });

  it('returns valid for various feature branch patterns', () => {
    const validBranches = ['001-feature', '099-test', '100-something', '999-final'];

    for (const branch of validBranches) {
      const result = checkFeatureBranch(branch, true);
      expect(result.isValid).toBe(true);
    }
  });

  it('returns error for non-feature branch in git repo', () => {
    const result = checkFeatureBranch('main', true);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Not on a feature branch');
    expect(result.error).toContain('main');
  });

  it('returns error for invalid branch patterns', () => {
    const invalidBranches = ['develop', 'feature/test', '1-short', 'no-number'];

    for (const branch of invalidBranches) {
      const result = checkFeatureBranch(branch, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not on a feature branch');
    }
  });

  it('returns warning for non-git repos', () => {
    const result = checkFeatureBranch('main', false);

    expect(result.isValid).toBe(true);
    expect(result.warning).toContain('Git repository not detected');
    expect(result.warning).toContain('skipped branch validation');
  });

  it('returns valid with warning for any branch in non-git repo', () => {
    const result = checkFeatureBranch('random-branch', false);

    expect(result.isValid).toBe(true);
    expect(result.warning).toBeDefined();
  });
});

describe('findFeatureDirByPrefix', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prefix-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('finds single matching directory by prefix', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-my-feature'), { recursive: true });

    const result = findFeatureDirByPrefix(tempDir, '004-fix-bug');

    expect(result).toBe(join(specsDir, '004-my-feature'));
  });

  it('allows different branches to find same spec', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-original-feature'), { recursive: true });

    const result1 = findFeatureDirByPrefix(tempDir, '004-fix-bug');
    const result2 = findFeatureDirByPrefix(tempDir, '004-add-feature');

    expect(result1).toBe(result2);
    expect(result1).toBe(join(specsDir, '004-original-feature'));
  });

  it('falls back to exact match when no prefix in branch', () => {
    const specsDir = join(tempDir, 'specs');

    const result = findFeatureDirByPrefix(tempDir, 'main');

    expect(result).toBe(join(specsDir, 'main'));
  });

  it('returns branch path when no matching prefix found', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    const result = findFeatureDirByPrefix(tempDir, '999-nonexistent');

    expect(result).toBe(join(specsDir, '999-nonexistent'));
  });

  it('handles specs directory not existing', () => {
    const result = findFeatureDirByPrefix(tempDir, '001-feature');

    expect(result).toBe(join(tempDir, 'specs', '001-feature'));
  });

  it('logs error for multiple matches with same prefix', () => {
    const specsDir = join(tempDir, 'specs');
    mkdirSync(join(specsDir, '004-feature-a'), { recursive: true });
    mkdirSync(join(specsDir, '004-feature-b'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = findFeatureDirByPrefix(tempDir, '004-something');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Multiple spec directories found with prefix '004'")
    );
    consoleSpy.mockRestore();
  });
});

describe('getFeaturePaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPECIFY_FEATURE;
  });

  it('returns all required path fields', () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('show-toplevel')) {
        return '/repo\n';
      }
      if (cmd.includes('abbrev-ref')) {
        return '001-feature\n';
      }
      return '';
    });

    const result = getFeaturePaths();

    expect(result).toHaveProperty('repoRoot');
    expect(result).toHaveProperty('currentBranch');
    expect(result).toHaveProperty('hasGit');
    expect(result).toHaveProperty('featureDir');
    expect(result).toHaveProperty('featureSpec');
    expect(result).toHaveProperty('implPlan');
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('research');
    expect(result).toHaveProperty('dataModel');
    expect(result).toHaveProperty('quickstart');
    expect(result).toHaveProperty('contractsDir');
  });

  it('constructs correct artifact paths', () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('show-toplevel')) {
        return '/repo\n';
      }
      if (cmd.includes('abbrev-ref')) {
        return '001-feature\n';
      }
      return '';
    });

    const result = getFeaturePaths();

    expect(result.featureSpec).toMatch(/spec\.md$/);
    expect(result.implPlan).toMatch(/plan\.md$/);
    expect(result.tasks).toMatch(/tasks\.md$/);
    expect(result.research).toMatch(/research\.md$/);
    expect(result.dataModel).toMatch(/data-model\.md$/);
    expect(result.quickstart).toMatch(/quickstart\.md$/);
    expect(result.contractsDir).not.toMatch(/\.md$/);
  });

  it('all paths are under feature directory', () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('show-toplevel')) {
        return '/repo\n';
      }
      if (cmd.includes('abbrev-ref')) {
        return '001-feature\n';
      }
      return '';
    });

    const result = getFeaturePaths();

    expect(result.featureSpec).toContain(result.featureDir);
    expect(result.implPlan).toContain(result.featureDir);
    expect(result.tasks).toContain(result.featureDir);
    expect(result.research).toContain(result.featureDir);
    expect(result.dataModel).toContain(result.featureDir);
    expect(result.quickstart).toContain(result.featureDir);
    expect(result.contractsDir).toContain(result.featureDir);
  });
});

describe('dirHasFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `dir-files-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false for non-existent directory', () => {
    const nonExistent = join(tempDir, 'does-not-exist');

    const result = dirHasFiles(nonExistent);

    expect(result).toBe(false);
  });

  it('returns false for empty directory', () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir);

    const result = dirHasFiles(emptyDir);

    expect(result).toBe(false);
  });

  it('returns true for directory with files', () => {
    const dirWithFiles = join(tempDir, 'with-files');
    mkdirSync(dirWithFiles);
    writeFileSync(join(dirWithFiles, 'test.txt'), 'content');

    const result = dirHasFiles(dirWithFiles);

    expect(result).toBe(true);
  });

  it('returns true for directory with subdirectories', () => {
    const dirWithSubdir = join(tempDir, 'with-subdir');
    mkdirSync(join(dirWithSubdir, 'subdir'), { recursive: true });

    const result = dirHasFiles(dirWithSubdir);

    expect(result).toBe(true);
  });

  it('returns true for directory with multiple entries', () => {
    const dir = join(tempDir, 'multiple');
    mkdirSync(dir);
    writeFileSync(join(dir, 'file1.txt'), 'content1');
    writeFileSync(join(dir, 'file2.txt'), 'content2');
    mkdirSync(join(dir, 'subdir'));

    const result = dirHasFiles(dir);

    expect(result).toBe(true);
  });
});

describe('FeaturePaths type structure', () => {
  it('interface contains all required fields', () => {
    const paths: FeaturePaths = {
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

    expect(paths.repoRoot).toBeDefined();
    expect(paths.currentBranch).toBeDefined();
    expect(typeof paths.hasGit).toBe('boolean');
    expect(paths.featureDir).toBeDefined();
    expect(paths.featureSpec).toBeDefined();
    expect(paths.implPlan).toBeDefined();
    expect(paths.tasks).toBeDefined();
    expect(paths.research).toBeDefined();
    expect(paths.dataModel).toBeDefined();
    expect(paths.quickstart).toBeDefined();
    expect(paths.contractsDir).toBeDefined();
  });
});
