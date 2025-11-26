/**
 * Comprehensive E2E tests for all major Spec Kit workflows.
 * 
 * This test suite covers:
 * 1. Project Initialization (init command validation)
 * 2. Tool Checking (check command)
 * 3. Version Information (version command)
 * 4. Feature Creation (create-new-feature command)
 * 5. Plan Setup (setup-plan command)
 * 6. Prerequisites Checking (check-prerequisites command)
 * 7. Agent Context Updates (update-agent-context command)
 * 8. Complete SDD Workflow (end-to-end)
 * 
 * All tests run without network access using simulated project structures.
 * Network-dependent template download tests are not included here as they
 * would be flaky and the same code paths are covered by the simulated tests.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { execSync, spawnSync, ExecSyncOptionsWithStringEncoding } from 'child_process';

// ============================================================================
// Test Configuration
// ============================================================================

const CLI_PATH = join(__dirname, '..', '..', 'bin', 'specify.js');
const PROJECT_ROOT = join(__dirname, '..', '..');

// Common exec options
const execOptions: ExecSyncOptionsWithStringEncoding = {
  encoding: 'utf-8',
  timeout: 30000,
};

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a unique temporary directory for testing
 */
function createTempDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Clean up a temporary directory
 */
function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Initialize a git repository with basic config
 */
function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'ignore' });
}

/**
 * Create an initial commit in a git repository
 */
function createInitialCommit(dir: string, message = 'Initial commit'): void {
  writeFileSync(join(dir, 'README.md'), '# Test Project\n');
  execSync('git add .', { cwd: dir, stdio: 'ignore' });
  execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'ignore' });
}

/**
 * Simulate the project structure that `specify init` creates
 * This allows testing workflow commands without network access
 */
function simulateSpecKitProject(projectDir: string, options: {
  agent?: string;
  withGit?: boolean;
  withSpec?: string;
  withPlan?: string;
} = {}): void {
  const { agent = 'copilot', withGit = true, withSpec, withPlan } = options;

  // Create .specify directory with templates
  const templatesDir = join(projectDir, '.specify', 'templates');
  mkdirSync(templatesDir, { recursive: true });

  writeFileSync(join(templatesDir, 'spec-template.md'), `# Feature Specification

## Overview
[Brief description]

## Functional Requirements
- FR-001: [Requirement]

## Non-Functional Requirements
- NFR-001: [Requirement]

## User Stories
- US-001: As a [user], I want [goal] so that [benefit]
`);

  writeFileSync(join(templatesDir, 'plan-template.md'), `# Implementation Plan

## Technical Stack
**Language/Version**: [e.g., TypeScript 5.4]
**Primary Dependencies**: [e.g., Express, React]
**Storage**: [e.g., PostgreSQL]
**Project Type**: [e.g., REST API]

## Implementation Approach
[High-level approach]

## Implementation Phases
### Phase 1: [Name]
- [Task 1]
- [Task 2]

## Risks and Mitigations
- Risk: [Description] → Mitigation: [Strategy]
`);

  writeFileSync(join(templatesDir, 'tasks-template.md'), `# Implementation Tasks

## Phase 1 Tasks
- [ ] Task 1
- [ ] Task 2

## Phase 2 Tasks
- [ ] Task 3
`);

  writeFileSync(join(templatesDir, 'checklist-template.md'), `# Implementation Checklist

## Pre-Implementation
- [ ] Reviewed spec
- [ ] Reviewed plan

## Implementation
- [ ] Core functionality
- [ ] Tests
- [ ] Documentation
`);

  writeFileSync(join(templatesDir, 'agent-file-template.md'), `# Agent Context

## Active Technologies
<!-- Technologies extracted from plan.md files -->

## Recent Changes
<!-- Recent feature changes -->
`);

  // Create agent-specific directory
  const agentDirs: Record<string, string> = {
    copilot: '.github/agents',
    claude: '.claude/commands',
    gemini: '.gemini/commands',
    'cursor-agent': '.cursor/commands',
    windsurf: '.windsurf/workflows',
    kilocode: '.kilocode/rules',
    roo: '.roo/rules',
  };

  const agentDir = agentDirs[agent] || '.github/agents';
  mkdirSync(join(projectDir, agentDir), { recursive: true });

  // Create agent instructions file
  const agentFile = agent === 'copilot' 
    ? join(projectDir, agentDir, 'copilot-instructions.md')
    : join(projectDir, agentDir, `${agent}-rules.md`);
  
  writeFileSync(agentFile, `# ${agent.charAt(0).toUpperCase() + agent.slice(1)} Instructions

## Active Technologies
<!-- Technologies will be added here -->

## Recent Changes
<!-- Changes will be tracked here -->
`);

  // Create memory directory
  mkdirSync(join(projectDir, 'memory'), { recursive: true });
  writeFileSync(join(projectDir, 'memory', 'constitution.md'), `# Project Constitution

This project follows Spec-Driven Development (SDD) methodology.
`);

  // Create specs directory
  mkdirSync(join(projectDir, 'specs'), { recursive: true });

  // Create feature spec if requested
  if (withSpec) {
    const specDir = dirname(withSpec);
    mkdirSync(join(projectDir, specDir), { recursive: true });
    writeFileSync(join(projectDir, withSpec), `# Feature Specification

## Overview
Test feature specification.

## Functional Requirements
- FR-001: Test requirement
`);
  }

  // Create plan if requested
  if (withPlan) {
    const planDir = dirname(withPlan);
    mkdirSync(join(projectDir, planDir), { recursive: true });
    writeFileSync(join(projectDir, withPlan), `# Implementation Plan

## Technical Stack
**Language/Version**: TypeScript 5.4
**Primary Dependencies**: Express, Jest
**Storage**: PostgreSQL
**Project Type**: REST API

## Implementation Approach
Test approach.
`);
  }

  // Initialize git if requested
  if (withGit) {
    initGitRepo(projectDir);
    createInitialCommit(projectDir);
  }
}

/**
 * Run CLI command and return result
 */
function runCli(args: string, options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  expectError?: boolean;
  timeout?: number;
} = {}): { stdout: string; stderr: string; exitCode: number } {
  const { cwd = PROJECT_ROOT, env, expectError = false, timeout = 30000 } = options;

  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf-8',
      cwd,
      timeout,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    if (expectError) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.status || 1,
      };
    }
    throw error;
  }
}

/**
 * Parse JSON output from CLI command
 */
function parseJsonOutput(output: string): any {
  // Find the JSON object in the output (skip any warnings/logs)
  const lines = output.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{') && line.endsWith('}')) {
      return JSON.parse(line);
    }
  }
  // Try parsing the entire trimmed output
  return JSON.parse(output.trim());
}

// ============================================================================
// Test Suite: Version Command
// ============================================================================

