/**
 * Built-in template generator for JavaScript script type.
 * 
 * When --script js is selected, we generate templates locally instead of
 * downloading from GitHub releases (since js templates aren't published yet).
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import type { StepTracker } from '../ui/tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the templates directory in the source repo.
 * This walks up from the dist folder to find the assets/templates directory.
 */
function getTemplatesDir(): string {
  // From dist/lib/template -> look for assets/templates in project root
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    // Check for assets/templates (the actual location)
    const assetsTemplatesPath = join(dir, 'assets', 'templates');
    if (existsSync(assetsTemplatesPath)) {
      return assetsTemplatesPath;
    }
    // Also check for templates/ for backwards compatibility
    const templatesPath = join(dir, 'templates');
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
    dir = dirname(dir);
  }
  throw new Error('Could not find templates directory');
}

/**
 * Template files to copy to .specify/templates/
 */
const TEMPLATE_FILES = [
  'spec-template.md',
  'plan-template.md',
  'tasks-template.md',
  'checklist-template.md',
  'agent-file-template.md',
];

/**
 * Command files to copy to agent directories.
 */
const COMMAND_FILES = [
  'analyze.md',
  'checklist.md',
  'clarify.md',
  'constitution.md',
  'implement.md',
  'plan.md',
  'specify.md',
  'tasks.md',
  'taskstoissues.md',
];

/**
 * Agent directory mappings for different AI assistants.
 */
const AGENT_DIRS: Record<string, string> = {
  copilot: '.github/agents',
  claude: '.claude/commands',
  gemini: '.gemini/commands',
  'cursor-agent': '.cursor/commands',
  qwen: '.qwen/commands',
  opencode: '.opencode/commands',
  codex: '.codex/commands',
  windsurf: '.windsurf/workflows',
  kilocode: '.kilocode/rules',
  auggie: '.augment/rules',
  codebuddy: '.codebuddy/commands',
  roo: '.roo/rules',
  q: '.amazonq/prompts',
  amp: '.agents/commands',
  shai: '.shai/commands',
};

/**
 * Generate copilot-instructions.md content.
 */
function generateCopilotInstructions(): string {
  return `# GitHub Copilot Instructions

This project uses Spec-Driven Development (SDD) methodology.

## Active Technologies
<!-- Technologies will be added here by update-agent-context -->

## Recent Changes
<!-- Changes will be tracked here -->

## Project Structure
- \`specs/\` - Feature specifications and implementation plans
- \`memory/\` - Project constitution and long-term context
- \`.specify/templates/\` - SDD document templates

## Workflow
1. Use \`/speckit.specify\` to create specifications
2. Use \`/speckit.plan\` to create implementation plans  
3. Use \`/speckit.tasks\` to generate task lists
4. Use \`/speckit.implement\` to start coding
`;
}

/**
 * Generate constitution.md content.
 */
function generateConstitution(): string {
  return `# Project Constitution

This document defines the core principles and rules for this project.

## Development Methodology
This project follows **Spec-Driven Development (SDD)**, which emphasizes:
1. Writing clear specifications before implementation
2. Creating detailed implementation plans
3. Breaking work into manageable tasks
4. Maintaining documentation alongside code

## Code Standards
<!-- Define your coding standards here -->

## Architecture Decisions
<!-- Document key architecture decisions here -->

## Testing Requirements
<!-- Define testing requirements here -->
`;
}

/**
 * Generate .vscode/settings.json content.
 */
function generateVSCodeSettings(): string {
  return JSON.stringify({
    "chat.commandCenter.enabled": true,
    "github.copilot.chat.codeGeneration.useInstructionFiles": true,
    "chat.agent.maxRequests": 100
  }, null, 2);
}

/**
 * Options for generating built-in templates.
 */
export interface GenerateBuiltinOptions {
  ai: string;
  tracker?: StepTracker;
  debug?: boolean;
}

/**
 * Result of template generation including list of created files.
 */
export interface GenerateBuiltinResult {
  /** List of created files (relative to project root) */
  files: string[];
  /** List of created directories (relative to project root) */
  directories: string[];
}

/**
 * Recursively scan a directory and return all files and directories.
 * @param dir - Directory to scan
 * @param baseDir - Base directory for relative paths
 * @returns Object with arrays of relative file and directory paths
 */
function scanDirectory(dir: string, baseDir: string): { files: string[]; directories: string[] } {
  const files: string[] = [];
  const directories: string[] = [];

  if (!existsSync(dir)) {
    return { files, directories };
  }

  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
    
    if (statSync(fullPath).isDirectory()) {
      directories.push(relativePath);
      // Recursively scan subdirectories
      const subResult = scanDirectory(fullPath, baseDir);
      files.push(...subResult.files);
      directories.push(...subResult.directories);
    } else {
      files.push(relativePath);
    }
  }

  return { files, directories };
}

/**
 * Scan the project directory for created spec-kit files and directories.
 * @param projectPath - Path to the project directory
 * @param ai - AI assistant key to determine agent directory
 * @returns Object with arrays of relative file and directory paths
 */
function scanCreatedFiles(projectPath: string, ai: string): GenerateBuiltinResult {
  const allFiles: string[] = [];
  const allDirs: string[] = [];

  // Directories to scan for spec-kit content
  const dirsToScan = [
    '.specify',
    '.vscode',
    'memory',
    'specs',
    AGENT_DIRS[ai] || '.github/agents',
  ];

  for (const dir of dirsToScan) {
    const fullPath = join(projectPath, dir);
    if (existsSync(fullPath)) {
      allDirs.push(dir);
      const result = scanDirectory(fullPath, projectPath);
      allFiles.push(...result.files);
      allDirs.push(...result.directories);
    }
  }

  // Sort and deduplicate
  const uniqueFiles = [...new Set(allFiles)].sort();
  const uniqueDirs = [...new Set(allDirs)].sort();

  return { files: uniqueFiles, directories: uniqueDirs };
}

