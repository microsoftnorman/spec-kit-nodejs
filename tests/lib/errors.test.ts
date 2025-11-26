/**
 * Tests for error classes and exit codes.
 * Ported from Python test_error_messages.py
 */

import { describe, it, expect } from 'vitest';
import {
  ExitCode,
  SpecifyError,
  MissingDependencyError,
  InvalidArgumentError,
  NetworkError,
  RateLimitError,
  FileSystemError,
} from '../../src/lib/errors.js';

describe('SpecifyError', () => {
  describe('constructor', () => {
    it('should include message in error', () => {
      const error = new SpecifyError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
    });

    it('should include exit code in error', () => {
      const error = new SpecifyError('Error', ExitCode.GENERAL_ERROR);
      expect(error.exitCode).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should default to GENERAL_ERROR exit code', () => {
      const error = new SpecifyError('Error');
      expect(error.exitCode).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should include optional details', () => {
      const error = new SpecifyError('Error', ExitCode.GENERAL_ERROR, 'Details here');
      expect(error.details).toBe('Details here');
    });

    it('should set error name correctly', () => {
      const error = new SpecifyError('Error');
      expect(error.name).toBe('SpecifyError');
    });
  });
});

describe('MissingDependencyError', () => {
  it('should include dependency name in message', () => {
    const error = new MissingDependencyError('git');
    expect(error.message).toContain('git');
  });

  it('should have MISSING_DEPENDENCY exit code', () => {
    const error = new MissingDependencyError('node');
    expect(error.exitCode).toBe(ExitCode.MISSING_DEPENDENCY);
  });

  it('should include install URL in details', () => {
    const error = new MissingDependencyError('claude', 'https://example.com/install');
    expect(error.details).toContain('https://example.com/install');
  });

  it('should set error name correctly', () => {
    const error = new MissingDependencyError('tool');
    expect(error.name).toBe('MissingDependencyError');
  });
});

describe('InvalidArgumentError', () => {
  it('should include message', () => {
    const error = new InvalidArgumentError('Invalid option --foo');
    expect(error.message).toBe('Invalid option --foo');
  });

  it('should have INVALID_ARGUMENT exit code', () => {
    const error = new InvalidArgumentError('Bad arg');
    expect(error.exitCode).toBe(ExitCode.INVALID_ARGUMENT);
  });

  it('should set error name correctly', () => {
    const error = new InvalidArgumentError('Bad');
    expect(error.name).toBe('InvalidArgumentError');
  });
});

describe('NetworkError', () => {
  it('should include message', () => {
    const error = new NetworkError('Connection failed');
    expect(error.message).toBe('Connection failed');
  });

  it('should have NETWORK_ERROR exit code', () => {
    const error = new NetworkError('Timeout');
    expect(error.exitCode).toBe(ExitCode.NETWORK_ERROR);
  });

  it('should include status code', () => {
    const error = new NetworkError('Not found', 404);
    expect(error.statusCode).toBe(404);
  });

  it('should include URL', () => {
    const error = new NetworkError('Error', 500, 'https://api.github.com');
    expect(error.url).toBe('https://api.github.com');
  });

  it('should set error name correctly', () => {
    const error = new NetworkError('Error');
    expect(error.name).toBe('NetworkError');
  });
});

describe('RateLimitError', () => {
  it('should include message', () => {
    const error = new RateLimitError('Rate limit exceeded', 429, 'https://api.github.com');
    expect(error.message).toBe('Rate limit exceeded');
  });

  it('should have NETWORK_ERROR exit code', () => {
    const error = new RateLimitError('Limit', 403, 'url');
    expect(error.exitCode).toBe(ExitCode.NETWORK_ERROR);
  });

  it('should include reset time', () => {
    const resetTime = new Date('2025-01-01T00:00:00Z');
    const error = new RateLimitError('Limit', 429, 'url', resetTime);
    expect(error.resetTime).toEqual(resetTime);
  });

  it('should set error name correctly', () => {
    const error = new RateLimitError('Error', 429, 'url');
    expect(error.name).toBe('RateLimitError');
  });
});

describe('FileSystemError', () => {
  it('should include message', () => {
    const error = new FileSystemError('Cannot write file');
    expect(error.message).toBe('Cannot write file');
  });

  it('should have FILE_SYSTEM_ERROR exit code', () => {
    const error = new FileSystemError('Error');
    expect(error.exitCode).toBe(ExitCode.FILE_SYSTEM_ERROR);
  });

  it('should include path', () => {
    const error = new FileSystemError('Not found', '/path/to/file');
    expect(error.path).toBe('/path/to/file');
  });

  it('should set error name correctly', () => {
    const error = new FileSystemError('Error');
    expect(error.name).toBe('FileSystemError');
  });
});
