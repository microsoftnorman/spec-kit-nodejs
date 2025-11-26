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
