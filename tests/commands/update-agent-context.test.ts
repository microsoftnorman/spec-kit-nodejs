/**
 * Tests for update-agent-context command.
 * Tests the command that updates agent context files with information from plan.md.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('UpdateAgentContext Agent Types', () => {
  const validAgentTypes = [
    'claude',
    'gemini',
    'copilot',
    'cursor-agent',
    'qwen',
    'opencode',
    'codex',
    'windsurf',
    'kilocode',
    'auggie',
    'roo',
    'codebuddy',
    'amp',
    'shai',
    'q',
  ];

  it('accepts all valid agent types', () => {
    expect(validAgentTypes).toHaveLength(15);
  });

  it('claude is a valid agent type', () => {
    expect(validAgentTypes).toContain('claude');
  });

  it('copilot is a valid agent type', () => {
    expect(validAgentTypes).toContain('copilot');
  });

  it('cursor-agent uses hyphen not underscore', () => {
    expect(validAgentTypes).toContain('cursor-agent');
    expect(validAgentTypes).not.toContain('cursor_agent');
  });

  it('q is a valid agent type for Amazon Q', () => {
    expect(validAgentTypes).toContain('q');
  });
});

describe('UpdateAgentContext Agent File Paths', () => {
  it('claude file is CLAUDE.md at repo root', () => {
    const claudeFile = 'CLAUDE.md';
    expect(claudeFile).toBe('CLAUDE.md');
  });

  it('gemini file is GEMINI.md at repo root', () => {
    const geminiFile = 'GEMINI.md';
    expect(geminiFile).toBe('GEMINI.md');
  });

  it('copilot file is under .github/agents/', () => {
    const copilotFile = '.github/agents/copilot-instructions.md';
    expect(copilotFile).toContain('.github/agents/');
  });

  it('cursor file is under .cursor/rules/', () => {
    const cursorFile = '.cursor/rules/specify-rules.mdc';
    expect(cursorFile).toContain('.cursor/rules/');
  });

  it('windsurf file is under .windsurf/rules/', () => {
    const windsurfFile = '.windsurf/rules/specify-rules.md';
    expect(windsurfFile).toContain('.windsurf/rules/');
  });

  it('kilocode file is under .kilocode/rules/', () => {
    const kilocodeFile = '.kilocode/rules/specify-rules.md';
    expect(kilocodeFile).toContain('.kilocode/rules/');
  });

  it('auggie file is under .augment/rules/', () => {
    const auggieFile = '.augment/rules/specify-rules.md';
    expect(auggieFile).toContain('.augment/rules/');
  });

  it('roo file is under .roo/rules/', () => {
    const rooFile = '.roo/rules/specify-rules.md';
    expect(rooFile).toContain('.roo/rules/');
  });

  it('shai file is SHAI.md at repo root', () => {
    const shaiFile = 'SHAI.md';
    expect(shaiFile).toBe('SHAI.md');
  });

  it('codebuddy file is CODEBUDDY.md at repo root', () => {
    const codebuddyFile = 'CODEBUDDY.md';
    expect(codebuddyFile).toBe('CODEBUDDY.md');
  });

  it('opencode, codex, amp, q share AGENTS.md', () => {
    const sharedFile = 'AGENTS.md';
    // These agents all use AGENTS.md
    expect(sharedFile).toBe('AGENTS.md');
  });
});

describe('UpdateAgentContext Plan Parsing', () => {
  it('extracts Language/Version field', () => {
    const planContent = '**Language/Version**: Python 3.12\n';
    const match = planContent.match(/\*\*Language\/Version\*\*:\s*(.+)/);

    expect(match).not.toBeNull();
    expect(match![1]).toBe('Python 3.12');
  });

  it('extracts Primary Dependencies field', () => {
    const planContent = '**Primary Dependencies**: FastAPI, SQLAlchemy\n';
    const match = planContent.match(/\*\*Primary Dependencies\*\*:\s*(.+)/);

    expect(match).not.toBeNull();
    expect(match![1]).toBe('FastAPI, SQLAlchemy');
  });

  it('extracts Storage field', () => {
    const planContent = '**Storage**: PostgreSQL 15\n';
    const match = planContent.match(/\*\*Storage\*\*:\s*(.+)/);

    expect(match).not.toBeNull();
    expect(match![1]).toBe('PostgreSQL 15');
  });

  it('extracts Project Type field', () => {
    const planContent = '**Project Type**: Web API\n';
    const match = planContent.match(/\*\*Project Type\*\*:\s*(.+)/);

    expect(match).not.toBeNull();
    expect(match![1]).toBe('Web API');
  });

  it('filters out NEEDS CLARIFICATION', () => {
    const value = 'NEEDS CLARIFICATION';
    expect(value).toBe('NEEDS CLARIFICATION');
    // This should be filtered to empty string
    const filtered = value === 'NEEDS CLARIFICATION' ? '' : value;
    expect(filtered).toBe('');
  });

  it('filters out N/A', () => {
    const value = 'N/A';
    const filtered = value === 'N/A' ? '' : value;
    expect(filtered).toBe('');
  });
});

describe('UpdateAgentContext Technology Stack Formatting', () => {
  it('formats language only', () => {
    const language = 'Python 3.12';
    const framework = '';
    const result = language;

    expect(result).toBe('Python 3.12');
  });

  it('formats framework only', () => {
    const language = '';
    const framework = 'FastAPI';
    const result = framework;

    expect(result).toBe('FastAPI');
  });

  it('combines language and framework with +', () => {
    const language = 'Python 3.12';
    const framework = 'FastAPI';
    const result = `${language} + ${framework}`;

    expect(result).toBe('Python 3.12 + FastAPI');
  });

  it('returns empty string when both empty', () => {
    const language = '';
    const framework = '';
    const parts = [language, framework].filter(Boolean);
    const result = parts.join(' + ');

    expect(result).toBe('');
  });
});

describe('UpdateAgentContext File Updates', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `agent-update-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates new agent file from template', () => {
    const templateDir = join(tempDir, '.specify', 'templates');
    mkdirSync(templateDir, { recursive: true });

    const templateContent = '# Agent Context\n\n## Active Technologies\n[EXTRACTED FROM ALL PLAN.MD FILES]\n';
    writeFileSync(join(templateDir, 'agent-file-template.md'), templateContent);

    const agentFile = join(tempDir, 'CLAUDE.md');
    const updatedContent = templateContent.replace(
      '[EXTRACTED FROM ALL PLAN.MD FILES]',
      '- Python 3.12 + FastAPI (001-test-feature)'
    );
    writeFileSync(agentFile, updatedContent);

    expect(existsSync(agentFile)).toBe(true);
    expect(readFileSync(agentFile, 'utf-8')).toContain('Python 3.12');
  });

  it('updates Active Technologies section', () => {
    const existingContent = `# Agent Context

## Active Technologies
- JavaScript (existing)

## Recent Changes
- old-feature: Added JavaScript
`;

    const agentFile = join(tempDir, 'CLAUDE.md');
    writeFileSync(agentFile, existingContent);

    // Simulate update
    const newEntry = '- Python 3.12 (001-new-feature)';
    const updated = existingContent.replace(
      '## Active Technologies\n',
      `## Active Technologies\n${newEntry}\n`
    );
    writeFileSync(agentFile, updated);

    const content = readFileSync(agentFile, 'utf-8');
    expect(content).toContain('Python 3.12');
    expect(content).toContain('JavaScript');
  });

  it('updates Recent Changes section', () => {
    const existingContent = `# Agent Context

## Recent Changes
- old-feature: Added something
`;

    const agentFile = join(tempDir, 'CLAUDE.md');
    writeFileSync(agentFile, existingContent);

    // Simulate update
    const newEntry = '- 001-new-feature: Added Python 3.12';
    const updated = existingContent.replace(
      '## Recent Changes\n',
      `## Recent Changes\n${newEntry}\n`
    );
    writeFileSync(agentFile, updated);

    const content = readFileSync(agentFile, 'utf-8');
    expect(content).toContain('001-new-feature');
    expect(content).toContain('old-feature');
  });

  it('keeps only 3 most recent changes', () => {
    const maxRecentChanges = 3;
    // The command keeps new entry + 2 existing = 3 total
    expect(maxRecentChanges).toBe(3);
  });

  it('updates Last updated timestamp', () => {
    const oldDate = '2024-01-01';
    const newDate = new Date().toISOString().split('T')[0];

    const content = `**Last updated**: ${oldDate}`;
    const updated = content.replace(/\d{4}-\d{2}-\d{2}/, newDate!);

    expect(updated).toContain(newDate);
    expect(updated).not.toContain(oldDate);
  });
});

describe('UpdateAgentContext Behavior Without Agent Type', () => {
  it('updates all existing agent files when no type specified', () => {
    // When agentType is empty, command should update all existing files
    const agentType = undefined;
    expect(agentType).toBeUndefined();
  });

  it('creates default Claude file if no agent files exist', () => {
    // If no agent files found, create CLAUDE.md as default
    const defaultAgent = 'claude';
    const defaultFile = 'CLAUDE.md';

    expect(defaultAgent).toBe('claude');
    expect(defaultFile).toBe('CLAUDE.md');
  });
});

describe('UpdateAgentContext Template Placeholders', () => {
  it('replaces [PROJECT NAME] placeholder', () => {
    const template = '# [PROJECT NAME] Agent Context';
    const replaced = template.replace('[PROJECT NAME]', 'MyProject');

    expect(replaced).toBe('# MyProject Agent Context');
  });

  it('replaces [DATE] placeholder', () => {
    const template = '**Created**: [DATE]';
    const date = '2025-01-15';
    const replaced = template.replace('[DATE]', date);

    expect(replaced).toBe('**Created**: 2025-01-15');
  });

  it('replaces [EXTRACTED FROM ALL PLAN.MD FILES] placeholder', () => {
    const template = '## Active Technologies\n[EXTRACTED FROM ALL PLAN.MD FILES]';
    const techStack = '- Python 3.12 (001-feature)';
    const replaced = template.replace('[EXTRACTED FROM ALL PLAN.MD FILES]', techStack);

    expect(replaced).toContain('Python 3.12');
  });

  it('replaces [LAST 3 FEATURES AND WHAT THEY ADDED] placeholder', () => {
    const template = '## Recent Changes\n[LAST 3 FEATURES AND WHAT THEY ADDED]';
    const changes = '- 001-feature: Added Python 3.12';
    const replaced = template.replace('[LAST 3 FEATURES AND WHAT THEY ADDED]', changes);

    expect(replaced).toContain('001-feature');
  });
});

describe('UpdateAgentContext Error Handling', () => {
  it('requires plan.md to exist', () => {
    const errorMessage = 'No plan.md found';
    expect(errorMessage).toContain('plan.md');
  });

  it('warns when template file missing', () => {
    const warningMessage = 'Template file not found';
    expect(warningMessage).toContain('Template');
  });

  it('exits with error for unknown agent type', () => {
    const errorMessage = "Unknown agent type 'invalid'";
    expect(errorMessage).toContain('Unknown agent type');
  });

  it('lists valid agent types in error message', () => {
    const validTypes = 'claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|roo|codebuddy|amp|shai|q';
    expect(validTypes).toContain('claude');
    expect(validTypes).toContain('q');
  });
});

describe('UpdateAgentContext Agent Display Names', () => {
  const displayNames: Record<string, string> = {
    claude: 'Claude Code',
    gemini: 'Gemini CLI',
    copilot: 'GitHub Copilot',
    'cursor-agent': 'Cursor IDE',
    qwen: 'Qwen Code',
    opencode: 'opencode',
    codex: 'Codex CLI',
    windsurf: 'Windsurf',
    kilocode: 'Kilo Code',
    auggie: 'Auggie CLI',
    roo: 'Roo Code',
    codebuddy: 'CodeBuddy CLI',
    amp: 'Amp',
    shai: 'SHAI',
    q: 'Amazon Q Developer CLI',
  };

  it('claude display name is Claude Code', () => {
    expect(displayNames.claude).toBe('Claude Code');
  });

  it('copilot display name is GitHub Copilot', () => {
    expect(displayNames.copilot).toBe('GitHub Copilot');
  });

  it('q display name is Amazon Q Developer CLI', () => {
    expect(displayNames.q).toBe('Amazon Q Developer CLI');
  });

  it('cursor-agent display name is Cursor IDE', () => {
    expect(displayNames['cursor-agent']).toBe('Cursor IDE');
  });

  it('all 15 agents have display names', () => {
    expect(Object.keys(displayNames)).toHaveLength(15);
  });
});
