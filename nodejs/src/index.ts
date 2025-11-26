/**
 * Specify CLI - Main module exports
 * Ported from Python specify_cli/__init__.py
 */

// Export configuration
export {
  AGENT_CONFIG,
  BANNER,
  TAGLINE,
  CLAUDE_LOCAL_PATH,
} from './lib/config.js';

// Export GitHub utilities
export { getGitHubToken, getAuthHeaders } from './lib/github/token.js';
export { parseRateLimitHeaders, formatRateLimitError } from './lib/github/rate-limit.js';

// Export UI utilities
export { StepTracker } from './lib/ui/tracker.js';
export { showBanner, getBannerText, getTagline } from './lib/ui/banner.js';

// Export template utilities
export { deepMerge, mergeJsonFiles } from './lib/template/merge.js';

// Export tool utilities
export { checkTool, checkToolForTracker } from './lib/tools/detect.js';
export { isGitRepo, initGitRepo } from './lib/tools/git.js';

// Export error classes
export * from './lib/errors.js';

// Export types
export type { AgentConfig } from './lib/config.js';
export type { RateLimitInfo } from './lib/github/rate-limit.js';
export type { Step, StepStatus } from './lib/ui/tracker.js';
export type { GitInitResult } from './lib/tools/git.js';
export type { InitOptions, TemplateMetadata, TemplateDownloadResult } from './types/index.js';

// Export commands
export { init } from './commands/init.js';
export { check } from './commands/check.js';
export { version } from './commands/version.js';
