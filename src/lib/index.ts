/**
 * Library exports for Specify CLI
 *
 * This barrel file provides a single import point for all shared utilities.
 */

// Common utilities (ported from common.sh / common.ps1)
export {
  getRepoRoot,
  hasGit,
  getCurrentBranch,
  checkFeatureBranch,
  findFeatureDirByPrefix,
  getFeaturePaths,
  dirHasFiles,
  type FeaturePaths,
} from './common.js';

// Configuration and constants
export {
  AGENT_CONFIG,
  SCRIPT_TYPE_CHOICES,
  getDefaultScriptType,
  CLAUDE_LOCAL_PATH,
  BANNER,
  TAGLINE,
  ALL_AGENT_KEYS,
  IDE_AGENTS,
  CLI_AGENTS,
  type AgentConfig,
} from './config.js';

// Error handling
export * from './errors.js';
