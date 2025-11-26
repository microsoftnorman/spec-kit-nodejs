/**
 * Common functions and variables for Spec-Driven Development workflow
 * Ported from scripts/bash/common.sh and scripts/powershell/common.ps1
 *
 * This is a shared library used by multiple commands.
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Feature paths returned by getFeaturePaths()
 */
export interface FeaturePaths {
  repoRoot: string;
  currentBranch: string;
  hasGit: boolean;
  featureDir: string;
  featureSpec: string;
  implPlan: string;
  tasks: string;
  research: string;
  dataModel: string;
  quickstart: string;
  contractsDir: string;
}

/**
 * Get repository root, with fallback for non-git repositories.
 */
export function getRepoRoot(): string {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch {
    // Fall back to current working directory
    return process.cwd();
  }
}

/**
 * Check if we have git available in the current directory.
 */
export function hasGit(): boolean {
  try {
    execSync('git rev-parse --show-toplevel', {
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch, with fallback for non-git repositories.
 * Checks SPECIFY_FEATURE env var first, then git, then falls back to finding latest feature.
 */
export function getCurrentBranch(): string {
  // First check if SPECIFY_FEATURE environment variable is set
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }

  // Then check git if available
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch {
    // For non-git repos, try to find the latest feature directory
    const repoRoot = getRepoRoot();
    const specsDir = join(repoRoot, 'specs');

    if (existsSync(specsDir)) {
      let latestFeature = '';
      let highest = 0;

      try {
        const entries = readdirSync(specsDir);
        for (const entry of entries) {
          const fullPath = join(specsDir, entry);
          if (statSync(fullPath).isDirectory()) {
            const match = entry.match(/^(\d{3})-/);
            if (match && match[1]) {
              const number = parseInt(match[1], 10);
              if (number > highest) {
                highest = number;
                latestFeature = entry;
              }
            }
          }
        }
      } catch {
        // Ignore errors reading directory
      }

      if (latestFeature) {
        return latestFeature;
      }
    }

    return 'main'; // Final fallback
  }
}

/**
 * Check if we're on a valid feature branch.
 * @param branch - Branch name to check
 * @param hasGitRepo - Whether we have a git repo
 * @returns Object with isValid and error message if invalid
 */
export function checkFeatureBranch(
  branch: string,
  hasGitRepo: boolean
): { isValid: boolean; error?: string; warning?: string } {
  // For non-git repos, we can't enforce branch naming but still provide output
  if (!hasGitRepo) {
    return {
      isValid: true,
      warning: '[specify] Warning: Git repository not detected; skipped branch validation',
    };
  }

  // Feature branches should match pattern: 001-feature-name
  if (!/^\d{3}-/.test(branch)) {
    return {
      isValid: false,
      error: `ERROR: Not on a feature branch. Current branch: ${branch}\nFeature branches should be named like: 001-feature-name`,
    };
  }

  return { isValid: true };
}

/**
 * Find feature directory by numeric prefix instead of exact branch match.
 * This allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature).
 */
export function findFeatureDirByPrefix(repoRoot: string, branchName: string): string {
  const specsDir = join(repoRoot, 'specs');

  // Extract numeric prefix from branch (e.g., "004" from "004-whatever")
  const prefixMatch = branchName.match(/^(\d{3})-/);
  if (!prefixMatch) {
    // If branch doesn't have numeric prefix, fall back to exact match
    return join(specsDir, branchName);
  }

  const prefix = prefixMatch[1];
  const matches: string[] = [];

  // Search for directories in specs/ that start with this prefix
  if (existsSync(specsDir)) {
    try {
      const entries = readdirSync(specsDir);
      for (const entry of entries) {
        const fullPath = join(specsDir, entry);
        if (statSync(fullPath).isDirectory() && entry.startsWith(`${prefix}-`)) {
          matches.push(entry);
        }
      }
    } catch {
      // Ignore errors reading directory
    }
  }

  // Handle results
  if (matches.length === 0) {
    // No match found - return the branch name path (will fail later with clear error)
    return join(specsDir, branchName);
  } else if (matches.length === 1) {
    // Exactly one match - perfect!
    return join(specsDir, matches[0]!);
  } else {
    // Multiple matches - this shouldn't happen with proper naming convention
    console.error(
      `ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(', ')}`
    );
    console.error('Please ensure only one spec directory exists per numeric prefix.');
    return join(specsDir, branchName); // Return something to avoid breaking the script
  }
}

/**
 * Get all feature paths for the current working context.
 */
export function getFeaturePaths(): FeaturePaths {
  const repoRoot = getRepoRoot();
  const currentBranch = getCurrentBranch();
  const hasGitRepo = hasGit();

  // Use prefix-based lookup to support multiple branches per spec
  const featureDir = findFeatureDirByPrefix(repoRoot, currentBranch);

  return {
    repoRoot,
    currentBranch,
    hasGit: hasGitRepo,
    featureDir,
    featureSpec: join(featureDir, 'spec.md'),
    implPlan: join(featureDir, 'plan.md'),
    tasks: join(featureDir, 'tasks.md'),
    research: join(featureDir, 'research.md'),
    dataModel: join(featureDir, 'data-model.md'),
    quickstart: join(featureDir, 'quickstart.md'),
    contractsDir: join(featureDir, 'contracts'),
  };
}

/**
 * Check if a directory exists and has files.
 */
export function dirHasFiles(dirPath: string): boolean {
  if (!existsSync(dirPath)) {
    return false;
  }
  try {
    const entries = readdirSync(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}