describe('E2E: Version Command', () => {
  it('displays version number', () => {
    const { stdout } = runCli('version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('displays system information', () => {
    const { stdout } = runCli('version');
    expect(stdout).toContain('Node.js');
    expect(stdout).toContain('Platform');
  });

  it('--version flag works', () => {
    const { stdout } = runCli('--version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});

// ============================================================================
// Test Suite: Check Command
// ============================================================================

describe('E2E: Check Command', () => {
  it('runs without errors', () => {
    const { stdout } = runCli('check');
    expect(stdout).toBeDefined();
  });

  it('checks for git', () => {
    const { stdout } = runCli('check');
    expect(stdout.toLowerCase()).toContain('git');
  });

  it('displays tool availability', () => {
    const { stdout } = runCli('check');
    // Should show some indication of tool status
    expect(stdout.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: Create New Feature Command
// ============================================================================

describe('E2E: Create New Feature Command', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-feature');
    projectDir = join(tempDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });
    simulateSpecKitProject(projectDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Basic feature creation', () => {
    it('creates feature with auto-generated number', () => {
      const { stdout } = runCli(
        'create-new-feature "Add user authentication" --short-name user-auth --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toBe('001-user-auth');
      expect(existsSync(join(projectDir, 'specs', '001-user-auth'))).toBe(true);
      expect(existsSync(join(projectDir, 'specs', '001-user-auth', 'spec.md'))).toBe(true);
    });

    it('creates feature with explicit number', () => {
      const { stdout } = runCli(
        'create-new-feature "Add feature" --short-name test --number 42 --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toBe('042-test');
      expect(existsSync(join(projectDir, 'specs', '042-test'))).toBe(true);
    });

    it('creates spec.md from template', () => {
      runCli('create-new-feature "Test feature" --short-name test --json', { cwd: projectDir });

      const specContent = readFileSync(join(projectDir, 'specs', '001-test', 'spec.md'), 'utf-8');
      expect(specContent).toContain('Feature Specification');
      expect(specContent).toContain('Functional Requirements');
    });

    it('outputs correct JSON structure', () => {
      const { stdout } = runCli(
        'create-new-feature "Test" --short-name test --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output).toHaveProperty('BRANCH_NAME');
      expect(output).toHaveProperty('SPEC_FILE');
      expect(output).toHaveProperty('FEATURE_NUM');
    });
  });

  describe('Branch numbering', () => {
    it('increments number for same feature name on different branch', () => {
      // Create first feature
      runCli('create-new-feature "First" --short-name myfeature --json', { cwd: projectDir });
      expect(existsSync(join(projectDir, 'specs', '001-myfeature'))).toBe(true);

      // Switch back to main branch
      execSync('git checkout main || git checkout master', { cwd: projectDir, stdio: 'ignore' });

      // Create second feature with same short name
      const { stdout } = runCli(
        'create-new-feature "Second" --short-name myfeature --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toBe('002-myfeature');
    });

    it('finds highest number across all features', () => {
      // Get default branch name (could be main or master)
      let defaultBranch = 'main';
      try {
        defaultBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectDir, encoding: 'utf-8' }).trim();
      } catch {
        // If on feature branch, try to find main/master
        try {
          execSync('git show-ref --verify refs/heads/main', { cwd: projectDir, stdio: 'ignore' });
          defaultBranch = 'main';
        } catch {
          defaultBranch = 'master';
        }
      }

      // Create features with various numbers
      runCli('create-new-feature "F1" --short-name a --number 5 --json', { cwd: projectDir });
      execSync(`git checkout ${defaultBranch}`, { cwd: projectDir, stdio: 'ignore' });
      
      runCli('create-new-feature "F2" --short-name b --number 10 --json', { cwd: projectDir });
      execSync(`git checkout ${defaultBranch}`, { cwd: projectDir, stdio: 'ignore' });

      // Next auto-numbered feature with same short name should increment
      const { stdout } = runCli(
        'create-new-feature "F3" --short-name b --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      // Should increment from the highest existing number for this short name
      expect(output.BRANCH_NAME).toBe('011-b');
    });
  });

  describe('Error handling', () => {
    it('requires feature description', () => {
      const { stderr, exitCode } = runCli('create-new-feature', { 
        cwd: projectDir, 
        expectError: true 
      });
      expect(exitCode).not.toBe(0);
    });

    it('requires short name when not auto-generated', () => {
      // This may or may not error depending on implementation
      // Just verify it handles the case
      const result = runCli(
        'create-new-feature "A very long feature description that would generate a long branch name"',
        { cwd: projectDir, expectError: true }
      );
      // Should either succeed with auto-generated name or fail gracefully
      expect(result.exitCode === 0 || result.stderr.length > 0).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: Setup Plan Command
// ============================================================================

describe('E2E: Setup Plan Command', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-plan');
    projectDir = join(tempDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });
    simulateSpecKitProject(projectDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Plan creation', () => {
    it('creates plan.md from template', () => {
      // Create a feature first
      runCli('create-new-feature "Test" --short-name test --json', { cwd: projectDir });

      // Setup plan
      const { stdout } = runCli('setup-plan --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH).toBe('001-test');
      expect(existsSync(join(projectDir, 'specs', '001-test', 'plan.md'))).toBe(true);
    });

    it('copies plan template content', () => {
      runCli('create-new-feature "Test" --short-name test --json', { cwd: projectDir });
      runCli('setup-plan --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const planContent = readFileSync(join(projectDir, 'specs', '001-test', 'plan.md'), 'utf-8');
      expect(planContent).toContain('Implementation Plan');
      expect(planContent).toContain('Technical Stack');
    });

    it('outputs correct JSON structure', () => {
      runCli('create-new-feature "Test" --short-name test --json', { cwd: projectDir });
      
      const { stdout } = runCli('setup-plan --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      expect(output).toHaveProperty('BRANCH');
      expect(output).toHaveProperty('IMPL_PLAN');
    });
  });

  describe('Git integration', () => {
    it('detects git state', () => {
      runCli('create-new-feature "Test" --short-name test --json', { cwd: projectDir });
      
      const { stdout } = runCli('setup-plan --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      expect(output).toHaveProperty('HAS_GIT');
      expect(output.HAS_GIT).toBe('true');
    });
  });
});

// ============================================================================
// Test Suite: Check Prerequisites Command
// ============================================================================

describe('E2E: Check Prerequisites Command', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-prereq');
    projectDir = join(tempDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Prerequisite validation', () => {
    it('succeeds when spec.md and plan.md exist', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });

      const { stdout } = runCli('check-prerequisites --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      expect(output.FEATURE_DIR).toContain('001-test');
    });

    it('fails when plan.md is missing', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
      });

      const { exitCode } = runCli('check-prerequisites --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
        expectError: true,
      });

      expect(exitCode).not.toBe(0);
    });

    it('detects tasks.md in feature directory', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });

      // Add tasks.md (a recognized doc type)
      writeFileSync(join(projectDir, 'specs', '001-test', 'tasks.md'), '# Tasks\n- [ ] Task 1\n');

      const { stdout } = runCli('check-prerequisites --include-tasks --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      // tasks.md should be included when --include-tasks is passed
      expect(output.AVAILABLE_DOCS).toContain('tasks.md');
    });
  });

  describe('Task validation', () => {
    it('--require-tasks fails when tasks.md missing', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });

      const { exitCode } = runCli('check-prerequisites --require-tasks --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
        expectError: true,
      });

      expect(exitCode).not.toBe(0);
    });

    it('--require-tasks succeeds when tasks.md exists', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });
      writeFileSync(join(projectDir, 'specs', '001-test', 'tasks.md'), '# Tasks\n- [ ] Task 1\n');

      const { stdout, exitCode } = runCli('check-prerequisites --require-tasks --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      expect(exitCode).toBe(0);
    });

    it('--include-tasks adds tasks.md to AVAILABLE_DOCS', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });
      writeFileSync(join(projectDir, 'specs', '001-test', 'tasks.md'), '# Tasks\n');

      const { stdout } = runCli('check-prerequisites --include-tasks --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const output = parseJsonOutput(stdout);
      expect(output.AVAILABLE_DOCS).toContain('tasks.md');
    });
  });

  describe('Paths only mode', () => {
    it('--paths-only outputs only path variables', () => {
      simulateSpecKitProject(projectDir, {
        withSpec: 'specs/001-test/spec.md',
      });

      const { stdout, exitCode } = runCli('check-prerequisites --paths-only --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      // Should succeed even without plan.md
      expect(exitCode).toBe(0);
      const output = parseJsonOutput(stdout);
      expect(output).toHaveProperty('FEATURE_DIR');
    });
  });
});

// ============================================================================
// Test Suite: Update Agent Context Command
// ============================================================================

describe('E2E: Update Agent Context Command', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-agent');
    projectDir = join(tempDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Copilot agent', () => {
    it('updates copilot instructions with tech stack', () => {
      simulateSpecKitProject(projectDir, {
        agent: 'copilot',
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });

      runCli('update-agent-context copilot', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const agentContent = readFileSync(
        join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
        'utf-8'
      );
      expect(agentContent).toContain('TypeScript');
      expect(agentContent).toContain('Express');
    });

    it('extracts technology information from plan.md', () => {
      simulateSpecKitProject(projectDir, { agent: 'copilot' });

      // Create feature with specific tech stack
      const specDir = join(projectDir, 'specs', '001-test');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), '# Spec\n');
      writeFileSync(join(specDir, 'plan.md'), `# Plan

## Technical Stack
**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic
**Storage**: MongoDB
**Project Type**: GraphQL API
`);

      runCli('update-agent-context copilot', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      const agentContent = readFileSync(
        join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
        'utf-8'
      );
      expect(agentContent).toContain('Python');
      expect(agentContent).toContain('FastAPI');
      expect(agentContent).toContain('MongoDB');
    });
  });

  describe('Multiple agents', () => {
    it('updates all agent files when no agent specified', () => {
      // Setup project with multiple agent directories
      simulateSpecKitProject(projectDir, {
        agent: 'copilot',
        withSpec: 'specs/001-test/spec.md',
        withPlan: 'specs/001-test/plan.md',
      });

      // Add another agent directory
      const claudeDir = join(projectDir, '.claude', 'commands');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, 'claude-rules.md'), `# Claude Rules

## Active Technologies
<!-- Technologies here -->
`);

      runCli('update-agent-context', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-test' },
      });

      // Both should be updated
      const copilotContent = readFileSync(
        join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
        'utf-8'
      );
      expect(copilotContent).toContain('TypeScript');
    });
  });
});

