/**
 * Tests for template generator module.
 */

import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  generateCommand,
  rewritePaths,
  AGENT_OUTPUT_CONFIG,
} from '../../../src/lib/template/generator.js';

describe('parseFrontmatter', () => {
  it('should parse simple frontmatter', () => {
    const content = `---
description: Test description
script: npx speckit test
---

Body content here.`;

    const result = parseFrontmatter(content);
    
    expect(result.frontmatter.description).toBe('Test description');
    expect(result.frontmatter.script).toBe('npx speckit test');
    expect(result.body).toContain('Body content here.');
  });

  it('should preserve handoffs in frontmatterText', () => {
    const content = `---
description: Test
handoffs:
  - label: Next Step
    agent: speckit.next
    prompt: Do something
---

Body`;

    const result = parseFrontmatter(content);
    
    expect(result.frontmatterText).toContain('handoffs:');
    expect(result.frontmatterText).toContain('- label: Next Step');
    expect(result.frontmatterText).toContain('agent: speckit.next');
  });

  it('should handle content without frontmatter', () => {
    const content = 'Just regular content without frontmatter.';
    
    const result = parseFrontmatter(content);
    
    expect(result.frontmatter).toEqual({});
    expect(result.frontmatterText).toBe('');
    expect(result.body).toBe(content);
  });

  it('should handle empty content', () => {
    const result = parseFrontmatter('');
    
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('');
  });
});

describe('rewritePaths', () => {
  it('should rewrite memory/ to .speckit/memory/', () => {
    expect(rewritePaths('memory/constitution.md')).toBe('.speckit/memory/constitution.md');
    expect(rewritePaths('/memory/file.md')).toBe('.speckit/memory/file.md');
  });

  it('should rewrite scripts/ to .speckit/scripts/', () => {
    expect(rewritePaths('scripts/bash/setup.sh')).toBe('.speckit/scripts/bash/setup.sh');
  });

  it('should rewrite templates/ to .speckit/templates/', () => {
    expect(rewritePaths('templates/plan.md')).toBe('.speckit/templates/plan.md');
  });

  it('should handle multiple rewrites in one string', () => {
    const input = 'Read memory/constitution.md and templates/spec.md';
    const expected = 'Read .speckit/memory/constitution.md and .speckit/templates/spec.md';
    expect(rewritePaths(input)).toBe(expected);
  });
});

describe('generateCommand', () => {
  const templateContent = `---
description: Test command
script: npx speckit test-cmd --json
agent_script: npx speckit update-agent-context __AGENT__
---

## Input

\`\`\`text
$ARGUMENTS
\`\`\`

Run \`{SCRIPT}\` and then \`{AGENT_SCRIPT}\`.
Read memory/constitution.md.`;

  it('should generate markdown format for Claude', () => {
    const result = generateCommand(templateContent, 'claude', AGENT_OUTPUT_CONFIG.claude!);
    
    // Should be markdown with frontmatter
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('description: Test command');
    expect(result).not.toContain('script:');
    expect(result).not.toContain('agent_script:');
    
    // Should replace placeholders
    expect(result).toContain('npx speckit test-cmd --json');
    expect(result).toContain('npx speckit update-agent-context claude');
    expect(result).toContain('$ARGUMENTS');
    
    // Should rewrite paths
    expect(result).toContain('.speckit/memory/constitution.md');
  });

  it('should generate TOML format for Gemini', () => {
    const result = generateCommand(templateContent, 'gemini', AGENT_OUTPUT_CONFIG.gemini!);
    
    // Should be TOML format
    expect(result).toMatch(/^description = "/);
    expect(result).toContain('prompt = """');
    
    // Should NOT have frontmatter in prompt
    expect(result).not.toContain('---\ndescription:');
    
    // Should use {{args}} for Gemini
    expect(result).toContain('{{args}}');
    expect(result).not.toContain('$ARGUMENTS');
    
    // Should replace script placeholders
    expect(result).toContain('npx speckit test-cmd --json');
  });

  it('should generate TOML format for Qwen', () => {
    const result = generateCommand(templateContent, 'qwen', AGENT_OUTPUT_CONFIG.qwen!);
    
    expect(result).toMatch(/^description = "/);
    expect(result).toContain('{{args}}');
  });

  it('should generate agent.md format for Copilot', () => {
    const result = generateCommand(templateContent, 'copilot', AGENT_OUTPUT_CONFIG.copilot!);
    
    // Should still be markdown format
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('$ARGUMENTS');
  });

  it('should replace __AGENT__ placeholder', () => {
    const content = `---
description: Test
agent_script: npx speckit update-context __AGENT__
---

Agent is __AGENT__.
Script: {AGENT_SCRIPT}`;

    const result = generateCommand(content, 'cursor-agent', AGENT_OUTPUT_CONFIG['cursor-agent']!);
    
    expect(result).toContain('Agent is cursor-agent.');
    expect(result).toContain('npx speckit update-context cursor-agent');
    expect(result).not.toContain('__AGENT__');
  });
});

describe('AGENT_OUTPUT_CONFIG', () => {
  it('should have all supported agents', () => {
    const expectedAgents = [
      'claude', 'gemini', 'copilot', 'cursor-agent', 'qwen',
      'opencode', 'windsurf', 'codex', 'kilocode', 'auggie',
      'roo', 'codebuddy', 'q', 'amp', 'shai'
    ];
    
    for (const agent of expectedAgents) {
      expect(AGENT_OUTPUT_CONFIG).toHaveProperty(agent);
    }
  });

  it('should have correct extension for TOML agents', () => {
    expect(AGENT_OUTPUT_CONFIG.gemini?.extension).toBe('toml');
    expect(AGENT_OUTPUT_CONFIG.qwen?.extension).toBe('toml');
  });

  it('should have correct extension for markdown agents', () => {
    expect(AGENT_OUTPUT_CONFIG.claude?.extension).toBe('md');
    expect(AGENT_OUTPUT_CONFIG['cursor-agent']?.extension).toBe('md');
    expect(AGENT_OUTPUT_CONFIG.windsurf?.extension).toBe('md');
  });

  it('should have agent.md extension for Copilot', () => {
    expect(AGENT_OUTPUT_CONFIG.copilot?.extension).toBe('agent.md');
  });

  it('should have correct args format for each type', () => {
    // TOML agents use {{args}}
    expect(AGENT_OUTPUT_CONFIG.gemini?.argsFormat).toBe('{{args}}');
    expect(AGENT_OUTPUT_CONFIG.qwen?.argsFormat).toBe('{{args}}');
    
    // Markdown agents use $ARGUMENTS
    expect(AGENT_OUTPUT_CONFIG.claude?.argsFormat).toBe('$ARGUMENTS');
    expect(AGENT_OUTPUT_CONFIG.copilot?.argsFormat).toBe('$ARGUMENTS');
  });

  it('should have correct command directories', () => {
    expect(AGENT_OUTPUT_CONFIG.claude?.commandDir).toBe('.claude/commands');
    expect(AGENT_OUTPUT_CONFIG.gemini?.commandDir).toBe('.gemini/commands');
    expect(AGENT_OUTPUT_CONFIG.copilot?.commandDir).toBe('.github/agents');
    expect(AGENT_OUTPUT_CONFIG['cursor-agent']?.commandDir).toBe('.cursor/commands');
  });

  it('should have prompt files enabled only for Copilot', () => {
    expect(AGENT_OUTPUT_CONFIG.copilot?.generatePromptFiles).toBe(true);
    expect(AGENT_OUTPUT_CONFIG.claude?.generatePromptFiles).toBeUndefined();
  });
});
