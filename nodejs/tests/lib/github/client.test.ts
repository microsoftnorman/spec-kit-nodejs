/**
 * Tests for GitHub API client.
 * Tests for src/lib/github/client.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchLatestRelease,
  findTemplateAsset,
  getTemplateVersion,
  formatReleaseDate,
  type GitHubRelease,
  type ReleaseAsset,
} from '../../../src/lib/github/client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GitHub Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchLatestRelease', () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release v0.0.22',
      published_at: '2024-01-15T12:00:00Z',
      html_url: 'https://github.com/github/spec-kit/releases/tag/v0.0.22',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-0.0.22.zip',
          size: 123456,
          browser_download_url: 'https://github.com/github/spec-kit/releases/download/v0.0.22/spec-kit-template-copilot-sh-0.0.22.zip',
          content_type: 'application/zip',
        },
      ],
    };

    it('should fetch release info from GitHub API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      });

      const release = await fetchLatestRelease();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/github/spec-kit/releases/latest',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'speckit-cli/nodejs',
          }),
        })
      );
      expect(release.tag_name).toBe('v0.0.22');
    });

    it('should include authorization header when token provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      });

      await fetchLatestRelease({ token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw NetworkError on connection failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(fetchLatestRelease()).rejects.toThrow('Failed to connect to GitHub API');
    });

    it('should throw RateLimitError on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1700000000',
        }),
      });

      await expect(fetchLatestRelease()).rejects.toThrow();
    });

    it('should throw RateLimitError on 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '60',
        }),
      });

      await expect(fetchLatestRelease()).rejects.toThrow();
    });

    it('should throw NetworkError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      await expect(fetchLatestRelease()).rejects.toThrow('Release not found');
    });

    it('should throw NetworkError on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      await expect(fetchLatestRelease()).rejects.toThrow('GitHub API error');
    });
  });

  describe('findTemplateAsset', () => {
    const release: GitHubRelease = {
      tag_name: 'v0.0.22',
      name: 'Release',
      published_at: '2024-01-15T12:00:00Z',
      html_url: 'https://github.com/github/spec-kit/releases/tag/v0.0.22',
      assets: [
        {
          name: 'spec-kit-template-copilot-sh-0.0.22.zip',
          size: 100000,
          browser_download_url: 'https://example.com/copilot-sh.zip',
          content_type: 'application/zip',
        },
        {
          name: 'spec-kit-template-copilot-ps-0.0.22.zip',
          size: 100001,
          browser_download_url: 'https://example.com/copilot-ps.zip',
          content_type: 'application/zip',
        },
        {
          name: 'spec-kit-template-claude-sh-0.0.22.zip',
          size: 100002,
          browser_download_url: 'https://example.com/claude-sh.zip',
          content_type: 'application/zip',
        },
      ],
    };

    it('should find matching asset for ai and script type', () => {
      const asset = findTemplateAsset(release, 'copilot', 'sh');
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('spec-kit-template-copilot-sh-0.0.22.zip');
    });

    it('should find PowerShell variant', () => {
      const asset = findTemplateAsset(release, 'copilot', 'ps');
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('spec-kit-template-copilot-ps-0.0.22.zip');
    });

    it('should find different AI assistant', () => {
      const asset = findTemplateAsset(release, 'claude', 'sh');
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('spec-kit-template-claude-sh-0.0.22.zip');
    });

    it('should return null for non-existent combination', () => {
      const asset = findTemplateAsset(release, 'nonexistent', 'sh');
      
      expect(asset).toBeNull();
    });

    it('should return null for empty assets', () => {
      const emptyRelease: GitHubRelease = {
        ...release,
        assets: [],
      };
      
      const asset = findTemplateAsset(emptyRelease, 'copilot', 'sh');
      
      expect(asset).toBeNull();
    });
  });

  describe('getTemplateVersion', () => {
    it('should extract version from tag with v prefix', () => {
      const release: GitHubRelease = {
        tag_name: 'v0.0.22',
        name: 'Release',
        published_at: '2024-01-15T12:00:00Z',
        html_url: '',
        assets: [],
      };
      
      expect(getTemplateVersion(release)).toBe('0.0.22');
    });

    it('should handle tag without v prefix', () => {
      const release: GitHubRelease = {
        tag_name: '1.0.0',
        name: 'Release',
        published_at: '2024-01-15T12:00:00Z',
        html_url: '',
        assets: [],
      };
      
      expect(getTemplateVersion(release)).toBe('1.0.0');
    });
  });

  describe('formatReleaseDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const release: GitHubRelease = {
        tag_name: 'v0.0.22',
        name: 'Release',
        published_at: '2024-01-15T12:00:00Z',
        html_url: '',
        assets: [],
      };
      
      expect(formatReleaseDate(release)).toBe('2024-01-15');
    });

    it('should handle different date formats', () => {
      const release: GitHubRelease = {
        tag_name: 'v0.0.22',
        name: 'Release',
        published_at: '2023-12-31T23:59:59Z',
        html_url: '',
        assets: [],
      };
      
      expect(formatReleaseDate(release)).toBe('2023-12-31');
    });
  });
});
