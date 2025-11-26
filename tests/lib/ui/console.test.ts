/**
 * Tests for lib/ui/console.ts - Console utilities for styled terminal output.
 * Tests text centering, box drawing, and styled message output.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  centerText,
  box,
  panel,
  success,
  error,
  warning,
  info,
  dim,
} from '../../../src/lib/ui/console.js';

describe('centerText', () => {
  const originalColumns = process.stdout.columns;

  afterEach(() => {
    process.stdout.columns = originalColumns;
  });

  it('centers text in 80-column terminal', () => {
    process.stdout.columns = 80;
    
    const result = centerText('Hello');
    
    // "Hello" is 5 chars, so padding should be (80 - 5) / 2 = 37
    expect(result.startsWith(' '.repeat(37))).toBe(true);
    expect(result).toContain('Hello');
  });

  it('centers each line independently', () => {
    process.stdout.columns = 80;
    
    const result = centerText('Hi\nWorld');
    const lines = result.split('\n');
    
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Hi');
    expect(lines[1]).toContain('World');
  });

  it('handles empty string', () => {
    process.stdout.columns = 80;
    
    const result = centerText('');
    
    expect(result).toBe(' '.repeat(40));
  });

  it('defaults to 80 columns when stdout.columns is undefined', () => {
    process.stdout.columns = undefined as unknown as number;
    
    const result = centerText('Test');
    
    // Should use 80 as default
    expect(result).toContain('Test');
  });

  it('handles text with ANSI codes', () => {
    process.stdout.columns = 80;
    
    // ANSI codes should not affect centering calculation
    const result = centerText('\x1b[32mGreen\x1b[0m');
    
    // "Green" is 5 visible chars, padding should be (80 - 5) / 2 = 37
    expect(result.startsWith(' '.repeat(37))).toBe(true);
  });

  it('handles text longer than terminal width', () => {
    process.stdout.columns = 10;
    
    const result = centerText('This is a very long text');
    
    // No padding when text is longer than terminal
    expect(result).toBe('This is a very long text');
  });
});

describe('box', () => {
  const originalColumns = process.stdout.columns;

  afterEach(() => {
    process.stdout.columns = originalColumns;
  });

  it('creates a box around content', () => {
    process.stdout.columns = 40;
    
    const result = box('Hello');
    const lines = result.split('\n');
    
    expect(lines).toHaveLength(3); // top, content, bottom
    expect(lines[0]).toContain('╭');
    expect(lines[0]).toContain('╮');
    expect(lines[1]).toContain('│');
    expect(lines[1]).toContain('Hello');
    expect(lines[2]).toContain('╰');
    expect(lines[2]).toContain('╯');
  });

  it('includes title in top border', () => {
    process.stdout.columns = 40;
    
    const result = box('Content', 'My Title');
    const lines = result.split('\n');
    
    expect(lines[0]).toContain('My Title');
  });

  it('handles multi-line content', () => {
    process.stdout.columns = 40;
    
    const result = box('Line 1\nLine 2\nLine 3');
    const lines = result.split('\n');
    
    expect(lines).toHaveLength(5); // top + 3 content + bottom
    expect(lines[1]).toContain('Line 1');
    expect(lines[2]).toContain('Line 2');
    expect(lines[3]).toContain('Line 3');
  });

  it('wraps long lines', () => {
    process.stdout.columns = 20;
    
    const longText = 'This is a very long line that should wrap';
    const result = box(longText);
    
    // Should have more than 3 lines due to wrapping
    expect(result.split('\n').length).toBeGreaterThan(3);
  });

  it('handles empty content', () => {
    process.stdout.columns = 40;
    
    const result = box('');
    const lines = result.split('\n');
    
    expect(lines).toHaveLength(3);
  });

  it('defaults to 80 columns when undefined', () => {
    process.stdout.columns = undefined as unknown as number;
    
    const result = box('Test');
    
    expect(result).toContain('Test');
    expect(result).toContain('╭');
  });

  it('caps width at 80 columns', () => {
    process.stdout.columns = 200;
    
    const result = box('Test');
    const lines = result.split('\n');
    
    // Top border should be 80 chars including corners
    // Account for ANSI codes in length check
    const plainTop = lines[0]!.replace(/\x1b\[[0-9;]*m/g, '');
    expect(plainTop.length).toBe(80);
  });
});

describe('panel', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.stdout.columns = 40;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs box to console', () => {
    panel('Content');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('Content');
    expect(output).toContain('╭');
  });

  it('outputs box with title', () => {
    panel('Content', 'Title');
    
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('Title');
  });
});

describe('success', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs message with green checkmark', () => {
    success('Operation completed');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('✓');
    expect(output).toContain('Operation completed');
  });
});

describe('error', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs message with red X', () => {
    error('Something failed');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('✗');
    expect(output).toContain('Something failed');
  });
});

describe('warning', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs message with yellow exclamation', () => {
    warning('Be careful');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('!');
    expect(output).toContain('Be careful');
  });
});

describe('info', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs message with blue info icon', () => {
    info('FYI message');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('ℹ');
    expect(output).toContain('FYI message');
  });
});

describe('dim', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs dimmed message', () => {
    dim('Muted text');
    
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('Muted text');
  });
});

describe('edge cases', () => {
  const originalColumns = process.stdout.columns;

  afterEach(() => {
    process.stdout.columns = originalColumns;
  });

  it('centerText handles very narrow terminal', () => {
    process.stdout.columns = 5;
    
    const result = centerText('Hello World');
    
    // Text is longer than terminal, no padding
    expect(result).toBe('Hello World');
  });

  it('box handles content with special characters', () => {
    process.stdout.columns = 40;
    
    const result = box('Test: émojis 🎉 & symbols <>&');
    
    expect(result).toContain('Test');
    expect(result).toContain('🎉');
  });

  it('centerText preserves multiple spaces', () => {
    process.stdout.columns = 80;
    
    const result = centerText('A   B');
    
    expect(result).toContain('A   B');
  });
});
