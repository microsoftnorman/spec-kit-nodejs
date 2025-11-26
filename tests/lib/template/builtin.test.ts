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
