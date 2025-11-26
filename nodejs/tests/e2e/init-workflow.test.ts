/**
 * End-to-end tests for the complete specify init workflow.
 * 
 * These tests simulate the full flow: init → select AI → project setup.
 * 
 * The Node.js port has native TypeScript commands (create-new-feature, setup-plan, 
 * check-prerequisites, update-agent-context) that replace the shell/PowerShell scripts
 * from the Python version. The --script flag is only used for legacy template compatibility
 * when downloading templates that still include shell wrappers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawnSync } from 'child_process';

// Get the path to the CLI
const CLI_PATH = join(__dirname, '..', '..', 'bin', 'specify.js');
const PROJECT_ROOT = join(__dirname, '..', '..');

// Helper to check if network is available (Windows-compatible)
function isNetworkAvailable(): boolean {
  try {
    const result = spawnSync('ping', ['-n', '1', '-w', '1000', 'github.com'], {
      stdio: 'ignore',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Simulate the project structure that `specify init --ai copilot --script sh` would create.
 * This allows testing the full workflow without requiring network access.
 */
function simulateInitProjectStructure(projectDir: string): void {
  // Create .specify directory with templates
  const specifyDir = join(projectDir, '.specify');
  const templatesDir = join(specifyDir, 'templates');
  const scriptsDir = join(specifyDir, 'scripts');
  mkdirSync(templatesDir, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });

  // Create template files
  writeFileSync(join(templatesDir, 'spec-template.md'), `# Feature Specification

## Overview
[Brief description of the feature]

## Functional Requirements
- FR-001: [First requirement]

## Non-Functional Requirements
- NFR-001: [First non-functional requirement]

## User Stories
- US-001: As a [user type], I want [goal] so that [benefit]
`);

  writeFileSync(join(templatesDir, 'plan-template.md'), `# Implementation Plan

## Technical Stack
**Language/Version**: [e.g., TypeScript 5.4]
**Primary Dependencies**: [e.g., Express, React]
**Storage**: [e.g., PostgreSQL]
**Project Type**: [e.g., Web API, CLI tool]

## Implementation Approach
[Describe the high-level approach]

## Implementation Phases
### Phase 1: [Name]
- [Task 1]
- [Task 2]

## Risks and Mitigations
- Risk: [Description] → Mitigation: [Strategy]
`);

  writeFileSync(join(templatesDir, 'agent-file-template.md'), `# Agent Context

## Project: [PROJECT NAME]
**Last updated**: [DATE]

## Active Technologies
[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure
[ACTUAL STRUCTURE FROM PLANS]

## Recent Changes
[LAST 3 FEATURES AND WHAT THEY ADDED]
`);

  // Create .github directory with agents for copilot
  const agentsDir = join(projectDir, '.github', 'agents');
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(join(agentsDir, 'copilot-instructions.md'), `# GitHub Copilot Instructions

## Active Technologies
<!-- Technologies will be added by update-agent-context -->

## Recent Changes
<!-- Changes will be tracked here -->
`);

  // Create memory directory
  const memoryDir = join(projectDir, 'memory');
  mkdirSync(memoryDir, { recursive: true });
  writeFileSync(join(memoryDir, 'constitution.md'), `# Project Constitution

This project follows Spec-Driven Development (SDD) methodology.
`);

  // Create specs directory
  mkdirSync(join(projectDir, 'specs'), { recursive: true });

  // Initialize git
  execSync('git init', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.name "Test User"', { cwd: projectDir, stdio: 'ignore' });
  writeFileSync(join(projectDir, 'README.md'), '# Test Project\n');
  execSync('git add .', { cwd: projectDir, stdio: 'ignore' });
  execSync('git commit -m "Initial SDD project structure"', { cwd: projectDir, stdio: 'ignore' });
}

// Check if we have a GitHub token for API access
const hasGitHubToken = Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);

