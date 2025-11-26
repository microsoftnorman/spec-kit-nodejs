/**
 * Step tracker module - tracks and renders hierarchical steps
 * Ported from Python specify_cli/__init__.py StepTracker class
 */

import chalk from 'chalk';

/**
 * Status values for steps
 */
export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

/**
 * Step data structure
 */
export interface Step {
  key: string;
  label: string;
  status: StepStatus;
  detail: string;
}

/**
 * Track and render hierarchical steps without emojis, similar to Claude Code tree output.
 * Supports live auto-refresh via an attached refresh callback.
 */
export class StepTracker {
  public title: string;
  public steps: Step[] = [];
  public readonly statusOrder: Record<StepStatus, number> = {
    pending: 0,
    running: 1,
    done: 2,
    error: 3,
    skipped: 4,
  };
  private _refreshCallback?: () => void;

  constructor(title: string) {
    this.title = title;
  }

  /**
   * Attach a callback that will be called whenever the tracker state changes.
   */
  attachRefresh(cb: () => void): void {
    this._refreshCallback = cb;
  }

  /**
   * Add a new step with the given key and label.
   * If a step with the same key already exists, this is a no-op.
   */
  add(key: string, label: string): void {
    if (!this.steps.find((s) => s.key === key)) {
      this.steps.push({ key, label, status: 'pending', detail: '' });
      this._maybeRefresh();
    }
  }

  /**
   * Mark a step as running.
   */
  start(key: string, detail = ''): void {
    this._update(key, 'running', detail);
  }

  /**
   * Mark a step as done.
   */
  complete(key: string, detail = ''): void {
    this._update(key, 'done', detail);
  }

  /**
   * Mark a step as error.
   */
  error(key: string, detail = ''): void {
    this._update(key, 'error', detail);
  }

  /**
   * Mark a step as skipped.
   */
  skip(key: string, detail = ''): void {
    this._update(key, 'skipped', detail);
  }

  /**
   * Update a step's status and detail.
   * If the step doesn't exist, it will be created with the key as the label.
   */
  private _update(key: string, status: StepStatus, detail: string): void {
    const step = this.steps.find((s) => s.key === key);
    if (step) {
      step.status = status;
      if (detail) {
        step.detail = detail;
      }
      this._maybeRefresh();
    } else {
      // Auto-create step if it doesn't exist
      this.steps.push({ key, label: key, status, detail });
      this._maybeRefresh();
    }
  }

  /**
   * Call the refresh callback if one is attached.
   */
  private _maybeRefresh(): void {
    if (this._refreshCallback) {
      try {
        this._refreshCallback();
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Render the tracker as a string tree.
   */
  render(): string {
    const lines: string[] = [];

    // Title line with cyan color
    lines.push(chalk.cyan(this.title));

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]!;
      const isLast = i === this.steps.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const { label, status, detail } = step;
      const detailText = detail.trim();

      let symbol: string;
      let line: string;

      switch (status) {
        case 'done':
          symbol = chalk.green('●');
          break;
        case 'pending':
          symbol = chalk.dim.green('○');
          break;
        case 'running':
          symbol = chalk.cyan('○');
          break;
        case 'error':
          symbol = chalk.red('●');
          break;
        case 'skipped':
          symbol = chalk.yellow('○');
          break;
        default:
          symbol = ' ';
      }

      if (status === 'pending') {
        // Entire line light gray (pending)
        if (detailText) {
          line = `${prefix}${symbol} ${chalk.gray(`${label} (${detailText})`)}`;
        } else {
          line = `${prefix}${symbol} ${chalk.gray(label)}`;
        }
      } else {
        // Label white, detail (if any) light gray in parentheses
        if (detailText) {
          line = `${prefix}${symbol} ${chalk.white(label)} ${chalk.gray(`(${detailText})`)}`;
        } else {
          line = `${prefix}${symbol} ${chalk.white(label)}`;
        }
      }

      lines.push(line);
    }

    return lines.join('\n');
  }
}
