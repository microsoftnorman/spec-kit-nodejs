# Speckit CLI - Node.js Port

This directory contains the Node.js/TypeScript port of the Speckit CLI.

## Overview

The original Python implementation is in `../src/specify_cli/`. This port provides identical functionality using Node.js and TypeScript.

## Current Status

**353 tests passing** across 20 test files. **100% complete** ✅

### Implemented Features

- ✅ **Configuration**: AGENT_CONFIG (15 agents), CLAUDE_LOCAL_PATH
- ✅ **GitHub Integration**: Token handling, rate limit parsing/formatting, API client
- ✅ **UI Components**: StepTracker, ASCII banner, console utilities, interactive selection
- ✅ **Template Processing**: Deep merge JSON files, download, extraction
- ✅ **Tool Detection**: Check for CLI tools (git, claude, code, etc.)
- ✅ **Git Operations**: Detect git repos, initialize with commit
- ✅ **CLI Commands**: `check`, `version`, `init` (fully functional)
- ✅ **Error Handling**: Structured error classes with exit codes
- ✅ **Interactive Selection**: Arrow key navigation for AI assistant

### Fully Working Commands

- `speckit check` - Check for required tools
- `speckit version` - Show version and system info
- `speckit init <project-name>` - Initialize a new Speckit project

## Getting Started

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run the CLI locally
npx . --help
npx . check
npx . version
npx . init my-project --ai copilot --no-git
```

## Usage Examples

```bash
# Initialize a new project with GitHub Copilot
speckit init my-project --ai copilot

# Initialize in current directory
speckit init --here --ai claude

# Force overwrite non-empty directory
speckit init my-project --ai gemini --force

# Skip git initialization
speckit init my-project --ai copilot --no-git

# Use a custom GitHub token
speckit init my-project --ai copilot --github-token ghp_xxx
```

## Project Structure

```
nodejs/
├── src/
│   ├── index.ts            # Main exports
│   ├── cli.ts              # CLI wiring with Commander
│   ├── commands/           # CLI commands (init, check, version)
│   ├── lib/
│   │   ├── config.ts       # AGENT_CONFIG and constants
│   │   ├── errors.ts       # Error classes and exit codes
│   │   ├── github/         # GitHub API integration (token, rate-limit, client)
│   │   ├── template/       # Template download/extract/merge/permissions
│   │   ├── tools/          # Tool detection and git operations
│   │   └── ui/             # Banner, tracker, select, console
│   └── types/              # TypeScript interfaces
├── tests/                  # Vitest test files (353 tests)
├── bin/                    # Executable entry point
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Development

See the [Implementation Checklist](../docs/implementation-checklist.md) for detailed progress tracking.

## Testing

Tests are ported from the Python acceptance tests in `../tests/acceptance/`. Run with:

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

## Supported AI Assistants

| Agent | CLI Required | Folder |
|-------|-------------|--------|
| GitHub Copilot | No (IDE) | .github/ |
| Claude Code | Yes | .claude/ |
| Gemini CLI | Yes | .gemini/ |
| Cursor | No (IDE) | .cursor/ |
| Qwen Code | Yes | .qwen/ |
| opencode | Yes | .opencode/ |
| Codex CLI | Yes | .codex/ |
| Windsurf | No (IDE) | .windsurf/ |
| Kilo Code | No (IDE) | .kilocode/ |
| Auggie CLI | Yes | .augment/ |
| CodeBuddy | Yes | .codebuddy/ |
| Roo Code | No (IDE) | .roo/ |
| Amazon Q | Yes | .amazonq/ |
| Amp | Yes | .agents/ |
| SHAI | Yes | .shai/ |

## Reference

- [Original Python Source](../src/specify_cli/__init__.py)
- [Copilot Instructions](../.github/copilot-instructions.md)
- [Implementation Checklist](../docs/implementation-checklist.md)
