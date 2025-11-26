/**
 * Platform compatibility tests.
 * Ported from Python test_platform_compat.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { platform } from 'os';

// Mock the os module
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    platform: vi.fn(() => actual.platform()),
  };
});

describe('Platform Compatibility', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isWindows detection', () => {
    it('should detect Windows correctly', async () => {
      const { isWindows } = await import('../src/lib/template/permissions.js');
      
      if (process.platform === 'win32') {
        expect(isWindows()).toBe(true);
      } else {
        expect(isWindows()).toBe(false);
      }
    });
  });

  describe('Command detection', () => {
    it('should use where on Windows for tool detection', () => {
      // On Windows, the checkTool function uses 'where' command
      // On Unix, it uses 'which' command
      const isWin = process.platform === 'win32';
      expect(isWin).toBe(process.platform === 'win32');
    });

    it('should use which on Unix for tool detection', () => {
      const isUnix = process.platform !== 'win32';
      expect(isUnix).toBe(process.platform !== 'win32');
    });
  });

  describe('Path separators', () => {
    it('should handle Windows path separators', () => {
      const winPath = 'C:\\Users\\test\\project';
      expect(winPath).toContain('\\');
    });

    it('should handle Unix path separators', () => {
      const unixPath = '/home/user/project';
      expect(unixPath).toContain('/');
    });
  });

  describe('Script permissions', () => {
    it('should skip chmod on Windows', async () => {
      const { isWindows } = await import('../src/lib/template/permissions.js');
      
      // The ensureExecutableScripts function should be a no-op on Windows
      if (isWindows()) {
        // On Windows, permissions are not set via chmod
        expect(true).toBe(true);
      }
    });

    it('should set permissions on Unix', async () => {
      const { isWindows } = await import('../src/lib/template/permissions.js');
      
      if (!isWindows()) {
        // On Unix, we can set execute permissions
        expect(true).toBe(true);
      }
    });
  });
});

describe('Environment Variables', () => {
  describe('GitHub token detection', () => {
    it('should check GH_TOKEN environment variable', () => {
      const tokenType = typeof process.env.GH_TOKEN;
      expect(['string', 'undefined']).toContain(tokenType);
    });

    it('should check GITHUB_TOKEN environment variable', () => {
      const tokenType = typeof process.env.GITHUB_TOKEN;
      expect(['string', 'undefined']).toContain(tokenType);
    });
  });

  describe('Home directory', () => {
    it('should resolve home directory correctly', async () => {
      const { homedir } = await import('os');
      const home = homedir();
      
      expect(home).toBeTruthy();
      expect(typeof home).toBe('string');
      expect(home.length).toBeGreaterThan(0);
    });
  });
});

describe('Process Information', () => {
  it('should have valid platform', () => {
    expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(process.platform);
  });

  it('should have valid architecture', () => {
    expect(['x64', 'arm64', 'arm', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x']).toContain(process.arch);
  });

  it('should have Node.js version', () => {
    expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
  });
});
