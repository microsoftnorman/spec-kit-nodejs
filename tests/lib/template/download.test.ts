/**
 * Tests for template download module.
 * Ported from tests/acceptance/test_template_download.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
  fetchLatestRelease,
  downloadTemplate,
  type GitHubRelease,
} from '../../../src/lib/template/download.js';

// Helper to create temp directory
function createTempDir(): string {
  const dir = join(tmpdir(), `download-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Helper to clean up temp directory
function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

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
  it('pattern format matches spec-kit-template-{ai}-{script}-{version}.zip', () => {
    const pattern = getAssetNamePattern('copilot', 'js');
    expect(pattern.test('spec-kit-template-copilot-js-0.0.22.zip')).toBe(true);
    expect(pattern.test('spec-kit-template-copilot-js-1.0.0.zip')).toBe(true);
  });

  it('pattern examples for valid asset names', () => {
    const validPatterns = [
      'spec-kit-template-copilot-js-0.0.22.zip',
      'spec-kit-template-claude-js-0.0.22.zip',
      'spec-kit-template-gemini-js-1.0.0.zip',
    ];

    for (const pattern of validPatterns) {
      expect(isValidAssetName(pattern)).toBe(true);
      expect(pattern.startsWith('spec-kit-template-')).toBe(true);
      expect(pattern.endsWith('.zip')).toBe(true);
    }
  });

  it('finds matching asset for ai_assistant and script_type', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-js-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
        { name: 'spec-kit-template-claude-js-0.0.22.zip', size: 2000, browser_download_url: 'https://example.com/2' },
      ],
    };

    const asset = findMatchingAsset(release, 'copilot', 'js');
    expect(asset).not.toBeNull();
    expect(asset?.name).toBe('spec-kit-template-copilot-js-0.0.22.zip');
  });

  it('returns null when no match found', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-js-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
      ],
    };

    const asset = findMatchingAsset(release, 'claude', 'js');
    expect(asset).toBeNull();
  });

  it('gets available assets list', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release 0.0.22',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-copilot-sh-0.0.22.zip', size: 1000, browser_download_url: 'https://example.com/1' },
        { name: 'spec-kit-template-claude-ps-0.0.22.zip', size: 2000, browser_download_url: 'https://example.com/2' },
        { name: 'other-file.txt', size: 100, browser_download_url: 'https://example.com/3' },
      ],
    };

    const available = getAvailableAssets(release);
    expect(available).toHaveLength(2);
    expect(available).toContain('spec-kit-template-copilot-sh-0.0.22.zip');
    expect(available).toContain('spec-kit-template-claude-ps-0.0.22.zip');
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
    expect(isValidAssetName('spec-kit-template-copilot-sh-0.0.22.zip')).toBe(true);
    expect(isValidAssetName('spec-kit-template-claude-ps-1.0.0.zip')).toBe(true);
  });

  it('rejects invalid asset names', () => {
    expect(isValidAssetName('other-file.txt')).toBe(false);
    expect(isValidAssetName('spec-kit-template-copilot-sh')).toBe(false);
    expect(isValidAssetName('template-copilot-sh-0.0.22.zip')).toBe(false);
  });
});

describe('getAssetNamePattern', () => {
  it('matches version with v prefix', () => {
    const pattern = getAssetNamePattern('copilot', 'sh');
    expect(pattern.test('spec-kit-template-copilot-sh-v0.0.22.zip')).toBe(true);
  });

  it('matches version without v prefix', () => {
    const pattern = getAssetNamePattern('copilot', 'sh');
    expect(pattern.test('spec-kit-template-copilot-sh-0.0.22.zip')).toBe(true);
  });

  it('matches different AI assistants', () => {
    expect(getAssetNamePattern('claude', 'ps').test('spec-kit-template-claude-ps-1.0.0.zip')).toBe(true);
    expect(getAssetNamePattern('gemini', 'js').test('spec-kit-template-gemini-js-2.0.0.zip')).toBe(true);
  });

  it('does not match incorrect format', () => {
    const pattern = getAssetNamePattern('copilot', 'sh');
    expect(pattern.test('spec-kit-template-claude-sh-0.0.22.zip')).toBe(false);
    expect(pattern.test('spec-kit-template-copilot-ps-0.0.22.zip')).toBe(false);
    expect(pattern.test('wrong-prefix-copilot-sh-0.0.22.zip')).toBe(false);
  });
});

describe('fetchLatestRelease', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches release info from GitHub API', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      assets: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRelease),
    } as Response);

    const release = await fetchLatestRelease();

    expect(release.tag_name).toBe('v1.0.0');
    expect(global.fetch).toHaveBeenCalledWith(
      API_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          'User-Agent': 'specify-cli',
        }),
      })
    );
  });

  it('includes auth header when token provided', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release',
      published_at: '2024-01-01T00:00:00Z',
      assets: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRelease),
    } as Response);

    await fetchLatestRelease({ githubToken: 'test-token' });

    expect(global.fetch).toHaveBeenCalledWith(
      API_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('throws on rate limit error (403)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      }),
    } as Response);

    await expect(fetchLatestRelease()).rejects.toThrow();
  });

  it('throws on rate limit error (429)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      }),
    } as Response);

    await expect(fetchLatestRelease()).rejects.toThrow();
  });

  it('throws on other API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchLatestRelease()).rejects.toThrow('GitHub API error: 500 Internal Server Error');
  });
});

describe('downloadTemplate', () => {
  const originalFetch = global.fetch;
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    cleanupTempDir(tempDir);
  });

  it('downloads template to destination directory', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-1.0.0.zip',
          size: 1000,
          browser_download_url: 'https://example.com/template.zip',
        },
      ],
    };

    const zipContent = Buffer.from('PK\x03\x04mock zip content');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(zipContent.buffer.slice(zipContent.byteOffset, zipContent.byteOffset + zipContent.byteLength)),
      } as Response);

    const result = await downloadTemplate('copilot', 'sh', tempDir);

    expect(result.zipPath).toBe(join(tempDir, 'spec-kit-template-copilot-sh-1.0.0.zip'));
    expect(result.metadata.filename).toBe('spec-kit-template-copilot-sh-1.0.0.zip');
    expect(result.metadata.release).toBe('v1.0.0');
    expect(existsSync(result.zipPath)).toBe(true);
  });

  it('throws when no matching template found', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        {
          name: 'spec-kit-template-claude-ps-1.0.0.zip',
          size: 1000,
          browser_download_url: 'https://example.com/template.zip',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRelease),
    } as Response);

    await expect(downloadTemplate('copilot', 'sh', tempDir)).rejects.toThrow(
      /No template found for copilot\/sh/
    );
  });

  it('throws on download failure', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-1.0.0.zip',
          size: 1000,
          browser_download_url: 'https://example.com/template.zip',
        },
      ],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

    await expect(downloadTemplate('copilot', 'sh', tempDir)).rejects.toThrow(
      'Download failed: 404 Not Found'
    );
  });

  it('creates destination directory if not exists', async () => {
    const nestedDir = join(tempDir, 'nested', 'dir');
    
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-1.0.0.zip',
          size: 1000,
          browser_download_url: 'https://example.com/template.zip',
        },
      ],
    };

    const zipContent = Buffer.from('PK\x03\x04mock');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(zipContent.buffer.slice(zipContent.byteOffset, zipContent.byteOffset + zipContent.byteLength)),
      } as Response);

    await downloadTemplate('copilot', 'sh', nestedDir);

    expect(existsSync(nestedDir)).toBe(true);
  });

  it('uses tracker when provided', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-1.0.0.zip',
          size: 1000,
          browser_download_url: 'https://example.com/template.zip',
        },
      ],
    };

    const zipContent = Buffer.from('PK\x03\x04mock');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(zipContent.buffer.slice(zipContent.byteOffset, zipContent.byteOffset + zipContent.byteLength)),
      } as Response);

    const tracker = {
      start: vi.fn(),
      complete: vi.fn(),
    };

    await downloadTemplate('copilot', 'sh', tempDir, { tracker: tracker as any });

    expect(tracker.start).toHaveBeenCalledWith('fetch', expect.any(String));
    expect(tracker.complete).toHaveBeenCalledWith('fetch', expect.any(String));
    expect(tracker.start).toHaveBeenCalledWith('download', expect.any(String));
    expect(tracker.complete).toHaveBeenCalledWith('download', expect.any(String));
  });

  it('includes available templates in error message', async () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.0.0',
      name: 'Release',
      published_at: '2024-01-01T00:00:00Z',
      assets: [
        { name: 'spec-kit-template-claude-ps-1.0.0.zip', size: 1000, browser_download_url: 'url1' },
        { name: 'spec-kit-template-gemini-sh-1.0.0.zip', size: 2000, browser_download_url: 'url2' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRelease),
    } as Response);

    await expect(downloadTemplate('copilot', 'sh', tempDir)).rejects.toThrow(
      /Available templates:/
    );
  });
});
