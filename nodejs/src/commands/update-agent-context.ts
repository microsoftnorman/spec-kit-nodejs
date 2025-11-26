/**
 * update-agent-context command
 * Ported from scripts/bash/update-agent-context.sh
 *
 * Updates agent context files with information from plan.md.
 * Maintains AI agent context files by parsing feature specifications
 * and updating agent-specific configuration files with project information.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { getFeaturePaths, type FeaturePaths } from '../lib/common.js';

/**
 * Options for update-agent-context command
 */
export interface UpdateAgentContextOptions {
  /** Specific agent type to update (leave empty to update all existing) */
  agentType?: string;
}

/**
 * Valid agent types
 */
const VALID_AGENT_TYPES = [
  'claude', 'gemini', 'copilot', 'cursor-agent', 'qwen', 'opencode',
  'codex', 'windsurf', 'kilocode', 'auggie', 'roo', 'codebuddy', 'amp', 'shai', 'q'
] as const;

type AgentType = typeof VALID_AGENT_TYPES[number];

/**
 * Parsed plan data
 */
interface PlanData {
  language: string;
  framework: string;
  database: string;
  projectType: string;
}

/**
 * Get agent file paths for a given repository root
 */
function getAgentFilePaths(repoRoot: string): Record<AgentType, string> {
  return {
    claude: join(repoRoot, 'CLAUDE.md'),
    gemini: join(repoRoot, 'GEMINI.md'),
    copilot: join(repoRoot, '.github', 'agents', 'copilot-instructions.md'),
    'cursor-agent': join(repoRoot, '.cursor', 'rules', 'specify-rules.mdc'),
    qwen: join(repoRoot, 'QWEN.md'),
    opencode: join(repoRoot, 'AGENTS.md'),
    codex: join(repoRoot, 'AGENTS.md'),
    windsurf: join(repoRoot, '.windsurf', 'rules', 'specify-rules.md'),
    kilocode: join(repoRoot, '.kilocode', 'rules', 'specify-rules.md'),
    auggie: join(repoRoot, '.augment', 'rules', 'specify-rules.md'),
    roo: join(repoRoot, '.roo', 'rules', 'specify-rules.md'),
    codebuddy: join(repoRoot, 'CODEBUDDY.md'),
    amp: join(repoRoot, 'AGENTS.md'),
    shai: join(repoRoot, 'SHAI.md'),
    q: join(repoRoot, 'AGENTS.md'),
  };
}

/**
 * Get agent display name
 */
function getAgentDisplayName(agentType: AgentType): string {
  const names: Record<AgentType, string> = {
    claude: 'Claude Code',
    gemini: 'Gemini CLI',
    copilot: 'GitHub Copilot',
    'cursor-agent': 'Cursor IDE',
    qwen: 'Qwen Code',
    opencode: 'opencode',
    codex: 'Codex CLI',
    windsurf: 'Windsurf',
    kilocode: 'Kilo Code',
    auggie: 'Auggie CLI',
    roo: 'Roo Code',
    codebuddy: 'CodeBuddy CLI',
    amp: 'Amp',
    shai: 'SHAI',
    q: 'Amazon Q Developer CLI',
  };
  return names[agentType];
}

/**
 * Log functions
 */
function logInfo(message: string): void {
  console.log(`INFO: ${message}`);
}

function logSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

function logError(message: string): void {
  console.error(`ERROR: ${message}`);
}

function logWarning(message: string): void {
  console.error(`WARNING: ${message}`);
}

/**
 * Extract a field from the plan file.
 */
function extractPlanField(fieldPattern: string, planContent: string): string {
  const regex = new RegExp(`^\\*\\*${fieldPattern}\\*\\*:\\s*(.+)$`, 'm');
  const match = planContent.match(regex);
  
  if (!match || !match[1]) {
    return '';
  }
  
  const value = match[1].trim();
  
  // Filter out placeholder values
  if (value === 'NEEDS CLARIFICATION' || value === 'N/A') {
    return '';
  }
  
  return value;
}