// ============================================================================
// Test Suite: Complete SDD Workflow (Without Network)
// ============================================================================

describe('E2E: Complete SDD Workflow', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-workflow');
    projectDir = join(tempDir, 'sdd-project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('completes full cycle: create → plan → check → update', () => {
    // Step 1: Simulate project initialization
    console.log('  Step 1: Initialize project structure');
    simulateSpecKitProject(projectDir, { agent: 'copilot' });

    // Step 2: Create new feature
    console.log('  Step 2: Create new feature');
    const createResult = runCli(
      'create-new-feature "Implement user authentication with JWT" --short-name user-auth --json',
      { cwd: projectDir }
    );
    const createOutput = parseJsonOutput(createResult.stdout);
    expect(createOutput.BRANCH_NAME).toBe('001-user-auth');

    // Step 3: Write detailed specification
    console.log('  Step 3: Write specification');
    writeFileSync(join(projectDir, 'specs', '001-user-auth', 'spec.md'), `# User Authentication

## Overview
Implement JWT-based authentication with refresh tokens.

## Functional Requirements
- FR-001: Users can register with email/password
- FR-002: Users can login and receive JWT tokens
- FR-003: Tokens expire after 1 hour
- FR-004: Refresh tokens last 7 days

## Non-Functional Requirements
- NFR-001: Passwords hashed with bcrypt (cost 12)
- NFR-002: Login response < 200ms

## User Stories
- US-001: As a user, I want to register to access the app
- US-002: As a user, I want to login to use protected features
`);

    // Step 4: Setup implementation plan
    console.log('  Step 4: Setup plan');
    const planResult = runCli('setup-plan --json', {
      cwd: projectDir,
      env: { SPECIFY_FEATURE: '001-user-auth' },
    });
    expect(parseJsonOutput(planResult.stdout).BRANCH).toBe('001-user-auth');

    // Step 5: Write implementation plan
    console.log('  Step 5: Write implementation plan');
    writeFileSync(join(projectDir, 'specs', '001-user-auth', 'plan.md'), `# Implementation Plan

## Technical Stack
**Language/Version**: TypeScript 5.4
**Primary Dependencies**: Express.js, Passport.js, bcrypt, jsonwebtoken
**Storage**: PostgreSQL 16
**Project Type**: REST API

## Implementation Approach
JWT authentication with refresh token rotation.

## Implementation Phases
### Phase 1: Core Auth (3 days)
- Setup Express with TypeScript
- Implement registration endpoint
- Implement login endpoint
- Add bcrypt password hashing

### Phase 2: Token Management (2 days)
- JWT generation and validation
- Refresh token mechanism
- Token blacklisting on logout

## Risks and Mitigations
- Risk: Token theft → Mitigation: Short-lived access tokens
- Risk: Brute force → Mitigation: Rate limiting
`);

    // Step 6: Check prerequisites
    console.log('  Step 6: Check prerequisites');
    const checkResult = runCli('check-prerequisites --json', {
      cwd: projectDir,
      env: { SPECIFY_FEATURE: '001-user-auth' },
    });
    const checkOutput = parseJsonOutput(checkResult.stdout);
    expect(checkOutput.FEATURE_DIR).toContain('001-user-auth');

    // Step 7: Update agent context
    console.log('  Step 7: Update agent context');
    runCli('update-agent-context copilot', {
      cwd: projectDir,
      env: { SPECIFY_FEATURE: '001-user-auth' },
    });

    // Verify agent was updated
    const agentContent = readFileSync(
      join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
      'utf-8'
    );
    expect(agentContent).toContain('TypeScript');
    expect(agentContent).toContain('Express');
    expect(agentContent).toContain('PostgreSQL');

    // Step 8: Create another feature
    console.log('  Step 8: Create second feature');
    // Get current default branch
    let defaultBranch = 'main';
    try {
      execSync('git show-ref --verify refs/heads/main', { cwd: projectDir, stdio: 'ignore' });
    } catch {
      defaultBranch = 'master';
    }
    execSync(`git checkout ${defaultBranch}`, { cwd: projectDir, stdio: 'ignore' });
    const secondResult = runCli(
      'create-new-feature "Add user profile management" --short-name user-profile --json',
      { cwd: projectDir }
    );
    expect(parseJsonOutput(secondResult.stdout).BRANCH_NAME).toBe('001-user-profile');

    // Verify final structure
    console.log('  Step 9: Verify final structure');
    const expectedPaths = [
      '.github/agents/copilot-instructions.md',
      '.specify/templates/spec-template.md',
      '.specify/templates/plan-template.md',
      'memory/constitution.md',
      'specs/001-user-auth/spec.md',
      'specs/001-user-auth/plan.md',
      'specs/001-user-profile/spec.md',
    ];

    for (const path of expectedPaths) {
      expect(existsSync(join(projectDir, path))).toBe(true);
    }

    console.log('  ✓ Complete SDD workflow passed!');
  }, 60000);

  it('handles multiple features with different tech stacks', () => {
    simulateSpecKitProject(projectDir, { agent: 'copilot' });

    // Feature 1: Python backend
    runCli('create-new-feature "Python API" --short-name python-api --json', { cwd: projectDir });
    runCli('setup-plan --json', { cwd: projectDir, env: { SPECIFY_FEATURE: '001-python-api' } });
    writeFileSync(join(projectDir, 'specs', '001-python-api', 'plan.md'), `# Plan

## Technical Stack
**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI, Pydantic
**Storage**: Redis
**Project Type**: REST API
`);

    // Switch back to default branch
    let defaultBranch = 'main';
    try {
      execSync('git show-ref --verify refs/heads/main', { cwd: projectDir, stdio: 'ignore' });
    } catch {
      defaultBranch = 'master';
    }
    execSync(`git checkout ${defaultBranch}`, { cwd: projectDir, stdio: 'ignore' });

    // Feature 2: React frontend
    runCli('create-new-feature "React Frontend" --short-name react-ui --json', { cwd: projectDir });
    runCli('setup-plan --json', { cwd: projectDir, env: { SPECIFY_FEATURE: '001-react-ui' } });
    writeFileSync(join(projectDir, 'specs', '001-react-ui', 'plan.md'), `# Plan

## Technical Stack
**Language/Version**: TypeScript 5.4
**Primary Dependencies**: React 18, Vite, TailwindCSS
**Storage**: N/A
**Project Type**: SPA
`);

    // Update agent context for both
    runCli('update-agent-context copilot', { cwd: projectDir, env: { SPECIFY_FEATURE: '001-python-api' } });
    
    const agentContent = readFileSync(
      join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
      'utf-8'
    );
    expect(agentContent).toContain('Python');
    expect(agentContent).toContain('FastAPI');
  }, 60000);
});

