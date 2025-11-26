/**
 * Tests for lib/template/builtin.ts - Built-in template generation for JavaScript script type.
 * Tests the template generation functions used when init is called.
 * 
 * These tests verify the ACTUAL implementation behavior, not aspirational features.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  generateBuiltinTemplates,
  shouldUseBuiltinTemplates,
  type GenerateBuiltinOptions,
} from '../../../src/lib/template/builtin.js';

// ============================================================================
// shouldUseBuiltinTemplates
// ============================================================================

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

// ============================================================================
// generateBuiltinTemplates - Directory Creation
// ============================================================================

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

  describe('template files', () => {
    const templateFiles = [
      'spec-template.md',
      'plan-template.md',
      'tasks-template.md',
      'checklist-template.md',
      'agent-file-template.md',
    ];

    it('creates all template files', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      for (const file of templateFiles) {
        const filePath = join(tempDir, '.specify', 'templates', file);
        expect(existsSync(filePath), `Missing template: ${file}`).toBe(true);
      }
    });

    it('spec-template.md has required sections', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, '.specify', 'templates', 'spec-template.md'),
        'utf-8'
      );
      expect(content).toContain('Feature Specification');
      expect(content).toContain('Functional Requirements');
    });

    it('plan-template.md has required sections', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, '.specify', 'templates', 'plan-template.md'),
        'utf-8'
      );
      expect(content).toContain('Implementation Plan');
      // The actual template uses 'Technical Context' not 'Technical Stack'
      expect(content).toContain('Technical Context');
    });
  });

  describe('command files', () => {
    const commandFiles = [
      'analyze.md',
      'checklist.md',
      'clarify.md',
      'constitution.md',
      'implement.md',
      'plan.md',
      'specify.md',
      'tasks.md',
      'taskstoissues.md',
    ];

    it('creates all command files for copilot', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      for (const file of commandFiles) {
        const filePath = join(tempDir, '.github', 'agents', file);
        expect(existsSync(filePath), `Missing command: ${file}`).toBe(true);
      }
    });

    it('creates all command files for claude', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      for (const file of commandFiles) {
        const filePath = join(tempDir, '.claude', 'commands', file);
        expect(existsSync(filePath), `Missing command: ${file}`).toBe(true);
      }
    });

    it('creates all command files for gemini', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'gemini' });

      for (const file of commandFiles) {
        const filePath = join(tempDir, '.gemini', 'commands', file);
        expect(existsSync(filePath), `Missing command: ${file}`).toBe(true);
      }
    });
  });

  describe('agent instructions files', () => {
    it('creates copilot-instructions.md for copilot', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.github', 'agents', 'copilot-instructions.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('copilot-instructions.md has SDD methodology content', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, '.github', 'agents', 'copilot-instructions.md'),
        'utf-8'
      );
      expect(content).toContain('GitHub Copilot');
      expect(content).toContain('Spec-Driven Development');
      expect(content).toContain('/speckit.specify');
      expect(content).toContain('/speckit.plan');
    });

    it('creates agent-rules.md for non-copilot agents', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'claude' });

      const filePath = join(tempDir, '.claude', 'commands', 'claude-rules.md');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('VS Code settings', () => {
    it('creates settings.json', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, '.vscode', 'settings.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('settings.json is valid JSON', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, '.vscode', 'settings.json'),
        'utf-8'
      );
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('settings.json has chat settings', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, '.vscode', 'settings.json'),
        'utf-8'
      );
      const settings = JSON.parse(content);
      expect(settings['chat.commandCenter.enabled']).toBe(true);
      expect(settings['github.copilot.chat.codeGeneration.useInstructionFiles']).toBe(true);
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

  describe('constitution file', () => {
    it('creates constitution in memory directory', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const filePath = join(tempDir, 'memory', 'constitution.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('constitution has SDD methodology content', async () => {
      await generateBuiltinTemplates(tempDir, { ai: 'copilot' });

      const content = readFileSync(
        join(tempDir, 'memory', 'constitution.md'),
        'utf-8'
      );
      expect(content).toContain('Project Constitution');
      expect(content).toContain('Spec-Driven Development');
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
      { key: 'opencode', dir: '.opencode/commands' },
      { key: 'codex', dir: '.codex/commands' },
      { key: 'windsurf', dir: '.windsurf/workflows' },
      { key: 'kilocode', dir: '.kilocode/rules' },
      { key: 'auggie', dir: '.augment/rules' },
      { key: 'codebuddy', dir: '.codebuddy/commands' },
      { key: 'roo', dir: '.roo/rules' },
      { key: 'q', dir: '.amazonq/prompts' },
      { key: 'amp', dir: '.agents/commands' },
      { key: 'shai', dir: '.shai/commands' },
    ];

    it.each(agents)('creates agent directory for $key', async ({ key, dir }) => {
      await generateBuiltinTemplates(tempDir, { ai: key });

      const agentDir = join(tempDir, dir);
      expect(existsSync(agentDir)).toBe(true);
    });

    it.each(agents)('creates command files for $key', async ({ key, dir }) => {
      await generateBuiltinTemplates(tempDir, { ai: key });

      const specifyPath = join(tempDir, dir, 'specify.md');
      expect(existsSync(specifyPath)).toBe(true);
    });
  });

  describe('debug option', () => {
    it('does not throw with debug enabled', async () => {
      await expect(
        generateBuiltinTemplates(tempDir, { ai: 'copilot', debug: true })
      ).resolves.not.toThrow();
    });
  });
});