/**
 * Parse plan data from a plan file.
 */
function parsePlanData(planFile: string): PlanData | null {
  if (!existsSync(planFile)) {
    logError(`Plan file not found: ${planFile}`);
    return null;
  }

  logInfo(`Parsing plan data from ${planFile}`);

  let planContent: string;
  try {
    planContent = readFileSync(planFile, 'utf-8');
  } catch (e) {
    logError(`Plan file is not readable: ${planFile}`);
    return null;
  }

  const language = extractPlanField('Language/Version', planContent);
  const framework = extractPlanField('Primary Dependencies', planContent);
  const database = extractPlanField('Storage', planContent);
  const projectType = extractPlanField('Project Type', planContent);

  // Log what we found
  if (language) {
    logInfo(`Found language: ${language}`);
  } else {
    logWarning('No language information found in plan');
  }

  if (framework) {
    logInfo(`Found framework: ${framework}`);
  }

  if (database && database !== 'N/A') {
    logInfo(`Found database: ${database}`);
  }

  if (projectType) {
    logInfo(`Found project type: ${projectType}`);
  }

  return { language, framework, database, projectType };
}

/**
 * Format technology stack string.
 */
function formatTechnologyStack(language: string, framework: string): string {
  const parts: string[] = [];

  if (language && language !== 'NEEDS CLARIFICATION') {
    parts.push(language);
  }
  if (framework && framework !== 'NEEDS CLARIFICATION' && framework !== 'N/A') {
    parts.push(framework);
  }

  if (parts.length === 0) {
    return '';
  } else if (parts.length === 1) {
    return parts[0]!;
  } else {
    return parts.join(' + ');
  }
}

/**
 * Get project structure based on project type.
 */
function getProjectStructure(projectType: string): string {
  if (projectType.includes('web')) {
    return 'backend/\nfrontend/\ntests/';
  }
  return 'src/\ntests/';
}

/**
 * Get commands for a given language.
 */
function getCommandsForLanguage(language: string): string {
  if (language.includes('Python')) {
    return 'cd src && pytest && ruff check .';
  } else if (language.includes('Rust')) {
    return 'cargo test && cargo clippy';
  } else if (language.includes('JavaScript') || language.includes('TypeScript')) {
    return 'npm test && npm run lint';
  }
  return `# Add commands for ${language}`;
}

/**
 * Get language conventions.
 */
function getLanguageConventions(language: string): string {
  return `${language}: Follow standard conventions`;
}

/**
 * Create a new agent file from template.
 */
function createNewAgentFile(
  targetFile: string,
  templateFile: string,
  projectName: string,
  currentDate: string,
  planData: PlanData,
  currentBranch: string
): boolean {
  if (!existsSync(templateFile)) {
    logError(`Template not found at ${templateFile}`);
    return false;
  }

  logInfo('Creating new agent context file from template...');

  let content: string;
  try {
    content = readFileSync(templateFile, 'utf-8');
  } catch (e) {
    logError(`Template file is not readable: ${templateFile}`);
    return false;
  }

  const projectStructure = getProjectStructure(planData.projectType);
  const commands = getCommandsForLanguage(planData.language);
  const languageConventions = getLanguageConventions(planData.language);

  // Build technology stack and recent change strings
  let techStack: string;
  if (planData.language && planData.framework) {
    techStack = `- ${planData.language} + ${planData.framework} (${currentBranch})`;
  } else if (planData.language) {
    techStack = `- ${planData.language} (${currentBranch})`;
  } else if (planData.framework) {
    techStack = `- ${planData.framework} (${currentBranch})`;
  } else {
    techStack = `- (${currentBranch})`;
  }

  let recentChange: string;
  if (planData.language && planData.framework) {
    recentChange = `- ${currentBranch}: Added ${planData.language} + ${planData.framework}`;
  } else if (planData.language) {
    recentChange = `- ${currentBranch}: Added ${planData.language}`;
  } else if (planData.framework) {
    recentChange = `- ${currentBranch}: Added ${planData.framework}`;
  } else {
    recentChange = `- ${currentBranch}: Added`;
  }

  // Perform substitutions
  content = content
    .replace(/\[PROJECT NAME\]/g, projectName)
    .replace(/\[DATE\]/g, currentDate)
    .replace(/\[EXTRACTED FROM ALL PLAN\.MD FILES\]/g, techStack)
    .replace(/\[ACTUAL STRUCTURE FROM PLANS\]/g, projectStructure)
    .replace(/\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]/g, commands)
    .replace(/\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]/g, languageConventions)
    .replace(/\[LAST 3 FEATURES AND WHAT THEY ADDED\]/g, recentChange);

  // Create directory if needed
  const targetDir = dirname(targetFile);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  try {
    writeFileSync(targetFile, content, 'utf-8');
    return true;
  } catch (e) {
    logError(`Failed to write to ${targetFile}`);
    return false;
  }
}

