/**
 * Interactive selection module - arrow key navigable selection menu.
 */

import { AGENT_CONFIG } from '../config.js';

/**
 * Key mappings from keyboard input.
 */
export type KeyAction = 'up' | 'down' | 'enter' | 'escape';

/**
 * Get action from key input.
 * Maps arrow keys and Emacs-style navigation (Ctrl+P/Ctrl+N) to actions.
 */
export function getKeyAction(key: string): KeyAction | null {
  // Arrow keys
  if (key === '\x1b[A' || key === '\x10') return 'up'; // Up arrow or Ctrl+P
  if (key === '\x1b[B' || key === '\x0e') return 'down'; // Down arrow or Ctrl+N
  if (key === '\r' || key === '\n') return 'enter'; // Enter
  if (key === '\x1b') return 'escape'; // Escape
  if (key === '\x03') throw new Error('KeyboardInterrupt'); // Ctrl+C

  return null;
}

/**
 * Selection options for the menu.
 */
export interface SelectOptions<T extends string> {
  options: Record<T, string>;
  prompt: string;
  defaultKey?: T;
}

/**
 * Format a menu option for display.
 * 
 * @param key - Option key
 * @param description - Option description
 * @param selected - Whether this option is selected
 * @returns Formatted string
 */
export function formatOption(key: string, description: string, selected: boolean): string {
  const indicator = selected ? '▶' : ' ';
  return `${indicator} [cyan]${key}[/cyan] [dim](${description})[/dim]`;
}

/**
 * Navigation help text shown below menu.
 */
export const NAVIGATION_HELP = 'Use ↑/↓ to navigate, Enter to select, Esc to cancel';

/**
 * Get AI selection choices from AGENT_CONFIG.
 */
export function getAIChoices(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(AGENT_CONFIG).map(([key, config]) => [key, config.name])
  );
}

/**
 * Default AI selection key.
 */
export const DEFAULT_AI_KEY = 'copilot';

/**
 * Interactive selection with arrow key navigation.
 * 
 * @param options - Record of key -> description
 * @param prompt - Prompt text to display
 * @param defaultKey - Default selected key
 * @returns Selected key
 */
export async function selectWithArrows<T extends string>(
  options: Record<T, string>,
  prompt: string,
  defaultKey?: T
): Promise<T> {
  // Use inquirer for interactive selection
  const { select } = await import('@inquirer/prompts');
  
  const keys = Object.keys(options) as T[];
  const defaultIndex = defaultKey ? keys.indexOf(defaultKey) : 0;
  const validDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;

  const choices = keys.map((key, index) => ({
    name: `${key} (${options[key]})`,
    value: key,
  }));

  try {
    const result = await select({
      message: prompt,
      choices,
      default: keys[validDefaultIndex],
    });

    return result;
  } catch (error) {
    // Handle cancellation
    if (error instanceof Error && error.message.includes('User force closed')) {
      throw new Error('KeyboardInterrupt');
    }
    throw error;
  }
}
