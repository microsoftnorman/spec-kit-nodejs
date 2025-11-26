/**
 * create-new-feature command
 * Ported from scripts/bash/create-new-feature.sh
 *
 * Creates a new feature branch and sets up the spec directory structure.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { getRepoRoot, hasGit } from '../lib/common.js';

/**
 * Options for create-new-feature command
 */
export interface CreateNewFeatureOptions {
  /** Output in JSON format */
  json?: boolean;
  /** Custom short name (2-4 words) for the branch */
  shortName?: string;
  /** Specify branch number manually (overrides auto-detection) */
  number?: string;
}

/**
 * JSON output format
 */
interface CreateNewFeatureOutput {
  BRANCH_NAME: string;
  SPEC_FILE: string;
  FEATURE_NUM: string;
}

/** Common stop words to filter out when generating branch names */
const STOP_WORDS = new Set([
  'i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'must', 'shall', 'this', 'that', 'these', 'those', 'my', 'your', 'our', 'their',
  'want', 'need', 'add', 'get', 'set'
]);

/**
 * Clean and format a branch name.
 */
function cleanBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');
}

/**
 * Generate branch name with stop word filtering and length filtering.
 */
function generateBranchName(description: string): string {
  // Convert to lowercase and split into words
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);

  // Filter words: remove stop words and words shorter than 3 chars
  const meaningfulWords: string[] = [];
  for (const word of words) {
    // Skip stop words
    if (STOP_WORDS.has(word)) continue;

    // Keep words with length >= 3, or potential acronyms (uppercase in original)
    if (word.length >= 3) {
      meaningfulWords.push(word);
    } else if (description.includes(word.toUpperCase())) {
      // Keep short words if they appear as uppercase in original (likely acronyms)
      meaningfulWords.push(word);
    }
  }

  // If we have meaningful words, use first 3-4 of them
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join('-');
  }

  // Fallback to original logic if no meaningful words found
  const cleaned = cleanBranchName(description);
  return cleaned.split('-').filter(w => w.length > 0).slice(0, 3).join('-');
}

/**
 * Get highest number from specs directory.
 */
