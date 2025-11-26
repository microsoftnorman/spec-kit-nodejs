/**
 * Test setup file for Vitest
 * Provides common utilities and mocks for tests
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Restore all mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Helper to capture stdout output during a test
 */
export function captureStdout(): { getOutput: () => string; restore: () => void } {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    chunks.push(chunk.toString());
    return true;
  };

  return {
    getOutput: () => chunks.join(''),
    restore: () => {
      process.stdout.write = originalWrite;
    },
  };
}

/**
 * Helper to capture stderr output during a test
 */
export function captureStderr(): { getOutput: () => string; restore: () => void } {
  const chunks: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);

  process.stderr.write = (chunk: string | Uint8Array): boolean => {
    chunks.push(chunk.toString());
    return true;
  };

  return {
    getOutput: () => chunks.join(''),
    restore: () => {
      process.stderr.write = originalWrite;
    },
  };
}

/**
 * Helper to set environment variables for a test and restore them after
 */
export function mockEnv(vars: Record<string, string | undefined>): () => void {
  const originalEnv: Record<string, string | undefined> = {};

  for (const key of Object.keys(vars)) {
    originalEnv[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }

  return () => {
    for (const key of Object.keys(vars)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  };
}

/**
 * Helper to clear all environment variables related to GitHub tokens
 */
export function clearEnv(): () => void {
  return mockEnv({
    GH_TOKEN: undefined,
    GITHUB_TOKEN: undefined,
  });
}
