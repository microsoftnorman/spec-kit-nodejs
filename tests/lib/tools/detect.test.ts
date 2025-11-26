/**
 * Tool detection tests - ported from test_tool_detection.py
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { checkTool } from '../../../src/lib/tools/detect.js';
import { StepTracker } from '../../../src/lib/ui/tracker.js';

// Mock the modules
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('checkTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // test_detects_git (we'll simulate it being found)
  it('should detect installed tools', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/git'));
    expect(checkTool('git')).toBe(true);
  });

  // test_detects_node
  it('should detect node when installed', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/node'));
    expect(checkTool('node')).toBe(true);
  });

  // test_nonexistent_tool_returns_false
  it('should return false for non-existent tools', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not found');
    });
    expect(checkTool('fake-tool-that-does-not-exist')).toBe(false);
  });

  // test_claude_special_path_checked
  it('should check Claude special path first', () => {
    // Mock Claude local path exists
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ isFile: () => true } as ReturnType<typeof statSync>);

    expect(checkTool('claude')).toBe(true);

    // execSync should not be called since special path exists
    expect(execSync).not.toHaveBeenCalled();
  });

  // test_tracker_updated_on_found
  it('should update tracker with complete when tool found', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/git'));
    const tracker = new StepTracker('Test');
    tracker.add('git', 'Git');

    checkTool('git', tracker);

    expect(tracker.steps[0]?.status).toBe('done');
    expect(tracker.steps[0]?.detail).toBe('available');
  });

  // test_tracker_updated_on_not_found
  it('should update tracker with error when tool not found', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not found');
    });
    const tracker = new StepTracker('Test');
    tracker.add('fake', 'Fake Tool');

    checkTool('fake', tracker);

    expect(tracker.steps[0]?.status).toBe('error');
    expect(tracker.steps[0]?.detail).toBe('not found');
  });

  it('should fall back to PATH when Claude special path does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/claude'));

    expect(checkTool('claude')).toBe(true);
    expect(execSync).toHaveBeenCalled();
  });

  it('should fall back to PATH when Claude special path is not a file', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ isFile: () => false } as ReturnType<typeof statSync>);
    vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/claude'));

    expect(checkTool('claude')).toBe(true);
    expect(execSync).toHaveBeenCalled();
  });
});