/**
 * Update an existing agent file.
 */
function updateExistingAgentFile(
  targetFile: string,
  currentDate: string,
  planData: PlanData,
  currentBranch: string
): boolean {
  logInfo('Updating existing agent context file...');

  let content: string;
  try {
    content = readFileSync(targetFile, 'utf-8');
  } catch (e) {
    logError(`Cannot read existing file: ${targetFile}`);
    return false;
  }

  const techStack = formatTechnologyStack(planData.language, planData.framework);
  const newTechEntries: string[] = [];
  let newChangeEntry = '';

  // Prepare new technology entries
  if (techStack && !content.includes(techStack)) {
    newTechEntries.push(`- ${techStack} (${currentBranch})`);
  }

  if (planData.database && planData.database !== 'N/A' && planData.database !== 'NEEDS CLARIFICATION' && !content.includes(planData.database)) {
    newTechEntries.push(`- ${planData.database} (${currentBranch})`);
  }

  // Prepare new change entry
  if (techStack) {
    newChangeEntry = `- ${currentBranch}: Added ${techStack}`;
  } else if (planData.database && planData.database !== 'N/A' && planData.database !== 'NEEDS CLARIFICATION') {
    newChangeEntry = `- ${currentBranch}: Added ${planData.database}`;
  }

  const lines = content.split('\n');
  const outputLines: string[] = [];
  let inTechSection = false;
  let inChangesSection = false;
  let techEntriesAdded = false;
  let changesEntriesAdded = false;
  let existingChangesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Handle Active Technologies section
    if (line === '## Active Technologies') {
      outputLines.push(line);
      inTechSection = true;
      continue;
    } else if (inTechSection && /^## /.test(line)) {
      // Add new tech entries before closing the section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        outputLines.push(...newTechEntries);
        techEntriesAdded = true;
      }
      outputLines.push(line);
      inTechSection = false;
      continue;
    } else if (inTechSection && line === '') {
      // Add new tech entries before empty line in tech section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        outputLines.push(...newTechEntries);
        techEntriesAdded = true;
      }
      outputLines.push(line);
      continue;
    }

    // Handle Recent Changes section
    if (line === '## Recent Changes') {
      outputLines.push(line);
      // Add new change entry right after the heading
      if (newChangeEntry) {
        outputLines.push(newChangeEntry);
      }
      inChangesSection = true;
      changesEntriesAdded = true;
      continue;
    } else if (inChangesSection && /^## /.test(line)) {
      outputLines.push(line);
      inChangesSection = false;
      continue;
    } else if (inChangesSection && line.startsWith('- ')) {
      // Keep only first 2 existing changes
      if (existingChangesCount < 2) {
        outputLines.push(line);
        existingChangesCount++;
      }
      continue;
    }

    // Update timestamp
    if (/\*\*Last updated\*\*:.*\d{4}-\d{2}-\d{2}/.test(line)) {
      outputLines.push(line.replace(/\d{4}-\d{2}-\d{2}/, currentDate));
    } else {
      outputLines.push(line);
    }
  }

  // Post-loop check: if we're still in the Active Technologies section
  if (inTechSection && !techEntriesAdded && newTechEntries.length > 0) {
    outputLines.push(...newTechEntries);
  }

  // If sections don't exist, add them at the end of the file
  const hasActiveTechnologies = content.includes('## Active Technologies');
  const hasRecentChanges = content.includes('## Recent Changes');

  if (!hasActiveTechnologies && newTechEntries.length > 0) {
    outputLines.push('');
    outputLines.push('## Active Technologies');
    outputLines.push(...newTechEntries);
  }

  if (!hasRecentChanges && newChangeEntry) {
    outputLines.push('');
    outputLines.push('## Recent Changes');
    outputLines.push(newChangeEntry);
  }

  try {
    writeFileSync(targetFile, outputLines.join('\n'), 'utf-8');
    return true;
  } catch (e) {
    logError(`Failed to update target file: ${targetFile}`);
    return false;
  }
}

