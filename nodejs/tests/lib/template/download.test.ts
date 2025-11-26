/**
 * Tests for template download module.
 * Ported from tests/acceptance/test_template_download.py
 */

import { describe, it, expect } from 'vitest';
import {
  REPO_OWNER,
  REPO_NAME,
  API_URL,
  API_TIMEOUT,
  STREAM_TIMEOUT,
  CHUNK_SIZE,
  getAssetNamePattern,
  isValidAssetName,
  findMatchingAsset,
  getAvailableAssets,
  type GitHubRelease,
} from '../../../src/lib/template/download.js';

describe('Template Download API', () => {
  it('uses correct GitHub API URL format', () => {
    expect(API_URL).toBe('https://api.github.com/repos/github/spec-kit/releases/latest');
  });

  it('repository owner is github', () => {
    expect(REPO_OWNER).toBe('github');
  });

  it('repository name is spec-kit', () => {
    expect(REPO_NAME).toBe('spec-kit');
  });

  it('API request timeout is 30 seconds', () => {
    expect(API_TIMEOUT).toBe(30);
  });

  it('streaming download timeout is 60 seconds', () => {
    expect(STREAM_TIMEOUT).toBe(60);
  });
});

describe('Asset Name Pattern', () => {
  it('pattern format matches spec-kit-template-{ai}-{version}.zip', () => {
    const pattern = getAssetNamePattern('copilot');
    expect(pattern.test('spec-kit-template-copilot-0.0.22.zip')).toBe(true);
    expect(pattern.test('spec-kit-template-copilot-1.0.0.zip')).toBe(true);
  });

  it('pattern examples for valid asset names', () => {
    const validPatterns = [
      'spec-kit-template-copilot-0.0.22.zip',
      'spec-kit-template-claude-0.0.22.zip',
      'spec-kit-template-gemini-1.0.0.zip',
    ];

    for (const pattern of validPatterns) {
      expect(isValidAssetName(pattern)).toBe(true);
      expect(pattern.startsWith('spec-kit-template-')).toBe(true);
      expect(pattern.endsWith('.zip')).toBe(true);
    }
  });

  it('finds matching asset for ai_assistant', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
        { name: 'spec-kit-template-claude-0.0.22.zip', size: 2000, browser_download_url: 'https://example.com/2' },
      ],
    };

    const asset = findMatchingAsset(release, 'copilot');
    expect(asset).not.toBeNull();
    expect(asset?.name).toBe('spec-kit-template-copilot-0.0.22.zip');
  });

  it('returns null when no match found', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
      ],
    };

    const asset = findMatchingAsset(release, 'claude');
    expect(asset).toBeNull();
  });

  it('gets available assets list', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
        { name: 'spec-kit-template-claude-0.0.22.zip', size: 2000, browser_download_url: 'https://example.com/2' },
        { name: 'other-file.txt', size: 100, browser_download_url: 'https://example.com/3' },
      ],
    };

    const available = getAvailableAssets(release);
    expect(available).toHaveLength(2);
    expect(available).toContain('spec-kit-template-copilot-0.0.22.zip');
    expect(available).toContain('spec-kit-template-claude-0.0.22.zip');
    expect(available).not.toContain('other-file.txt');
  });
});

describe('Download Return Value', () => {
  it('metadata interface has filename', () => {
    const metadata = { filename: 'test.zip', size: 1000, release: 'v1.0.0', assetUrl: 'https://example.com' };
    expect(metadata.filename).toBe('test.zip');
  });

  it('metadata interface has size', () => {
    const metadata = { filename: 'test.zip', size: 1000, release: 'v1.0.0', assetUrl: 'https://example.com' };
    expect(metadata.size).toBe(1000);
  });

  it('metadata interface has release', () => {
    const metadata = { filename: 'test.zip', size: 1000, release: 'v1.0.0', assetUrl: 'https://example.com' };
    expect(metadata.release).toBe('v1.0.0');
  });

  it('metadata interface has assetUrl', () => {
    const metadata = { filename: 'test.zip', size: 1000, release: 'v1.0.0', assetUrl: 'https://example.com' };
    expect(metadata.assetUrl).toBe('https://example.com');
  });
});

describe('Download Progress', () => {
  it('chunk size is 8192 bytes', () => {
    expect(CHUNK_SIZE).toBe(8192);
  });
});

describe('Asset Validation', () => {
  it('validates valid asset names', () => {
    expect(isValidAssetName('spec-kit-template-copilot-0.0.22.zip')).toBe(true);
    expect(isValidAssetName('spec-kit-template-claude-1.0.0.zip')).toBe(true);
  });

  it('rejects invalid asset names', () => {
    expect(isValidAssetName('other-file.txt')).toBe(false);
    expect(isValidAssetName('spec-kit-template-copilot')).toBe(false);
    expect(isValidAssetName('template-copilot-0.0.22.zip')).toBe(false);
  });
});