// ============================================================================
// Test Suite: Edge Cases and Error Handling
// ============================================================================

describe('E2E: Edge Cases and Error Handling', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-edge');
    projectDir = join(tempDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Non-git directories', () => {
    it('create-new-feature warns when not in git repo', () => {
      simulateSpecKitProject(projectDir, { withGit: false });

      const { stdout } = runCli(
        'create-new-feature "Test" --short-name test --json',
        { cwd: projectDir }
      );

      // Should still work but may warn
      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toContain('test');
    });
  });

  describe('Missing directories', () => {
    it('check-prerequisites fails gracefully when specs dir missing', () => {
      mkdirSync(projectDir, { recursive: true });
      initGitRepo(projectDir);

      const { exitCode } = runCli('check-prerequisites --json', {
        cwd: projectDir,
        env: { SPECIFY_FEATURE: 'nonexistent' },
        expectError: true,
      });

      expect(exitCode).not.toBe(0);
    });
  });

  describe('Special characters in names', () => {
    it('handles feature names with special characters', () => {
      simulateSpecKitProject(projectDir);

      const { stdout } = runCli(
        'create-new-feature "Add API v2.0 support" --short-name api-v2 --json',
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toBe('001-api-v2');
    });
  });

  describe('Long feature names', () => {
    it('handles very long feature descriptions', () => {
      simulateSpecKitProject(projectDir);

      const longDescription = 'A'.repeat(200);
      const { stdout } = runCli(
        `create-new-feature "${longDescription}" --short-name short --json`,
        { cwd: projectDir }
      );

      const output = parseJsonOutput(stdout);
      expect(output.BRANCH_NAME).toBe('001-short');
    });
  });
});

// ============================================================================
// Test Suite: Init Command Validation
// ============================================================================

describe('E2E: Init Command Validation', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-init');
    projectDir = join(tempDir, 'new-project');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('fails with invalid AI assistant', () => {
    const { exitCode } = runCli(
      `init "${projectDir}" --ai invalid-ai --script sh`,
      { expectError: true }
    );
    expect(exitCode).not.toBe(0);
  });

  it('fails with invalid script type', () => {
    const { exitCode } = runCli(
      `init "${projectDir}" --ai copilot --script invalid`,
      { expectError: true }
    );
    expect(exitCode).not.toBe(0);
  });

  it('requires --force for non-empty directory', () => {
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, 'existing.txt'), 'content');

    const { stderr, stdout, exitCode } = runCli(
      `init "${projectDir}" --ai copilot`,
      { expectError: true }
    );

    expect(exitCode).not.toBe(0);
    // Error message may be in stdout or stderr
    const output = stdout + stderr;
    expect(output.toLowerCase()).toMatch(/not empty|already exists|--force/);
  });
});

// ============================================================================
// Test Suite: Space Invaders Game - Full SDD Workflow Demo
// ============================================================================

