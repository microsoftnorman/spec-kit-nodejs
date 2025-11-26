/**
 * Platform compatibility tests.
 */

import { describe, it, expect } from 'vitest';

describe('Platform Compatibility', () => {
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