function getHighestFromSpecs(specsDir: string): number {
  let highest = 0;

  if (existsSync(specsDir)) {
    try {
      const entries = readdirSync(specsDir);
      for (const entry of entries) {
        const fullPath = join(specsDir, entry);
        if (statSync(fullPath).isDirectory()) {
          const match = entry.match(/^(\d+)/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > highest) {
              highest = num;
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return highest;
}

/**
 * Get highest number from git branches.
 */
function getHighestFromBranches(): number {
  let highest = 0;

  try {
    const branches = execSync('git branch -a', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

    for (const line of branches.split('\n')) {
      // Clean branch name: remove leading markers and remote prefixes
      const cleanBranch = line.replace(/^[* ]+/, '').replace(/^remotes\/[^/]+\//, '').trim();

      // Extract feature number if branch matches pattern ###-*
      const match = cleanBranch.match(/^(\d{3})-/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return highest;
}

/**
 * Check existing branches (local and remote) and return next available number.
 */
function checkExistingBranches(shortName: string, specsDir: string): number {
  let maxNum = 0;

  try {
    // Fetch all remotes to get latest branch info
    execSync('git fetch --all --prune', { stdio: 'ignore' });
  } catch {
    // Ignore fetch errors (e.g., no remotes)
  }

  // Check remote branches
  try {
    const remoteBranches = execSync('git ls-remote --heads origin', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const pattern = new RegExp(`refs/heads/(\\d+)-${shortName}$`, 'gm');
    let match;
    while ((match = pattern.exec(remoteBranches)) !== null) {
      if (match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  } catch {
    // Ignore errors
  }

  // Check local branches
  try {
    const localBranches = execSync('git branch', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const pattern = new RegExp(`^[* ]*(\\d+)-${shortName}$`, 'gm');
    let match;
    while ((match = pattern.exec(localBranches)) !== null) {
      if (match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  } catch {
    // Ignore errors
  }

  // Check specs directory
  if (existsSync(specsDir)) {
    try {
      const entries = readdirSync(specsDir);
      const pattern = new RegExp(`^(\\d+)-${shortName}$`);
      for (const entry of entries) {
        const fullPath = join(specsDir, entry);
        if (statSync(fullPath).isDirectory()) {
          const match = entry.match(pattern);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return maxNum + 1;
}

/**
 * Find the repository root by searching for existing project markers.
 */
function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.git')) || existsSync(join(dir, '.specify'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

/**
 * Create a new feature branch and set up the spec directory structure.
 *
 * @param featureDescription - Description of the feature
 * @param options - Command options
 */
export async function createNewFeature(
  featureDescription: string,
  options: CreateNewFeatureOptions
): Promise<void> {
  const jsonMode = options.json ?? false;

  if (!featureDescription || featureDescription.trim() === '') {
    console.error('Usage: specify create-new-feature [options] <feature_description>');
    process.exit(1);
  }

  // Resolve repository root
  let repoRoot: string;
  let hasGitRepo: boolean;

  if (hasGit()) {
    repoRoot = getRepoRoot();
    hasGitRepo = true;
  } else {
    const found = findRepoRoot(process.cwd());
    if (!found) {
      console.error('Error: Could not determine repository root. Please run this command from within the repository.');
      process.exit(1);
    }
    repoRoot = found;
    hasGitRepo = false;
  }

  const specsDir = join(repoRoot, 'specs');
  mkdirSync(specsDir, { recursive: true });

  // Generate branch name
  let branchSuffix: string;
  if (options.shortName) {
    branchSuffix = cleanBranchName(options.shortName);
  } else {
    branchSuffix = generateBranchName(featureDescription);
  }

  // Determine branch number
  let branchNumber: number;
  if (options.number) {
    branchNumber = parseInt(options.number, 10);
    if (isNaN(branchNumber)) {
      console.error('Error: --number must be a valid integer');
      process.exit(1);
    }
  } else if (hasGitRepo) {
    branchNumber = checkExistingBranches(branchSuffix, specsDir);
  } else {
    const highest = getHighestFromSpecs(specsDir);
    branchNumber = highest + 1;
  }

  const featureNum = branchNumber.toString().padStart(3, '0');
  let branchName = `${featureNum}-${branchSuffix}`;

  // GitHub enforces a 244-byte limit on branch names
  const MAX_BRANCH_LENGTH = 244;
  if (branchName.length > MAX_BRANCH_LENGTH) {
    const maxSuffixLength = MAX_BRANCH_LENGTH - 4; // Account for: feature number (3) + hyphen (1)
    let truncatedSuffix = branchSuffix.slice(0, maxSuffixLength);
    // Remove trailing hyphen if truncation created one
    truncatedSuffix = truncatedSuffix.replace(/-$/, '');

    const originalBranchName = branchName;
    branchName = `${featureNum}-${truncatedSuffix}`;

    console.error(`[specify] Warning: Branch name exceeded GitHub's 244-byte limit`);
    console.error(`[specify] Original: ${originalBranchName} (${originalBranchName.length} bytes)`);
    console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
  }

  // Create git branch if we have git
  if (hasGitRepo) {
    try {
      execSync(`git checkout -b "${branchName}"`, { cwd: repoRoot, stdio: 'pipe' });
    } catch (e) {
      const err = e as { stderr?: Buffer };
      const stderr = err.stderr?.toString() ?? '';
      console.error(`Error creating branch: ${stderr}`);
      process.exit(1);
    }
  } else {
    console.error(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }

  // Create feature directory
  const featureDir = join(specsDir, branchName);
  mkdirSync(featureDir, { recursive: true });

  // Copy spec template if it exists
  const templatePath = join(repoRoot, '.specify', 'templates', 'spec-template.md');
  const specFile = join(featureDir, 'spec.md');

  if (existsSync(templatePath)) {
    copyFileSync(templatePath, specFile);
  } else {
    writeFileSync(specFile, '');
  }

  // Set the SPECIFY_FEATURE environment variable for the current session
  process.env.SPECIFY_FEATURE = branchName;

  // Output results
  if (jsonMode) {
    const output: CreateNewFeatureOutput = {
      BRANCH_NAME: branchName,
      SPEC_FILE: specFile,
      FEATURE_NUM: featureNum,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
    console.log(`SPECIFY_FEATURE environment variable set to: ${branchName}`);
  }
}
