/**
 * Config tests - ported from:
 * - test_agent_config.py
 * - test_claude_path.py
 */
import { describe, it, expect } from 'vitest';
import { homedir } from 'os';
import {
  AGENT_CONFIG,
  CLAUDE_LOCAL_PATH,
  ALL_AGENT_KEYS,
  IDE_AGENTS,
  CLI_AGENTS,
} from '../../src/lib/config.js';

describe('AGENT_CONFIG', () => {
  // test_agent_config_has_15_agents
  it('should have exactly 15 agents', () => {
    expect(Object.keys(AGENT_CONFIG)).toHaveLength(15);
  });

  // test_all_keys_are_lowercase
  it('should have all lowercase keys', () => {
    for (const key of Object.keys(AGENT_CONFIG)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  // test_each_agent_has_4_fields
  it('should have 4 fields for each agent (name, folder, installUrl, requiresCli)', () => {
    for (const [key, config] of Object.entries(AGENT_CONFIG)) {
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('folder');
      expect(config).toHaveProperty('installUrl');
      expect(config).toHaveProperty('requiresCli');
      expect(typeof config.name).toBe('string');
      expect(typeof config.folder).toBe('string');
      expect(config.installUrl === null || typeof config.installUrl === 'string').toBe(true);
      expect(typeof config.requiresCli).toBe('boolean');
    }
  });

  // test_copilot_exact_values
  it('should have correct copilot config values', () => {
    expect(AGENT_CONFIG.copilot).toEqual({
      name: 'GitHub Copilot',
      folder: '.github/',
      installUrl: null,
      requiresCli: false,
    });
  });

  // test_claude_exact_values
  it('should have correct claude config values', () => {
    expect(AGENT_CONFIG.claude).toEqual({
      name: 'Claude Code',
      folder: '.claude/',
      installUrl: 'https://docs.anthropic.com/en/docs/claude-code/setup',
      requiresCli: true,
    });
  });

  // test_gemini_exact_values
  it('should have correct gemini config values', () => {
    expect(AGENT_CONFIG.gemini).toEqual({
      name: 'Gemini CLI',
      folder: '.gemini/',
      installUrl: 'https://github.com/google-gemini/gemini-cli',
      requiresCli: true,
    });
  });

  // test_cursor_agent_exact_values
  it('should have correct cursor-agent config values', () => {
    expect(AGENT_CONFIG['cursor-agent']).toEqual({
      name: 'Cursor',
      folder: '.cursor/',
      installUrl: null,
      requiresCli: false,
    });
  });

  // test_qwen_exact_values
  it('should have correct qwen config values', () => {
    expect(AGENT_CONFIG.qwen).toEqual({
      name: 'Qwen Code',
      folder: '.qwen/',
      installUrl: 'https://github.com/QwenLM/qwen-code',
      requiresCli: true,
    });
  });

  // test_opencode_exact_values
  it('should have correct opencode config values', () => {
    expect(AGENT_CONFIG.opencode).toEqual({
      name: 'opencode',
      folder: '.opencode/',
      installUrl: 'https://opencode.ai',
      requiresCli: true,
    });
  });

  // test_codex_exact_values
  it('should have correct codex config values', () => {
    expect(AGENT_CONFIG.codex).toEqual({
      name: 'Codex CLI',
      folder: '.codex/',
      installUrl: 'https://github.com/openai/codex',
      requiresCli: true,
    });
  });

  // test_windsurf_exact_values
  it('should have correct windsurf config values', () => {
    expect(AGENT_CONFIG.windsurf).toEqual({
      name: 'Windsurf',
      folder: '.windsurf/',
      installUrl: null,
      requiresCli: false,
    });
  });

  // test_kilocode_exact_values
  it('should have correct kilocode config values', () => {
    expect(AGENT_CONFIG.kilocode).toEqual({
      name: 'Kilo Code',
      folder: '.kilocode/',
      installUrl: null,
      requiresCli: false,
    });
  });

  // test_auggie_exact_values (folder is .augment/)
  it('should have correct auggie config values', () => {
    expect(AGENT_CONFIG.auggie).toEqual({
      name: 'Auggie CLI',
      folder: '.augment/',
      installUrl: 'https://docs.augmentcode.com/cli/setup-auggie/install-auggie-cli',
      requiresCli: true,
    });
  });

  // test_codebuddy_exact_values
  it('should have correct codebuddy config values', () => {
    expect(AGENT_CONFIG.codebuddy).toEqual({
      name: 'CodeBuddy',
      folder: '.codebuddy/',
      installUrl: 'https://www.codebuddy.ai/cli',
      requiresCli: true,
    });
  });

  // test_roo_exact_values
  it('should have correct roo config values', () => {
    expect(AGENT_CONFIG.roo).toEqual({
      name: 'Roo Code',
      folder: '.roo/',
      installUrl: null,
      requiresCli: false,
    });
  });

  // test_q_exact_values (folder is .amazonq/)
  it('should have correct q config values', () => {
    expect(AGENT_CONFIG.q).toEqual({
      name: 'Amazon Q Developer CLI',
      folder: '.amazonq/',
      installUrl: 'https://aws.amazon.com/developer/learning/q-developer-cli/',
      requiresCli: true,
    });
  });

  // test_amp_exact_values (folder is .agents/)
  it('should have correct amp config values', () => {
    expect(AGENT_CONFIG.amp).toEqual({
      name: 'Amp',
      folder: '.agents/',
      installUrl: 'https://ampcode.com/manual#install',
      requiresCli: true,
    });
  });

  // test_shai_exact_values
  it('should have correct shai config values', () => {
    expect(AGENT_CONFIG.shai).toEqual({
      name: 'SHAI',
      folder: '.shai/',
      installUrl: 'https://github.com/ovh/shai',
      requiresCli: true,
    });
  });

  // test_ide_agents_no_cli
  it('should have requiresCli=false for IDE-based agents', () => {
    for (const agent of IDE_AGENTS) {
      expect(AGENT_CONFIG[agent].requiresCli).toBe(false);
    }
  });

  // test_cli_agents_require_cli
  it('should have requiresCli=true for CLI-based agents', () => {
    for (const agent of CLI_AGENTS) {
      expect(AGENT_CONFIG[agent].requiresCli).toBe(true);
    }
  });

  // test_all_folders_start_with_dot
  it('should have all folders start with a dot', () => {
    for (const config of Object.values(AGENT_CONFIG)) {
      expect(config.folder).toMatch(/^\./);
    }
  });

  // test_all_folders_end_with_slash
  it('should have all folders end with a slash', () => {
    for (const config of Object.values(AGENT_CONFIG)) {
      expect(config.folder).toMatch(/\/$/);
    }
  });

  // test_folders_mostly_unique
  it('should have at least 12 unique folders', () => {
    const folders = new Set(Object.values(AGENT_CONFIG).map((c) => c.folder));
    expect(folders.size).toBeGreaterThanOrEqual(12);
  });

  // test_all_15_keys_present
  it('should have all 15 expected keys', () => {
    const keys = Object.keys(AGENT_CONFIG).sort();
    const expected = [...ALL_AGENT_KEYS].sort();
    expect(keys).toEqual(expected);
  });
});

describe('CLAUDE_LOCAL_PATH', () => {
  // test_claude_local_path_ends_correctly
  it('should end with .claude/local/claude', () => {
    expect(CLAUDE_LOCAL_PATH).toMatch(/\.claude[/\\]local[/\\]claude$/);
  });

  // test_claude_local_path_is_absolute
  it('should be an absolute path', () => {
    // On Windows, starts with drive letter; on Unix, starts with /
    const isAbsolute = CLAUDE_LOCAL_PATH.startsWith('/') || /^[A-Za-z]:/.test(CLAUDE_LOCAL_PATH);
    expect(isAbsolute).toBe(true);
  });

  // test_claude_local_path_from_homedir
  it('should start with the home directory', () => {
    expect(CLAUDE_LOCAL_PATH.startsWith(homedir())).toBe(true);
  });
});
