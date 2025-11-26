# Specify CLI Behavioral Specification

This document provides a complete behavioral specification of the Specify CLI Node.js implementation,
serving as the authoritative reference for the codebase.

## Table of Contents

1. [CLI Commands](#cli-commands)
2. [Configuration](#configuration)
3. [GitHub API Integration](#github-api-integration)
4. [Template Processing](#template-processing)
5. [Tool Detection](#tool-detection)
6. [Git Operations](#git-operations)
7. [UI Components](#ui-components)
8. [Error Handling](#error-handling)
9. [Cross-Platform Behavior](#cross-platform-behavior)

---

## CLI Commands

### `specify init [project-name]`

**Purpose:** Initialize a new Specify project from the latest template.

**Arguments:**

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| project-name | string | No | None | Directory name for new project |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--ai` | string | (interactive) | AI assistant: copilot, claude, gemini, etc. |
| `--script` | string | js | Script type: js (built-in) |
| `--ignore-agent-tools` | flag | false | Skip CLI tool verification |
| `--no-git` | flag | false | Skip Git initialization |
| `--here` | flag | false | Initialize in current directory |
| `--force` | flag | false | Skip non-empty directory confirmation |
| `--skip-tls` | flag | false | Skip TLS verification |
| `--debug` | flag | false | Enable verbose output |
| `--github-token` | string | (env var) | GitHub API token |

**Workflow:**

```
1. Display banner
2. Validate project name/path
3. Check if directory non-empty (prompt or --force)
4. Select AI assistant (interactive or --ai)
5. Verify agent CLI if required (unless --ignore-agent-tools)
6. Select script type (interactive or --script)
7. Initialize StepTracker
8. Create project structure from built-in templates
9. Merge .vscode/settings.json (if exists)
10. Set executable permissions on .sh files (Unix)
11. Initialize Git repository (unless --no-git)
12. Display completion panel with next steps
```

**Exit Codes:**

- 0: Success
- 1: General error
- 2: Missing dependency
- 3: Invalid argument
- 4: Network error
- 5: File system error

### `specify check`

**Purpose:** Verify that required tools are installed.

**Arguments:** None

**Output Format:**

```
● git - available
● claude - available
○ gemini - not found
○ copilot - IDE-based, no CLI check
● code - available
```

**Tools Checked:**

1. git (version control)
2. All CLI-based agents from AGENT_CONFIG
3. code (VS Code)
4. code-insiders (VS Code Insiders)

### `specify version`

**Purpose:** Display version and system information.

**Output Format:**

```
Specify CLI v0.0.1
Node.js v20.10.0
Platform: win32 (x64)
```

### `specify create-new-feature`

**Purpose:** Create a new feature branch with spec files.

**Arguments:**

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| name | string | Yes | Feature name |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `--short-name` | string | Short name for branch |
| `--json` | flag | Output JSON format |

### `specify setup-plan`

**Purpose:** Set up planning artifacts for a feature.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `--json` | flag | Output JSON format |

### `specify check-prerequisites`

**Purpose:** Check prerequisites for a feature.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `--json` | flag | Output JSON format |

### `specify update-agent-context`

**Purpose:** Update AI agent context files.

**Arguments:**

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| agent | string | No | Specific agent to update |

---

## Configuration

### AGENT_CONFIG

Complete agent registry in `src/lib/config.ts`:

```typescript
export const AGENT_CONFIG: Record<string, AgentConfig> = {
  copilot: {
    name: 'GitHub Copilot',
    folder: '.github/',
    installUrl: null,
    requiresCli: false,
  },
  claude: {
    name: 'Claude Code',
    folder: '.claude/',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-code/setup',
    requiresCli: true,
  },
  gemini: {
    name: 'Gemini CLI',
    folder: '.gemini/',
    installUrl: 'https://github.com/google-gemini/gemini-cli',
    requiresCli: true,
  },
  'cursor-agent': {
    name: 'Cursor',
    folder: '.cursor/',
    installUrl: null,
    requiresCli: false,
  },
  qwen: {
    name: 'Qwen Code',
    folder: '.qwen/',
    installUrl: 'https://github.com/QwenLM/qwen-code',
    requiresCli: true,
  },
  opencode: {
    name: 'opencode',
    folder: '.opencode/',
    installUrl: 'https://opencode.ai',
    requiresCli: true,
  },
  codex: {
    name: 'Codex CLI',
    folder: '.codex/',
    installUrl: 'https://github.com/openai/codex',
    requiresCli: true,
  },
  windsurf: {
    name: 'Windsurf',
    folder: '.windsurf/',
    installUrl: null,
    requiresCli: false,
  },
  kilocode: {
    name: 'Kilo Code',
    folder: '.kilocode/',
    installUrl: null,
    requiresCli: false,
  },
  auggie: {
    name: 'Auggie CLI',
    folder: '.augment/',
    installUrl: 'https://docs.augmentcode.com/cli/setup-auggie/install-auggie-cli',
    requiresCli: true,
  },
  codebuddy: {
    name: 'CodeBuddy',
    folder: '.codebuddy/',
    installUrl: 'https://www.codebuddy.ai/cli',
    requiresCli: true,
  },
  roo: {
    name: 'Roo Code',
    folder: '.roo/',
    installUrl: null,
    requiresCli: false,
  },
  q: {
    name: 'Amazon Q Developer CLI',
    folder: '.amazonq/',
    installUrl: 'https://aws.amazon.com/developer/learning/q-developer-cli/',
    requiresCli: true,
  },
  amp: {
    name: 'Amp',
    folder: '.agents/',
    installUrl: 'https://ampcode.com/manual#install',
    requiresCli: true,
  },
  shai: {
    name: 'SHAI',
    folder: '.shai/',
    installUrl: 'https://github.com/ovh/shai',
    requiresCli: true,
  },
};
```

### SCRIPT_TYPE_CHOICES

```typescript
export const SCRIPT_TYPE_CHOICES: Record<string, string> = {
  js: 'JavaScript/Node.js (built-in)',
};
```

### Agent Lists

```typescript
export const ALL_AGENT_KEYS = [
  'copilot', 'claude', 'gemini', 'cursor-agent', 'qwen',
  'opencode', 'codex', 'windsurf', 'kilocode', 'auggie',
  'codebuddy', 'roo', 'q', 'amp', 'shai',
] as const;

export const IDE_AGENTS = [
  'copilot', 'cursor-agent', 'windsurf', 'kilocode', 'roo'
] as const;

export const CLI_AGENTS = [
  'claude', 'gemini', 'qwen', 'opencode', 'codex',
  'auggie', 'codebuddy', 'q', 'amp', 'shai',
] as const;
```

---

## GitHub API Integration

### Token Resolution

```typescript
export function getGitHubToken(cliToken?: string): string | undefined {
  const token = (
    cliToken ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ''
  ).trim();
  return token || undefined;
}
```

### Auth Headers

```typescript
export function getAuthHeaders(cliToken?: string): Record<string, string> {
  const token = getGitHubToken(cliToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

### Rate Limit Parsing

```typescript
export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  resetEpoch?: number;
  resetTime?: Date;
  retryAfterSeconds?: number;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const info: RateLimitInfo = {};

  const limit = headers.get('X-RateLimit-Limit');
  if (limit) info.limit = parseInt(limit, 10);

  const remaining = headers.get('X-RateLimit-Remaining');
  if (remaining) info.remaining = parseInt(remaining, 10);

  const reset = headers.get('X-RateLimit-Reset');
  if (reset) {
    const epoch = parseInt(reset, 10);
    info.resetEpoch = epoch;
    info.resetTime = new Date(epoch * 1000);
  }

  const retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) info.retryAfterSeconds = seconds;
  }

  return info;
}
```

---

## Template Processing

### VS Code Settings Merge

```typescript
export function deepMergeJson(
  base: Record<string, unknown>,
  update: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };

  for (const [key, value] of Object.entries(update)) {
    if (
      key in result &&
      typeof result[key] === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(result[key]) &&
      !Array.isArray(value) &&
      result[key] !== null &&
      value !== null
    ) {
      result[key] = deepMergeJson(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

### Executable Permissions (Unix)

```typescript
export function ensureExecutableScripts(projectPath: string): void {
  if (process.platform === 'win32') return;

  const scriptsDir = join(projectPath, '.specify', 'scripts');
  if (!existsSync(scriptsDir)) return;

  walkDir(scriptsDir, (filePath) => {
    if (!filePath.endsWith('.sh')) return;

    const content = readFileSync(filePath);
    if (content.slice(0, 2).toString() !== '#!') return;

    const stat = statSync(filePath);
    const mode = stat.mode;

    if (mode & 0o111) return; // Already executable

    let newMode = mode;
    if (mode & 0o400) newMode |= 0o100;
    if (mode & 0o040) newMode |= 0o010;
    if (mode & 0o004) newMode |= 0o001;
    if (!(newMode & 0o100)) newMode |= 0o100;

    chmodSync(filePath, newMode);
  });
}
```

---

## Tool Detection

### Basic Detection

```typescript
export function checkTool(tool: string): boolean {
  // Special handling for Claude
  if (tool === 'claude') {
    const claudePath = join(homedir(), '.claude', 'local', 'claude');
    if (existsSync(claudePath)) {
      return true;
    }
  }

  try {
    const cmd = process.platform === 'win32' ? `where ${tool}` : `which ${tool}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

---

## Git Operations

### Repository Detection

```typescript
export function isGitRepository(dir: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: dir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function getRepoRoot(dir: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}
```

### Repository Initialization

```typescript
export function initGitRepo(projectPath: string): boolean {
  if (isGitRepository(projectPath)) {
    return false; // Already a repo
  }

  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

---

## UI Components

### Banner

```typescript
export const BANNER = `
███████╗██████╗ ███████╗ ██████╗██╗███████╗██╗   ██╗         ██╗███████╗
██╔════╝██╔══██╗██╔════╝██╔════╝██║██╔════╝╚██╗ ██╔╝         ██║██╔════╝
███████╗██████╔╝█████╗  ██║     ██║█████╗   ╚████╔╝          ██║███████╗
╚════██║██╔═══╝ ██╔══╝  ██║     ██║██╔══╝    ╚██╔╝      ██   ██║╚════██║
███████║██║     ███████╗╚██████╗██║██║        ██║   ██╗ ╚█████╔╝███████║
╚══════╝╚═╝     ╚══════╝ ╚═════╝╚═╝╚═╝        ╚═╝   ╚═╝  ╚════╝ ╚══════╝
`;

export const TAGLINE = 'GitHub Spec Kit - Spec-Driven Development Toolkit JS';
```

### StepTracker

```typescript
export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface Step {
  key: string;
  label: string;
  status: StepStatus;
  detail: string;
}

export class StepTracker {
  title: string;
  steps: Step[];

  constructor(title: string);
  add(key: string, label: string): void;
  start(key: string, detail?: string): void;
  complete(key: string, detail?: string): void;
  error(key: string, detail?: string): void;
  skip(key: string, detail?: string): void;
  render(): string;
}
```

---

## Error Handling

### Error Classes

```typescript
export class SpecifyError extends Error {
  exitCode: ExitCode;
  details: string | null;

  constructor(message: string, exitCode?: ExitCode, details?: string | null);
}

export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  MISSING_DEPENDENCY = 2,
  INVALID_ARGUMENT = 3,
  NETWORK_ERROR = 4,
  FILE_SYSTEM_ERROR = 5,
}
```

---

## Cross-Platform Behavior

### Default Script Type

```typescript
export function getDefaultScriptType(): 'js' {
  return 'js'; // Always returns 'js' for built-in templates
}
```

### Path Handling

- Use `path.join()` for all path construction
- Use `os.homedir()` for home directory
- Normalize paths for display

### Environment Variables

```typescript
// Checked by CLI
process.env.GH_TOKEN       // GitHub token
process.env.GITHUB_TOKEN   // GitHub token (fallback)

// Checked by scripts
process.env.SPECIFY_FEATURE  // Override branch detection
```

---

## File Structure After Init

```
project/
├── .specify/
│   ├── memory/
│   │   └── constitution.md
│   ├── templates/
│   │   ├── spec-template.md
│   │   ├── plan-template.md
│   │   ├── tasks-template.md
│   │   └── checklist-template.md
│   └── scripts/
│       ├── bash/
│       │   └── *.sh
│       └── powershell/
│           └── *.ps1
├── .vscode/
│   └── settings.json
├── {agent-dir}/           # e.g., .github/, .claude/, etc.
│   └── {commands-dir}/    # e.g., agents/, commands/, etc.
│       ├── speckit.analyze.md
│       ├── speckit.clarify.md
│       ├── speckit.implement.md
│       ├── speckit.plan.md
│       ├── speckit.specify.md
│       ├── speckit.tasks.md
│       └── ...
└── .git/                  # Unless --no-git
```

---

*This specification documents the Node.js/TypeScript implementation.*
*For the original Python version, see [github/spec-kit](https://github.com/github/spec-kit).*
