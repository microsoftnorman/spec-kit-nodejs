/**
 * Type definitions for Specify CLI
 */

export type { AgentConfig } from '../lib/config.js';
export type { RateLimitInfo } from '../lib/github/rate-limit.js';
export type { Step, StepStatus } from '../lib/ui/tracker.js';
export type { GitInitResult } from '../lib/tools/git.js';
export * from '../lib/errors.js';

/**
 * Options for the init command
 */
export interface InitOptions {
  /** AI assistant to use */
  ai?: string;
  /** Skip checks for AI agent CLI tools */
  ignoreAgentTools?: boolean;
  /** Skip git repository initialization */
  noGit?: boolean;
  /** Initialize in current directory */
  here?: boolean;
  /** Skip confirmation for non-empty directories */
  force?: boolean;
  /** Skip TLS verification (not recommended) */
  skipTls?: boolean;
  /** Show verbose debug output */
  debug?: boolean;
  /** GitHub token for API requests */
  githubToken?: string;
}

/**
 * Template metadata from GitHub release
 */
export interface TemplateMetadata {
  /** Filename of the downloaded ZIP */
  filename: string;
  /** Size of the ZIP file in bytes */
  size: number;
  /** Release version string */
  release: string;
  /** Direct download URL for the asset */
  assetUrl: string;
}

/**
 * Result of template download
 */
export interface TemplateDownloadResult {
  /** Path to the downloaded ZIP file */
  zipPath: string;
  /** Metadata about the template */
  metadata: TemplateMetadata;
}
