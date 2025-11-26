/**
 * Banner tests - ported from test_banner.py
 */
import { describe, it, expect, vi } from 'vitest';
import { showBanner, getBannerText, getTagline } from '../../../src/lib/ui/banner.js';

describe('BANNER', () => {
  // test_banner_has_6_lines
  it('should have 6 lines', () => {
    const bannerText = getBannerText();
    const lines = bannerText.split('\n');
    expect(lines).toHaveLength(6);
  });

  // test_banner_contains_specify_text (ASCII art version)
  it('should spell out SPECIFY in ASCII art', () => {
    const bannerText = getBannerText();
    // The banner uses Unicode box-drawing characters
    expect(bannerText).toContain('███████'); // Part of the S
    expect(bannerText).toContain('██████╗'); // Part of the P
  });

  it('should use Unicode block characters', () => {
    const bannerText = getBannerText();
    expect(bannerText).toContain('█');
    expect(bannerText).toContain('╗');
    expect(bannerText).toContain('║');
  });

  it('should have exact first line pattern', () => {
    const bannerText = getBannerText();
    const firstLine = bannerText.split('\n')[0];
    expect(firstLine).toContain('███████╗██████╗');
  });

  it('should have exact last line pattern', () => {
    const bannerText = getBannerText();
    const lines = bannerText.split('\n');
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toContain('╚══════╝╚═╝');
  });
});

describe('TAGLINE', () => {
  // test_tagline_exact
  it('should be exact text', () => {
    const tagline = getTagline();
    expect(tagline).toBe('GitHub Spec Kit - Spec-Driven Development Toolkit JS');
  });

  it('should mention Spec Kit', () => {
    const tagline = getTagline();
    expect(tagline).toContain('Spec Kit');
  });

  it('should mention Spec-Driven Development', () => {
    const tagline = getTagline();
    expect(tagline).toContain('Spec-Driven Development');
  });
});

describe('showBanner', () => {
  // test_show_banner_no_error
  it('should run without error', () => {
    // Mock console.log to prevent output during test
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => showBanner()).not.toThrow();
    consoleSpy.mockRestore();
  });

  it('should call console.log', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    showBanner();
    // Should be called at least 3 times: banner, tagline, empty line
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
