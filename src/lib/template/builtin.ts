/**
 * Built-in template generator for JavaScript script type.
 * 
 * When --script js is selected, we generate templates locally instead of
 * downloading from GitHub releases (since js templates aren't published yet).
 * 
 * This module ports the logic from create-release-packages.sh into TypeScript
 * to generate agent-specific command files with proper placeholders.
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import type { StepTracker } from '../ui/tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the assets directory in the source repo.
 * This walks up from the dist folder to find the assets folder.
 */
function getAssetsDir(): string {
  // From dist/lib/template -> project root -> assets
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const assetsPath = join(dir, 'assets');
    if (existsSync(assetsPath)) {
      return assetsPath;
    }
    dir = dirname(dir);
  }
  throw new Error('Could not find assets directory');
}

/**
 * Get the path to the templates directory in the assets folder.
 */
function getTemplatesDir(): string {
  try {
    const assetsDir = getAssetsDir();
    const templatesPath = join(assetsDir, 'templates');
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  } catch {
    // Fall through to error
  }
  throw new Error('Could not find templates directory');
}

/**
 * Get the path to the memory directory in the assets folder.
 */
function getMemoryDir(): string {
  try {
    const assetsDir = getAssetsDir();
    const memoryPath = join(assetsDir, 'memory');
    if (existsSync(memoryPath)) {
      return memoryPath;
    }
  } catch {
    // Fall through to error
  }
  throw new Error('Could not find memory directory');
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
 * Agent directory mappings for different AI assistants.
 */
const AGENT_COMMAND_DIRS: Record<string, { dir: string; ext: string; argFormat: string }> = {
  copilot: { dir: '.github/agents', ext: 'agent.md', argFormat: '$ARGUMENTS' },
  claude: { dir: '.claude/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  gemini: { dir: '.gemini/commands', ext: 'toml', argFormat: '{{args}}' },
  'cursor-agent': { dir: '.cursor/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  qwen: { dir: '.qwen/commands', ext: 'toml', argFormat: '{{args}}' },
  opencode: { dir: '.opencode/command', ext: 'md', argFormat: '$ARGUMENTS' },
  codex: { dir: '.codex/prompts', ext: 'md', argFormat: '$ARGUMENTS' },
  windsurf: { dir: '.windsurf/workflows', ext: 'md', argFormat: '$ARGUMENTS' },
  kilocode: { dir: '.kilocode/workflows', ext: 'md', argFormat: '$ARGUMENTS' },
  auggie: { dir: '.augment/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  codebuddy: { dir: '.codebuddy/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  roo: { dir: '.roo/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  q: { dir: '.amazonq/prompts', ext: 'md', argFormat: '$ARGUMENTS' },
  amp: { dir: '.agents/commands', ext: 'md', argFormat: '$ARGUMENTS' },
  shai: { dir: '.shai/commands', ext: 'md', argFormat: '$ARGUMENTS' },
};

/**
 * Script command for js script type
 */
const JS_SCRIPT_COMMANDS: Record<string, string> = {
  'create-new-feature': 'npx specify create-new-feature --json "{ARGS}"',
  'setup-plan': 'npx specify setup-plan --json',
  'check-prerequisites': 'npx specify check-prerequisites --json',
  'update-agent-context': 'npx specify update-agent-context __AGENT__',
};

/**
 * Rewrite paths in template content.
 * Converts:
 * - memory/ → .specify/memory/
 * - scripts/ → .specify/scripts/
 * - templates/ → .specify/templates/
 */
function rewritePaths(content: string): string {
  return content
    .replace(/(\/?)(memory\/)/g, '.specify/memory/')
    .replace(/(\/?)(scripts\/)/g, '.specify/scripts/')
    .replace(/(\/?)(templates\/)/g, '.specify/templates/');
}

/**
 * Extract YAML frontmatter value from template content.
 */
function extractFrontmatterValue(content: string, key: string): string | null {
  const lines = content.split('\n');
  let inFrontmatter = false;
  
  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        break; // End of frontmatter
      }
    }
    
    if (inFrontmatter) {
      const match = line.match(new RegExp(`^${key}:\\s*(.*)$`));
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  
  return null;
}

/**
 * Extract nested YAML value from frontmatter.
 * e.g., extractNestedValue(content, 'scripts', 'js') for scripts.js
 */
function extractNestedValue(content: string, section: string, key: string): string | null {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let inSection = false;
  
  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        break;
      }
    }
    
    if (inFrontmatter) {
      // Check if we're entering the target section
      if (line.match(new RegExp(`^${section}:\\s*$`))) {
        inSection = true;
        continue;
      }
      
      // Check if we're leaving the section (new top-level key)
      if (inSection && /^[a-zA-Z]/.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        inSection = false;
      }
      
      // Look for the nested key
      if (inSection) {
        const match = line.match(new RegExp(`^\\s+${key}:\\s*(.*)$`));
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  }
  
  return null;
}

/**
 * Remove scripts and agent_scripts sections from frontmatter.
 */
function removeScriptSections(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inFrontmatter = false;
  let skipSection = false;
  let dashCount = 0;
  
  for (const line of lines) {
    if (line.trim() === '---') {
      dashCount++;
      if (dashCount === 1) {
        inFrontmatter = true;
      } else {
        inFrontmatter = false;
      }
      result.push(line);
      continue;
    }
    
    if (inFrontmatter) {
      // Check if we're entering a section to skip
      if (/^scripts:\s*$/.test(line) || /^agent_scripts:\s*$/.test(line)) {
        skipSection = true;
        continue;
      }
      
      // Check if we're leaving the skip section (new top-level key)
      if (skipSection && /^[a-zA-Z].*:/.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        skipSection = false;
      }
      
      // Skip indented lines in skip section
      if (skipSection && (/^\s+/.test(line) || line.trim() === '')) {
        continue;
      }
      
      result.push(line);
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Process a command template and generate agent-specific output.
 */
function processCommandTemplate(
  templateContent: string,
  commandName: string,
  agent: string,
  config: { ext: string; argFormat: string }
): string {
  // Get the script command for js
  const scriptCommand = JS_SCRIPT_COMMANDS[commandName] || `npx specify ${commandName}`;
  
  // Get the agent script command if present
  const agentScriptCommand = extractNestedValue(templateContent, 'agent_scripts', 'js') || '';
  
  // Replace {SCRIPT} placeholder with the actual command
  let body = templateContent.replace(/\{SCRIPT\}/g, scriptCommand);
  
  // Replace {AGENT_SCRIPT} placeholder if present
  if (agentScriptCommand) {
    body = body.replace(/\{AGENT_SCRIPT\}/g, agentScriptCommand);
  }
  
  // Replace __AGENT__ with actual agent name
  body = body.replace(/__AGENT__/g, agent);
  
  // Replace {ARGS} with the agent-specific format
  body = body.replace(/\{ARGS\}/g, config.argFormat);
  
  // Remove scripts and agent_scripts sections from frontmatter
  body = removeScriptSections(body);
  
  // Rewrite paths
  body = rewritePaths(body);
  
  // Extract description for TOML format
  const description = extractFrontmatterValue(templateContent, 'description') || '';
  
  // Format output based on extension type
  if (config.ext === 'toml') {
    // For TOML, remove the frontmatter entirely and use {{args}} format
    body = removeFrontmatter(body);
    // Replace $ARGUMENTS with {{args}} for TOML format
    body = body.replace(/\$ARGUMENTS/g, '{{args}}');
    // Escape backslashes for TOML
    body = body.replace(/\\/g, '\\\\');
    return `description = "${description}"\n\nprompt = """\n${body}\n"""`;
  }
  
  return body;
}

/**
 * Remove YAML frontmatter from content.
 */
function removeFrontmatter(content: string): string {
  const lines = content.split('\n');
  let dashCount = 0;
  let endIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line?.trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  // Return content after frontmatter, trimming leading whitespace
  return lines.slice(endIndex).join('\n').trim();
}

/**
 * Generate .vscode/settings.json content.
 * Uses the template file if available, otherwise generates defaults.
 */
function generateVSCodeSettings(templatesDir: string): string {
  // Try to use the template file if available
  const templateSettingsPath = join(templatesDir, 'vscode-settings.json');
  if (templatesDir && existsSync(templateSettingsPath)) {
    return readFileSync(templateSettingsPath, 'utf-8');
  }
  
  // Fallback to default settings
  return JSON.stringify({
    "chat.commandCenter.enabled": true,
    "github.copilot.chat.codeGeneration.useInstructionFiles": true,
    "chat.agent.maxRequests": 100,
    "chat.promptFilesRecommendations": {
      "speckit.constitution": true,
      "speckit.specify": true,
      "speckit.plan": true,
      "speckit.tasks": true,
      "speckit.implement": true
    },
    "chat.tools.terminal.autoApprove": {
      ".specify/scripts/bash/": true,
      ".specify/scripts/powershell/": true
    }
  }, null, 2);
}

/**
 * Generate copilot prompt files for .github/prompts/
 */
function generateCopilotPromptFile(agentName: string): string {
  return `---
agent: ${agentName}
---
`;
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
 * Generate built-in templates for JavaScript script type.
 * 
 * @param projectPath - Path to the project directory
 * @param options - Generation options
 */
export async function generateBuiltinTemplates(
  projectPath: string,
  options: GenerateBuiltinOptions
): Promise<void> {
  const { ai, tracker, debug } = options;
  
  let templatesDir: string;
  let memoryDir: string;
  
  try {
    templatesDir = getTemplatesDir();
    memoryDir = getMemoryDir();
    if (debug) {
      console.log(`Templates directory: ${templatesDir}`);
      console.log(`Memory directory: ${memoryDir}`);
    }
  } catch (error) {
    // Fall back to generating templates from scratch
    if (debug) {
      console.log('Templates/memory directory not found, generating from scratch');
    }
    templatesDir = '';
    memoryDir = '';
  }

  // Get agent configuration
  const agentConfig = AGENT_COMMAND_DIRS[ai] ?? AGENT_COMMAND_DIRS['copilot']!;

  // Create directory structure
  const specifyTemplatesDir = join(projectPath, '.specify', 'templates');
  const specifyMemoryDir = join(projectPath, '.specify', 'memory');
  const memoryLinkDir = join(projectPath, 'memory');
  const specsDir = join(projectPath, 'specs');
  const vscodeDir = join(projectPath, '.vscode');
  const agentDir = join(projectPath, agentConfig.dir);

  mkdirSync(specifyTemplatesDir, { recursive: true });
  mkdirSync(specifyMemoryDir, { recursive: true });
  mkdirSync(memoryLinkDir, { recursive: true });
  mkdirSync(specsDir, { recursive: true });
  mkdirSync(vscodeDir, { recursive: true });
  mkdirSync(agentDir, { recursive: true });

  // Copy template files to .specify/templates/
  for (const file of TEMPLATE_FILES) {
    const destPath = join(specifyTemplatesDir, file);
    if (templatesDir && existsSync(join(templatesDir, file))) {
      copyFileSync(join(templatesDir, file), destPath);
    } else {
      writeFileSync(destPath, getDefaultTemplateContent(file));
    }
  }

  // Copy constitution to .specify/memory/ and memory/
  if (memoryDir && existsSync(join(memoryDir, 'constitution.md'))) {
    copyFileSync(join(memoryDir, 'constitution.md'), join(specifyMemoryDir, 'constitution.md'));
    copyFileSync(join(memoryDir, 'constitution.md'), join(memoryLinkDir, 'constitution.md'));
  } else {
    const defaultConstitution = generateDefaultConstitution();
    writeFileSync(join(specifyMemoryDir, 'constitution.md'), defaultConstitution);
    writeFileSync(join(memoryLinkDir, 'constitution.md'), defaultConstitution);
  }

  // Process and generate command files
  const commandsSourceDir = templatesDir ? join(templatesDir, 'commands') : '';
  
  if (commandsSourceDir && existsSync(commandsSourceDir)) {
    const commandFiles = readdirSync(commandsSourceDir).filter(f => f.endsWith('.md'));
    
    for (const file of commandFiles) {
      const commandName = basename(file, '.md');
      const sourceContent = readFileSync(join(commandsSourceDir, file), 'utf-8');
      
      // Process template with agent-specific substitutions
      const processedContent = processCommandTemplate(
        sourceContent,
        commandName,
        ai,
        agentConfig
      );
      
      // Write to agent directory with proper extension
      const destFileName = `speckit.${commandName}.${agentConfig.ext}`;
      writeFileSync(join(agentDir, destFileName), processedContent);
    }
  }

  // Generate Copilot-specific files
  if (ai === 'copilot') {
    // Create .github/prompts/ directory with prompt files
    const promptsDir = join(projectPath, '.github', 'prompts');
    mkdirSync(promptsDir, { recursive: true });
    
    if (commandsSourceDir && existsSync(commandsSourceDir)) {
      const commandFiles = readdirSync(commandsSourceDir).filter(f => f.endsWith('.md'));
      for (const file of commandFiles) {
        const commandName = basename(file, '.md');
        const promptFileName = `speckit.${commandName}.prompt.md`;
        writeFileSync(
          join(promptsDir, promptFileName),
          generateCopilotPromptFile(`speckit.${commandName}`)
        );
      }
    }
  }

  // Generate VS Code settings
  const settingsPath = join(vscodeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, generateVSCodeSettings(templatesDir));
  }

  // Create .gitkeep in specs directory
  writeFileSync(join(specsDir, '.gitkeep'), '');
}

/**
 * Generate default constitution content.
 */
function generateDefaultConstitution(): string {
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
