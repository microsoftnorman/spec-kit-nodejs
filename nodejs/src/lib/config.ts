/**
 * Configuration and constants for Specify CLI
 * Ported from Python specify_cli/__init__.py
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /** Human-readable display name */
  name: string;
  /** Directory for agent-specific files (relative to project root) */
  folder: string;
  /** Installation documentation URL (null for IDE-based agents) */
  installUrl: string | null;
  /** Whether the agent requires a CLI tool check during initialization */
  requiresCli: boolean;
}

/**
 * Agent configuration with name, folder, install URL, and CLI tool requirement.
 * The key is the actual CLI tool name (what users type in terminal).
 */
export const AGENT_CONFIG: Record<string, AgentConfig> = {
  copilot: {
    name: 'GitHub Copilot',
    folder: '.github/',
    installUrl: null, // IDE-based, no CLI check needed
    requiresCli: false,
  },
  claude: {
    name: 'Claude Code',
    folder: '.claude/',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-code/setup',
    requiresCli: true,
  },
  gemini: {
    name: 'Gemini CLI',
    folder: '.gemini/',
    installUrl: 'https://github.com/google-gemini/gemini-cli',
    requiresCli: true,
  },
  'cursor-agent': {
    name: 'Cursor',
    folder: '.cursor/',
    installUrl: null, // IDE-based
    requiresCli: false,
  },
  qwen: {
    name: 'Qwen Code',
    folder: '.qwen/',
    installUrl: 'https://github.com/QwenLM/qwen-code',
    requiresCli: true,
  },
  opencode: {
    name: 'opencode',
    folder: '.opencode/',
    installUrl: 'https://opencode.ai',
    requiresCli: true,
  },
  codex: {
    name: 'Codex CLI',
    folder: '.codex/',
    installUrl: 'https://github.com/openai/codex',
    requiresCli: true,
  },
  windsurf: {
    name: 'Windsurf',
    folder: '.windsurf/',
    installUrl: null, // IDE-based
    requiresCli: false,
  },
  kilocode: {
    name: 'Kilo Code',
    folder: '.kilocode/',
    installUrl: null, // IDE-based
    requiresCli: false,
  },
  auggie: {
    name: 'Auggie CLI',
    folder: '.augment/',
    installUrl: 'https://docs.augmentcode.com/cli/setup-auggie/install-auggie-cli',
    requiresCli: true,
  },
  codebuddy: {
    name: 'CodeBuddy',
    folder: '.codebuddy/',
    installUrl: 'https://www.codebuddy.ai/cli',
    requiresCli: true,
  },
  roo: {
    name: 'Roo Code',
    folder: '.roo/',
    installUrl: null, // IDE-based
    requiresCli: false,
  },
  q: {
    name: 'Amazon Q Developer CLI',
    folder: '.amazonq/',
    installUrl: 'https://aws.amazon.com/developer/learning/q-developer-cli/',
    requiresCli: true,
  },
  amp: {
    name: 'Amp',
    folder: '.agents/',
    installUrl: 'https://ampcode.com/manual#install',
    requiresCli: true,
  },
  shai: {
    name: 'SHAI',
    folder: '.shai/',
    installUrl: 'https://github.com/ovh/shai',
    requiresCli: true,
  },
};

/**
 * Special path for Claude CLI after `claude migrate-installer`
 * See: https://github.com/github/spec-kit/issues/123
 * The migrate-installer command REMOVES the original executable from PATH
 * and creates an alias at ~/.claude/local/claude instead
 */
export const CLAUDE_LOCAL_PATH = join(homedir(), '.claude', 'local', 'claude');

/**
 * ASCII banner for CLI display
 */
export const BANNER = `
███████╗██████╗ ███████╗ ██████╗██╗███████╗██╗   ██╗
██╔════╝██╔══██╗██╔════╝██╔════╝██║██╔════╝╚██╗ ██╔╝
███████╗██████╔╝█████╗  ██║     ██║█████╗   ╚████╔╝ 
╚════██║██╔═══╝ ██╔══╝  ██║     ██║██╔══╝    ╚██╔╝  
███████║██║     ███████╗╚██████╗██║██║        ██║   
╚══════╝╚═╝     ╚══════╝ ╚═════╝╚═╝╚═╝        ╚═╝   
`;

/**
 * Tagline displayed under the banner
 */
export const TAGLINE = 'GitHub Spec Kit - Spec-Driven Development Toolkit JS';

/**
 * List of all expected agent keys
 */
export const ALL_AGENT_KEYS = [
  'copilot',
  'claude',
  'gemini',
  'cursor-agent',
  'qwen',
  'opencode',
  'codex',
  'windsurf',
  'kilocode',
  'auggie',
  'codebuddy',
  'roo',
  'q',
  'amp',
  'shai',
] as const;

/**
 * IDE-based agents (no CLI required)
 */
export const IDE_AGENTS = ['copilot', 'cursor-agent', 'windsurf', 'kilocode', 'roo'] as const;

/**
 * CLI-based agents (require CLI tool)
 */
export const CLI_AGENTS = [
  'claude',
  'gemini',
  'qwen',
  'opencode',
  'codex',
  'auggie',
  'codebuddy',
  'q',
  'amp',
  'shai',
] as const;