/**
 * Generate built-in templates for JavaScript script type.
 * 
 * @param projectPath - Path to the project directory
 * @param options - Generation options
 * @returns Object containing lists of created files and directories
 */
export async function generateBuiltinTemplates(
  projectPath: string,
  options: GenerateBuiltinOptions
): Promise<GenerateBuiltinResult> {
  const { ai, tracker, debug } = options;
  
  let templatesDir: string;
  try {
    templatesDir = getTemplatesDir();
    if (debug) {
      console.log(`Templates directory: ${templatesDir}`);
    }
  } catch (error) {
    // Fall back to generating templates from scratch
    if (debug) {
      console.log('Templates directory not found, generating from scratch');
    }
    templatesDir = '';
  }

  // Create directory structure
  const specifyDir = join(projectPath, '.specify', 'templates');
  const memoryDir = join(projectPath, 'memory');
  const specsDir = join(projectPath, 'specs');
  const vscodeDir = join(projectPath, '.vscode');
  const agentDirRelative = AGENT_DIRS[ai] || '.github/agents';
  const agentDir = join(projectPath, agentDirRelative);

  mkdirSync(specifyDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(specsDir, { recursive: true });
  mkdirSync(vscodeDir, { recursive: true });
  mkdirSync(agentDir, { recursive: true });

  // Copy or generate template files
  for (const file of TEMPLATE_FILES) {
    const destPath = join(specifyDir, file);
    if (templatesDir && existsSync(join(templatesDir, file))) {
      copyFileSync(join(templatesDir, file), destPath);
    } else {
      // Generate default content
      writeFileSync(destPath, getDefaultTemplateContent(file));
    }
  }

  // Copy or generate command files to agent directory
  const commandsSourceDir = templatesDir ? join(templatesDir, 'commands') : '';
  for (const file of COMMAND_FILES) {
    const destPath = join(agentDir, file);
    if (commandsSourceDir && existsSync(join(commandsSourceDir, file))) {
      copyFileSync(join(commandsSourceDir, file), destPath);
    }
  }

  // Generate agent-specific files
  if (ai === 'copilot') {
    writeFileSync(
      join(agentDir, 'copilot-instructions.md'),
      generateCopilotInstructions()
    );
  } else {
    const rulesFile = `${ai}-rules.md`;
    writeFileSync(
      join(agentDir, rulesFile),
      generateCopilotInstructions().replace('GitHub Copilot', AGENT_DIRS[ai] || ai)
    );
  }

  // Generate constitution
  writeFileSync(join(memoryDir, 'constitution.md'), generateConstitution());

  // Generate VS Code settings
  const settingsPath = join(vscodeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, generateVSCodeSettings());
  }

  // Create .gitkeep in specs directory
  writeFileSync(join(specsDir, '.gitkeep'), '');

  // Scan the actual filesystem to determine what was created
  return scanCreatedFiles(projectPath, ai);
}

/**
 * Get default content for a template file.
 */
function getDefaultTemplateContent(filename: string): string {
  switch (filename) {
    case 'spec-template.md':
      return `# Feature Specification

## Overview
[Brief description of the feature]

## Functional Requirements
- FR-001: [Requirement description]

## Non-Functional Requirements
- NFR-001: [Requirement description]

## User Stories
- US-001: As a [user type], I want [goal] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
`;

    case 'plan-template.md':
      return `# Implementation Plan

## Technical Stack
**Language/Version**: [e.g., TypeScript 5.4]
**Primary Dependencies**: [e.g., Express, React]
**Storage**: [e.g., PostgreSQL, Redis]
**Project Type**: [e.g., REST API, CLI, Web App]

## Implementation Approach
[High-level approach description]

## Implementation Phases

### Phase 1: [Phase Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Phase Name]
- [ ] Task 3
- [ ] Task 4

## Risks and Mitigations
- Risk: [Description] → Mitigation: [Strategy]

## Testing Strategy
[Describe testing approach]
`;

    case 'tasks-template.md':
      return `# Implementation Tasks

## Phase 1 Tasks
- [ ] Task 1: [Description]
- [ ] Task 2: [Description]

## Phase 2 Tasks
- [ ] Task 3: [Description]
- [ ] Task 4: [Description]

## Completion Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
`;

    case 'checklist-template.md':
      return `# Implementation Checklist

## Pre-Implementation
- [ ] Reviewed specification
- [ ] Reviewed implementation plan
- [ ] Environment set up

## Implementation
- [ ] Core functionality complete
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Documentation updated

## Post-Implementation
- [ ] Code reviewed
- [ ] All tests passing
- [ ] Deployed to staging
`;

    case 'agent-file-template.md':
      return `# Agent Context

## Active Technologies
<!-- Technologies will be extracted from plan.md files -->

## Recent Changes
<!-- Recent feature changes will be tracked here -->

## Project Notes
<!-- Additional context for the AI agent -->
`;

    default:
      return `# ${filename}\n\n[Template content]\n`;
  }
}

/**
 * Check if js script type should use built-in templates.
 */
export function shouldUseBuiltinTemplates(scriptType: string): boolean {
  return scriptType === 'js';
}
