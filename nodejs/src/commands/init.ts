/**
 * Init command - initialize a new Speckit project
 * Ported from Python specify_cli/__init__.py
 */

import { existsSync, readdirSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';
import chalk from 'chalk';
import { showBanner } from '../lib/ui/banner.js';
import { StepTracker } from '../lib/ui/tracker.js';
import { panel } from '../lib/ui/console.js';
import { selectWithArrows, getAIChoices, DEFAULT_AI_KEY } from '../lib/ui/select.js';
import { AGENT_CONFIG } from '../lib/config.js';
import { checkTool } from '../lib/tools/detect.js';
import { initGitRepo, isGitRepo } from '../lib/tools/git.js';
import { generateTemplates } from '../lib/template/generator.js';
import { ExitCode } from '../lib/errors.js';
import type { InitOptions } from '../types/index.js';

/**
 * Security notice for agent folders.
 */
const SECURITY_NOTICE = `
${chalk.yellow('Security Notice:')}
Agent configuration folders may contain sensitive prompts and instructions.
Consider adding them to .gitignore if you don't want to share them.
`;

/**
 * Get next steps content based on configuration.
 */
function getNextSteps(projectName: string, selectedAi: string, inCurrentDir: boolean): string {
  const cdStep = inCurrentDir ? '' : `  ${chalk.cyan('cd')} ${projectName}\n`;
  
  return `${cdStep}  ${chalk.cyan('code')} .

${chalk.dim('Then use these Spec Kit commands:')}
  ${chalk.green('/speckit.constitution')} - Set project rules
  ${chalk.green('/speckit.specify')}      - Write specifications
  ${chalk.green('/speckit.plan')}         - Create implementation plan
  ${chalk.green('/speckit.tasks')}        - Generate task list
  ${chalk.green('/speckit.implement')}    - Start coding

${chalk.dim('Enhancement commands:')}
  ${chalk.cyan('/speckit.clarify')}   - Ask clarifying questions
  ${chalk.cyan('/speckit.analyze')}   - Analyze existing code
  ${chalk.cyan('/speckit.checklist')} - Create implementation checklist`;
}

/**
 * Get Codex-specific environment variable message.
 */
function getCodexHomeMessage(projectPath: string): string {
  if (process.platform === 'win32') {
    return `
${chalk.yellow('Codex CLI Setup:')}
Set the CODEX_HOME environment variable to enable Codex in this project:
  ${chalk.cyan('setx CODEX_HOME')} "${projectPath}"

Or for the current session only:
  ${chalk.cyan('$env:CODEX_HOME')} = "${projectPath}"
`;
  }
  
  return `
${chalk.yellow('Codex CLI Setup:')}
Set the CODEX_HOME environment variable to enable Codex in this project:
  ${chalk.cyan('export CODEX_HOME')}="${projectPath}"

Add this to your shell profile (.bashrc, .zshrc) to persist it.
`;
}

/**
 * Initialize a new Specify project from the latest template.
 */
export async function init(
  projectName: string | undefined,
  options: InitOptions
): Promise<void> {
  showBanner();

  // Handle "." as --here flag
  if (projectName === '.') {
    options.here = true;
    projectName = undefined;
  }

  // Determine project path
  let projectPath: string;
  const inCurrentDir = options.here ?? false;
  
  if (inCurrentDir) {
    projectPath = process.cwd();
    projectName = basename(projectPath);
  } else if (projectName) {
    projectPath = resolve(projectName);
  } else {
    console.log(chalk.red('Error:') + ' Please provide a project name or use --here');
    console.log('');
    console.log('Usage: speckit init <project-name>');
    console.log('       speckit init --here');
    process.exit(ExitCode.INVALID_ARGUMENT);
  }

  // Validate project directory
  if (!inCurrentDir && existsSync(projectPath)) {
    const contents = readdirSync(projectPath);
    if (contents.length > 0 && !options.force) {
      console.log(chalk.yellow('Warning:') + ` Directory '${projectPath}' is not empty.`);
      console.log('Use --force to proceed anyway, or choose a different directory.');
      process.exit(ExitCode.GENERAL_ERROR);
    }
  }

  // Create project directory if needed
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true });
  }

  // Determine AI assistant
  let selectedAi = options.ai;
  if (!selectedAi) {
    // Interactive selection if TTY is available
    if (process.stdin.isTTY && process.stdout.isTTY) {
      try {
        console.log();
        selectedAi = await selectWithArrows(
          getAIChoices(),
          'Select AI assistant:',
          DEFAULT_AI_KEY
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('KeyboardInterrupt')) {
          console.log('\n' + chalk.yellow('Selection cancelled.'));
          process.exit(ExitCode.USER_CANCELLED);
        }
        throw error;
      }
    } else {
      // Non-interactive: default to copilot
      selectedAi = 'copilot';
      console.log(chalk.cyan('Note:') + ' Defaulting to copilot. Use --ai <name> to specify an AI assistant.');
    }
  }

  // Validate AI assistant
  if (!AGENT_CONFIG[selectedAi]) {
    console.log(chalk.red('Error:') + ` Unknown AI assistant '${selectedAi}'.`);
    console.log('Valid options: ' + Object.keys(AGENT_CONFIG).join(', '));
    process.exit(ExitCode.INVALID_ARGUMENT);
  }

  const agentConfig = AGENT_CONFIG[selectedAi]!;

  // Check if agent CLI is required
  if (agentConfig.requiresCli && !options.ignoreAgentTools) {
    if (!checkTool(selectedAi)) {
      console.log(chalk.yellow('Warning:') + ` ${agentConfig.name} CLI is not installed.`);
      if (agentConfig.installUrl) {
        console.log(`Install from: ${agentConfig.installUrl}`);
      }
      console.log('Use --ignore-agent-tools to proceed anyway.');
      process.exit(ExitCode.MISSING_DEPENDENCY);
    }
  }

  // Initialize step tracker
  const tracker = new StepTracker(`Initialize ${projectName}`);

  tracker.add('generate', 'Generate templates');
  if (!options.noGit) {
    tracker.add('git', 'Initialize git repository');
  }

  console.log();
  console.log(chalk.cyan('Project Configuration:'));
  console.log(`  Name: ${chalk.green(projectName)}`);
  console.log(`  Path: ${chalk.green(projectPath)}`);
  console.log(`  AI Assistant: ${chalk.green(agentConfig.name)}`);
  console.log();

  // Generate templates locally
  tracker.start('generate', 'generating templates');
  try {
    const result = await generateTemplates(selectedAi, projectPath, {
      tracker,
      verbose: options.debug,
    });
    
    tracker.complete('generate', `${result.filesGenerated} files created`);
  } catch (error) {
    tracker.error('generate', String(error instanceof Error ? error.message : error));
    console.log(tracker.render());
    console.log();
    console.log(chalk.red('Error:') + ' Failed to generate templates.');
    if (options.debug) {
      console.log(chalk.dim(String(error)));
    }
    process.exit(ExitCode.FILE_SYSTEM_ERROR);
  }

  // Initialize git repository
  if (!options.noGit) {
    tracker.start('git', 'initializing repository');
    if (isGitRepo(projectPath)) {
      tracker.skip('git', 'already a git repository');
    } else {
      const result = initGitRepo(projectPath, true);
      if (result.success) {
        tracker.complete('git', 'done');
      } else {
        tracker.error('git', result.error || 'failed');
      }
    }
  }

  console.log(tracker.render());
  console.log();

  // Show security notice
  console.log(SECURITY_NOTICE);

  // Show Codex-specific message
  if (selectedAi === 'codex') {
    console.log(getCodexHomeMessage(projectPath));
  }

  // Show next steps panel
  panel(getNextSteps(projectName!, selectedAi, inCurrentDir), 'Next Steps');
  console.log();

  // Success message
  console.log(chalk.green('✓') + ' Project initialized successfully!');
  console.log();
}
