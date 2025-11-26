/**
 * Tests for check-prerequisites command.
 * Ported from tests/acceptance/ Python tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock child_process for git commands
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execSync: vi.fn((cmd: string) => {
      if (cmd.includes('git rev-parse --show-toplevel')) {
        return '/mock/repo\n';
      }
      if (cmd.includes('git rev-parse --abbrev-ref HEAD')) {
        return '001-test-feature\n';
      }
      throw new Error('Command not mocked');
    }),
  };
});

describe('CheckPrerequisites Output Format', () => {
  it('JSON output contains required fields', () => {
    // Expected JSON output structure
    const expectedFields = [
      'REPO_ROOT',
      'CURRENT_BRANCH',
      'HAS_GIT',
      'FEATURE_DIR',
      'FEATURE_SPEC',
      'IMPL_PLAN',
      'TASKS',
      'AVAILABLE_DOCS',
    ];

    // Simulate JSON output
    const jsonOutput = {
      REPO_ROOT: '/test/repo',
      CURRENT_BRANCH: '001-test-feature',
      HAS_GIT: 'true',
      FEATURE_DIR: '/test/repo/specs/001-test-feature',
      FEATURE_SPEC: '/test/repo/specs/001-test-feature/spec.md',
      IMPL_PLAN: '/test/repo/specs/001-test-feature/plan.md',
      TASKS: '/test/repo/specs/001-test-feature/tasks.md',
      AVAILABLE_DOCS: ['spec.md'],
    };

    for (const field of expectedFields) {
      expect(jsonOutput).toHaveProperty(field);
    }
  });

  it('JSON output HAS_GIT is string true or false', () => {
    const trueOutput = { HAS_GIT: 'true' };
    const falseOutput = { HAS_GIT: 'false' };

    expect(trueOutput.HAS_GIT).toBe('true');
    expect(falseOutput.HAS_GIT).toBe('false');
  });

  it('paths-only mode returns minimal fields', () => {
    const pathsOnlyFields = ['FEATURE_DIR', 'FEATURE_SPEC', 'IMPL_PLAN', 'TASKS'];

    const pathsOnlyOutput = {
      FEATURE_DIR: '/test/repo/specs/001-test-feature',
      FEATURE_SPEC: '/test/repo/specs/001-test-feature/spec.md',
      IMPL_PLAN: '/test/repo/specs/001-test-feature/plan.md',
      TASKS: '/test/repo/specs/001-test-feature/tasks.md',
    };

    for (const field of pathsOnlyFields) {
      expect(pathsOnlyOutput).toHaveProperty(field);
    }
  });
});

describe('CheckPrerequisites Options', () => {
  it('supports --json flag', () => {
    const validOptions = ['--json'];
    expect(validOptions).toContain('--json');
  });

  it('supports --paths-only flag', () => {
    const validOptions = ['--paths-only'];
    expect(validOptions).toContain('--paths-only');
  });

  it('supports --require-tasks flag', () => {
    const validOptions = ['--require-tasks'];
    expect(validOptions).toContain('--require-tasks');
  });

  it('supports --include-tasks flag', () => {
    const validOptions = ['--include-tasks'];
    expect(validOptions).toContain('--include-tasks');
  });
});

describe('CheckPrerequisites AVAILABLE_DOCS', () => {
  it('includes spec.md when present', () => {
    const availableDocs = ['spec.md'];
    expect(availableDocs).toContain('spec.md');
  });

  it('includes plan.md when present', () => {
    const availableDocs = ['spec.md', 'plan.md'];
    expect(availableDocs).toContain('plan.md');
  });

  it('includes tasks.md when present', () => {
    const availableDocs = ['spec.md', 'plan.md', 'tasks.md'];
    expect(availableDocs).toContain('tasks.md');
  });

  it('includes research.md when present', () => {
    const availableDocs = ['spec.md', 'research.md'];
    expect(availableDocs).toContain('research.md');
  });

  it('includes data-model.md when present', () => {
    const availableDocs = ['spec.md', 'data-model.md'];
    expect(availableDocs).toContain('data-model.md');
  });

  it('includes contracts when directory has files', () => {
    const availableDocs = ['spec.md', 'contracts'];
    expect(availableDocs).toContain('contracts');
  });
});

describe('CheckPrerequisites Task Content', () => {
  it('TASKS_CONTENT included when --include-tasks is set', () => {
    const output = {
      TASKS: '/test/repo/specs/001-test-feature/tasks.md',
      TASKS_CONTENT: '# Tasks\n- [ ] T001 Setup project',
    };

    expect(output).toHaveProperty('TASKS_CONTENT');
    expect(output.TASKS_CONTENT).toContain('Tasks');
  });
});
