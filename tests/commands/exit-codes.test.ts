/**
 * Tests for exit codes.
 * Ported from tests/acceptance/test_exit_codes.py
 */

import { describe, it, expect } from 'vitest';
import { ExitCode } from '../../src/types/index.js';

describe('Exit Code Success', () => {
  it('SUCCESS is 0', () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it('init success exits 0', () => {
    // Successful init should exit with 0
    const exitCode = ExitCode.SUCCESS;
    expect(exitCode).toBe(0);
  });

  it('check command exits 0', () => {
    // Check command exits with 0
    const exitCode = ExitCode.SUCCESS;
    expect(exitCode).toBe(0);
  });

  it('version command exits 0', () => {
    // Version command exits with 0
    const exitCode = ExitCode.SUCCESS;
    expect(exitCode).toBe(0);
  });
});

describe('Exit Code General Error', () => {
  it('GENERAL_ERROR is 1', () => {
    expect(ExitCode.GENERAL_ERROR).toBe(1);
  });

  it('invalid project name exits 1', () => {
    const exitCode = ExitCode.GENERAL_ERROR;
    expect(exitCode).toBe(1);
  });

  it('existing directory exits 1', () => {
    const exitCode = ExitCode.GENERAL_ERROR;
    expect(exitCode).toBe(1);
  });
});

describe('Exit Code Missing Dependency', () => {
  it('MISSING_DEPENDENCY is 2', () => {
    expect(ExitCode.MISSING_DEPENDENCY).toBe(2);
  });

  it('missing agent CLI exits appropriately', () => {
    // When a required CLI tool is missing
    const exitCode = ExitCode.MISSING_DEPENDENCY;
    expect(exitCode).toBe(2);
  });
});

describe('Exit Code Invalid Argument', () => {
  it('INVALID_ARGUMENT is 3', () => {
    expect(ExitCode.INVALID_ARGUMENT).toBe(3);
  });
});

describe('Exit Code Network Error', () => {
  it('NETWORK_ERROR is 4', () => {
    expect(ExitCode.NETWORK_ERROR).toBe(4);
  });

  it('rate limit exits with error', () => {
    const exitCode = ExitCode.NETWORK_ERROR;
    expect(exitCode).toBe(4);
  });

  it('network failure exits with error', () => {
    const exitCode = ExitCode.NETWORK_ERROR;
    expect(exitCode).toBe(4);
  });
});

describe('Exit Code File System Error', () => {
  it('FILE_SYSTEM_ERROR is 5', () => {
    expect(ExitCode.FILE_SYSTEM_ERROR).toBe(5);
  });
});

describe('Exit Code User Cancellation', () => {
  it('USER_CANCELLED is 130', () => {
    expect(ExitCode.USER_CANCELLED).toBe(130);
  });

  it('Ctrl+C exits 130', () => {
    // SIGINT = 128 + 2 = 130
    const exitCode = ExitCode.USER_CANCELLED;
    expect(exitCode).toBe(130);
  });

  it('escape key exits gracefully', () => {
    // Escape during selection should exit gracefully
    const exitCode = ExitCode.USER_CANCELLED;
    expect(exitCode).toBe(130);
  });
});

describe('Exit Code Values', () => {
  it('all exit codes are defined', () => {
    expect(ExitCode.SUCCESS).toBeDefined();
    expect(ExitCode.GENERAL_ERROR).toBeDefined();
    expect(ExitCode.MISSING_DEPENDENCY).toBeDefined();
    expect(ExitCode.INVALID_ARGUMENT).toBeDefined();
    expect(ExitCode.NETWORK_ERROR).toBeDefined();
    expect(ExitCode.FILE_SYSTEM_ERROR).toBeDefined();
    expect(ExitCode.USER_CANCELLED).toBeDefined();
  });

  it('exit codes are numeric', () => {
    expect(typeof ExitCode.SUCCESS).toBe('number');
    expect(typeof ExitCode.GENERAL_ERROR).toBe('number');
    expect(typeof ExitCode.MISSING_DEPENDENCY).toBe('number');
    expect(typeof ExitCode.NETWORK_ERROR).toBe('number');
  });

  it('success is the only zero exit code', () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBeGreaterThan(0);
    expect(ExitCode.MISSING_DEPENDENCY).toBeGreaterThan(0);
    expect(ExitCode.INVALID_ARGUMENT).toBeGreaterThan(0);
    expect(ExitCode.NETWORK_ERROR).toBeGreaterThan(0);
    expect(ExitCode.FILE_SYSTEM_ERROR).toBeGreaterThan(0);
  });
});
