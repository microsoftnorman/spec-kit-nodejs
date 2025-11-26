/**
 * setup-plan command
 * Ported from scripts/bash/setup-plan.sh
 *
 * Sets up the plan.md file for a feature by copying the plan template
 * to the feature directory.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getFeaturePaths, checkFeatureBranch } from '../lib/common.js';

/**
 * Options for setup-plan command
 */
export interface SetupPlanOptions {
  /** Output in JSON format */
  json?: boolean;
}

/**
 * JSON output format
 */
interface SetupPlanOutput {
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  SPECS_DIR: string;
  BRANCH: string;
  HAS_GIT: string;
}

/**
 * Set up the plan.md file for a feature.
 *
 * @param options - Command options
 */
export async function setupPlan(options: SetupPlanOptions): Promise<void> {
  const jsonMode = options.json ?? false;

  // Get feature paths
  const paths = getFeaturePaths();

  // Check if we're on a proper feature branch (only for git repos)
  const branchCheck = checkFeatureBranch(paths.currentBranch, paths.hasGit);
  if (!branchCheck.isValid) {
    console.error(branchCheck.error);
    process.exit(1);
  }
  if (branchCheck.warning) {
    console.error(branchCheck.warning);
  }

  // Ensure the feature directory exists
  if (!existsSync(paths.featureDir)) {
    mkdirSync(paths.featureDir, { recursive: true });
  }

  // Copy plan template if it exists
  const templatePath = join(paths.repoRoot, '.specify', 'templates', 'plan-template.md');

  if (existsSync(templatePath)) {
    copyFileSync(templatePath, paths.implPlan);
    if (!jsonMode) {
      console.log(`Copied plan template to ${paths.implPlan}`);
    }
  } else {
    if (!jsonMode) {
      console.log(`Warning: Plan template not found at ${templatePath}`);
    }
    // Create a basic plan file if template doesn't exist
    if (!existsSync(paths.implPlan)) {
      writeFileSync(paths.implPlan, '');
    }
  }

  // Output results
  if (jsonMode) {
    const output: SetupPlanOutput = {
      FEATURE_SPEC: paths.featureSpec,
      IMPL_PLAN: paths.implPlan,
      SPECS_DIR: paths.featureDir,
      BRANCH: paths.currentBranch,
      HAS_GIT: paths.hasGit ? 'true' : 'false',
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`FEATURE_SPEC: ${paths.featureSpec}`);
    console.log(`IMPL_PLAN: ${paths.implPlan}`);
    console.log(`SPECS_DIR: ${paths.featureDir}`);
    console.log(`BRANCH: ${paths.currentBranch}`);
    console.log(`HAS_GIT: ${paths.hasGit}`);
  }
}
