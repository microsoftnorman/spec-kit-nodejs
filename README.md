# Specify CLI

> A Node.js/TypeScript implementation of GitHub Spec Kit for Spec-Driven Development

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%2B-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

Specify CLI is a toolkit for **Spec-Driven Development (SDD)** - a methodology that emphasizes creating clear specifications before implementation. It bootstraps projects with templates, scripts, and AI agent integrations.

This project is a complete Node.js port of the original [Python implementation](https://github.com/github/spec-kit).

## Features

- 🚀 **Quick Project Setup** - Initialize SDD projects with a single command
- 🤖 **Multi-Agent Support** - Works with 15+ AI coding assistants
- 📝 **Spec Templates** - Pre-built templates for specifications, plans, and tasks
- 🔧 **Cross-Platform** - Bash and PowerShell scripts included
- ⚡ **TypeScript** - Full type safety and modern Node.js features

## Installation

### Install from npm

```bash
npm install -g @specify/cli
```

### Install from Source

```bash
git clone https://github.com/github/spec-kit-nodejs.git
cd spec-kit-nodejs
npm install
npm run build
npm link
```

## Quick Start

### Initialize a New Project

```bash
# Create a new project
specify init my-project --ai copilot

# Initialize in current directory
specify init --here --ai claude

# Specify script type
specify init my-project --ai gemini --script sh
```

### Available Commands

| Command | Description |
|---------|-------------|
| `specify init <name>` | Initialize a new Specify project |
| `specify check` | Check that required tools are installed |
| `specify version` | Display version and system information |
| `specify create-new-feature` | Create a new feature branch with spec files |
| `specify setup-plan` | Set up planning artifacts for a feature |
| `specify check-prerequisites` | Check prerequisites for a feature |
| `specify update-agent-context` | Update AI agent context files |

## Supported AI Agents

| Agent | CLI Required | Directory |
|-------|-------------|-----------|
| GitHub Copilot | No (IDE) | `.github/` |
| Claude Code | Yes | `.claude/` |
| Gemini CLI | Yes | `.gemini/` |
| Cursor | No (IDE) | `.cursor/` |
| Qwen Code | Yes | `.qwen/` |
| opencode | Yes | `.opencode/` |
| Codex CLI | Yes | `.codex/` |
| Windsurf | No (IDE) | `.windsurf/` |
| Kilo Code | No (IDE) | `.kilocode/` |
| Auggie CLI | Yes | `.augment/` |
| CodeBuddy | Yes | `.codebuddy/` |
| Roo Code | No (IDE) | `.roo/` |
| Amazon Q | Yes | `.amazonq/` |
| Amp | Yes | `.agents/` |
| SHAI | Yes | `.shai/` |

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev -- --help
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type-check without emitting |

### Project Structure

```
spec-kit-nodejs/
├── src/
│   ├── cli.ts                # CLI entry point
│   ├── commands/             # Command implementations
│   ├── lib/                  # Core library modules
│   │   ├── github/           # GitHub API integration
│   │   ├── template/         # Template processing
│   │   ├── tools/            # Tool detection
│   │   └── ui/               # Terminal UI components
│   └── types/                # TypeScript types
├── tests/                    # Test files
├── templates/                # SDD templates
├── docs/                     # Documentation
└── bin/                      # Executable
```

## Document Hierarchy

Spec Kit uses a structured document hierarchy for Spec-Driven Development:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPEC KIT DOCUMENT HIERARCHY                        │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │    CONSTITUTION      │  ← Project-wide rules
                         │  memory/constitution │     (non-negotiable)
                         │        .md           │
                         └──────────┬───────────┘
                                    │ governs all features
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PER-FEATURE DOCS                                │
│                        specs/{NNN-feature-name}/                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   spec.md     │ ───────▶ │   plan.md     │ ───────▶ │   tasks.md    │
│               │          │               │          │               │
│ WHAT & WHY    │          │ HOW           │          │ DO            │
│               │          │               │          │               │
│ • Overview    │          │ • Tech stack  │          │ • Task IDs    │
│ • User stories│          │ • Architecture│          │ • Phases      │
│ • Functional  │          │ • Data model  │          │ • Parallelism │
│   requirements│          │ • Phases      │          │ • File paths  │
│ • Non-func    │          │ • Constraints │          │ • Checkboxes  │
│   requirements│          │               │          │               │
│ • Edge cases  │          │               │          │               │
└───────────────┘          └───────┬───────┘          └───────────────┘
       │                           │                         │
       │ /speckit.specify          │ /speckit.plan           │ /speckit.tasks
       │                           │                         │
       │                           ▼                         │
       │                  ┌─────────────────┐                │
       │                  │ SUPPORTING DOCS │                │
       │                  │   (optional)    │                │
       │                  ├─────────────────┤                │
       │                  │ • research.md   │                │
       │                  │ • data-model.md │                │
       │                  │ • contracts/    │                │
       │                  │ • quickstart.md │                │
       │                  └─────────────────┘                │
       │                                                     │
       └──────────────────────┬──────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  /speckit.analyze │  ← Cross-artifact validation
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ /speckit.implement│  ← Code generation
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │    ACTUAL CODE    │
                    └───────────────────┘
```

### Document Purpose Summary

| Document | Purpose | Created By | Depends On |
|----------|---------|------------|------------|
| `constitution.md` | Immutable project rules | Manual | Nothing |
| `spec.md` | WHAT to build & WHY | `/speckit.specify` | Constitution |
| `plan.md` | HOW to build it | `/speckit.plan` | spec.md |
| `research.md` | Technical research | `/speckit.plan` | spec.md |
| `data-model.md` | Data entities | `/speckit.plan` | spec.md |
| `contracts/` | API specs | `/speckit.plan` | spec.md |
| `tasks.md` | Actionable work items | `/speckit.tasks` | plan.md |
| `checklist.md` | Implementation checklist | `/speckit.checklist` | tasks.md |

### File Locations

```
project-root/
├── memory/
│   └── constitution.md          ← Project principles
├── specs/
│   ├── 001-user-auth/
│   │   ├── spec.md              ← Feature specification
│   │   ├── plan.md              ← Implementation plan
│   │   ├── tasks.md             ← Task breakdown
│   │   ├── research.md          ← Technical research (optional)
│   │   ├── data-model.md        ← Data entities (optional)
│   │   └── contracts/           ← API contracts (optional)
│   └── 002-payment-system/
│       └── ...
├── .specify/
│   └── templates/               ← Templates for new features
└── CLAUDE.md / GEMINI.md        ← Agent context files
```

## Documentation

- [Installation Guide](docs/installation.md)
- [Quick Start](docs/quickstart.md)
- [Local Development](docs/local-development.md)
- [Upgrade Guide](docs/upgrade.md)
- [Agent Configuration](AGENTS.md)
- [Spec-Driven Development](spec-driven.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Implement your feature
5. Run tests (`npm test`) and linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original Python implementation: [github/spec-kit](https://github.com/github/spec-kit)
- Spec-Driven Development methodology by GitHub

---

Made with ❤️ by GitHub