/**
 * Update a single agent file.
 */
function updateAgentFile(
  targetFile: string,
  agentName: string,
  templateFile: string,
  planData: PlanData,
  currentBranch: string,
  repoRoot: string
): boolean {
  logInfo(`Updating ${agentName} context file: ${targetFile}`);

  const projectName = basename(repoRoot);
  const currentDate = new Date().toISOString().split('T')[0]!;

  // Create directory if it doesn't exist
  const targetDir = dirname(targetFile);
  if (!existsSync(targetDir)) {
    try {
      mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      logError(`Failed to create directory: ${targetDir}`);
      return false;
    }
  }

  if (!existsSync(targetFile)) {
    // Create new file from template
    if (createNewAgentFile(targetFile, templateFile, projectName, currentDate!, planData, currentBranch)) {
      logSuccess(`Created new ${agentName} context file`);
      return true;
    } else {
      logError('Failed to create new agent file');
      return false;
    }
  } else {
    // Update existing file
    if (updateExistingAgentFile(targetFile, currentDate!, planData, currentBranch)) {
      logSuccess(`Updated existing ${agentName} context file`);
      return true;
    } else {
      logError('Failed to update existing agent file');
      return false;
    }
  }
}

/**
 * Update a specific agent.
 */
function updateSpecificAgent(
  agentType: AgentType,
  agentFilePaths: Record<AgentType, string>,
  templateFile: string,
  planData: PlanData,
  currentBranch: string,
  repoRoot: string
): boolean {
  const targetFile = agentFilePaths[agentType];
  const agentName = getAgentDisplayName(agentType);
  return updateAgentFile(targetFile, agentName, templateFile, planData, currentBranch, repoRoot);
}

/**
 * Update all existing agent files.
 */
function updateAllExistingAgents(
  agentFilePaths: Record<AgentType, string>,
  templateFile: string,
  planData: PlanData,
  currentBranch: string,
  repoRoot: string
): boolean {
  let foundAgent = false;
  let success = true;

  // Track which files we've already updated (some agents share the same file)
  const updatedFiles = new Set<string>();

  const agentsToCheck: AgentType[] = [
    'claude', 'gemini', 'copilot', 'cursor-agent', 'qwen', 'windsurf',
    'kilocode', 'auggie', 'roo', 'codebuddy', 'shai'
  ];

  // Handle AGENTS.md separately (shared by opencode, codex, amp, q)
  const agentsFile = agentFilePaths['opencode']; // They all point to AGENTS.md

  for (const agentType of agentsToCheck) {
    const targetFile = agentFilePaths[agentType];
    
    if (existsSync(targetFile) && !updatedFiles.has(targetFile)) {
      const agentName = getAgentDisplayName(agentType);
      if (!updateAgentFile(targetFile, agentName, templateFile, planData, currentBranch, repoRoot)) {
        success = false;
      }
      updatedFiles.add(targetFile);
      foundAgent = true;
    }
  }

  // Check AGENTS.md (shared file)
  if (existsSync(agentsFile) && !updatedFiles.has(agentsFile)) {
    if (!updateAgentFile(agentsFile, 'Codex/opencode', templateFile, planData, currentBranch, repoRoot)) {
      success = false;
    }
    updatedFiles.add(agentsFile);
    foundAgent = true;
  }

  // If no agent files exist, create a default Claude file
  if (!foundAgent) {
    logInfo('No existing agent files found, creating default Claude file...');
    if (!updateAgentFile(agentFilePaths['claude'], 'Claude Code', templateFile, planData, currentBranch, repoRoot)) {
      success = false;
    }
  }

  return success;
}

