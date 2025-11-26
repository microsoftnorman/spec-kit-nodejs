/**
 * Rate limit handling module
 * Ported from Python specify_cli/__init__.py
 */

/**
 * Rate limit information parsed from GitHub API response headers
 */
export interface RateLimitInfo {
  /** Rate limit (requests per hour) */
  limit?: string;
  /** Remaining requests */
  remaining?: string;
  /** Unix epoch timestamp when rate limit resets */
  resetEpoch?: number;
  /** Date object when rate limit resets */
  resetTime?: Date;
  /** Localized reset time */
  resetLocal?: Date;
  /** Retry-After seconds (for 429 responses) */
  retryAfterSeconds?: number;
  /** Retry-After value (if not parseable as seconds) */
  retryAfter?: string;
}

/**
 * Extract and parse GitHub rate-limit headers from a response.
 *
 * @param headers - Headers object from fetch response
 * @returns Parsed rate limit information
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const info: RateLimitInfo = {};

  // Standard GitHub rate-limit headers
  const limit = headers.get('X-RateLimit-Limit');
  if (limit) {
    info.limit = limit;
  }

  const remaining = headers.get('X-RateLimit-Remaining');
  if (remaining) {
    info.remaining = remaining;
  }

  const reset = headers.get('X-RateLimit-Reset');
  if (reset) {
    const resetEpoch = parseInt(reset, 10);
    if (!isNaN(resetEpoch) && resetEpoch > 0) {
      info.resetEpoch = resetEpoch;
      info.resetTime = new Date(resetEpoch * 1000);
      info.resetLocal = info.resetTime; // In JS, Date already handles local timezone
    }
  }

  // Retry-After header (seconds or HTTP-date)
  const retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);
    if (!isNaN(parsed)) {
      info.retryAfterSeconds = parsed;
    } else {
      // HTTP-date format - store as string
      info.retryAfter = retryAfter;
    }
  }

  return info;
}

/**
 * Format a user-friendly error message with rate-limit information.
 *
 * @param statusCode - HTTP status code from the response
 * @param headers - Headers object from fetch response
 * @param url - The URL that was requested
 * @returns Formatted error message string
 */
export function formatRateLimitError(statusCode: number, headers: Headers, url: string): string {
  const rateInfo = parseRateLimitHeaders(headers);

  const lines: string[] = [`GitHub API returned status ${statusCode} for ${url}`];
  lines.push('');

  if (Object.keys(rateInfo).length > 0) {
    lines.push('Rate Limit Information:');
    if (rateInfo.limit) {
      lines.push(`  • Rate Limit: ${rateInfo.limit} requests/hour`);
    }
    if (rateInfo.remaining) {
      lines.push(`  • Remaining: ${rateInfo.remaining}`);
    }
    if (rateInfo.resetTime) {
      const resetStr = rateInfo.resetTime.toLocaleString();
      lines.push(`  • Resets at: ${resetStr}`);
    }
    if (rateInfo.retryAfterSeconds) {
      lines.push(`  • Retry after: ${rateInfo.retryAfterSeconds} seconds`);
    }
    lines.push('');
  }

  // Add troubleshooting guidance
  lines.push('Troubleshooting Tips:');
  lines.push(
    '  • If you\'re on a shared CI or corporate environment, you may be rate-limited.'
  );
  lines.push(
    '  • Consider using a GitHub token via --github-token or the GH_TOKEN/GITHUB_TOKEN'
  );
  lines.push('    environment variable to increase rate limits.');
  lines.push(
    '  • Authenticated requests have a limit of 5,000/hour vs 60/hour for unauthenticated.'
  );

  return lines.join('\n');
}