describe('E2E: specify init command validation', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `specify-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    projectDir = join(tempDir, 'test-project');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    }
  });

  describe('Argument validation (no network needed)', () => {
    it('fails with invalid AI assistant name', () => {
      expect(() => {
        execSync(
          `node "${CLI_PATH}" init "${projectDir}" --ai invalid-ai --script sh --no-git`,
          {
            encoding: 'utf-8',
            cwd: PROJECT_ROOT,
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
      }).toThrow();
    });

    it('fails with invalid script type', () => {
      expect(() => {
        execSync(
          `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script invalid --no-git`,
          {
            encoding: 'utf-8',
            cwd: PROJECT_ROOT,
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
      }).toThrow();
    });

    it('warns when directory is not empty without --force', () => {
      // Create directory with a file
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, 'existing.txt'), 'content');

      expect(() => {
        execSync(
          `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git`,
          {
            encoding: 'utf-8',
            cwd: PROJECT_ROOT,
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
      }).toThrow();
    });

    it('requires project name or --here flag', () => {
      expect(() => {
        execSync(
          `node "${CLI_PATH}" init --ai copilot --script sh`,
          {
            encoding: 'utf-8',
            cwd: tempDir,
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
      }).toThrow();
    });
  });

  describe('Configuration display (network dependent)', () => {
    it.skipIf(!isNetworkAvailable())('shows project configuration in output', async () => {
      let result: string;
      try {
        result = execSync(
          `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
          {
            encoding: 'utf-8',
            cwd: PROJECT_ROOT,
            timeout: 120000,
          }
        );
      } catch (error: any) {
        // Even if it fails, check the output for configuration display
        result = error.stdout || '';
      }

      expect(result).toContain('Project Configuration');
      expect(result).toContain('GitHub Copilot');
      expect(result).toContain('POSIX Shell');
    }, 120000);

    it.skipIf(!isNetworkAvailable())('shows step tracker in output', async () => {
      let result: string;
      try {
        result = execSync(
          `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
          {
            encoding: 'utf-8',
            cwd: PROJECT_ROOT,
            timeout: 120000,
          }
        );
      } catch (error: any) {
        result = error.stdout || '';
      }

      expect(result).toContain('Download template');
      expect(result).toContain('Extract files');
    }, 120000);
  });
});

describe('E2E: Full workflow simulation (without network)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `specify-workflow-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    projectDir = join(tempDir, 'workflow-project');
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Spec workflow without init (simulated)', () => {
    it('check-prerequisites with spec.md and plan.md outputs correct JSON', async () => {
      // Create project structure with both spec.md and plan.md
      const specsDir = join(projectDir, 'specs', '001-test-feature');
      mkdirSync(specsDir, { recursive: true });

      writeFileSync(join(specsDir, 'spec.md'), `# Test Feature Specification

## Overview
This is a test feature for E2E testing.

## Functional Requirements
- FR-001: The system shall support test operations
`);

      writeFileSync(join(specsDir, 'plan.md'), `# Implementation Plan

## Technical Stack
**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Express, Vitest
**Storage**: PostgreSQL
**Project Type**: Web API
`);

      // Run check-prerequisites
      const checkResult = execSync(
        `node "${CLI_PATH}" check-prerequisites --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-test-feature',
          },
        }
      );

      // Verify JSON output - uses FEATURE_DIR and AVAILABLE_DOCS
      const jsonOutput = JSON.parse(checkResult.trim());
      expect(jsonOutput).toHaveProperty('FEATURE_DIR');
      expect(jsonOutput).toHaveProperty('AVAILABLE_DOCS');
      expect(jsonOutput.FEATURE_DIR).toContain('001-test-feature');
    }, 30000);

    it('check-prerequisites detects available docs correctly', async () => {
      // Create project structure with all artifacts
      const specsDir = join(projectDir, 'specs', '002-complete-feature');
      mkdirSync(specsDir, { recursive: true });
      mkdirSync(join(specsDir, 'contracts'), { recursive: true });

      writeFileSync(join(specsDir, 'spec.md'), '# Spec\n## Overview\nComplete spec');
      writeFileSync(join(specsDir, 'plan.md'), '# Plan\n## Approach\nComplete plan');
      writeFileSync(join(specsDir, 'tasks.md'), `# Tasks

## Phase 1: Setup
- [ ] T001 Initialize project structure
- [ ] T002 Configure build system
`);
      writeFileSync(join(specsDir, 'research.md'), '# Research Notes\n');
      writeFileSync(join(specsDir, 'contracts', 'api.yaml'), 'openapi: 3.0.0\n');

      // Run check-prerequisites with tasks
      const checkResult = execSync(
        `node "${CLI_PATH}" check-prerequisites --json --include-tasks`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '002-complete-feature',
          },
        }
      );

      const jsonOutput = JSON.parse(checkResult.trim());
      // Note: AVAILABLE_DOCS contains what's found beyond spec.md and plan.md
      expect(jsonOutput.AVAILABLE_DOCS).toContain('tasks.md');
      expect(jsonOutput.AVAILABLE_DOCS).toContain('research.md');
    }, 30000);

    it('check-prerequisites fails when plan.md is missing', async () => {
      // Create project structure with only spec.md
      const specsDir = join(projectDir, 'specs', '003-no-plan');
      mkdirSync(specsDir, { recursive: true });
      writeFileSync(join(specsDir, 'spec.md'), '# Spec\n## Overview\nNo plan');

      expect(() => {
        execSync(
          `node "${CLI_PATH}" check-prerequisites --json`,
          {
            encoding: 'utf-8',
            cwd: projectDir,
            timeout: 30000,
            env: {
              ...process.env,
              SPECIFY_FEATURE: '003-no-plan',
            },
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
      }).toThrow();
    }, 30000);
  });

  describe('Create new feature workflow', () => {
    it('creates feature with first available number for name', async () => {
      // Initialize git repo for create-new-feature
      execSync('git init', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: projectDir, stdio: 'ignore' });
      writeFileSync(join(projectDir, 'README.md'), '# Test Project\n');
      execSync('git add .', { cwd: projectDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectDir, stdio: 'ignore' });

      // Run create-new-feature with required feature-description argument
      // When there's no existing 'third-feature' branch, it starts at 001
      const result = execSync(
        `node "${CLI_PATH}" create-new-feature "Add third feature" --short-name third-feature --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
        }
      );

      const jsonOutput = JSON.parse(result.trim());
      // Auto-numbering finds first available number for this specific branch name
      expect(jsonOutput.BRANCH_NAME).toBe('001-third-feature');
      expect(jsonOutput.SPEC_FILE).toContain('001-third-feature');
      expect(existsSync(join(projectDir, 'specs', '001-third-feature'))).toBe(true);
      expect(existsSync(join(projectDir, 'specs', '001-third-feature', 'spec.md'))).toBe(true);
    }, 30000);

    it('increments number when same feature name exists', async () => {
      // Initialize git repo
      execSync('git init', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: projectDir, stdio: 'ignore' });
      writeFileSync(join(projectDir, 'README.md'), '# Test Project\n');
      execSync('git add .', { cwd: projectDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectDir, stdio: 'ignore' });

      // Create first feature with this name
      execSync(
        `node "${CLI_PATH}" create-new-feature "First feature" --short-name my-feature --json`,
        { cwd: projectDir, timeout: 30000 }
      );

      // Go back to master/main
      execSync('git checkout master', { cwd: projectDir, stdio: 'ignore' });

      // Create second feature with same name
      const result = execSync(
        `node "${CLI_PATH}" create-new-feature "Second feature" --short-name my-feature --json`,
        { encoding: 'utf-8', cwd: projectDir, timeout: 30000 }
      );

      const jsonOutput = JSON.parse(result.trim());
      // Should be 002 since 001-my-feature already exists
      expect(jsonOutput.BRANCH_NAME).toBe('002-my-feature');
    }, 30000);

    it('creates feature with explicit number', async () => {
      // Initialize git repo
      execSync('git init', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: projectDir, stdio: 'ignore' });
      writeFileSync(join(projectDir, 'README.md'), '# Test Project\n');
      execSync('git add .', { cwd: projectDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectDir, stdio: 'ignore' });

      // Run create-new-feature with explicit number
      const result = execSync(
        `node "${CLI_PATH}" create-new-feature "My custom feature" --number 42 --short-name my-feature --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
        }
      );

      const jsonOutput = JSON.parse(result.trim());
      expect(jsonOutput.BRANCH_NAME).toBe('042-my-feature');
    }, 30000);
  });

  describe('Setup plan workflow', () => {
    it('sets up plan for existing feature', async () => {
      // Create feature directory with spec
      const specsDir = join(projectDir, 'specs', '001-my-feature');
      mkdirSync(specsDir, { recursive: true });
      writeFileSync(join(specsDir, 'spec.md'), '# My Feature Spec\n');

      // Run setup-plan
      const result = execSync(
        `node "${CLI_PATH}" setup-plan --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-my-feature',
          },
        }
      );

      // JSON uses FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH
      const jsonOutput = JSON.parse(result.trim());
      expect(jsonOutput).toHaveProperty('FEATURE_SPEC');
      expect(jsonOutput).toHaveProperty('IMPL_PLAN');
      expect(jsonOutput).toHaveProperty('SPECS_DIR');
      expect(jsonOutput).toHaveProperty('BRANCH');
      expect(jsonOutput.BRANCH).toBe('001-my-feature');
    }, 30000);

    it('detects git state in setup-plan', async () => {
      // Initialize git repo
      execSync('git init', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: projectDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: projectDir, stdio: 'ignore' });

      // Create feature
      const specsDir = join(projectDir, 'specs', '001-templated');
      mkdirSync(specsDir, { recursive: true });
      writeFileSync(join(specsDir, 'spec.md'), '# Spec\n');

      // Run setup-plan
      const result = execSync(
        `node "${CLI_PATH}" setup-plan --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-templated',
          },
        }
      );

      const jsonOutput = JSON.parse(result.trim());
      expect(jsonOutput).toHaveProperty('HAS_GIT');
      expect(jsonOutput.HAS_GIT).toBe('true');
    }, 30000);
  });

  describe('Update agent context workflow', () => {
    it('updates copilot agent context with tech stack', async () => {
      // Create feature with plan
      const specsDir = join(projectDir, 'specs', '001-context-test');
      mkdirSync(specsDir, { recursive: true });

      writeFileSync(join(specsDir, 'spec.md'), '# Spec\n');
      writeFileSync(join(specsDir, 'plan.md'), `# Plan

## Technical Stack
**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI, SQLAlchemy
**Storage**: SQLite
**Project Type**: REST API
`);

      // Create agent file in the correct path (.github/agents/)
      const agentDir = join(projectDir, '.github', 'agents');
      mkdirSync(agentDir, { recursive: true });

      // Create an existing copilot instructions file with Active Technologies section
      writeFileSync(
        join(agentDir, 'copilot-instructions.md'),
        `# Copilot Instructions

## Active Technologies
<!-- technologies will be added here -->

## Recent Changes
<!-- changes will be tracked here -->
`
      );

      // Create the template directory and agent file template (for creating new agent files)
      const templatesDir = join(projectDir, '.specify', 'templates');
      mkdirSync(templatesDir, { recursive: true });
      writeFileSync(
        join(templatesDir, 'agent-file-template.md'),
        '# Agent Instructions\n\n## Active Technologies\n\n## Recent Changes\n'
      );

      // Run update-agent-context with agent type as argument
      execSync(
        `node "${CLI_PATH}" update-agent-context copilot`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-context-test',
          },
        }
      );

      // Verify file was updated - check output and file content
      const updatedContent = readFileSync(
        join(agentDir, 'copilot-instructions.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('Python');
      expect(updatedContent).toContain('FastAPI');
    }, 30000);
  });

  /**
   * Complete Simulated SDD Workflow
   * 
   * This test runs the entire SDD workflow using a simulated project structure,
   * allowing it to run without network access. It tests:
   * 1. create-new-feature → creates feature branch and spec
   * 2. setup-plan → copies plan template
   * 3. check-prerequisites → validates spec files
   * 4. update-agent-context → updates agent with plan data
   */
  describe('Complete simulated SDD workflow', () => {
    it('runs full workflow: create-feature → setup-plan → check → update-context', async () => {
      // Simulate the structure that `specify init --ai copilot` would create
      simulateInitProjectStructure(projectDir);

      // Verify simulated structure exists
      expect(existsSync(join(projectDir, '.specify', 'templates'))).toBe(true);
      expect(existsSync(join(projectDir, '.github', 'agents'))).toBe(true);

      // Step 1: Create a new feature
      console.log('  → Step 1: Create new feature');
      const createResult = execSync(
        `node "${CLI_PATH}" create-new-feature "Build user authentication" --short-name user-auth --json`,
        { encoding: 'utf-8', cwd: projectDir, timeout: 30000 }
      );
      const createOutput = JSON.parse(createResult.trim());
      expect(createOutput.BRANCH_NAME).toBe('001-user-auth');
      expect(existsSync(join(projectDir, 'specs', '001-user-auth', 'spec.md'))).toBe(true);

      // Step 2: Write specification
      console.log('  → Step 2: Write specification');
      writeFileSync(
        join(projectDir, 'specs', '001-user-auth', 'spec.md'),
        `# User Authentication Feature

## Overview
Implement secure user authentication with JWT tokens.

## Functional Requirements
- FR-001: Users can register with email and password
- FR-002: Users can login with valid credentials
- FR-003: JWT tokens expire after 24 hours

## Non-Functional Requirements
- NFR-001: Passwords must be hashed with bcrypt
- NFR-002: Login should complete within 200ms

## User Stories
- US-001: As a user, I want to register so I can access protected features
- US-002: As a user, I want to login so I can use the application
`
      );

      // Step 3: Setup plan
      console.log('  → Step 3: Setup implementation plan');
      const setupResult = execSync(
        `node "${CLI_PATH}" setup-plan --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: { ...process.env, SPECIFY_FEATURE: '001-user-auth' },
        }
      );
      const setupOutput = JSON.parse(setupResult.trim());
      expect(setupOutput.BRANCH).toBe('001-user-auth');

      // Step 4: Write plan with technical details
      console.log('  → Step 4: Write implementation plan');
      writeFileSync(
        join(projectDir, 'specs', '001-user-auth', 'plan.md'),
        `# Implementation Plan: User Authentication

## Technical Stack
**Language/Version**: TypeScript 5.4
**Primary Dependencies**: Express.js, Passport.js, bcrypt, jsonwebtoken
**Storage**: PostgreSQL 16
**Project Type**: REST API

## Implementation Approach
JWT-based authentication with refresh token rotation.

## Implementation Phases
### Phase 1: Core Auth (3 days)
- Setup Express with TypeScript
- Implement registration
- Implement login

### Phase 2: Sessions (2 days)
- JWT generation
- Token refresh
- Logout

## Risks and Mitigations
- Risk: Token theft → Mitigation: Short-lived tokens
`
      );

      // Step 5: Check prerequisites
      console.log('  → Step 5: Check prerequisites');
      const checkResult = execSync(
        `node "${CLI_PATH}" check-prerequisites --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: { ...process.env, SPECIFY_FEATURE: '001-user-auth' },
        }
      );
      const checkOutput = JSON.parse(checkResult.trim());
      expect(checkOutput.FEATURE_DIR).toContain('001-user-auth');

      // Step 6: Update agent context
      console.log('  → Step 6: Update agent context');
      execSync(
        `node "${CLI_PATH}" update-agent-context copilot`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: { ...process.env, SPECIFY_FEATURE: '001-user-auth' },
        }
      );

      // Verify agent context was updated with tech stack
      const agentContent = readFileSync(
        join(projectDir, '.github', 'agents', 'copilot-instructions.md'),
        'utf-8'
      );
      expect(agentContent).toContain('TypeScript');
      expect(agentContent).toContain('Express');

      // Step 7: Create second feature to test numbering
      console.log('  → Step 7: Create second feature');
      execSync('git checkout main || git checkout master', { cwd: projectDir, stdio: 'ignore' });
      const secondResult = execSync(
        `node "${CLI_PATH}" create-new-feature "Add user profiles" --short-name user-profiles --json`,
        { encoding: 'utf-8', cwd: projectDir, timeout: 30000 }
      );
      const secondOutput = JSON.parse(secondResult.trim());
      expect(secondOutput.BRANCH_NAME).toBe('001-user-profiles');
      expect(existsSync(join(projectDir, 'specs', '001-user-profiles', 'spec.md'))).toBe(true);

      // Verify complete project structure
      console.log('  → Step 8: Verify final project structure');
      const expectedFiles = [
        '.github/agents/copilot-instructions.md',
        '.specify/templates/spec-template.md',
        '.specify/templates/plan-template.md',
        'memory/constitution.md',
        'specs/001-user-auth/spec.md',
        'specs/001-user-auth/plan.md',
        'specs/001-user-profiles/spec.md',
      ];

      for (const file of expectedFiles) {
        const filePath = join(projectDir, file);
        expect(existsSync(filePath)).toBe(true);
      }

      console.log('  ✓ Complete simulated SDD workflow passed!');
    }, 60000);
  });
});

describe('E2E: Network-dependent tests (with sh script)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `specify-net-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    projectDir = join(tempDir, 'test-project');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // These tests require network access and may fail without a GitHub token
  describe.skipIf(!isNetworkAvailable() || !hasGitHubToken)('Full init with template download', () => {
    it('creates project with copilot and sh script type', async () => {
      const result = execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      expect(existsSync(projectDir)).toBe(true);
      expect(result).toContain('Project initialized successfully');
    }, 120000);

    it('creates .github directory for copilot agent', async () => {
      execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      const githubDir = join(projectDir, '.github');
      expect(existsSync(githubDir)).toBe(true);
    }, 120000);

    it('creates .specify directory with templates', async () => {
      execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      const specifyDir = join(projectDir, '.specify');
      const templatesDir = join(specifyDir, 'templates');

      expect(existsSync(specifyDir)).toBe(true);
      expect(existsSync(templatesDir)).toBe(true);
    }, 120000);

    it('shows next steps panel', async () => {
      const result = execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      expect(result).toContain('Next Steps');
      expect(result).toContain('/speckit.specify');
      expect(result).toContain('/speckit.plan');
    }, 120000);
  });
});

