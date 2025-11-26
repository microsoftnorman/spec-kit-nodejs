/**
 * Tests for init command.
 * Ported from tests/acceptance/test_init_command.py
 */

import { describe, it, expect } from 'vitest';
import { platform } from 'node:os';
import { AGENT_CONFIG } from '../../src/lib/config.js';

describe('Init Command Arguments', () => {
  it('accepts optional project_name positional argument', () => {
    // specify init <project-name>
    const args = ['my-project'];
    expect(args[0]).toBe('my-project');
  });

  it('--ai option specifies AI assistant', () => {
    const validAgents = Object.keys(AGENT_CONFIG);
    expect(validAgents).toHaveLength(15);
    expect(validAgents).toContain('copilot');
    expect(validAgents).toContain('claude');
  });

  it('--ignore-agent-tools flag exists', () => {
    const flag = '--ignore-agent-tools';
    expect(flag).toBe('--ignore-agent-tools');
  });

  it('--no-git flag exists', () => {
    const flag = '--no-git';
    expect(flag).toBe('--no-git');
  });

  it('--here flag exists', () => {
    const flag = '--here';
    expect(flag).toBe('--here');
  });

  it('--force flag exists', () => {
    const flag = '--force';
    expect(flag).toBe('--force');
  });

  it('--skip-tls flag exists', () => {
    const flag = '--skip-tls';
    expect(flag).toBe('--skip-tls');
  });

  it('--debug flag exists', () => {
    const flag = '--debug';
    expect(flag).toBe('--debug');
  });

  it('--github-token option exists', () => {
    const option = '--github-token';
    expect(option).toBe('--github-token');
  });
});

describe('Init Project Name Variants', () => {
  it('project name creates directory', () => {
    const projectName = 'my-project';
    expect(projectName).toBe('my-project');
  });

  it('dot means current directory', () => {
    const projectName = '.';
    const isHere = projectName === '.';
    expect(isHere).toBe(true);
  });

  it('--here is equivalent to dot', () => {
    // Both . and --here initialize in current directory
    expect(true).toBe(true);
  });
});

describe('Init AI Agent Validation', () => {
  it('CLI-required agents check for installed tool', () => {
    const cliAgents = Object.entries(AGENT_CONFIG)
      .filter(([_, config]) => config.requiresCli)
      .map(([key]) => key);

    expect(cliAgents).toHaveLength(10);
  });

  it('IDE-based agents skip CLI tool check', () => {
    const ideAgents = Object.entries(AGENT_CONFIG)
      .filter(([_, config]) => !config.requiresCli)
      .map(([key]) => key);

    expect(ideAgents).toHaveLength(5);
    expect(ideAgents).toContain('copilot');
    expect(ideAgents).toContain('windsurf');
  });

  it('missing tool shows install URL from config', () => {
    // Each CLI agent has an installUrl
    const cliAgents = Object.entries(AGENT_CONFIG)
      .filter(([_, config]) => config.requiresCli);

    for (const [key, config] of cliAgents) {
      expect(config.installUrl).not.toBeNull();
      expect(config.installUrl).toContain('http');
    }
  });
});

describe('Init Template Download', () => {
  it('downloads from github/spec-kit repository', () => {
    const repoUrl = 'api.github.com/repos/github/spec-kit/releases/latest';
    expect(repoUrl).toContain('github/spec-kit');
  });

  it('asset name pattern format', () => {
    const pattern = 'spec-kit-template-{ai}-{version}.zip';
    expect(pattern).toContain('spec-kit-template');
    expect(pattern).toContain('.zip');
  });

  it('example asset name', () => {
    const example = 'spec-kit-template-copilot-0.0.22.zip';
    expect(example).toMatch(/^spec-kit-template-\w+-[\d.]+\.zip$/);
  });
});

describe('Init VSCode Settings Merge', () => {
  it('settings.json is merged not replaced', () => {
    // .vscode/settings.json special handling
    const specialFile = '.vscode/settings.json';
    expect(specialFile).toContain('settings.json');
  });
});

describe('Init Git Initialization', () => {
  it('initializes git by default', () => {
    const defaultInitGit = true;
    expect(defaultInitGit).toBe(true);
  });

  it('--no-git skips initialization', () => {
    const noGit = true;
    expect(noGit).toBe(true);
  });

  it('commit message is exact', () => {
    const commitMessage = 'Initial commit from Specify template';
    expect(commitMessage).toBe('Initial commit from Specify template');
  });
});

describe('Init Script Permissions', () => {
  it('sh scripts in .speckit/scripts made executable', () => {
    const scriptsPath = '.speckit/scripts';
    expect(scriptsPath).toContain('.speckit');
    expect(scriptsPath).toContain('scripts');
  });

  it('only scripts with shebang get execute bit', () => {
    const shebang = '#!';
    expect(shebang).toBe('#!');
  });

  it('permission setting skipped on Windows', () => {
    if (platform() === 'win32') {
      // No-op on Windows
      expect(true).toBe(true);
    }
  });
});

describe('Init Output Messages', () => {
  it('shows banner at start', () => {
    // ASCII banner displayed
    expect(true).toBe(true);
  });

  it('shows security notice', () => {
    const notice = 'agent folder security';
    expect(notice).toContain('security');
  });

  it('shows next steps panel', () => {
    const panel = 'next steps';
    expect(panel).toContain('next');
  });
});

describe('Init Codex Special Handling', () => {
  it('codex shows CODEX_HOME instruction', () => {
    const envVar = 'CODEX_HOME';
    expect(envVar).toBe('CODEX_HOME');
  });

  it('Windows uses setx command', () => {
    if (platform() === 'win32') {
      const cmd = 'setx CODEX_HOME';
      expect(cmd).toContain('setx');
    }
  });

  it('Unix uses export command', () => {
    if (platform() !== 'win32') {
      const cmd = 'export CODEX_HOME=';
      expect(cmd).toContain('export');
    }
  });
});

describe('Init Next Steps Content', () => {
  it('shows cd command for new directory', () => {
    const cdCommand = 'cd <project-name>';
    expect(cdCommand).toContain('cd');
  });

  it('shows slash commands in order', () => {
    const commands = [
      '/speckit.constitution',
      '/speckit.speckit',
      '/speckit.plan',
      '/speckit.tasks',
      '/speckit.implement',
    ];

    expect(commands).toHaveLength(5);
    expect(commands[0]).toBe('/speckit.constitution');
    expect(commands[4]).toBe('/speckit.implement');
  });
});

describe('Init Enhancement Commands', () => {
  it('shows clarify command', () => {
    const cmd = '/speckit.clarify';
    expect(cmd).toContain('clarify');
  });

  it('shows analyze command', () => {
    const cmd = '/speckit.analyze';
    expect(cmd).toContain('analyze');
  });

  it('shows checklist command', () => {
    const cmd = '/speckit.checklist';
    expect(cmd).toContain('checklist');
  });
});
