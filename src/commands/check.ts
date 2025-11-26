/**
 * Check command - verify required tools are installed
 * Ported from Python specify_cli/__init__.py
 */

import { showBanner } from '../lib/ui/banner.js';
import { StepTracker } from '../lib/ui/tracker.js';
import { checkTool } from '../lib/tools/detect.js';
import { AGENT_CONFIG } from '../lib/config.js';

/**
 * Run the check command to verify all required tools are installed.
 */
export async function check(): Promise<void> {
  showBanner();

  const tracker = new StepTracker('Check Available Tools');

  // Check git
  tracker.add('git', 'Git version control');
  checkTool('git', tracker);

  // Check each agent
  for (const [key, config] of Object.entries(AGENT_CONFIG)) {
    tracker.add(key, config.name);
    if (config.requiresCli) {
      checkTool(key, tracker);
    } else {
      tracker.skip(key, 'IDE-based, no CLI check');
    }
  }

  // Check VS Code
  tracker.add('code', 'Visual Studio Code');
  checkTool('code', tracker);

  // Check VS Code Insiders
  tracker.add('code-insiders', 'Visual Studio Code Insiders');
  checkTool('code-insiders', tracker);

  console.log(tracker.render());
  console.log();
}
