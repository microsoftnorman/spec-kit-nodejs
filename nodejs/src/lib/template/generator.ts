/**
 * Template generator module - generates agent-specific templates from base templates.
 * 
 * This module replaces the need to download pre-built ZIP templates from GitHub releases.
 * Instead, it generates the templates locally based on the selected AI agent.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import type { StepTracker } from '../ui/tracker.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Agent output configuration - defines how commands are generated for each agent.
 */
export interface AgentOutputConfig {
  /** Directory path relative to project root where commands go */
  commandDir: string;
  /** File extension for command files */
  extension: 'md' | 'toml' | 'agent.md';
  /** How arguments are represented in the template */
  argsFormat: '$ARGUMENTS' | '{{args}}';
  /** Optional additional files to copy (e.g., GEMINI.md) */
  additionalFiles?: { src: string; dest: string }[];
  /** Whether to generate VS Code settings */
  generateVscodeSettings?: boolean;
  /** Whether to generate prompt companion files (for Copilot) */
  generatePromptFiles?: boolean;
}

/**
 * Agent output configurations for all supported agents.
 */
export const AGENT_OUTPUT_CONFIG: Record<string, AgentOutputConfig> = {
  claude: {
    commandDir: '.claude/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  gemini: {
    commandDir: '.gemini/commands',
    extension: 'toml',
    argsFormat: '{{args}}',
  },
  copilot: {
    commandDir: '.github/agents',
    extension: 'agent.md',
    argsFormat: '$ARGUMENTS',
    generateVscodeSettings: true,
    generatePromptFiles: true,
  },
  'cursor-agent': {
    commandDir: '.cursor/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  qwen: {
    commandDir: '.qwen/commands',
    extension: 'toml',
    argsFormat: '{{args}}',
  },
  opencode: {
    commandDir: '.opencode/command',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  windsurf: {
    commandDir: '.windsurf/workflows',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  codex: {
    commandDir: '.codex/prompts',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  kilocode: {
    commandDir: '.kilocode/workflows',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  auggie: {
    commandDir: '.augment/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  roo: {
    commandDir: '.roo/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  codebuddy: {
    commandDir: '.codebuddy/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  amp: {
    commandDir: '.agents/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  shai: {
    commandDir: '.shai/commands',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
  q: {
    commandDir: '.amazonq/prompts',
    extension: 'md',
    argsFormat: '$ARGUMENTS',
  },
};

/**
 * Options for template generation.
 */
export interface GenerateOptions {
  tracker?: StepTracker;
  verbose?: boolean;
}

/**
 * Result of template generation.
 */
export interface GenerateResult {
  filesGenerated: number;
  commandsGenerated: string[];
  directories: string[];
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns the raw frontmatter text and the body content.
 */
export function parseFrontmatter(content: string): { frontmatterText: string; frontmatter: Record<string, unknown>; body: string } {
  const lines = content.split('\n');
  
  if (lines[0]?.trim() !== '---') {
    return { frontmatterText: '', frontmatter: {}, body: content };
  }
  
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) {
    return { frontmatterText: '', frontmatter: {}, body: content };
  }
  
  // Get raw frontmatter text
  const frontmatterText = lines.slice(1, endIndex).join('\n');
  
  // Simple YAML parsing for extracting key values (only for simple keys)
  const frontmatter: Record<string, unknown> = {};
  const frontmatterLines = frontmatterText.split('\n');
  
  for (const line of frontmatterLines) {
    // Only parse simple key: value pairs (not nested)
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match && !line.startsWith(' ') && !line.startsWith('\t')) {
      frontmatter[match[1]!] = match[2]!;
    }
  }
  
  const body = lines.slice(endIndex + 1).join('\n');
  return { frontmatterText, frontmatter, body };
}

/**
 * Rewrite paths in template content to use .speckit prefix.
 */
export function rewritePaths(content: string): string {
  return content
    .replace(/(\/?)(memory\/)/g, '.speckit/$2')
    .replace(/(\/?)(scripts\/)/g, '.speckit/$2')
    .replace(/(\/?)(templates\/)/g, '.speckit/$2');
}

/**
 * Remove specific YAML keys from frontmatter text.
 */
function removeYamlKeys(frontmatterText: string, keysToRemove: string[]): string {
  const lines = frontmatterText.split('\n');
  const result: string[] = [];
  let skipUntilNextKey = false;
  
  for (const line of lines) {
    // Check if this line starts a key we want to remove
    const keyMatch = line.match(/^(\w+):/);
    if (keyMatch && keysToRemove.includes(keyMatch[1]!)) {
      skipUntilNextKey = true;
      continue;
    }
    
    // If we're skipping and this line is indented, skip it too
    if (skipUntilNextKey) {
      if (line.startsWith(' ') || line.startsWith('\t') || line.trim() === '') {
        continue;
      }
      skipUntilNextKey = false;
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

/**
 * Generate a command file for a specific agent from a template.
 */
export function generateCommand(
  templateContent: string,
  agent: string,
  config: AgentOutputConfig
): string {
  const { frontmatterText, frontmatter, body } = parseFrontmatter(templateContent);
  
  // Get the script command
  const scriptCommand = (frontmatter.script as string) || '';
  const agentScript = (frontmatter.agent_script as string) || '';
  
  // Replace {SCRIPT} placeholder with the script command
  let processedBody = body.replace(/\{SCRIPT\}/g, scriptCommand);
  
  // Replace {AGENT_SCRIPT} placeholder if present
  if (agentScript) {
    const processedAgentScript = agentScript.replace(/__AGENT__/g, agent);
    processedBody = processedBody.replace(/\{AGENT_SCRIPT\}/g, processedAgentScript);
  }
  
  // Replace {ARGS} with agent-specific format
  processedBody = processedBody.replace(/\{ARGS\}/g, config.argsFormat);
  
  // Replace __AGENT__ placeholder with actual agent name
  processedBody = processedBody.replace(/__AGENT__/g, agent);
  
  // Rewrite paths to use .speckit prefix
  processedBody = rewritePaths(processedBody);
  
  // Clean up frontmatter - remove script and agent_script keys
  const cleanedFrontmatter = removeYamlKeys(frontmatterText, ['script', 'agent_script']);
  
  // Build the output based on extension type
  const description = (frontmatter.description as string) || '';
  
  if (config.extension === 'toml') {
    // TOML format for Gemini/Qwen
    // - No frontmatter in prompt (just the body)
    // - Use {{args}} instead of $ARGUMENTS
    let tomlBody = processedBody.replace(/\$ARGUMENTS/g, '{{args}}');
    // Escape backslashes for TOML
    tomlBody = tomlBody.replace(/\\/g, '\\\\');
    // Escape quotes in description
    const escapedDesc = description.replace(/"/g, '\\"');
    return `description = "${escapedDesc}"\n\nprompt = """\n${tomlBody.trim()}\n"""`;
  }
  
  // Markdown format - use cleaned frontmatter
  return `---\n${cleanedFrontmatter}\n---\n${processedBody}`;
}

/**
 * Copy directory recursively.
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;
  
  mkdirSync(dest, { recursive: true });
  
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get the path to the assets directory.
 * This needs to work both in development and when installed as a package.
 * 
 * In development: src/lib/template/generator.ts -> assets/
 * In production: dist/lib/template/generator.js -> assets/
 */
function getAssetsDir(): string {
  const possiblePaths = [
    // Development/Production: from dist/lib/template/ or src/lib/template/ -> assets/
    join(__dirname, '..', '..', '..', 'assets'),
    // Alternative: from dist/lib/ -> assets/
    join(__dirname, '..', '..', 'assets'),
    // Alternative: from dist/ -> assets/
    join(__dirname, '..', 'assets'),
    // Fallback: look for assets in package root (when running from bin/)
    join(__dirname, '..', '..', '..', '..', 'assets'),
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p) && (existsSync(join(p, 'templates')) || existsSync(join(p, 'memory')))) {
      return p;
    }
  }
  
  throw new Error(`Could not find assets directory. Searched: ${possiblePaths.join(', ')}`);
}

/**
 * Get the path to the templates directory.
 * This needs to work both in development and when installed as a package.
 */
export function getTemplatesDir(): string {
  const assetsDir = getAssetsDir();
  const templatesDir = join(assetsDir, 'templates');
  
  if (existsSync(templatesDir) && existsSync(join(templatesDir, 'commands'))) {
    return templatesDir;
  }
  
  throw new Error(`Could not find templates directory at ${templatesDir}`);
}

/**
 * Get the path to the memory directory.
 */
export function getMemoryDir(): string {
  const assetsDir = getAssetsDir();
  const memoryDir = join(assetsDir, 'memory');
  
  if (existsSync(memoryDir)) {
    return memoryDir;
  }
  
  throw new Error(`Could not find memory directory at ${memoryDir}`);
}

/**
 * Generate all templates for a specific agent.
 * 
 * @param agent - The AI agent to generate templates for
 * @param destDir - The destination project directory
 * @param options - Generation options
 * @returns Result of generation
 */
export async function generateTemplates(
  agent: string,
  destDir: string,
  options?: GenerateOptions
): Promise<GenerateResult> {
  const { tracker } = options ?? {};
  
  const config = AGENT_OUTPUT_CONFIG[agent];
  if (!config) {
    throw new Error(`Unknown agent: ${agent}. Valid agents: ${Object.keys(AGENT_OUTPUT_CONFIG).join(', ')}`);
  }
  
  const result: GenerateResult = {
    filesGenerated: 0,
    commandsGenerated: [],
    directories: [],
  };
  
  tracker?.start('generate', 'Generating templates...');
  
  // Get paths to source templates
  const templatesDir = getTemplatesDir();
  const memoryDir = getMemoryDir();
  const commandsDir = join(templatesDir, 'commands');
  
  // Create .speckit directory structure
  const speckitDir = join(destDir, '.speckit');
  mkdirSync(speckitDir, { recursive: true });
  result.directories.push('.speckit');
  
  // Copy memory directory
  tracker?.add('copy-memory', 'Copying memory templates');
  const destMemoryDir = join(speckitDir, 'memory');
  copyDirRecursive(memoryDir, destMemoryDir);
  tracker?.complete('copy-memory', 'Memory templates copied');
  result.directories.push('.speckit/memory');
  
  // Copy templates (excluding commands)
  tracker?.add('copy-templates', 'Copying templates');
  const destTemplatesDir = join(speckitDir, 'templates');
  mkdirSync(destTemplatesDir, { recursive: true });
  
  const templateFiles = readdirSync(templatesDir);
  for (const file of templateFiles) {
    const srcPath = join(templatesDir, file);
    const destPath = join(destTemplatesDir, file);
    
    if (file === 'commands' || file === 'vscode-settings.json') {
      continue; // Skip commands dir and vscode-settings (handled separately)
    }
    
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      result.filesGenerated++;
    }
  }
  tracker?.complete('copy-templates', 'Templates copied');
  result.directories.push('.speckit/templates');
  
  // Generate agent-specific commands
  tracker?.add('generate-commands', `Generating ${agent} commands`);
  const destCommandsDir = join(destDir, config.commandDir);
  mkdirSync(destCommandsDir, { recursive: true });
  result.directories.push(config.commandDir);
  
  const commandTemplates = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  
  for (const templateFile of commandTemplates) {
    const templatePath = join(commandsDir, templateFile);
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    const commandName = basename(templateFile, '.md');
    const outputContent = generateCommand(templateContent, agent, config);
    
    const outputFileName = `speckit.${commandName}.${config.extension}`;
    const outputPath = join(destCommandsDir, outputFileName);
    
    writeFileSync(outputPath, outputContent);
    result.filesGenerated++;
    result.commandsGenerated.push(outputFileName);
  }
  
  tracker?.complete('generate-commands', `${result.commandsGenerated.length} commands generated`);
  
  // Generate prompt companion files for Copilot
  if (config.generatePromptFiles) {
    tracker?.add('generate-prompts', 'Generating prompt files');
    const promptsDir = join(destDir, '.github', 'prompts');
    mkdirSync(promptsDir, { recursive: true });
    result.directories.push('.github/prompts');
    
    for (const cmd of result.commandsGenerated) {
      const baseName = cmd.replace('.agent.md', '');
      const promptFile = join(promptsDir, `${baseName}.prompt.md`);
      writeFileSync(promptFile, `---\nagent: ${baseName}\n---\n`);
      result.filesGenerated++;
    }
    
    tracker?.complete('generate-prompts', 'Prompt files generated');
  }
  
  // Generate VS Code settings
  if (config.generateVscodeSettings) {
    tracker?.add('vscode-settings', 'Creating VS Code settings');
    const vscodeDir = join(destDir, '.vscode');
    mkdirSync(vscodeDir, { recursive: true });
    result.directories.push('.vscode');
    
    const vscodeSettingsPath = join(templatesDir, 'vscode-settings.json');
    if (existsSync(vscodeSettingsPath)) {
      copyFileSync(vscodeSettingsPath, join(vscodeDir, 'settings.json'));
      result.filesGenerated++;
    }
    
    tracker?.complete('vscode-settings', 'VS Code settings created');
  }
  
  // Create specs directory
  const specsDir = join(destDir, 'specs');
  if (!existsSync(specsDir)) {
    mkdirSync(specsDir, { recursive: true });
    result.directories.push('specs');
  }
  
  tracker?.complete('generate', `Generated ${result.filesGenerated} files`);
  
  return result;
}