/**
 * Complete End-to-End Workflow Test
 * 
 * This test runs the ENTIRE specify workflow from project initialization
 * through feature creation, plan setup, and spec completion.
 * 
 * The workflow is:
 * 1. `specify init` → creates project with GitHub Copilot and sh scripts
 * 2. `specify create-new-feature` → creates a new feature branch/spec
 * 3. `specify setup-plan` → copies plan template to feature
 * 4. `specify check-prerequisites` → validates spec files exist
 * 5. `specify update-agent-context` → updates agent context with plan data
 */
describe('E2E: Complete Spec-Driven Development Workflow', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `specify-full-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    projectDir = join(tempDir, 'my-sdd-project');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Skip if no network or GitHub token
  describe.skipIf(!isNetworkAvailable() || !hasGitHubToken)('Full workflow: init → create-feature → setup-plan → check → update-context', () => {
    
    it('completes full SDD workflow with GitHub Copilot and sh scripts', async () => {
      console.log('Step 1: Initialize project with specify init');
      // Step 1: Initialize the project with Copilot and sh scripts
      // Using --force to bypass non-empty directory check if temp already has files
      const initResult = execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );
      
      // Verify init completed successfully
      expect(existsSync(projectDir)).toBe(true);
      expect(existsSync(join(projectDir, '.github'))).toBe(true);
      expect(existsSync(join(projectDir, '.specify'))).toBe(true);
      expect(existsSync(join(projectDir, '.specify', 'templates'))).toBe(true);
      expect(existsSync(join(projectDir, 'memory'))).toBe(true);
      expect(initResult).toContain('Project initialized');

      console.log('Step 2: Create a new feature');
      // Step 2: Create a new feature
      const createResult = execSync(
        `node "${CLI_PATH}" create-new-feature "Build user authentication system" --short-name user-auth --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
        }
      );

      const createOutput = JSON.parse(createResult.trim());
      expect(createOutput.BRANCH_NAME).toBe('001-user-auth');
      expect(existsSync(join(projectDir, 'specs', '001-user-auth'))).toBe(true);
      expect(existsSync(join(projectDir, 'specs', '001-user-auth', 'spec.md'))).toBe(true);

      console.log('Step 3: Write specification content');
      // Step 3: Write a proper specification
      const specPath = join(projectDir, 'specs', '001-user-auth', 'spec.md');
      const specContent = `# User Authentication System

## Overview
Implement a secure user authentication system with login, registration, and session management.

## Functional Requirements
- FR-001: Users shall be able to register with email and password
- FR-002: Users shall be able to log in with their credentials
- FR-003: Sessions shall expire after 24 hours of inactivity
- FR-004: Users shall be able to reset their password via email

## Non-Functional Requirements
- NFR-001: Password hashing shall use bcrypt with cost factor 12
- NFR-002: All authentication endpoints shall respond within 200ms
- NFR-003: The system shall support 1000 concurrent login attempts

## User Stories
- US-001: As a new user, I want to register so I can access the application
- US-002: As a registered user, I want to log in so I can use protected features
- US-003: As a user, I want to reset my password if I forget it
`;
      writeFileSync(specPath, specContent);

      console.log('Step 4: Setup implementation plan');
      // Step 4: Setup the implementation plan
      const setupResult = execSync(
        `node "${CLI_PATH}" setup-plan --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-user-auth',
          },
        }
      );

      const setupOutput = JSON.parse(setupResult.trim());
      expect(setupOutput.BRANCH).toBe('001-user-auth');
      expect(setupOutput.IMPL_PLAN).toContain('plan.md');

      console.log('Step 5: Write implementation plan');
      // Step 5: Write the implementation plan with technical details
      const planPath = join(projectDir, 'specs', '001-user-auth', 'plan.md');
      const planContent = `# Implementation Plan: User Authentication System

## Technical Stack
**Language/Version**: TypeScript 5.4
**Primary Dependencies**: Express.js, Passport.js, bcrypt, jsonwebtoken
**Storage**: PostgreSQL 16
**Project Type**: REST API

## Implementation Approach
We will implement authentication using JWT tokens with refresh token rotation.
The architecture follows a clean separation between authentication logic and HTTP handling.

## Implementation Phases

### Phase 1: Core Authentication (3 days)
- Set up Express server with TypeScript
- Implement user registration endpoint
- Implement user login endpoint
- Add password hashing with bcrypt

### Phase 2: Session Management (2 days)
- Implement JWT token generation
- Add token refresh mechanism
- Implement logout functionality

### Phase 3: Password Reset (2 days)
- Add email service integration
- Implement password reset request
- Implement password reset confirmation

## Risks and Mitigations
- Risk: Token theft → Mitigation: Short-lived access tokens with refresh rotation
- Risk: Brute force attacks → Mitigation: Rate limiting and account lockout
`;
      writeFileSync(planPath, planContent);

      console.log('Step 6: Check prerequisites');
      // Step 6: Verify prerequisites are met
      const checkResult = execSync(
        `node "${CLI_PATH}" check-prerequisites --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-user-auth',
          },
        }
      );

      const checkOutput = JSON.parse(checkResult.trim());
      expect(checkOutput.FEATURE_DIR).toContain('001-user-auth');
      // AVAILABLE_DOCS contains additional docs beyond spec.md and plan.md

      console.log('Step 7: Update agent context');
      // Step 7: Update agent context with the plan information
      execSync(
        `node "${CLI_PATH}" update-agent-context copilot`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
          env: {
            ...process.env,
            SPECIFY_FEATURE: '001-user-auth',
          },
        }
      );

      // Verify the agent context was updated
      const agentFilePath = join(projectDir, '.github', 'agents', 'copilot-instructions.md');
      if (existsSync(agentFilePath)) {
        const agentContent = readFileSync(agentFilePath, 'utf-8');
        // The agent file should now contain the technology stack from the plan
        expect(agentContent).toContain('TypeScript');
        expect(agentContent).toContain('Express');
      }

      console.log('Step 8: Verify complete project structure');
      // Step 8: Final verification of project structure
      const expectedFiles = [
        '.github',
        '.specify',
        '.specify/templates',
        '.specify/scripts',
        'memory',
        'memory/constitution.md',
        'specs',
        'specs/001-user-auth',
        'specs/001-user-auth/spec.md',
        'specs/001-user-auth/plan.md',
      ];

      for (const file of expectedFiles) {
        expect(existsSync(join(projectDir, file))).toBe(true);
      }

      console.log('✓ Complete SDD workflow test passed!');
    }, 180000); // 3 minute timeout for full workflow

    it('supports force overwrite of existing directory', async () => {
      // Create the directory first with some content
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, 'existing-file.txt'), 'existing content');

      // Run init with --force
      const result = execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --no-git --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      // Should succeed and create the specify project
      expect(existsSync(join(projectDir, '.specify'))).toBe(true);
      // Original file may or may not exist depending on template extraction behavior
    }, 120000);

    it('creates feature and then another feature with correct numbering', async () => {
      // Initialize project
      execSync(
        `node "${CLI_PATH}" init "${projectDir}" --ai copilot --script sh --force`,
        {
          encoding: 'utf-8',
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      // Create first feature
      const first = execSync(
        `node "${CLI_PATH}" create-new-feature "First feature" --short-name first --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
        }
      );
      const firstOutput = JSON.parse(first.trim());
      expect(firstOutput.BRANCH_NAME).toBe('001-first');

      // Go back to main branch
      execSync('git checkout main || git checkout master', { cwd: projectDir, stdio: 'ignore' });

      // Create second feature with same name - should get 002
      const second = execSync(
        `node "${CLI_PATH}" create-new-feature "Second iteration" --short-name first --json`,
        {
          encoding: 'utf-8',
          cwd: projectDir,
          timeout: 30000,
        }
      );
      const secondOutput = JSON.parse(second.trim());
      expect(secondOutput.BRANCH_NAME).toBe('002-first');

      // Both spec directories should exist
      expect(existsSync(join(projectDir, 'specs', '001-first'))).toBe(true);
      expect(existsSync(join(projectDir, 'specs', '002-first'))).toBe(true);
    }, 180000);
  });
});
