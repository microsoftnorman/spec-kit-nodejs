/**
 * Rate limit tests - ported from test_rate_limit_parsing.py and test_rate_limit_error.py
 */
import { describe, it, expect } from 'vitest';
import { parseRateLimitHeaders, formatRateLimitError } from '../../../src/lib/github/rate-limit.js';

describe('parseRateLimitHeaders', () => {
  // test_parses_limit_header
  it('should parse X-RateLimit-Limit header', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': '5000',
    });
    const info = parseRateLimitHeaders(headers);
    expect(info.limit).toBe('5000');
  });

  // test_parses_remaining_header
  it('should parse X-RateLimit-Remaining header', () => {
    const headers = new Headers({
      'X-RateLimit-Remaining': '4999',
    });
    const info = parseRateLimitHeaders(headers);
    expect(info.remaining).toBe('4999');
  });

  // test_parses_reset_header
  it('should parse X-RateLimit-Reset header (epoch to Date)', () => {
    const resetEpoch = 1700000000;
    const headers = new Headers({
      'X-RateLimit-Reset': resetEpoch.toString(),
    });
    const info = parseRateLimitHeaders(headers);
    expect(info.resetEpoch).toBe(resetEpoch);
    expect(info.resetTime).toBeInstanceOf(Date);
    expect(info.resetTime?.getTime()).toBe(resetEpoch * 1000);
  });

  // test_parses_retry_after_header
  it('should parse Retry-After header (seconds)', () => {
    const headers = new Headers({
      'Retry-After': '120',
    });
    const info = parseRateLimitHeaders(headers);
    expect(info.retryAfterSeconds).toBe(120);
  });

  // test_handles_missing_headers
  it('should handle missing headers gracefully', () => {
    const headers = new Headers();
    const info = parseRateLimitHeaders(headers);
    expect(info.limit).toBeUndefined();
    expect(info.remaining).toBeUndefined();
    expect(info.resetEpoch).toBeUndefined();
    expect(info.retryAfterSeconds).toBeUndefined();
  });

  // test_handles_invalid_values
  it('should handle invalid (non-numeric) values gracefully', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': 'invalid',
      'X-RateLimit-Reset': 'not-a-number',
      'Retry-After': 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
    const info = parseRateLimitHeaders(headers);
    // Limit is stored as-is (string)
    expect(info.limit).toBe('invalid');
    // Reset should not be set if invalid
    expect(info.resetEpoch).toBeUndefined();
    // Retry-After as HTTP-date should be stored as string
    expect(info.retryAfter).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
    expect(info.retryAfterSeconds).toBeUndefined();
  });

  it('should parse all headers together', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': '5000',
      'X-RateLimit-Remaining': '4999',
      'X-RateLimit-Reset': '1700000000',
    });
    const info = parseRateLimitHeaders(headers);
    expect(info.limit).toBe('5000');
    expect(info.remaining).toBe('4999');
    expect(info.resetEpoch).toBe(1700000000);
  });
});

describe('formatRateLimitError', () => {
  // test_formats_status_code
  it('should include status code in error message', () => {
    const headers = new Headers();
    const message = formatRateLimitError(403, headers, 'https://api.github.com/test');
    expect(message).toContain('403');
  });

  // test_formats_url
  it('should include URL in error message', () => {
    const headers = new Headers();
    const message = formatRateLimitError(403, headers, 'https://api.github.com/test');
    expect(message).toContain('https://api.github.com/test');
  });

  // test_includes_rate_limit_info
  it('should include rate limit info when headers present', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1700000000',
    });
    const message = formatRateLimitError(403, headers, 'https://api.github.com/test');
    expect(message).toContain('Rate Limit Information');
    expect(message).toContain('60');
    expect(message).toContain('0');
    expect(message).toContain('Resets at');
  });

  // test_includes_troubleshooting_tips
  it('should include troubleshooting tips', () => {
    const headers = new Headers();
    const message = formatRateLimitError(403, headers, 'https://api.github.com/test');
    expect(message).toContain('Troubleshooting Tips');
    expect(message).toContain('GH_TOKEN');
    expect(message).toContain('GITHUB_TOKEN');
  });

  // test_mentions_5000_vs_60
  it('should mention authenticated vs unauthenticated rate limits', () => {
    const headers = new Headers();
    const message = formatRateLimitError(403, headers, 'https://api.github.com/test');
    expect(message).toContain('5,000');
    expect(message).toContain('60');
  });

  it('should include retry-after when present', () => {
    const headers = new Headers({
      'Retry-After': '60',
    });
    const message = formatRateLimitError(429, headers, 'https://api.github.com/test');
    expect(message).toContain('Retry after');
    expect(message).toContain('60 seconds');
  });
});
