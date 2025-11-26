/**
 * check-prerequisites command
 * Ported from scripts/bash/check-prerequisites.sh and scripts/nodejs/check-prerequisites.sh
 *
 * Provides unified prerequisite checking for Spec-Driven Development workflow.
 */

import { existsSync } from 'fs';
import {
  getFeaturePaths,
  checkFeatureBranch,
  dirHasFiles,
  type FeaturePaths,
} from '../lib/common.js';

/**
 * Options for check-prerequisites command
 */
export interface CheckPrerequisitesOptions {
  /** Output in JSON format */
  json?: boolean;
  /** Require tasks.md to exist (for implementation phase) */
  requireTasks?: boolean;
  /** Include tasks.md in AVAILABLE_DOCS list */
  includeTasks?: boolean;
  /** Only output path variables (no validation) */
  pathsOnly?: boolean;
}

/**
 * JSON output format for paths-only mode
 */
interface PathsOnlyOutput {
  REPO_ROOT: string;
  BRANCH: string;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
}

/**
 * JSON output format for full validation mode
 */
interface ValidationOutput {
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
}

/**
 * Check prerequisites for Spec-Driven Development workflow.
 *
 * @param options - Command options
 * @returns Exit code (0 = success, 1 = error)
 */
export async function checkPrerequisites(options: CheckPrerequisitesOptions): Promise<void> {
  const jsonMode = options.json ?? false;
  const requireTasks = options.requireTasks ?? false;
  const includeTasks = options.includeTasks ?? false;
  const pathsOnly = options.pathsOnly ?? false;

  // Get feature paths
  const paths: FeaturePaths = getFeaturePaths();

  // Validate branch
  const branchCheck = checkFeatureBranch(paths.currentBranch, paths.hasGit);
  if (!branchCheck.isValid) {
    console.error(branchCheck.error);
    process.exit(1);
  }
  if (branchCheck.warning) {
    console.error(branchCheck.warning);
  }

  // If paths-only mode, output paths and exit
  if (pathsOnly) {
    if (jsonMode) {
      const output: PathsOnlyOutput = {
        REPO_ROOT: paths.repoRoot,
        BRANCH: paths.currentBranch,
        FEATURE_DIR: paths.featureDir,
        FEATURE_SPEC: paths.featureSpec,
        IMPL_PLAN: paths.implPlan,
        TASKS: paths.tasks,
      };
      console.log(JSON.stringify(output));
    } else {
      console.log(`REPO_ROOT: ${paths.repoRoot}`);
      console.log(`BRANCH: ${paths.currentBranch}`);
      console.log(`FEATURE_DIR: ${paths.featureDir}`);
      console.log(`FEATURE_SPEC: ${paths.featureSpec}`);
      console.log(`IMPL_PLAN: ${paths.implPlan}`);
      console.log(`TASKS: ${paths.tasks}`);
    }
    return;
  }

  // Validate required directories and files
  if (!existsSync(paths.featureDir)) {
    console.error(`ERROR: Feature directory not found: ${paths.featureDir}`);
    console.error('Run /speckit.specify first to create the feature structure.');
    process.exit(1);
  }

  if (!existsSync(paths.implPlan)) {
    console.error(`ERROR: plan.md not found in ${paths.featureDir}`);
    console.error('Run /speckit.plan first to create the implementation plan.');
    process.exit(1);
  }

  // Check for tasks.md if required
  if (requireTasks && !existsSync(paths.tasks)) {
    console.error(`ERROR: tasks.md not found in ${paths.featureDir}`);
    console.error('Run /speckit.tasks first to create the task list.');
    process.exit(1);
  }

  // Build list of available documents
  const docs: string[] = [];

  // Always check these optional docs
  if (existsSync(paths.research)) {
    docs.push('research.md');
  }
  if (existsSync(paths.dataModel)) {
    docs.push('data-model.md');
  }

  // Check contracts directory (only if it exists and has files)
  if (dirHasFiles(paths.contractsDir)) {
    docs.push('contracts/');
  }

  if (existsSync(paths.quickstart)) {
    docs.push('quickstart.md');
  }

  // Include tasks.md if requested and it exists
  if (includeTasks && existsSync(paths.tasks)) {
    docs.push('tasks.md');
  }

  // Output results
  if (jsonMode) {
    const output: ValidationOutput = {
      FEATURE_DIR: paths.featureDir,
      AVAILABLE_DOCS: docs,
    };
    console.log(JSON.stringify(output));
  } else {
    // Text output
    console.log(`FEATURE_DIR:${paths.featureDir}`);
    console.log('AVAILABLE_DOCS:');

    // Show status of each potential document
    checkFile(paths.research, 'research.md');
    checkFile(paths.dataModel, 'data-model.md');
    checkDir(paths.contractsDir, 'contracts/');
    checkFile(paths.quickstart, 'quickstart.md');

    if (includeTasks) {
      checkFile(paths.tasks, 'tasks.md');
    }
  }
}

/**
 * Check if a file exists and print status.
 */
function checkFile(filePath: string, displayName: string): void {
  if (existsSync(filePath)) {
    console.log(`  ✓ ${displayName}`);
  } else {
    console.log(`  ✗ ${displayName}`);
  }
}

/**
 * Check if a directory exists and has files, then print status.
 */
function checkDir(dirPath: string, displayName: string): void {
  if (dirHasFiles(dirPath)) {
    console.log(`  ✓ ${displayName}`);
  } else {
    console.log(`  ✗ ${displayName}`);
  }
}
