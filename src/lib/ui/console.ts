/**
 * Console utilities for styled terminal output.
 * Ported from Python rich library usage.
 */

import chalk from 'chalk';

/**
 * Center text in the terminal.
 */
export function centerText(text: string): string {
  const terminalWidth = process.stdout.columns || 80;
  const lines = text.split('\n');
  
  return lines.map(line => {
    // Strip ANSI codes for length calculation
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, Math.floor((terminalWidth - plainLine.length) / 2));
    return ' '.repeat(padding) + line;
  }).join('\n');
}

/**
 * Box drawing characters
 */
const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

/**
 * Create a box around content with an optional title.
 */
export function box(content: string, title?: string): string {
  const terminalWidth = Math.min(process.stdout.columns || 80, 80);
  const innerWidth = terminalWidth - 4; // Account for borders and padding
  
  const lines = content.split('\n');
  const wrappedLines: string[] = [];
  
  // Wrap long lines
  for (const line of lines) {
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    if (plainLine.length <= innerWidth) {
      wrappedLines.push(line);
    } else {
      // Simple word wrap
      let remaining = line;
      while (remaining.length > 0) {
        wrappedLines.push(remaining.slice(0, innerWidth));
        remaining = remaining.slice(innerWidth);
      }
    }
  }
  
  // Build the box
  const output: string[] = [];
  
  // Top border with optional title
  if (title) {
    const titlePart = ` ${title} `;
    const remainingWidth = terminalWidth - 2 - titlePart.length;
    const leftDashes = Math.floor(remainingWidth / 2);
    const rightDashes = remainingWidth - leftDashes;
    output.push(
      chalk.dim(BOX.topLeft) +
      chalk.dim(BOX.horizontal.repeat(leftDashes)) +
      chalk.cyan(titlePart) +
      chalk.dim(BOX.horizontal.repeat(rightDashes)) +
      chalk.dim(BOX.topRight)
    );
  } else {
    output.push(
      chalk.dim(BOX.topLeft) +
      chalk.dim(BOX.horizontal.repeat(terminalWidth - 2)) +
      chalk.dim(BOX.topRight)
    );
  }
  
  // Content lines
  for (const line of wrappedLines) {
    const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    const paddingRight = innerWidth - plainLine.length;
    output.push(
      chalk.dim(BOX.vertical) +
      ' ' +
      line +
      ' '.repeat(Math.max(0, paddingRight)) +
      ' ' +
      chalk.dim(BOX.vertical)
    );
  }
  
  // Bottom border
  output.push(
    chalk.dim(BOX.bottomLeft) +
    chalk.dim(BOX.horizontal.repeat(terminalWidth - 2)) +
    chalk.dim(BOX.bottomRight)
  );
  
  return output.join('\n');
}

/**
 * Create a panel (styled box) with content and title.
 * Similar to rich.Panel in Python.
 */
export function panel(content: string, title?: string): void {
  console.log(box(content, title));
}

/**
 * Print a success message with a green checkmark.
 */
export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

/**
 * Print an error message with a red X.
 */
export function error(message: string): void {
  console.log(chalk.red('✗') + ' ' + message);
}

/**
 * Print a warning message with a yellow exclamation.
 */
export function warning(message: string): void {
  console.log(chalk.yellow('!') + ' ' + message);
}

/**
 * Print an info message with a blue info icon.
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Print a dim/muted message.
 */
export function dim(message: string): void {
  console.log(chalk.dim(message));
}
