/**
 * Tests for lib/template/builtin.ts - Built-in template generation for JavaScript script type.
 * Tests the template generation functions used when --script js is selected.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  generateBuiltinTemplates,
  shouldUseBuiltinTemplates,
  type GenerateBuiltinOptions,
} from '../../../src/lib/template/builtin.js';

describe('shouldUseBuiltinTemplates', () => {
  it('returns true for js script type', () => {
    expect(shouldUseBuiltinTemplates('js')).toBe(true);
  });

  it('returns false for sh script type', () => {
    expect(shouldUseBuiltinTemplates('sh')).toBe(false);
  });

  it('returns false for ps script type', () => {
    expect(shouldUseBuiltinTemplates('ps')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(shouldUseBuiltinTemplates('')).toBe(false);
  });

  it('returns false for other values', () => {
    expect(shouldUseBuiltinTemplates('python')).toBe(false);
    expect(shouldUseBuiltinTemplates('ruby')).toBe(false);
  });
});

describe('generateBuiltinTemplates', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `builtin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('directory creation', () => {
    it('creates .specify/templates directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const specifyDir = join(tempDir, '.specify', 'templates');
      expect(existsSync(specifyDir)).toBe(true);
    });

    it('creates memory directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const memoryDir = join(tempDir, 'memory');
      expect(existsSync(memoryDir)).toBe(true);
    });

    it('creates specs directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const specsDir = join(tempDir, 'specs');
      expect(existsSync(specsDir)).toBe(true);
    });

    it('creates .vscode directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const vscodeDir = join(tempDir, '.vscode');
      expect(existsSync(vscodeDir)).toBe(true);
    });

    it('creates agent-specific directory for copilot', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const agentDir = join(tempDir, '.github', 'agents');
      expect(existsSync(agentDir)).toBe(true);
    });

    it('creates agent-specific directory for claude', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const agentDir = join(tempDir, '.claude', 'commands');
      expect(existsSync(agentDir)).toBe(true);
    });

    it('creates agent-specific directory for cursor-agent', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'cursor-agent' });

      const agentDir = join(tempDir, '.cursor', 'commands');
      expect(existsSync(agentDir)).toBe(true);
    });
  });

  describe('template file generation', () => {
    it('creates spec-template.md', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'templates', 'spec-template.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Feature Specification');
    });

    it('creates plan-template.md', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'templates', 'plan-template.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Implementation Plan');
    });

    it('creates tasks-template.md', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'templates', 'tasks-template.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      // Template may come from actual templates dir or fallback
      expect(content).toMatch(/Tasks|Task list/i);
    });

    it('creates checklist-template.md', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'templates', 'checklist-template.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      // Template may come from actual templates dir or fallback
      expect(content).toMatch(/Checklist/i);
    });

    it('creates agent-file-template.md', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'templates', 'agent-file-template.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      // Template may come from actual templates dir or fallback
      expect(content).toMatch(/Development Guidelines|Agent Context/i);
    });
  });

  describe('constitution generation', () => {
    it('creates constitution.md in memory directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, 'memory', 'constitution.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('creates constitution.md in .specify/memory directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.specify', 'memory', 'constitution.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('constitution contains expected structure', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(join(tempDir, 'memory', 'constitution.md'), 'utf-8');
      // Check for template content or actual constitution content
      expect(content).toContain('Constitution');
      expect(content).toContain('Core Principles');
    });
  });

  describe('VS Code settings', () => {
    it('creates settings.json in .vscode directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.vscode', 'settings.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('settings.json contains chat settings', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(join(tempDir, '.vscode', 'settings.json'), 'utf-8');
      const settings = JSON.parse(content);
      
      // Check for prompt file recommendations
      expect(settings['chat.promptFilesRecommendations']).toBeDefined();
      expect(settings['chat.promptFilesRecommendations']['speckit.specify']).toBe(true);
    });

    it('does not overwrite existing settings.json', async () => {
      const settingsPath = join(tempDir, '.vscode', 'settings.json');
      mkdirSync(join(tempDir, '.vscode'), { recursive: true });
      writeFileSync(settingsPath, JSON.stringify({ existing: 'setting' }));

      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      expect(settings.existing).toBe('setting');
    });
  });

  describe('agent-specific files', () => {
    it('creates command files for copilot with .agent.md extension', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.github', 'agents', 'speckit.specify.agent.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('description:');
    });

    it('creates command files for claude with .md extension', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const filePath = join(tempDir, '.claude', 'commands', 'speckit.specify.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('creates command files for gemini with .toml extension', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      const filePath = join(tempDir, '.gemini', 'commands', 'speckit.specify.toml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('description =');
      expect(content).toContain('prompt = """');
    });

    it('copilot prompts directory is created with prompt files', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const promptsDir = join(tempDir, '.github', 'prompts');
      expect(existsSync(promptsDir)).toBe(true);
      
      const promptFile = join(promptsDir, 'speckit.specify.prompt.md');
      expect(existsSync(promptFile)).toBe(true);
      
      const content = readFileSync(promptFile, 'utf-8');
      expect(content).toContain('agent: speckit.specify');
    });

    it('command files contain correct script commands for js', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      expect(content).toContain('npx specify');
    });
  });

  describe('specs directory', () => {
    it('creates .gitkeep in specs directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, 'specs', '.gitkeep');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('all supported agents', () => {
    const agents = [
      { key: 'copilot', dir: '.github/agents' },
      { key: 'claude', dir: '.claude/commands' },
      { key: 'gemini', dir: '.gemini/commands' },
      { key: 'cursor-agent', dir: '.cursor/commands' },
      { key: 'qwen', dir: '.qwen/commands' },
      { key: 'opencode', dir: '.opencode/command' },
      { key: 'codex', dir: '.codex/prompts' },
      { key: 'windsurf', dir: '.windsurf/workflows' },
      { key: 'kilocode', dir: '.kilocode/workflows' },
      { key: 'auggie', dir: '.augment/commands' },
      { key: 'codebuddy', dir: '.codebuddy/commands' },
      { key: 'roo', dir: '.roo/commands' },
      { key: 'q', dir: '.amazonq/prompts' },
      { key: 'amp', dir: '.agents/commands' },
      { key: 'shai', dir: '.shai/commands' },
    ];

    for (const { key, dir } of agents) {
      it(`creates correct directory for ${key}`, async () => {
        const agentTempDir = join(tmpdir(), `agent-${key}-${Date.now()}`);
        mkdirSync(agentTempDir, { recursive: true });

        try {
          await generateBuiltinTemplates(agentTempDir, { ai: key });

          const agentDir = join(agentTempDir, dir);
          expect(existsSync(agentDir)).toBe(true);
        } finally {
          rmSync(agentTempDir, { recursive: true, force: true });
        }
      });
    }
  });

  describe('debug mode', () => {
    it('logs templates directory in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await generateBuiltinTemplates(tempDir, { ai: 'copilot', debug: true });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('idempotency', () => {
    it('can be called multiple times without error', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const specifyDir = join(tempDir, '.specify', 'templates');
      expect(existsSync(specifyDir)).toBe(true);
    });
  });
});

describe('template content quality', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `content-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('spec-template has requirements section', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    const content = readFileSync(
      join(tempDir, '.specify', 'templates', 'spec-template.md'),
      'utf-8'
    );
    // Check for key sections (may be phrased differently in actual vs fallback templates)
    expect(content).toMatch(/Requirements|Functional/i);
    expect(content).toMatch(/User Stor|Scenarios/i);
    expect(content).toMatch(/Acceptance|Success Criteria/i);
  });

  it('plan-template has implementation structure', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    const content = readFileSync(
      join(tempDir, '.specify', 'templates', 'plan-template.md'),
      'utf-8'
    );
    // Check for key sections
    expect(content).toMatch(/Technical|Stack|Context/i);
    expect(content).toMatch(/Phase|Implementation|Structure/i);
  });

  it('tasks-template has task structure', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    const content = readFileSync(
      join(tempDir, '.specify', 'templates', 'tasks-template.md'),
      'utf-8'
    );
    // Check for task-related content
    expect(content).toMatch(/Phase|Task/i);
  });
});

describe('command file processing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('path rewriting', () => {
    it('rewrites memory/ to .specify/memory/ in command files', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.plan.md'),
        'utf-8'
      );
      // Should contain .specify/memory/ paths
      expect(content).toContain('.specify/memory/');
    });

    it('rewrites templates/ to .specify/templates/ in command files', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      // Should contain .specify/templates/ paths
      expect(content).toContain('.specify/templates/');
    });
  });

  describe('placeholder substitution', () => {
    it('contains npx specify commands in command files', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      expect(content).toContain('npx specify');
    });

    it('replaces __AGENT__ with agent name in plan command', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.plan.md'),
        'utf-8'
      );
      expect(content).toContain('update-agent-context claude');
      expect(content).not.toContain('__AGENT__');
    });

    it('uses $ARGUMENTS for markdown agents', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      expect(content).toContain('$ARGUMENTS');
    });

    it('uses {{args}} for TOML agents', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      const content = readFileSync(
        join(tempDir, '.gemini', 'commands', 'speckit.specify.toml'),
        'utf-8'
      );
      expect(content).toContain('{{args}}');
      expect(content).not.toContain('$ARGUMENTS');
    });
  });

  describe('frontmatter handling', () => {
    it('removes scripts section from markdown frontmatter', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      expect(content).not.toMatch(/^scripts:\s*$/m);
      expect(content).not.toContain('sh:');
      expect(content).not.toContain('ps:');
    });

    it('removes agent_scripts section from markdown frontmatter', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.plan.md'),
        'utf-8'
      );
      expect(content).not.toMatch(/^agent_scripts:\s*$/m);
    });

    it('preserves description in markdown frontmatter', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const content = readFileSync(
        join(tempDir, '.claude', 'commands', 'speckit.specify.md'),
        'utf-8'
      );
      expect(content).toContain('description:');
    });

    it('removes frontmatter entirely for TOML format', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      const content = readFileSync(
        join(tempDir, '.gemini', 'commands', 'speckit.specify.toml'),
        'utf-8'
      );
      // TOML should not have YAML frontmatter delimiters in the prompt
      const promptMatch = content.match(/prompt = """([\s\S]*?)"""/);
      expect(promptMatch).toBeTruthy();
      const promptContent = promptMatch![1];
      expect(promptContent).not.toMatch(/^---\s*$/m);
    });

    it('extracts description for TOML format', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      const content = readFileSync(
        join(tempDir, '.gemini', 'commands', 'speckit.specify.toml'),
        'utf-8'
      );
      expect(content).toMatch(/^description = ".+"/m);
    });
  });

  describe('TOML format', () => {
    it('wraps content in prompt triple quotes', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      const content = readFileSync(
        join(tempDir, '.gemini', 'commands', 'speckit.specify.toml'),
        'utf-8'
      );
      expect(content).toContain('prompt = """');
      expect(content).toMatch(/"""$/);
    });

    it('qwen uses same TOML format as gemini', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'qwen' });

      const content = readFileSync(
        join(tempDir, '.qwen', 'commands', 'speckit.specify.toml'),
        'utf-8'
      );
      expect(content).toContain('description =');
      expect(content).toContain('prompt = """');
      expect(content).toContain('{{args}}');
    });
  });

  describe('all command files are generated', () => {
    const expectedCommands = [
      'analyze',
      'checklist',
      'clarify',
      'constitution',
      'implement',
      'plan',
      'specify',
      'tasks',
      'taskstoissues',
    ];

    it('generates all command files for copilot', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      for (const cmd of expectedCommands) {
        const filePath = join(tempDir, '.github', 'agents', `speckit.${cmd}.agent.md`);
        expect(existsSync(filePath), `Missing: speckit.${cmd}.agent.md`).toBe(true);
      }
    });

    it('generates all command files for claude', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      for (const cmd of expectedCommands) {
        const filePath = join(tempDir, '.claude', 'commands', `speckit.${cmd}.md`);
        expect(existsSync(filePath), `Missing: speckit.${cmd}.md`).toBe(true);
      }
    });

    it('generates all command files for gemini', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      for (const cmd of expectedCommands) {
        const filePath = join(tempDir, '.gemini', 'commands', `speckit.${cmd}.toml`);
        expect(existsSync(filePath), `Missing: speckit.${cmd}.toml`).toBe(true);
      }
    });

    it('generates all prompt files for copilot', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      for (const cmd of expectedCommands) {
        const filePath = join(tempDir, '.github', 'prompts', `speckit.${cmd}.prompt.md`);
        expect(existsSync(filePath), `Missing: speckit.${cmd}.prompt.md`).toBe(true);
      }
    });
  });
});

describe('copilot prompt files', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prompt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('prompt files have correct agent reference', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    const content = readFileSync(
      join(tempDir, '.github', 'prompts', 'speckit.specify.prompt.md'),
      'utf-8'
    );
    expect(content).toContain('---');
    expect(content).toContain('agent: speckit.specify');
  });

  it('prompt files are only created for copilot', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'claude' });

    const promptsDir = join(tempDir, '.github', 'prompts');
    expect(existsSync(promptsDir)).toBe(false);
  });
});

describe('constitution file handling', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `const-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates constitution in both memory/ and .specify/memory/', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    expect(existsSync(join(tempDir, 'memory', 'constitution.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.specify', 'memory', 'constitution.md'))).toBe(true);
  });

  it('both constitution files have same content', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

    const memoryContent = readFileSync(join(tempDir, 'memory', 'constitution.md'), 'utf-8');
    const specifyContent = readFileSync(join(tempDir, '.specify', 'memory', 'constitution.md'), 'utf-8');
    expect(memoryContent).toBe(specifyContent);
  });
});

describe('unknown agent fallback', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `unknown-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to copilot config for unknown agent', async () => {
    await generateBuiltinTemplates(tempDir, { ai: 'unknown-agent' });

    // Should use copilot's directory structure as fallback
    const agentDir = join(tempDir, '.github', 'agents');
    expect(existsSync(agentDir)).toBe(true);
  });
});
