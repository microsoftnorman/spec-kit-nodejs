/**
 * Init command - initialize a new Specify project
 * Ported from Python specify_cli/__init__.py
 */

import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import { tmpdir } from 'os';
import chalk from 'chalk';
import { showBanner } from '../lib/ui/banner.js';
import { StepTracker } from '../lib/ui/tracker.js';
import { panel } from '../lib/ui/console.js';
import { selectWithArrows, getAIChoices, getScriptChoices, DEFAULT_AI_KEY, getDefaultScriptKey } from '../lib/ui/select.js';
import { AGENT_CONFIG, SCRIPT_TYPE_CHOICES, getDefaultScriptType } from '../lib/config.js';
import { checkTool } from '../lib/tools/detect.js';
import { initGitRepo, isGitRepo } from '../lib/tools/git.js';
import { downloadTemplate } from '../lib/template/download.js';
import { extractTemplate } from '../lib/template/extract.js';
import { generateBuiltinTemplates, shouldUseBuiltinTemplates } from '../lib/template/builtin.js';
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
    console.log('Usage: specify init <project-name>');
    console.log('       specify init --here');
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

  // Determine script type
  let scriptType: string = options.script || '';
  if (!scriptType) {
    // Interactive selection if TTY is available
    if (process.stdin.isTTY && process.stdout.isTTY) {
      try {
        console.log();
        scriptType = await selectWithArrows(
          getScriptChoices(),
          'Select script type:',
          getDefaultScriptKey()
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('KeyboardInterrupt')) {
          console.log('\n' + chalk.yellow('Selection cancelled.'));
          process.exit(ExitCode.USER_CANCELLED);
        }
        throw error;
      }
    } else {
      // Non-interactive: default based on OS
      scriptType = getDefaultScriptType();
    }
  }

  // Validate script type
  if (!SCRIPT_TYPE_CHOICES[scriptType]) {
    console.log(chalk.red('Error:') + ` Unknown script type '${scriptType}'.`);
    console.log('Valid options: ' + Object.keys(SCRIPT_TYPE_CHOICES).join(', '));
    process.exit(ExitCode.INVALID_ARGUMENT);
  }

  // Initialize step tracker
  const tracker = new StepTracker(`Initialize ${projectName}`);

  // Use built-in templates for js, download for ps
  const useBuiltin = shouldUseBuiltinTemplates(scriptType);
  
  if (useBuiltin) {
    tracker.add('generate', 'Generate templates');
  } else {
    tracker.add('download', 'Download template');
    tracker.add('extract', 'Extract files');
  }
  // Commander.js sets git to false when --no-git is passed
  const shouldInitGit = options.git !== false;
  if (shouldInitGit) {
    tracker.add('git', 'Initialize git repository');
  }

  console.log();
  console.log(chalk.cyan('Project Configuration:'));
  console.log(`  Name: ${chalk.green(projectName)}`);
  console.log(`  Path: ${chalk.green(projectPath)}`);
  console.log(`  AI Assistant: ${chalk.green(agentConfig.name)}`);
  console.log(`  Script Type: ${chalk.green(SCRIPT_TYPE_CHOICES[scriptType])}`);
  console.log();

  if (useBuiltin) {
    // Generate built-in templates for js
    tracker.start('generate', 'creating project structure');
    try {
      await generateBuiltinTemplates(projectPath, {
        ai: selectedAi,
        tracker,
        debug: options.debug,
      });
      tracker.complete('generate', 'done');
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
  } else {
    // Download template from GitHub
    tracker.start('download', 'fetching from GitHub');
    let zipPath: string;
    try {
      const tempDir = join(tmpdir(), 'specify-cli');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      
      const result = await downloadTemplate(selectedAi, scriptType, tempDir, {
        githubToken: options.githubToken,
        debug: options.debug,
      });
      zipPath = result.zipPath;
      
      tracker.complete('download', `v${result.metadata.release}`);
    } catch (error) {
      tracker.error('download', String(error instanceof Error ? error.message : error));
      console.log(tracker.render());
      console.log();
      console.log(chalk.red('Error:') + ' Failed to download template from GitHub.');
      if (options.debug) {
        console.log(chalk.dim(String(error)));
      }
      console.log('');
      console.log('Troubleshooting:');
      console.log('  • Check your internet connection');
      console.log('  • Use --github-token <token> for higher rate limits');
      console.log('  • Set GH_TOKEN or GITHUB_TOKEN environment variable');
      process.exit(ExitCode.NETWORK_ERROR);
    }

    // Extract files
    tracker.start('extract', 'extracting to project');
    try {
      await extractTemplate(zipPath, projectPath, {
        here: inCurrentDir,
        tracker,
      });
      tracker.complete('extract', 'done');
    } catch (error) {
      tracker.error('extract', String(error instanceof Error ? error.message : error));
      console.log(tracker.render());
      console.log();
      console.log(chalk.red('Error:') + ' Failed to extract template.');
      if (options.debug) {
        console.log(chalk.dim(String(error)));
      }
      process.exit(ExitCode.FILE_SYSTEM_ERROR);
    }
  }

  // Initialize git repository
  if (shouldInitGit) {
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
