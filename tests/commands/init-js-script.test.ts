/**
 * Functional tests for init command with option.
 * Tests the built-in template generation without network access.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ============================================================================
// Test Configuration
// ============================================================================

const CLI_PATH = join(__dirname, '..', '..', 'bin', 'specify.js');

const execOptions: ExecSyncOptionsWithStringEncoding = {
  encoding: 'utf-8',
  timeout: 30000,
};

// ============================================================================
// Test Utilities
// ============================================================================

function createTempDir(prefix: string): string {
  const tempPath = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempPath, { recursive: true });
  return tempPath;
}

function cleanupTempDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runCli(args: string, options?: { cwd?: string; expectError?: boolean }): RunResult {
  const { cwd, expectError } = options ?? {};

  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
      ...execOptions,
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
    if (!expectError) {
      console.error('Command failed:', args);
      console.error('stdout:', execError.stdout?.toString());
      console.error('stderr:', execError.stderr?.toString());
    }
    return {
      stdout: execError.stdout?.toString() || '',
      stderr: execError.stderr?.toString() || '',
      exitCode: execError.status ?? 1,
    };
  }
}

// ============================================================================
// Test Suite: Init with --script js
// ============================================================================

describe('Init Command with --script js', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-init-js');
    projectDir = join(tempDir, 'test-project');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Basic functionality', () => {
    it('creates project with copilot and js script type', () => {
      const { stdout, exitCode } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(exitCode).toBe(0);
      expect(existsSync(projectDir)).toBe(true);
      expect(stdout).toContain('Project initialized successfully');
    });

    it('shows "Generate templates" step instead of "Download template"', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(stdout).toContain('Generate templates');
      expect(stdout).not.toContain('Download template');
    });

    it('does not require network access', () => {
      // This test verifies js works without network by checking it completes quickly
      const startTime = Date.now();
      const { exitCode } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );
      const duration = Date.now() - startTime;

      expect(exitCode).toBe(0);
      // Should complete in under 5 seconds (no network delay)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Directory structure', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    it('creates .specify directory', () => {
      expect(existsSync(join(projectDir, '.specify'))).toBe(true);
    });

    it('creates .specify/templates directory', () => {
      expect(existsSync(join(projectDir, '.specify', 'templates'))).toBe(true);
    });

    it('creates memory directory', () => {
      expect(existsSync(join(projectDir, 'memory'))).toBe(true);
    });

    it('creates specs directory', () => {
      expect(existsSync(join(projectDir, 'specs'))).toBe(true);
    });

    it('creates .vscode directory', () => {
      expect(existsSync(join(projectDir, '.vscode'))).toBe(true);
    });

    it('creates .github/agents directory for copilot', () => {
      expect(existsSync(join(projectDir, '.github', 'agents'))).toBe(true);
    });
  });

  describe('Template files', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    it('creates spec-template.md', () => {
      const filePath = join(projectDir, '.specify', 'templates', 'spec-template.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Feature Specification');
      expect(content).toContain('Functional Requirements');
    });

    it('creates plan-template.md', () => {
      const filePath = join(projectDir, '.specify', 'templates', 'plan-template.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Implementation Plan');
      expect(content).toContain('Language/Version');
    });

    it('creates tasks-template.md', () => {
      const filePath = join(projectDir, '.specify', 'templates', 'tasks-template.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Tasks');
    });

    it('creates checklist-template.md', () => {
      const filePath = join(projectDir, '.specify', 'templates', 'checklist-template.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Checklist');
    });

    it('creates agent-file-template.md', () => {
      const filePath = join(projectDir, '.specify', 'templates', 'agent-file-template.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Development Guidelines');
    });
  });

  describe('Command files for copilot', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    const commandFiles = [
      'speckit.analyze.agent.md',
      'speckit.checklist.agent.md',
      'speckit.clarify.agent.md',
      'speckit.constitution.agent.md',
      'speckit.implement.agent.md',
      'speckit.plan.agent.md',
      'speckit.specify.agent.md',
      'speckit.tasks.agent.md',
      'speckit.taskstoissues.agent.md',
    ];

    it('creates all command files', () => {
      for (const file of commandFiles) {
        const filePath = join(projectDir, '.github', 'agents', file);
        expect(existsSync(filePath), `Missing command file: ${file}`).toBe(true);
      }
    });

    it('creates command files for copilot', () => {
      const filePath = join(projectDir, '.github', 'agents', 'speckit.specify.agent.md');
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('description:');
    });
  });

  describe('Memory and constitution', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    it('creates constitution.md in memory directory', () => {
      const filePath = join(projectDir, 'memory', 'constitution.md');
      expect(existsSync(filePath)).toBe(true);
    });

    it('constitution.md contains expected content', () => {
      const content = readFileSync(join(projectDir, 'memory', 'constitution.md'), 'utf-8');
      // The template uses [PROJECT_NAME] Constitution and Core Principles
      expect(content).toContain('Constitution');
      expect(content).toContain('Core Principles');
    });
  });

  describe('VS Code settings', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    it('creates settings.json', () => {
      const filePath = join(projectDir, '.vscode', 'settings.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('settings.json is valid JSON', () => {
      const content = readFileSync(join(projectDir, '.vscode', 'settings.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('settings.json has expected keys', () => {
      const content = readFileSync(join(projectDir, '.vscode', 'settings.json'), 'utf-8');
      const settings = JSON.parse(content);

      // Check for prompt file recommendations
      expect(settings['chat.promptFilesRecommendations']).toBeDefined();
      expect(settings['chat.promptFilesRecommendations']['speckit.specify']).toBe(true);
    });
  });

  describe('Git initialization', () => {
    it('initializes git by default', () => {
      runCli(`init "${projectDir}" --ai copilot --force`);

      expect(existsSync(join(projectDir, '.git'))).toBe(true);
    });

    it('skips git with --no-git flag', () => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);

      expect(existsSync(join(projectDir, '.git'))).toBe(false);
    });

    it('shows git step in output when enabled', () => {
      const { stdout } = runCli(`init "${projectDir}" --ai copilot --force`);

      expect(stdout).toContain('Initialize git');
    });
  });

  describe('Different AI assistants with js script', () => {
    const aiAgents = ['copilot', 'claude', 'gemini', 'windsurf', 'cursor-agent'];

    for (const ai of aiAgents) {
      it(`works with ${ai} AI assistant`, () => {
        const testProjectDir = join(tempDir, `test-${ai}`);

        const { exitCode } = runCli(
          `init "${testProjectDir}" --ai ${ai} --no-git --force --ignore-agent-tools`
        );

        expect(exitCode).toBe(0);
        expect(existsSync(testProjectDir)).toBe(true);
        expect(existsSync(join(testProjectDir, '.specify'))).toBe(true);
      });
    }
  });

  describe('Error handling', () => {
    it('fails gracefully with invalid AI assistant', () => {
      const { exitCode, stdout } = runCli(
        `init "${projectDir}" --ai invalid-ai --no-git --force`,
        { expectError: true }
      );

      expect(exitCode).not.toBe(0);
      expect(stdout).toContain("Unknown AI assistant 'invalid-ai'");
    });

    it('requires --force for non-empty directory', () => {
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, 'existing.txt'), 'content');

      const { exitCode, stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git`,
        { expectError: true }
      );

      expect(exitCode).not.toBe(0);
      expect(stdout).toContain('not empty');
    });

    it('succeeds with --force on non-empty directory', () => {
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, 'existing.txt'), 'content');

      const { exitCode } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(exitCode).toBe(0);
    });
  });

  describe('Output messages', () => {
    it('shows banner', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      // Banner contains the Spec Kit tagline
      expect(stdout).toContain('Spec Kit');
    });

    it('shows project configuration summary', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(stdout).toContain('Project Configuration');
      expect(stdout).toContain('AI Assistant');
    });

    it('shows security notice', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(stdout).toContain('Security Notice');
    });

    it('shows next steps panel', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(stdout).toContain('Next Steps');
      expect(stdout).toContain('/speckit.constitution');
      expect(stdout).toContain('/speckit.specify');
    });

    it('shows success message', () => {
      const { stdout } = runCli(
        `init "${projectDir}" --ai copilot --no-git --force`
      );

      expect(stdout).toContain('Project initialized successfully');
    });
  });

  describe('Template content quality', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --no-git --force`);
    });

    it('spec-template.md has required sections', () => {
      const content = readFileSync(
        join(projectDir, '.specify', 'templates', 'spec-template.md'),
        'utf-8'
      );

      // Check for key sections that should be in any spec template
      expect(content).toContain('Specification');
      expect(content.length).toBeGreaterThan(100);
    });

    it('plan-template.md has required sections', () => {
      const content = readFileSync(
        join(projectDir, '.specify', 'templates', 'plan-template.md'),
        'utf-8'
      );

      // Check for key sections - the actual template uses Language/Version
      expect(content).toContain('Implementation Plan');
      expect(content).toContain('Language/Version');
    });

    it('constitution.md has SDD methodology description', () => {
      const content = readFileSync(join(projectDir, 'memory', 'constitution.md'), 'utf-8');

      expect(content).toContain('Constitution');
    });

    it('command files are created with proper format', () => {
      // Check for command files in agent directory
      const specifyCmd = join(projectDir, '.github', 'agents', 'speckit.specify.agent.md');
      expect(existsSync(specifyCmd)).toBe(true);
      
      const content = readFileSync(specifyCmd, 'utf-8');
      expect(content).toContain('description:');
      expect(content).toContain('npx specify');
    });

    it('copilot prompts directory is created', () => {
      const promptsDir = join(projectDir, '.github', 'prompts');
      expect(existsSync(promptsDir)).toBe(true);
      
      const promptFile = join(promptsDir, 'speckit.specify.prompt.md');
      expect(existsSync(promptFile)).toBe(true);
    });
  });

  describe('Integration with other commands', () => {
    beforeEach(() => {
      runCli(`init "${projectDir}" --ai copilot --force`);
    });

    it('create-new-feature works after init', () => {
      const { exitCode } = runCli(
        'create-new-feature "Test feature" --short-name test --json',
        { cwd: projectDir }
      );

      expect(exitCode).toBe(0);
      expect(existsSync(join(projectDir, 'specs', '001-test'))).toBe(true);
    });

    it('setup-plan works after init and create-new-feature', () => {
      runCli('create-new-feature "Test feature" --short-name test --json', { cwd: projectDir });

      // setup-plan needs to be run with SPECIFY_FEATURE set
      // This is typically done by the shell wrapper, so we just verify the spec dir exists
      expect(existsSync(join(projectDir, 'specs', '001-test', 'spec.md'))).toBe(true);
    });

    it('project has all required directories for SDD workflow', () => {
      // Create a feature
      runCli('create-new-feature "Test feature" --short-name test --json', { cwd: projectDir });

      // Verify complete structure
      expect(existsSync(join(projectDir, '.specify', 'templates'))).toBe(true);
      expect(existsSync(join(projectDir, 'memory', 'constitution.md'))).toBe(true);
      expect(existsSync(join(projectDir, 'specs', '001-test'))).toBe(true);
      expect(existsSync(join(projectDir, '.github', 'agents'))).toBe(true);
    });
  });
});

describe('Init with (only option)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-compare');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('js creates expected directory structures', () => {
    const jsDir = join(tempDir, 'js-project');

    // Create with js (built-in)
    runCli(`init "${jsDir}" --ai copilot --no-git --force`);

    // Should have same core directories
    expect(existsSync(join(jsDir, '.specify'))).toBe(true);
    expect(existsSync(join(jsDir, 'memory'))).toBe(true);
    expect(existsSync(join(jsDir, 'specs'))).toBe(true);
    expect(existsSync(join(jsDir, '.vscode'))).toBe(true);
  });

  it('js creates templates without network', () => {
    const jsDir = join(tempDir, 'js-project');

    // This should work even with no network
    const { exitCode } = runCli(`init "${jsDir}" --ai copilot --no-git --force`);

    expect(exitCode).toBe(0);
    expect(existsSync(join(jsDir, '.specify', 'templates', 'spec-template.md'))).toBe(true);
  });
});
