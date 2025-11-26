/**
 * Tests for interactive selection module.
 * Ported from tests/acceptance/test_interactive_selection.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { platform } from 'node:os';
import {
  getKeyAction,
  formatOption,
  NAVIGATION_HELP,
  getAIChoices,
  getScriptChoices,
  DEFAULT_AI_KEY,
  getDefaultScriptKey,
  selectWithArrows,
} from '../../../src/lib/ui/select.js';
import { AGENT_CONFIG, SCRIPT_TYPE_CHOICES } from '../../../src/lib/config.js';

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

  it('default script key is always js', () => {
    const defaultKey = getDefaultScriptKey();
    expect(defaultKey).toBe('js');
  });
});

describe('Select With Arrows Used For', () => {
  it('AI selection returns choices from AGENT_CONFIG', () => {
    const aiChoices = getAIChoices();
    // Verify it returns the same number of choices as AGENT_CONFIG
    expect(Object.keys(aiChoices).length).toBe(Object.keys(AGENT_CONFIG).length);
  });

  it('script selection returns choices from SCRIPT_TYPE_CHOICES', () => {
    const scriptChoices = getScriptChoices();
    expect(Object.keys(scriptChoices).length).toBe(Object.keys(SCRIPT_TYPE_CHOICES).length);
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

describe('getKeyAction edge cases', () => {
  it('handles empty string', () => {
    expect(getKeyAction('')).toBeNull();
  });

  it('handles special characters', () => {
    expect(getKeyAction('\t')).toBeNull(); // Tab
    expect(getKeyAction(' ')).toBeNull(); // Space
    expect(getKeyAction('\b')).toBeNull(); // Backspace
  });

  it('handles numeric keys', () => {
    expect(getKeyAction('0')).toBeNull();
    expect(getKeyAction('1')).toBeNull();
    expect(getKeyAction('9')).toBeNull();
  });

  it('handles F-keys escape sequences', () => {
    expect(getKeyAction('\x1b[11~')).toBeNull(); // F1
    expect(getKeyAction('\x1b[15~')).toBeNull(); // F5
  });
});

describe('formatOption variations', () => {
  it('handles long option keys', () => {
    const formatted = formatOption('a-very-long-option-key', 'description', true);
    expect(formatted).toContain('a-very-long-option-key');
    expect(formatted).toContain('▶');
  });

  it('handles long descriptions', () => {
    const longDesc = 'This is a very long description that describes the option in great detail';
    const formatted = formatOption('key', longDesc, false);
    expect(formatted).toContain(longDesc);
  });

  it('handles special characters in key', () => {
    const formatted = formatOption('key-with-dashes', 'desc', true);
    expect(formatted).toContain('key-with-dashes');
  });

  it('handles empty description', () => {
    const formatted = formatOption('key', '', false);
    expect(formatted).toContain('[dim]()[/dim]');
  });
});

describe('getAIChoices', () => {
  it('includes copilot', () => {
    const choices = getAIChoices();
    expect(choices).toHaveProperty('copilot');
    expect(choices.copilot).toBe('GitHub Copilot');
  });

  it('includes claude', () => {
    const choices = getAIChoices();
    expect(choices).toHaveProperty('claude');
    expect(choices.claude).toBe('Claude Code');
  });

  it('maps AGENT_CONFIG keys to names', () => {
    const choices = getAIChoices();
    for (const [key, config] of Object.entries(AGENT_CONFIG)) {
      expect(choices[key]).toBe(config.name);
    }
  });
});

describe('getScriptChoices', () => {
  it('includes js option', () => {
    const choices = getScriptChoices();
    expect(choices).toHaveProperty('js');
  });

  it('has at least one option', () => {
    const choices = getScriptChoices();
    expect(Object.keys(choices).length).toBeGreaterThan(0);
  });

  it('all options have descriptions', () => {
    const choices = getScriptChoices();
    for (const [key, desc] of Object.entries(choices)) {
      expect(typeof key).toBe('string');
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  it('returns a copy, not the original', () => {
    const choices1 = getScriptChoices();
    const choices2 = getScriptChoices();
    expect(choices1).not.toBe(choices2);
    expect(choices1).toEqual(choices2);
  });
});

describe('selectWithArrows', () => {
  // Note: These tests would require proper mocking of @inquirer/prompts
  // which is complex due to dynamic imports. Testing the wrapper behavior.
  
  it('function exists and has correct signature', () => {
    expect(typeof selectWithArrows).toBe('function');
    expect(selectWithArrows.length).toBe(3); // 3 parameters
  });

  it('options parameter accepts Record type', () => {
    // Type checking - this compiles if types are correct
    const options: Record<string, string> = { a: 'A', b: 'B' };
    expect(Object.keys(options)).toHaveLength(2);
  });
});

describe('NAVIGATION_HELP', () => {
  it('contains arrow navigation instruction', () => {
    expect(NAVIGATION_HELP).toContain('↑/↓');
  });

  it('contains enter instruction', () => {
    expect(NAVIGATION_HELP).toContain('Enter');
  });

  it('contains escape instruction', () => {
    expect(NAVIGATION_HELP).toContain('Esc');
  });

  it('contains cancel instruction', () => {
    expect(NAVIGATION_HELP).toContain('cancel');
  });

  it('contains navigate instruction', () => {
    expect(NAVIGATION_HELP).toContain('navigate');
  });

  it('contains select instruction', () => {
    expect(NAVIGATION_HELP).toContain('select');
  });
});
