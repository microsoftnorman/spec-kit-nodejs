/**
 * GitHub API client for fetching releases and assets.
 * Ported from Python specify_cli/__init__.py
 */

import { getAuthHeaders } from './token.js';
import { parseRateLimitHeaders, formatRateLimitError } from './rate-limit.js';
import { RateLimitError, NetworkError } from '../errors.js';

/**
 * GitHub release asset information
 */
export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

/**
 * GitHub release information
 */
export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
  html_url: string;
}

/**
 * Options for fetching releases
 */
export interface FetchReleaseOptions {
  token?: string;
  skipTls?: boolean;
}

/**
 * GitHub API base URL
 */
const GITHUB_API_URL = 'https://api.github.com';

/**
 * Repository owner and name for spec-kit
 */
const REPO_OWNER = 'github';
const REPO_NAME = 'spec-kit';

/**
 * Fetch the latest release from the spec-kit repository.
 */
export async function fetchLatestRelease(
  options?: FetchReleaseOptions
): Promise<GitHubRelease> {
  const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'specify-cli/nodejs',
    ...getAuthHeaders(options?.token),
  };

  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    throw new NetworkError(
      `Failed to connect to GitHub API: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      url
    );
  }

  if (!response.ok) {
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    if (response.status === 403 || response.status === 429) {
      const errorMessage = formatRateLimitError(response.status, response.headers, url);
      throw new RateLimitError(
        errorMessage,
        response.status,
        url,
        rateLimitInfo.resetTime
      );
    }

    if (response.status === 404) {
      throw new NetworkError(
        `Release not found at ${url}. The repository may not have any releases yet.`,
        404,
        url
      );
    }

    throw new NetworkError(
      `GitHub API error: ${response.status} ${response.statusText}`,
      response.status,
      url
    );
  }

  const data = await response.json() as GitHubRelease;
  return data;
}

/**
 * Find the template asset matching the given AI assistant and script type.
 * 
 * Asset naming pattern: spec-kit-template-{ai}-{script}-{version}.zip
 * Example: spec-kit-template-copilot-sh-0.0.22.zip
 */
export function findTemplateAsset(
  release: GitHubRelease,
  ai: string,
  script: string
): ReleaseAsset | null {
  // Extract version from tag (remove 'v' prefix if present)
  const version = release.tag_name.replace(/^v/, '');
  
  // Build expected asset name pattern
  const expectedName = `spec-kit-template-${ai}-${script}-${version}.zip`;
  
  // Find exact match first
  let asset = release.assets.find(a => a.name === expectedName);
  
  if (!asset) {
    // Try pattern matching for flexibility
    const pattern = new RegExp(`^spec-kit-template-${ai}-${script}-[\\d.]+\\.zip$`);
    asset = release.assets.find(a => pattern.test(a.name));
  }
  
  return asset || null;
}

/**
 * Get the template version from a release tag.
 */
export function getTemplateVersion(release: GitHubRelease): string {
  return release.tag_name.replace(/^v/, '');
}

/**
 * Format the release date as YYYY-MM-DD.
 */
export function formatReleaseDate(release: GitHubRelease): string {
  const date = new Date(release.published_at);
  return date.toISOString().split('T')[0] || 'unknown';
}
