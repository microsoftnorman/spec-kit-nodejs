/**
 * Template download module - downloads template assets from GitHub releases.
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getAuthHeaders } from '../github/token.js';
import { formatRateLimitError } from '../github/rate-limit.js';
import type { StepTracker } from '../ui/tracker.js';

// GitHub API configuration
export const REPO_OWNER = 'github';
export const REPO_NAME = 'spec-kit';
export const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
export const API_TIMEOUT = 30; // 30 seconds
export const STREAM_TIMEOUT = 60; // 60 seconds for streaming download
export const CHUNK_SIZE = 8192; // 8KB chunks

/**
 * Asset naming pattern: spec-kit-template-{ai}-{version}.zip
 * Version may or may not have 'v' prefix
 */
export function getAssetNamePattern(ai: string): RegExp {
  return new RegExp(`^spec-kit-template-${ai}-v?[\\d.]+\\.zip$`);
}

/**
 * Check if an asset name matches the expected pattern.
 */
export function isValidAssetName(name: string): boolean {
  return name.startsWith('spec-kit-template-') && name.endsWith('.zip');
}

/**
 * Metadata returned with downloaded template.
 */
export interface TemplateMetadata {
  filename: string;
  size: number;
  release: string;
  assetUrl: string;
}

/**
 * Download options for template download.
 */
export interface DownloadOptions {
  githubToken?: string;
  verbose?: boolean;
  showProgress?: boolean;
  debug?: boolean;
  tracker?: StepTracker;
}

/**
 * Result of template download.
 */
export interface DownloadResult {
  zipPath: string;
  metadata: TemplateMetadata;
}

/**
 * GitHub release asset structure.
 */
export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

/**
 * GitHub release structure.
 */
export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
}

/**
 * Find a matching asset in a release.
 */
export function findMatchingAsset(
  release: GitHubRelease,
  ai: string
): ReleaseAsset | null {
  const pattern = getAssetNamePattern(ai);
  return release.assets.find(asset => pattern.test(asset.name)) ?? null;
}

/**
 * Get list of available assets for display.
 */
export function getAvailableAssets(release: GitHubRelease): string[] {
  return release.assets
    .filter(asset => isValidAssetName(asset.name))
    .map(asset => asset.name);
}

/**
 * Fetch the latest release info from GitHub.
 */
export async function fetchLatestRelease(options?: {
  githubToken?: string;
}): Promise<GitHubRelease> {
  const headers = getAuthHeaders(options?.githubToken);

  const response = await fetch(API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'speckit-cli',
      ...headers,
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(formatRateLimitError(response.status, response.headers, API_URL));
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GitHubRelease>;
}

/**
 * Download a template from GitHub releases.
 * 
 * @param ai - AI assistant type (e.g., 'copilot', 'claude')
 * @param destDir - Destination directory for download
 * @param options - Download options
 * @returns Download result with zip path and metadata
 */
export async function downloadTemplate(
  ai: string,
  destDir: string,
  options?: DownloadOptions
): Promise<DownloadResult> {
  const { tracker } = options ?? {};

  // Fetch release info
  tracker?.start('fetch', 'Fetching release info...');
  const release = await fetchLatestRelease({ githubToken: options?.githubToken });
  tracker?.complete('fetch', `Found release ${release.tag_name}`);

  // Find matching asset
  const asset = findMatchingAsset(release, ai);
  if (!asset) {
    const available = getAvailableAssets(release);
    throw new Error(
      `No template found for ${ai}.\nAvailable templates:\n${available.join('\n')}`
    );
  }

  // Download the asset
  tracker?.start('download', `Downloading ${asset.name}...`);
  
  const headers = getAuthHeaders(options?.githubToken);
  const response = await fetch(asset.browser_download_url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': 'speckit-cli',
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  // Write the file to disk
  const zipPath = join(destDir, asset.name);
  
  // Ensure destination directory exists
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  // Get the response as an ArrayBuffer and write to file
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(zipPath, buffer);
  
  tracker?.complete('download', `Downloaded ${asset.name}`);

  return {
    zipPath,
    metadata: {
      filename: asset.name,
      size: asset.size,
      release: release.tag_name,
      assetUrl: asset.browser_download_url,
    },
  };
}
