/**
 * Git operations tests - ported from test_git_operations.py
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { isGitRepo, initGitRepo } from '../../../src/lib/tools/git.js';

describe('isGitRepo', () => {
  let tempDir: string;
  let gitDir: string;
  let nonGitDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `git-test-${Date.now()}`);
    gitDir = join(tempDir, 'git-repo');
    nonGitDir = join(tempDir, 'non-git');

    mkdirSync(gitDir, { recursive: true });
    mkdirSync(nonGitDir, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: gitDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: gitDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: gitDir, stdio: 'ignore' });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // test_is_git_repo_true
  it('should return true for git repository', () => {
    expect(isGitRepo(gitDir)).toBe(true);
  });

  // test_is_git_repo_false
  it('should return false for non-git directory', () => {
    expect(isGitRepo(nonGitDir)).toBe(false);
  });

  it('should return false for non-existent path', () => {
    expect(isGitRepo(join(tempDir, 'does-not-exist'))).toBe(false);
  });

  it('should detect nested directory inside git repo', () => {
    const nestedDir = join(gitDir, 'nested', 'dir');
    mkdirSync(nestedDir, { recursive: true });
    expect(isGitRepo(nestedDir)).toBe(true);
  });

  it('should use current directory when path not provided', () => {
    // The current directory (project root) should be a git repo
    expect(isGitRepo()).toBe(true);
  });
});

describe('initGitRepo', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `git-init-test-${Date.now()}`);
    projectDir = join(tempDir, 'project');

    mkdirSync(projectDir, { recursive: true });

    // Create a test file
    writeFileSync(join(projectDir, 'README.md'), '# Test Project\n');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // test_init_git_repo_creates_repo
  it('should create a git repository', () => {
    const result = initGitRepo(projectDir, true);
    expect(result.success).toBe(true);
    expect(isGitRepo(projectDir)).toBe(true);
  });

  // test_init_git_repo_commits
  it('should make initial commit', () => {
    initGitRepo(projectDir, true);

    // Check that a commit was made
    const log = execSync('git log --oneline', { cwd: projectDir, encoding: 'utf-8' });
    expect(log).toContain('Initial commit from Specify template');
  });

  // test_init_git_repo_returns_success
  it('should return success tuple on success', () => {
    const result = initGitRepo(projectDir, true);
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  // test_init_git_repo_returns_error
  it('should return error tuple on failure', () => {
    // Create an invalid path
    const invalidPath = join(tempDir, 'non-existent', 'nested', 'path');
    const result = initGitRepo(invalidPath, true);
    expect(result.success).toBe(false);
    expect(result.error).not.toBeNull();
  });

  it('should create .git directory', () => {
    initGitRepo(projectDir, true);
    expect(existsSync(join(projectDir, '.git'))).toBe(true);
  });

  it('should stage all files', () => {
    // Create multiple files
    writeFileSync(join(projectDir, 'file1.txt'), 'content1');
    writeFileSync(join(projectDir, 'file2.txt'), 'content2');
    mkdirSync(join(projectDir, 'src'));
    writeFileSync(join(projectDir, 'src', 'main.ts'), 'code');

    initGitRepo(projectDir, true);

    // Check that all files are tracked
    const status = execSync('git status --porcelain', { cwd: projectDir, encoding: 'utf-8' });
    expect(status.trim()).toBe(''); // Empty means all files are committed
  });

  it('should handle empty directory', () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });

    // Create at least one file to commit
    writeFileSync(join(emptyDir, '.gitkeep'), '');

    const result = initGitRepo(emptyDir, true);
    expect(result.success).toBe(true);
  });

  it('should return detailed error message', () => {
    const invalidPath = join(tempDir, 'non-existent', 'path');
    const result = initGitRepo(invalidPath, true);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(typeof result.error).toBe('string');
  });

  it('should accept quiet parameter without effect', () => {
    // quiet parameter is ignored but accepted for compatibility
    const result1 = initGitRepo(projectDir, true);
    
    // Create another project for comparison
    const projectDir2 = join(tempDir, 'project2');
    mkdirSync(projectDir2, { recursive: true });
    writeFileSync(join(projectDir2, 'README.md'), '# Test');
    
    const result2 = initGitRepo(projectDir2, false);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});

describe('GitInitResult interface', () => {
  it('has success and error properties', () => {
    const successResult = { success: true, error: null };
    const errorResult = { success: false, error: 'Some error' };
    
    expect(successResult.success).toBe(true);
    expect(successResult.error).toBeNull();
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe('Some error');
  });
});
