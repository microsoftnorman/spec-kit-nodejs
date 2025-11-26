/**
 * ASCII banner module
 * Ported from Python specify_cli/__init__.py
 */

import chalk from 'chalk';
import { BANNER, TAGLINE } from '../config.js';

/**
 * Colors for the banner gradient
 */
const COLORS = [
  chalk.blueBright,
  chalk.blue,
  chalk.cyan,
  chalk.cyanBright,
  chalk.white,
  chalk.whiteBright,
];

/**
 * Center text in the terminal
 */
function centerText(text: string): string {
  const terminalWidth = process.stdout.columns || 80;
  const lines = text.split('\n');

  return lines
    .map((line) => {
      // Strip ANSI codes for length calculation
      const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      const padding = Math.max(0, Math.floor((terminalWidth - plainLine.length) / 2));
      return ' '.repeat(padding) + line;
    })
    .join('\n');
}

/**
 * Display the ASCII art banner.
 */
export function showBanner(): void {
  const bannerLines = BANNER.trim().split('\n');

  const coloredBanner = bannerLines.map((line, i) => COLORS[i % COLORS.length]!(line)).join('\n');

  console.log(centerText(coloredBanner));
  console.log(centerText(chalk.italic.yellowBright(TAGLINE)));
  console.log();
}

/**
 * Get the banner text without displaying it (for testing)
 */
export function getBannerText(): string {
  return BANNER.trim();
}

/**
 * Get the tagline (for testing)
 */
export function getTagline(): string {
  return TAGLINE;
}
