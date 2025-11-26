/**
 * GitHub token tests - ported from test_github_token.py
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGitHubToken, getAuthHeaders } from '../../../src/lib/github/token.js';

describe('getGitHubToken', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear relevant env vars
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  // test_cli_token_takes_precedence
  it('should prefer CLI token over environment variables', () => {
    process.env.GH_TOKEN = 'env_gh_token';
    process.env.GITHUB_TOKEN = 'env_github_token';
    expect(getGitHubToken('cli_token')).toBe('cli_token');
  });

  // test_gh_token_fallback
  it('should fall back to GH_TOKEN when no CLI arg', () => {
    process.env.GH_TOKEN = 'env_gh_token';
    process.env.GITHUB_TOKEN = 'env_github_token';
    expect(getGitHubToken()).toBe('env_gh_token');
  });

  // test_github_token_fallback
  it('should fall back to GITHUB_TOKEN when no GH_TOKEN', () => {
    process.env.GITHUB_TOKEN = 'env_github_token';
    expect(getGitHubToken()).toBe('env_github_token');
  });

  // test_no_token_returns_undefined
  it('should return undefined when no token is available', () => {
    expect(getGitHubToken()).toBeUndefined();
  });

  // test_trims_whitespace_cli
  it('should trim whitespace from CLI token', () => {
    expect(getGitHubToken('  token_with_spaces  ')).toBe('token_with_spaces');
  });

  // test_trims_whitespace_env
  it('should trim whitespace from env token', () => {
    process.env.GH_TOKEN = '  env_token_spaces  ';
    expect(getGitHubToken()).toBe('env_token_spaces');
  });

  // test_strips_newlines
  it('should strip newlines from token', () => {
    expect(getGitHubToken('token\n')).toBe('token');
    expect(getGitHubToken('token\r\n')).toBe('token');
    expect(getGitHubToken('tok\nen')).toBe('token');
  });

  // test_empty_string_undefined
  it('should return undefined for empty string', () => {
    expect(getGitHubToken('')).toBeUndefined();
  });

  // test_whitespace_only_undefined
  it('should return undefined for whitespace-only string', () => {
    expect(getGitHubToken('   ')).toBeUndefined();
    expect(getGitHubToken('\t\n')).toBeUndefined();
  });
});

describe('getAuthHeaders', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // test_auth_headers_empty_no_token
  it('should return empty object when no token', () => {
    expect(getAuthHeaders()).toEqual({});
  });

  // test_auth_headers_bearer_format
  it('should return Bearer token format', () => {
    expect(getAuthHeaders('my_token')).toEqual({
      Authorization: 'Bearer my_token',
    });
  });

  // test_auth_headers_cli_precedence
  it('should use CLI token over env in headers', () => {
    process.env.GH_TOKEN = 'env_token';
    expect(getAuthHeaders('cli_token')).toEqual({
      Authorization: 'Bearer cli_token',
    });
  });
});
