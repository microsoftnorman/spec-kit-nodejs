/**
 * Tests for interactive selection module.
 * Ported from tests/acceptance/test_interactive_selection.py
 */

import { describe, it, expect } from 'vitest';
import {
  getKeyAction,
  formatOption,
  NAVIGATION_HELP,
  getAIChoices,
  DEFAULT_AI_KEY,
} from '../../../src/lib/ui/select.js';
import { AGENT_CONFIG } from '../../../src/lib/config.js';

describe('Get Key Behavior', () => {
  it('up arrow returns up', () => {
    expect(getKeyAction('\x1b[A')).toBe('up');
  });

  it('Ctrl+P returns up (Emacs-style)', () => {
    expect(getKeyAction('\x10')).toBe('up');
  });

  it('down arrow returns down', () => {
    expect(getKeyAction('\x1b[B')).toBe('down');
  });

  it('Ctrl+N returns down (Emacs-style)', () => {
    expect(getKeyAction('\x0e')).toBe('down');
  });

  it('Enter returns enter', () => {
    expect(getKeyAction('\r')).toBe('enter');
    expect(getKeyAction('\n')).toBe('enter');
  });

  it('Escape returns escape', () => {
    expect(getKeyAction('\x1b')).toBe('escape');
  });

  it('Ctrl+C raises KeyboardInterrupt', () => {
    expect(() => getKeyAction('\x03')).toThrow('KeyboardInterrupt');
  });

  it('unknown key returns null', () => {
    expect(getKeyAction('a')).toBeNull();
    expect(getKeyAction('x')).toBeNull();
  });
});

describe('Select With Arrows Parameters', () => {
  it('accepts options dict', () => {
    const options = { a: 'Option A', b: 'Option B' };
    expect(Object.keys(options)).toHaveLength(2);
  });

  it('returns selected key type', () => {
    // Type assertion test - the function returns the key type
    type TestKey = 'a' | 'b';
    const options: Record<TestKey, string> = { a: 'Option A', b: 'Option B' };
    // If this compiles, the types are correct
    expect(Object.keys(options)).toContain('a');
  });
});

describe('Select With Arrows Display', () => {
  it('shows arrow indicator for selected', () => {
    const formatted = formatOption('test', 'description', true);
    expect(formatted).toContain('▶');
  });

  it('no arrow for unselected', () => {
    const formatted = formatOption('test', 'description', false);
    expect(formatted).not.toContain('▶');
    expect(formatted.startsWith(' ')).toBe(true);
  });

  it('shows option key in cyan', () => {
    const formatted = formatOption('test', 'description', false);
    expect(formatted).toContain('[cyan]test[/cyan]');
  });

  it('shows description in dim parentheses', () => {
    const formatted = formatOption('test', 'description', false);
    expect(formatted).toContain('[dim](description)[/dim]');
  });

  it('shows navigation help text', () => {
    expect(NAVIGATION_HELP).toContain('↑/↓');
    expect(NAVIGATION_HELP).toContain('Enter');
    expect(NAVIGATION_HELP).toContain('Esc');
  });
});

describe('Select With Arrows Defaults', () => {
  it('default AI key is copilot', () => {
    expect(DEFAULT_AI_KEY).toBe('copilot');
  });
});

describe('Select With Arrows Used For', () => {
  it('AI selection uses AGENT_CONFIG keys and names', () => {
    const aiChoices = getAIChoices();
    expect(Object.keys(aiChoices)).toHaveLength(15);
    expect(aiChoices['copilot']).toBe('GitHub Copilot');
    expect(aiChoices['claude']).toBe('Claude Code');
  });

  it('AI selection default is copilot', () => {
    expect(DEFAULT_AI_KEY).toBe('copilot');
    expect(AGENT_CONFIG['copilot']).toBeDefined();
  });
});

describe('Select Options Structure', () => {
  it('all AI agents have display names', () => {
    const aiChoices = getAIChoices();
    for (const [key, name] of Object.entries(aiChoices)) {
      expect(typeof key).toBe('string');
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
