/**
 * Error classes and exit codes
 * Ported from Python specify_cli/__init__.py
 */

/**
 * Exit codes for CLI operations
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  MISSING_DEPENDENCY = 2,
  INVALID_ARGUMENT = 3,
  NETWORK_ERROR = 4,
  FILE_SYSTEM_ERROR = 5,
  USER_CANCELLED = 130, // SIGINT (128 + 2)
}

/**
 * Base error class for Specify CLI errors
 */
export class SpecifyError extends Error {
  public exitCode: ExitCode;
  public details?: string;

  constructor(message: string, exitCode: ExitCode = ExitCode.GENERAL_ERROR, details?: string) {
    super(message);
    this.name = 'SpecifyError';
    this.exitCode = exitCode;
    this.details = details;
  }
}

/**
 * Error thrown when a required dependency is missing
 */
export class MissingDependencyError extends SpecifyError {
  constructor(dependency: string, installUrl?: string) {
    const details = installUrl ? `Install from: ${installUrl}` : undefined;
    super(`Required dependency '${dependency}' is not installed`, ExitCode.MISSING_DEPENDENCY, details);
    this.name = 'MissingDependencyError';
  }
}

/**
 * Error thrown when an invalid argument is provided
 */
export class InvalidArgumentError extends SpecifyError {
  constructor(message: string) {
    super(message, ExitCode.INVALID_ARGUMENT);
    this.name = 'InvalidArgumentError';
  }
}

/**
 * Error thrown when a network request fails
 */
export class NetworkError extends SpecifyError {
  public statusCode?: number;
  public url?: string;

  constructor(message: string, statusCode?: number, url?: string) {
    super(message, ExitCode.NETWORK_ERROR);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Error thrown when GitHub API rate limit is exceeded
 */
export class RateLimitError extends NetworkError {
  public resetTime?: Date;

  constructor(message: string, statusCode: number, url: string, resetTime?: Date) {
    super(message, statusCode, url);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

/**
 * Error thrown when a file system operation fails
 */
export class FileSystemError extends SpecifyError {
  public path?: string;

  constructor(message: string, path?: string) {
    super(message, ExitCode.FILE_SYSTEM_ERROR);
    this.name = 'FileSystemError';
    this.path = path;
  }
}
