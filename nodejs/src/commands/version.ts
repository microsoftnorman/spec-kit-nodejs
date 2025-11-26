/**
 * Version command - display version and system information
 * Ported from Python specify_cli/__init__.py
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { showBanner } from '../lib/ui/banner.js';
import { getGitHubToken, getAuthHeaders } from '../lib/github/token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the CLI version from package.json
 */
function getCliVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.1';
  }
}

/**
 * Fetch the latest template version from GitHub releases API
 */
async function getLatestTemplateVersion(githubToken?: string): Promise<string | null> {
  const url = 'https://api.github.com/repos/github/spec-kit/releases/latest';

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'speckit-cli',
      ...getAuthHeaders(githubToken),
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { tag_name: string };
    return data.tag_name || null;
  } catch {
    return null;
  }
}

/**
 * Run the version command to display version and system information.
 */
export async function version(): Promise<void> {
  showBanner();

  const cliVersion = getCliVersion();

  console.log(chalk.cyan('Version Information:'));
  console.log(`  CLI version: ${chalk.green(cliVersion)}`);

  // Fetch template version
  const templateVersion = await getLatestTemplateVersion(getGitHubToken());
  if (templateVersion) {
    console.log(`  Template version: ${chalk.green(templateVersion)}`);
  } else {
    console.log(`  Template version: ${chalk.yellow('Unable to fetch')}`);
  }

  console.log();
  console.log(chalk.cyan('System Information:'));
  console.log(`  Node.js: ${chalk.green(process.version)}`);
  console.log(`  Platform: ${chalk.green(process.platform)}`);
  console.log(`  Architecture: ${chalk.green(process.arch)}`);
  console.log();
}
