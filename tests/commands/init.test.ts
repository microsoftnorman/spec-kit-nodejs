/**
 * Tests for init command configuration.
 * Actual CLI behavior is tested in init-js-script.test.ts
 */

import { describe, it, expect } from 'vitest';
import { AGENT_CONFIG } from '../../src/lib/config.js';

describe('Init AI Agent Configuration', () => {
  it('CLI-required agents have install URLs', () => {
    const cliAgents = Object.entries(AGENT_CONFIG)
      .filter(([_, config]) => config.requiresCli);

    for (const [_key, config] of cliAgents) {
      expect(config.installUrl).not.toBeNull();
      expect(config.installUrl).toContain('http');
    }
  });

  it('IDE-based agents do not require CLI tool check', () => {
    const ideAgents = Object.entries(AGENT_CONFIG)
      .filter(([_, config]) => !config.requiresCli)
      .map(([key]) => key);

    expect(ideAgents).toContain('copilot');
    expect(ideAgents).toContain('windsurf');
    expect(ideAgents).toContain('kilocode');
    expect(ideAgents).toContain('roo');
    expect(ideAgents).toContain('cursor-agent');
  });
});