/**
 * Print summary of changes.
 */
function printSummary(planData: PlanData): void {
  console.log();
  logInfo('Summary of changes:');

  if (planData.language) {
    console.log(`  - Added language: ${planData.language}`);
  }

  if (planData.framework) {
    console.log(`  - Added framework: ${planData.framework}`);
  }

  if (planData.database && planData.database !== 'N/A') {
    console.log(`  - Added database: ${planData.database}`);
  }

  console.log();
  logInfo(`Usage: specify update-agent-context [${VALID_AGENT_TYPES.join('|')}]`);
}

/**
 * Update agent context files with information from plan.md.
 *
 * @param agentType - Optional specific agent type to update
 * @param options - Command options (not used currently, for future expansion)
 */
export async function updateAgentContext(
  agentType?: string,
  _options?: UpdateAgentContextOptions
): Promise<void> {
  // Get feature paths
  const paths: FeaturePaths = getFeaturePaths();

  // Validate environment
  if (!paths.currentBranch) {
    logError('Unable to determine current feature');
    if (paths.hasGit) {
      logInfo("Make sure you're on a feature branch");
    } else {
      logInfo('Set SPECIFY_FEATURE environment variable or create a feature first');
    }
    process.exit(1);
  }

  const planFile = paths.implPlan;
  if (!existsSync(planFile)) {
    logError(`No plan.md found at ${planFile}`);
    logInfo("Make sure you're working on a feature with a corresponding spec directory");
    if (!paths.hasGit) {
      logInfo('Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first');
    }
    process.exit(1);
  }

  const templateFile = join(paths.repoRoot, '.speckit', 'templates', 'agent-file-template.md');
  if (!existsSync(templateFile)) {
    logWarning(`Template file not found at ${templateFile}`);
    logWarning('Creating new agent files will fail');
  }

  logInfo(`=== Updating agent context files for feature ${paths.currentBranch} ===`);

  // Parse the plan file
  const planData = parsePlanData(planFile);
  if (!planData) {
    logError('Failed to parse plan data');
    process.exit(1);
  }

  const agentFilePaths = getAgentFilePaths(paths.repoRoot);
  let success = true;

  if (!agentType) {
    // No specific agent provided - update all existing agent files
    logInfo('No agent specified, updating all existing agent files...');
    success = updateAllExistingAgents(agentFilePaths, templateFile, planData, paths.currentBranch, paths.repoRoot);
  } else {
    // Validate agent type
    if (!VALID_AGENT_TYPES.includes(agentType as AgentType)) {
      logError(`Unknown agent type '${agentType}'`);
      logError(`Expected: ${VALID_AGENT_TYPES.join('|')}`);
      process.exit(1);
    }

    // Specific agent provided - update only that agent
    logInfo(`Updating specific agent: ${agentType}`);
    success = updateSpecificAgent(agentType as AgentType, agentFilePaths, templateFile, planData, paths.currentBranch, paths.repoRoot);
  }

  // Print summary
  printSummary(planData);

  if (success) {
    logSuccess('Agent context update completed successfully');
  } else {
    logError('Agent context update completed with errors');
    process.exit(1);
  }
}
