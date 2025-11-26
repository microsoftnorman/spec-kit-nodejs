/**
 * Git operations tests - ported from test_git_operations.py
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
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
    expect(log).toContain('Initial commit from Speckit template');
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
});