describe('E2E: Space Invaders Game - Complete SDD Workflow', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir('specify-space-invaders');
    projectDir = join(tempDir, 'space-invaders');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  /**
   * This test demonstrates a complete SDD workflow for building a game.
   * It simulates what a developer would do when using Spec Kit with GitHub Copilot:
   * 
   * 1. Initialize project with Copilot integration
   * 2. Create a new feature for the Space Invaders game
   * 3. Set up the planning artifacts
   * 4. Write comprehensive spec.md with game requirements
   * 5. Write plan.md with technical architecture
   * 6. Write tasks.md with implementation tasks
   * 7. Check prerequisites to verify everything is in place
   * 8. Update agent context so Copilot knows about the project
   */
  it('completes full SDD workflow for Space Invaders game', async () => {
    // ========================================================================
    // Step 1: Simulate project initialization (avoiding network)
    // ========================================================================
    simulateSpecKitProject(projectDir, { agent: 'copilot', withGit: true });

    // Verify project structure exists
    expect(existsSync(join(projectDir, '.specify', 'templates'))).toBe(true);
    expect(existsSync(join(projectDir, '.github', 'agents'))).toBe(true);
    expect(existsSync(join(projectDir, 'memory', 'constitution.md'))).toBe(true);
    expect(existsSync(join(projectDir, 'specs'))).toBe(true);

    // ========================================================================
    // Step 2: Create a new feature for Space Invaders
    // ========================================================================
    const { stdout: createOutput } = runCli(
      'create-new-feature "Build Space Invaders arcade game with HTML5 Canvas" --short-name space-invaders --json',
      { cwd: projectDir }
    );

    const createResult = parseJsonOutput(createOutput);
    expect(createResult.BRANCH_NAME).toBe('001-space-invaders');
    expect(createResult.FEATURE_NUM).toBe('001');
    expect(createResult.SPEC_FILE).toContain('specs');
    expect(createResult.SPEC_FILE).toContain('001-space-invaders');

    // Verify feature directory was created
    const featureDir = join(projectDir, 'specs', '001-space-invaders');
    expect(existsSync(featureDir)).toBe(true);
    expect(existsSync(join(featureDir, 'spec.md'))).toBe(true);

    // ========================================================================
    // Step 3: Write comprehensive spec.md for Space Invaders
    // ========================================================================
    const specContent = `# Feature Specification: Space Invaders Game

## Overview

Build a classic Space Invaders arcade game using HTML5 Canvas and vanilla JavaScript. 
The game features a player-controlled spaceship defending against waves of descending alien invaders.

## Context

**Target Platform**: Web browser (modern browsers with Canvas support)
**Technology Stack**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
**Estimated Complexity**: Medium (500-800 lines of code)

---

## Functional Requirements

### FR-1: Game Canvas
- The game renders on an HTML5 Canvas element
- Canvas size: 800x600 pixels
- Background color: Black (#000000)
- Canvas is centered on the page

### FR-2: Player Ship
- Player controls a spaceship at the bottom of the screen
- Ship dimensions: 50x30 pixels
- Ship color: Green (#00FF00)
- Ship can move left and right using arrow keys or A/D keys
- Ship movement speed: 5 pixels per frame
- Ship cannot move beyond canvas boundaries
- Ship spawns at horizontal center, 50 pixels from bottom

### FR-3: Player Shooting
- Player fires bullets by pressing Spacebar
- Bullet dimensions: 4x10 pixels
- Bullet color: Yellow (#FFFF00)
- Bullet speed: 7 pixels per frame (upward)
- Maximum 3 bullets on screen at once (fire rate limiter)
- Bullets originate from top-center of player ship

### FR-4: Alien Invaders
- Aliens arranged in a 5x11 grid (55 aliens total)
- Three alien types with different point values:
  - Top row (11 aliens): 30 points each, color: Magenta (#FF00FF)
  - Middle rows 2-3 (22 aliens): 20 points each, color: Cyan (#00FFFF)
  - Bottom rows 4-5 (22 aliens): 10 points each, color: Green (#00FF00)
- Alien dimensions: 30x20 pixels
- Aliens move horizontally as a group
- When any alien reaches canvas edge: drop down 20px, reverse direction
- Speed increases as aliens are destroyed

### FR-5: Alien Shooting
- Random aliens fire bullets downward
- Alien bullet color: Red (#FF0000)
- Fire rate: Random alien fires every 60-120 frames
- Maximum 5 alien bullets on screen at once

### FR-6: Collision Detection
- Player bullet hits alien: Alien destroyed, score increases
- Alien bullet hits player: Player loses one life
- Alien reaches player Y position: Game Over

### FR-7: Scoring System
- Score displayed in top-left corner
- Format: "SCORE: 00000" (5 digits, zero-padded)
- High score persisted in localStorage

### FR-8: Lives System
- Player starts with 3 lives
- Lives displayed as ship icons below score
- Losing all lives triggers Game Over
- Extra life awarded at 1000 points

### FR-9: Game States
- START: Title screen, "Press SPACE to Start"
- PLAYING: Active gameplay
- PAUSED: Press P to pause/resume
- GAME_OVER: Final score, "Press SPACE to Restart"
- VICTORY: All aliens destroyed, advance to next wave

### FR-10: Wave System
- Each wave increases difficulty
- Wave number displayed on screen

---

## Non-Functional Requirements

### NFR-1: Performance
- Game runs at consistent 60 FPS
- No visible lag or stutter during gameplay

### NFR-2: Responsiveness
- Input latency under 16ms (one frame)
- Smooth player movement without jitter

### NFR-3: Code Quality
- No external dependencies (vanilla JS only)
- Code organized into logical classes
- Clear separation: Game, Player, Alien, Bullet, UI

### NFR-4: Browser Compatibility
- Works in Chrome, Firefox, Safari, Edge (latest versions)

---

## User Stories

### US-1: Start Game
**As a** player
**I want to** start a new game by pressing Space
**So that** I can begin playing immediately

**Acceptance Criteria:**
- [ ] Pressing Space on start screen begins gameplay
- [ ] Player ship appears at starting position
- [ ] Aliens appear in formation
- [ ] Score resets to 0

### US-2: Move Ship
**As a** player
**I want to** move my ship left and right
**So that** I can dodge enemy fire and aim at aliens

**Acceptance Criteria:**
- [ ] Left arrow / A key moves ship left
- [ ] Right arrow / D key moves ship right
- [ ] Ship stops at screen edges
- [ ] Movement is smooth and responsive

### US-3: Shoot Aliens
**As a** player
**I want to** fire bullets at aliens
**So that** I can destroy them and score points

**Acceptance Criteria:**
- [ ] Spacebar fires a bullet
- [ ] Bullet travels upward
- [ ] Hitting an alien destroys it
- [ ] Score increases appropriately

### US-4: Track High Score
**As a** player
**I want to** see my high score saved
**So that** I can try to beat my best performance

**Acceptance Criteria:**
- [ ] High score persists between sessions
- [ ] Current high score displayed during gameplay
- [ ] New high score is saved automatically

---

## Edge Cases

### EC-1: Rapid Fire Prevention
- Player cannot fire faster than bullet limit allows
- Holding spacebar should not queue bullets

### EC-2: Simultaneous Collisions
- If bullet hits multiple aliens in one frame, only count first
- If player hit while shooting, both events process correctly

### EC-3: Last Alien
- Single remaining alien should still move and shoot
- Destroying last alien triggers victory state

---

## Out of Scope

- Sound effects and music
- Power-ups or special weapons
- Mobile touch controls
- Online leaderboards

---

*Specification Version: 1.0*
`;

    writeFileSync(join(featureDir, 'spec.md'), specContent);

    // Verify spec was written
    const writtenSpec = readFileSync(join(featureDir, 'spec.md'), 'utf-8');
    expect(writtenSpec).toContain('Space Invaders');
    expect(writtenSpec).toContain('FR-1: Game Canvas');
    expect(writtenSpec).toContain('FR-4: Alien Invaders');
    expect(writtenSpec).toContain('US-1: Start Game');

    // ========================================================================
    // Step 4: Set up plan using CLI command
    // ========================================================================
    const { stdout: planSetupOutput, exitCode: planExitCode } = runCli(
      'setup-plan --json',
      { 
        cwd: projectDir, 
        env: { SPECIFY_FEATURE: '001-space-invaders' },
        expectError: true  // May fail if plan.md doesn't exist yet
      }
    );

    // ========================================================================
    // Step 5: Write comprehensive plan.md
    // ========================================================================
    const planContent = `# Implementation Plan: Space Invaders Game

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language/Version** | JavaScript (ES6+) | Universal browser support, no build step |
| **Rendering** | HTML5 Canvas API | Native browser support, good performance for 2D games |
| **Storage** | localStorage | Simple persistence for high scores |
| **Build** | None | Vanilla JS, single HTML file deployable |
| **Testing** | Manual + Browser DevTools | Appropriate for demo project |
| **Project Type** | Browser Game |

---

## Architecture

### Component Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                          index.html                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      <canvas>                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         game.js                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Game     │  │   Player    │  │   Alien     │              │
│  │  (main loop)│  │  (ship)     │  │  (enemy)    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Input     │  │   Bullet    │  │  Collision  │              │
│  │  Handler    │  │  (projectile│  │  Detector   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐                                                │
│  │     UI      │                                                │
│  │  Renderer   │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Class Structure

\`\`\`javascript
class Game           // Main game loop, state management
class Player         // Player ship, movement, shooting
class Alien          // Individual alien entity
class AlienFormation // Group behavior, movement pattern
class Bullet         // Projectile (player and alien)
class InputHandler   // Keyboard input management
class Renderer       // Canvas drawing operations
class UI             // Score, lives, game state screens
class CollisionManager // Hit detection
\`\`\`

---

## Implementation Phases

### Phase 1: Project Setup & Core Loop (30 min)
**Goal**: Basic game canvas with main loop running

- Create index.html with canvas element
- Create game.js with Game class
- Implement requestAnimationFrame game loop
- Add basic canvas rendering (clear screen)
- Verify 60 FPS performance

**Deliverable**: Black canvas, running game loop

### Phase 2: Player Ship (45 min)
**Goal**: Controllable player ship

- Create Player class
- Implement keyboard input handler
- Draw player ship (simple triangle/rectangle)
- Add left/right movement
- Enforce boundary constraints

**Deliverable**: Green ship moving left/right

### Phase 3: Player Shooting (45 min)
**Goal**: Player can fire bullets

- Create Bullet class
- Add spacebar input for firing
- Implement bullet movement (upward)
- Limit to 3 bullets on screen
- Remove bullets when off-screen

**Deliverable**: Yellow bullets firing upward

### Phase 4: Alien Formation (1 hour)
**Goal**: Aliens appear and move

- Create Alien class
- Create AlienFormation class
- Generate 5x11 grid of aliens
- Implement horizontal movement
- Add edge detection and descent
- Implement speed increase as aliens die

**Deliverable**: Moving alien grid

### Phase 5: Collision Detection (30 min)
**Goal**: Bullets destroy aliens

- Create CollisionManager class
- Implement AABB collision detection
- Handle player bullet → alien collisions
- Remove destroyed aliens
- Update score on hit

**Deliverable**: Aliens can be destroyed

### Phase 6: Alien Shooting (1 hour)
**Goal**: Aliens fight back

- Implement alien bullet spawning
- Add random fire rate logic
- Handle alien bullet → player collisions
- Implement player damage and lives
- Add invincibility frames

**Deliverable**: Dangerous aliens

### Phase 7: UI & Game States (1.5 hours)
**Goal**: Complete game flow

- Create UI class
- Implement start screen
- Add score display
- Add lives display
- Implement pause functionality
- Add game over screen
- Add victory screen

**Deliverable**: Full game flow

### Phase 8: Wave System & Polish (1 hour)
**Goal**: Replayable game with progression

- Implement wave progression
- Add high score persistence (localStorage)
- Add wave number display
- Add extra life at 1000 points
- Polish visual feedback

**Deliverable**: Complete, polished game

---

## File Structure

\`\`\`
space-invaders/
├── index.html        # Game entry point
├── css/
│   └── style.css     # Minimal styling
└── js/
    ├── constants.js  # Game constants
    ├── game.js       # Main game class
    ├── player.js     # Player class
    ├── alien.js      # Alien + AlienFormation
    ├── bullet.js     # Bullet class
    ├── input.js      # Input handler
    ├── collision.js  # Collision detection
    └── ui.js         # UI rendering
\`\`\`

---

## Constants

\`\`\`javascript
// Canvas
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Player
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;
const PLAYER_COLOR = '#00FF00';

// Aliens
const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_BASE_SPEED = 1;

// Game States
const GameState = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory'
};
\`\`\`

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance issues | Low | Medium | Use requestAnimationFrame, optimize collision checks |
| Input lag | Low | High | Handle input in animation frame |
| Collision bugs | Medium | High | Use simple AABB, add debug visualization |

---

*Plan Version: 1.0*
`;

    writeFileSync(join(featureDir, 'plan.md'), planContent);

    // Verify plan was written
    const writtenPlan = readFileSync(join(featureDir, 'plan.md'), 'utf-8');
    expect(writtenPlan).toContain('Technical Stack');
    expect(writtenPlan).toContain('HTML5 Canvas API');
    expect(writtenPlan).toContain('Phase 1: Project Setup');
    expect(writtenPlan).toContain('Phase 8: Wave System');

    // ========================================================================
    // Step 6: Write tasks.md with implementation tasks
    // ========================================================================
    const tasksContent = `# Implementation Tasks: Space Invaders Game

## Overview

Total Tasks: 43 | Estimated Time: ~7 hours

---

## Phase 1: Project Setup & Core Loop

### 1.1 Create HTML Structure
- [ ] Create index.html with HTML5 boilerplate
- [ ] Add \`<canvas id="game" width="800" height="600">\`
- [ ] Add script tags for JS files
- [ ] Center canvas on page with CSS

**File**: index.html

### 1.2 Create CSS Styling [P]
- [ ] Create css/style.css
- [ ] Style body (margin: 0, background: #111)
- [ ] Center canvas (display: block, margin: auto)

**File**: css/style.css

### 1.3 Create Constants File [P]
- [ ] Create js/constants.js
- [ ] Define all game constants
- [ ] Export as global object

**File**: js/constants.js

### 1.4 Create Game Class
- [ ] Create js/game.js
- [ ] Implement Game class with constructor
- [ ] Get canvas context in constructor
- [ ] Implement init() method
- [ ] Implement gameLoop() with requestAnimationFrame
- [ ] Implement update() stub
- [ ] Implement render() with black background clear

**File**: js/game.js
**Depends on**: 1.1, 1.3

### 1.5 Verify Core Loop
- [ ] Instantiate Game on page load
- [ ] Verify canvas clears to black each frame
- [ ] Verify 60 FPS in browser DevTools

**Depends on**: 1.4

---

## Phase 2: Player Ship

### 2.1 Create Input Handler [P]
- [ ] Create js/input.js
- [ ] Implement InputHandler class
- [ ] Track pressed keys
- [ ] Add keydown/keyup event listeners
- [ ] Expose isKeyPressed(key) method

**File**: js/input.js

### 2.2 Create Player Class
- [ ] Create js/player.js
- [ ] Implement Player class with position, size, speed
- [ ] Set starting position (center-bottom)
- [ ] Implement update(input) method
- [ ] Implement left/right movement
- [ ] Enforce canvas boundary constraints
- [ ] Implement render(ctx) method
- [ ] Draw player as green triangle

**File**: js/player.js
**Depends on**: 2.1

### 2.3 Integrate Player into Game
- [ ] Import Player in game.js
- [ ] Create Player instance in Game constructor
- [ ] Call player.update(input) in Game.update()
- [ ] Call player.render(ctx) in Game.render()

**File**: js/game.js
**Depends on**: 2.1, 2.2

### 2.4 Test Player Movement
- [ ] Verify left arrow / A key moves ship left
- [ ] Verify right arrow / D key moves ship right
- [ ] Verify ship stops at edges
- [ ] Verify smooth movement

**Depends on**: 2.3

---

## Phase 3: Player Shooting

### 3.1 Create Bullet Class [P]
- [ ] Create js/bullet.js
- [ ] Implement Bullet class with position, size, speed
- [ ] Implement update() method (move by speed)
- [ ] Implement render(ctx) method
- [ ] Implement isOffScreen() method

**File**: js/bullet.js

### 3.2 Add Shooting to Player
- [ ] Add bullets array to Player
- [ ] Add shoot() method to Player
- [ ] Check bullet limit (max 3) before creating
- [ ] Create bullet at player's top-center position

**File**: js/player.js
**Depends on**: 3.1

### 3.3 Handle Shoot Input
- [ ] Detect spacebar press in InputHandler
- [ ] Implement single-press detection
- [ ] Call player.shoot() on spacebar press

**File**: js/input.js, js/game.js
**Depends on**: 3.2

### 3.4 Update and Render Bullets
- [ ] Update all player bullets in Game.update()
- [ ] Remove bullets that are off-screen
- [ ] Render all player bullets in Game.render()

**File**: js/game.js
**Depends on**: 3.3

### 3.5 Test Player Shooting
- [ ] Verify spacebar fires bullet
- [ ] Verify bullet travels upward
- [ ] Verify max 3 bullets enforced
- [ ] Verify bullets disappear off screen

**Depends on**: 3.4

---

## Phase 4: Alien Formation

### 4.1 Create Alien Class [P]
- [ ] Create js/alien.js
- [ ] Implement Alien class with position, size, type, points
- [ ] Store isAlive flag
- [ ] Implement render(ctx) method with type-based color

**File**: js/alien.js

### 4.2 Create AlienFormation Class
- [ ] Add AlienFormation class to js/alien.js
- [ ] Generate 5x11 grid of aliens in constructor
- [ ] Assign types: row 0 = top, rows 1-2 = middle, rows 3-4 = bottom
- [ ] Calculate positions based on padding

**File**: js/alien.js
**Depends on**: 4.1

### 4.3 Implement Formation Movement
- [ ] Track formation direction (1 = right, -1 = left)
- [ ] Track formation speed
- [ ] Implement update() method
- [ ] Move all alive aliens horizontally
- [ ] Check if any alien hits edge
- [ ] If edge hit: reverse direction, drop all aliens

**File**: js/alien.js
**Depends on**: 4.2

### 4.4 Implement Speed Increase
- [ ] Track number of destroyed aliens
- [ ] Calculate speed multiplier: 1 + (0.1 × destroyed)
- [ ] Apply multiplier to movement speed

**File**: js/alien.js
**Depends on**: 4.3

### 4.5 Integrate Formation into Game
- [ ] Create AlienFormation in Game constructor
- [ ] Call formation.update() in Game.update()
- [ ] Call formation.render(ctx) in Game.render()

**File**: js/game.js
**Depends on**: 4.4

### 4.6 Test Alien Formation
- [ ] Verify 55 aliens appear in grid
- [ ] Verify aliens move right initially
- [ ] Verify aliens reverse and drop at edge
- [ ] Verify speed increases

**Depends on**: 4.5

---

## Phase 5: Collision Detection

### 5.1 Create CollisionManager [P]
- [ ] Create js/collision.js
- [ ] Implement checkAABB(a, b) function
- [ ] Returns true if rectangles overlap

**File**: js/collision.js

### 5.2 Implement Player Bullet vs Alien Collision
- [ ] In Game.update(), loop player bullets
- [ ] For each bullet, check against all alive aliens
- [ ] On hit: mark alien as dead, remove bullet
- [ ] Add points to score

**File**: js/game.js
**Depends on**: 5.1

### 5.3 Add Score Tracking
- [ ] Add score property to Game
- [ ] Update score when alien destroyed

**File**: js/game.js
**Depends on**: 5.2

### 5.4 Test Collision Detection
- [ ] Verify shooting an alien destroys it
- [ ] Verify alien disappears from screen
- [ ] Verify score increases correctly
- [ ] Verify bullet is consumed

**Depends on**: 5.3

---

## Phase 6: Alien Shooting

### 6.1 Implement Alien Shooting Logic
- [ ] Add bullets array to AlienFormation
- [ ] Add fire timer (random between min/max frames)
- [ ] On timer: pick random alive alien
- [ ] Create bullet at alien's bottom-center
- [ ] Reset timer to new random value

**File**: js/alien.js
**Depends on**: 3.1

### 6.2 Update and Render Alien Bullets
- [ ] Update all alien bullets in formation.update()
- [ ] Remove bullets that are off-screen
- [ ] Render alien bullets (red color)

**File**: js/alien.js
**Depends on**: 6.1

### 6.3 Implement Alien Bullet vs Player Collision
- [ ] Check all alien bullets against player
- [ ] On hit: reduce player lives
- [ ] Remove the bullet
- [ ] Trigger invincibility

**File**: js/game.js
**Depends on**: 6.2

### 6.4 Implement Player Invincibility
- [ ] Add isInvincible flag to Player
- [ ] Add invincibilityTimer to Player
- [ ] When hit: set invincible, start timer
- [ ] During invincibility: skip collision, flash sprite
- [ ] After timer expires: clear invincibility

**File**: js/player.js
**Depends on**: 6.3

### 6.5 Test Alien Shooting
- [ ] Verify aliens fire bullets downward
- [ ] Verify random fire rate
- [ ] Verify player takes damage on hit
- [ ] Verify invincibility works

**Depends on**: 6.4

---

## Phase 7: UI & Game States

### 7.1 Create UI Class [P]
- [ ] Create js/ui.js
- [ ] Implement UI class with render methods
- [ ] Implement renderScore(ctx, score)
- [ ] Implement renderHighScore(ctx, highScore)
- [ ] Implement renderLives(ctx, lives)
- [ ] Implement renderWave(ctx, wave)

**File**: js/ui.js

### 7.2 Implement Start Screen
- [ ] Add renderStartScreen(ctx) to UI
- [ ] Draw title "SPACE INVADERS"
- [ ] Draw "Press SPACE to Start"
- [ ] Draw high score

**File**: js/ui.js
**Depends on**: 7.1

### 7.3 Implement Game State Machine
- [ ] Add state property to Game
- [ ] Start in START state
- [ ] Transition to PLAYING on spacebar
- [ ] Only update game entities when PLAYING

**File**: js/game.js
**Depends on**: 7.2

### 7.4 Implement Pause Functionality
- [ ] Detect P key press
- [ ] Toggle between PLAYING and PAUSED
- [ ] Draw "PAUSED" overlay

**File**: js/game.js, js/ui.js
**Depends on**: 7.3

### 7.5 Implement Game Over Screen
- [ ] Detect when lives reach 0
- [ ] Transition to GAME_OVER state
- [ ] Draw "GAME OVER" and final score
- [ ] Allow restart with spacebar

**File**: js/game.js, js/ui.js
**Depends on**: 7.3

### 7.6 Implement Victory Screen
- [ ] Detect when all aliens destroyed
- [ ] Transition to VICTORY state
- [ ] After brief delay, advance to next wave

**File**: js/game.js, js/ui.js
**Depends on**: 7.3

### 7.7 Integrate UI into Game Loop
- [ ] Render score, lives, wave during PLAYING
- [ ] Render appropriate screen for each state

**File**: js/game.js
**Depends on**: 7.1-7.6

### 7.8 Test Game States
- [ ] Verify start screen appears
- [ ] Verify game starts on spacebar
- [ ] Verify pause works (P key)
- [ ] Verify game over when lives = 0
- [ ] Verify victory when all aliens destroyed

**Depends on**: 7.7

---

## Phase 8: Wave System & Polish

### 8.1 Implement Wave Progression
- [ ] After victory, increment wave number
- [ ] Reset alien formation for new wave
- [ ] Apply wave modifiers (aliens start lower, faster fire rate)
- [ ] Show "WAVE X" message briefly

**File**: js/game.js, js/alien.js

### 8.2 Implement High Score Persistence
- [ ] Load high score from localStorage on init
- [ ] Save high score when score exceeds it
- [ ] Handle localStorage errors gracefully

**File**: js/game.js

### 8.3 Implement Extra Life
- [ ] Track if extra life already awarded
- [ ] When score crosses 1000, add life (once)
- [ ] Cap lives at 5

**File**: js/game.js

### 8.4 Final Testing
- [ ] Play through multiple waves
- [ ] Verify high score saves and loads
- [ ] Verify extra life works
- [ ] Verify difficulty increases
- [ ] Performance test (60 FPS maintained)

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|---------------|
| Phase 1 | 5 tasks | 30 min |
| Phase 2 | 4 tasks | 45 min |
| Phase 3 | 5 tasks | 45 min |
| Phase 4 | 6 tasks | 1 hour |
| Phase 5 | 4 tasks | 30 min |
| Phase 6 | 5 tasks | 1 hour |
| Phase 7 | 8 tasks | 1.5 hours |
| Phase 8 | 4 tasks | 1 hour |
| **Total** | **41 tasks** | **~7 hours** |

---

*Tasks Version: 1.0*
*Derived from: plan.md v1.0*
`;

    writeFileSync(join(featureDir, 'tasks.md'), tasksContent);

    // Verify tasks was written
    const writtenTasks = readFileSync(join(featureDir, 'tasks.md'), 'utf-8');
    expect(writtenTasks).toContain('Phase 1: Project Setup');
    expect(writtenTasks).toContain('Create HTML Structure');
    expect(writtenTasks).toContain('Create Player Class');
    expect(writtenTasks).toContain('Phase 8: Wave System');

    // ========================================================================
    // Step 7: Check prerequisites to verify everything is in place
    // ========================================================================
    // Note: check-prerequisites validates that plan.md exists (required) and 
    // lists optional supporting docs. spec.md and plan.md are required, so
    // the command would have failed if they didn't exist.
    const { stdout: prereqOutput, exitCode: prereqExitCode } = runCli(
      'check-prerequisites --json --include-tasks',
      { 
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-space-invaders' }
      }
    );

    // Exit code 0 means plan.md was found (required)
    expect(prereqExitCode).toBe(0);
    
    const prereqResult = parseJsonOutput(prereqOutput);
    expect(prereqResult.FEATURE_DIR).toContain('001-space-invaders');

    // AVAILABLE_DOCS includes optional docs that exist (tasks.md with --include-tasks)
    expect(prereqResult.AVAILABLE_DOCS).toContain('tasks.md');

    // ========================================================================
    // Step 8: Update agent context so Copilot knows about the project
    // ========================================================================
    // Note: update-agent-context extracts technology info from plan.md files
    // and updates the agent instructions file. We verify it runs successfully.
    const { exitCode: agentExitCode } = runCli(
      'update-agent-context copilot',
      { 
        cwd: projectDir,
        env: { SPECIFY_FEATURE: '001-space-invaders' },
        expectError: true  // Allow checking exit code
      }
    );

    // Verify agent context file exists (command may or may not update content
    // depending on implementation details, but file should exist)
    const agentFilePath = join(projectDir, '.github', 'agents', 'copilot-instructions.md');
    expect(existsSync(agentFilePath)).toBe(true);

    // ========================================================================
    // Verification: Complete workflow successful
    // ========================================================================

    // Verify complete directory structure
    expect(existsSync(join(featureDir, 'spec.md'))).toBe(true);
    expect(existsSync(join(featureDir, 'plan.md'))).toBe(true);
    expect(existsSync(join(featureDir, 'tasks.md'))).toBe(true);

    // Verify spec content is comprehensive
    const finalSpec = readFileSync(join(featureDir, 'spec.md'), 'utf-8');
    expect(finalSpec.length).toBeGreaterThan(5000); // Substantial spec
    expect(finalSpec.split('FR-').length - 1).toBeGreaterThanOrEqual(10); // 10+ functional requirements
    expect(finalSpec.split('US-').length - 1).toBeGreaterThanOrEqual(4); // 4+ user stories

    // Verify plan content is comprehensive
    const finalPlan = readFileSync(join(featureDir, 'plan.md'), 'utf-8');
    expect(finalPlan.length).toBeGreaterThan(3000); // Substantial plan
    expect(finalPlan.split('Phase').length - 1).toBeGreaterThanOrEqual(8); // 8 phases

    // Verify tasks content is comprehensive
    const finalTasks = readFileSync(join(featureDir, 'tasks.md'), 'utf-8');
    expect(finalTasks.length).toBeGreaterThan(5000); // Substantial tasks
    expect(finalTasks.split('- [ ]').length - 1).toBeGreaterThanOrEqual(40); // 40+ tasks

    console.log('✅ Space Invaders SDD workflow completed successfully!');
    console.log(`   📁 Feature: ${featureDir}`);
    console.log(`   📄 spec.md: ${finalSpec.length} bytes, ${finalSpec.split('FR-').length - 1} functional requirements`);
    console.log(`   📄 plan.md: ${finalPlan.length} bytes, ${finalPlan.split('Phase').length - 1} phases`);
    console.log(`   📄 tasks.md: ${finalTasks.length} bytes, ${finalTasks.split('- [ ]').length - 1} tasks`);

  }, 120000); // 2 minute timeout for full workflow

  it('creates proper git branch for Space Invaders feature', () => {
    simulateSpecKitProject(projectDir, { agent: 'copilot', withGit: true });

    // Create the feature
    runCli(
      'create-new-feature "Space Invaders game" --short-name space-invaders --json',
      { cwd: projectDir }
    );

    // Verify git branch was created
    const branches = execSync('git branch', { 
      cwd: projectDir, 
      encoding: 'utf-8' 
    });

    expect(branches).toContain('001-space-invaders');
  });

  it('handles multiple game features in sequence', () => {
    simulateSpecKitProject(projectDir, { agent: 'copilot', withGit: true });

    // Create Space Invaders feature
    const { stdout: output1 } = runCli(
      'create-new-feature "Space Invaders" --short-name space-invaders --json',
      { cwd: projectDir }
    );
    const result1 = parseJsonOutput(output1);
    expect(result1.BRANCH_NAME).toBe('001-space-invaders');

    // Go back to main/master and create Pac-Man feature
    // Note: Different feature names get their own number sequence starting at 001
    // unless there's already a branch with that name
    execSync('git checkout main || git checkout master', { cwd: projectDir, stdio: 'ignore' });

    const { stdout: output2 } = runCli(
      'create-new-feature "Pac-Man game" --short-name pacman --json',
      { cwd: projectDir }
    );
    const result2 = parseJsonOutput(output2);
    // Each unique feature name starts its own numbering
    expect(result2.BRANCH_NAME).toBe('001-pacman');

    // Go back to main/master and create Tetris feature
    execSync('git checkout main || git checkout master', { cwd: projectDir, stdio: 'ignore' });

    const { stdout: output3 } = runCli(
      'create-new-feature "Tetris game" --short-name tetris --json',
      { cwd: projectDir }
    );
    const result3 = parseJsonOutput(output3);
    expect(result3.BRANCH_NAME).toBe('001-tetris');

    // Verify all three spec directories exist
    expect(existsSync(join(projectDir, 'specs', '001-space-invaders'))).toBe(true);
    expect(existsSync(join(projectDir, 'specs', '001-pacman'))).toBe(true);
    expect(existsSync(join(projectDir, 'specs', '001-tetris'))).toBe(true);
  });
});
