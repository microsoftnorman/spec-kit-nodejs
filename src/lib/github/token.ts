/**
 * GitHub token handling module
 * Ported from Python specify_cli/__init__.py
 */

/**
 * Return sanitized GitHub token (CLI arg takes precedence) or undefined.
 * Checks in order: CLI token > GH_TOKEN > GITHUB_TOKEN
 *
 * @param cliToken - Optional token provided via CLI argument
 * @returns Sanitized token string or undefined if no valid token found
 */
export function getGitHubToken(cliToken?: string): string | undefined {
  const token = (
    cliToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
  )
    .trim()
    .replace(/[\r\n]/g, '');

  return token || undefined;
}

/**
 * Return Authorization header dict only when a non-empty token exists.
 *
 * @param cliToken - Optional token provided via CLI argument
 * @returns Headers object with Authorization if token exists, empty object otherwise
 */
export function getAuthHeaders(cliToken?: string): Record<string, string> {
  const token = getGitHubToken(cliToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
