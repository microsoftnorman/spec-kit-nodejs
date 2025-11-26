# Copilot Instructions: Specify CLI (Node.js)

## Project Overview

This is **Specify CLI** - a Node.js/TypeScript implementation of **GitHub Spec Kit**. This project is a complete port from the original Python implementation at [github/spec-kit](https://github.com/github/spec-kit).

Spec Kit is a toolkit for Spec-Driven Development (SDD) that bootstraps projects with templates, scripts, and AI agent integrations.

### What Specify CLI Does

1. **`specify init <project-name>`** - Initialize a new project with SDD templates
2. **`specify check`** - Verify required tools are installed
3. **`specify version`** - Display version and system information
4. **`specify create-new-feature`** - Create a new feature branch with spec files
5. **`specify setup-plan`** - Set up planning artifacts for a feature
6. **`specify check-prerequisites`** - Check prerequisites for a feature
7. **`specify update-agent-context`** - Update AI agent context files

The CLI downloads template packages from GitHub releases, extracts them, sets up directory structures, and optionally initializes git repositories.

---

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Runtime | Node.js 18+ | ES Modules (`"type": "module"`) |
| Language | TypeScript 5.5+ | Strict mode enabled |
| CLI Framework | Commander | Subcommand-based CLI |
| Terminal UI | Chalk + Ora | Colors, spinners, formatting |
| HTTP Client | node-fetch | GitHub API requests |
| Interactive Prompts | @inquirer/prompts | Arrow-key selection menus |
| ZIP Handling | adm-zip | Template extraction |
| File System | fs-extra | Enhanced file operations |
| Process Execution | execa | Running shell commands |
| Testing | Vitest | Unit and integration tests |
| Linting | ESLint + Prettier | Code quality |

### Dependencies

```json
{
  "dependencies": {
    "@inquirer/prompts": "^5.0.0",
    "adm-zip": "^0.5.14",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.1.0",
    "env-paths": "^3.0.0",
    "execa": "^9.3.0",
    "fs-extra": "^11.2.0",
    "node-fetch": "^3.3.2",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.5",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^1.6.0",
    "eslint": "^9.5.0",
    "prettier": "^3.3.2",
    "tsx": "^4.15.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

---

## Project Structure

```
spec-kit-nodejs/
├── src/
│   ├── index.ts              # Main entry point
│   ├── cli.ts                # CLI wiring with Commander
│   ├── commands/
│   │   ├── check.ts          # 'specify check' command
│   │   ├── check-prerequisites.ts
│   │   ├── create-new-feature.ts
│   │   ├── init.ts           # 'specify init' command
│   │   ├── setup-plan.ts
│   │   ├── update-agent-context.ts
│   │   └── version.ts        # 'specify version' command
│   ├── lib/
│   │   ├── common.ts         # Shared utilities
│   │   ├── config.ts         # AGENT_CONFIG and constants
│   │   ├── errors.ts         # Error classes and exit codes
│   │   ├── index.ts          # Library exports
│   │   ├── github/
│   │   │   ├── client.ts     # GitHub API client
│   │   │   ├── rate-limit.ts # Rate limit parsing & errors
│   │   │   ├── tls.ts        # TLS/SSL handling
│   │   │   └── token.ts      # GitHub token handling
│   │   ├── template/
│   │   │   ├── download.ts   # Template download from releases
│   │   │   ├── extract.ts    # ZIP extraction
│   │   │   ├── merge.ts      # JSON deep merge
│   │   │   └── permissions.ts # Script chmod handling
│   │   ├── tools/
│   │   │   ├── detect.ts     # Tool detection (which/where)
│   │   │   └── git.ts        # Git operations
│   │   └── ui/
│   │       ├── banner.ts     # ASCII banner display
│   │       ├── select.ts     # Arrow key selection menu
│   │       └── tracker.ts    # Step tracker (progress display)
│   └── types/
│       └── index.ts          # TypeScript interfaces & types
├── tests/
│   ├── setup.ts              # Test setup with mock utilities
│   ├── platform.test.ts      # Platform-specific tests
│   ├── commands/             # Command tests
│   ├── e2e/                  # End-to-end workflow tests
│   └── lib/                  # Library unit tests
├── bin/
│   └── specify.js            # Executable entry point
├── templates/                # SDD templates
├── docs/                     # Documentation
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Key Data Structures

### AGENT_CONFIG (src/lib/config.ts)

```typescript
interface AgentConfig {
  name: string;
  folder: string;
  installUrl: string | null;
  requiresCli: boolean;
}

const AGENT_CONFIG: Record<string, AgentConfig> = {
  copilot: {
    name: "GitHub Copilot",
    folder: ".github/",
    installUrl: null,
    requiresCli: false,
  },
  claude: {
    name: "Claude Code",
    folder: ".claude/",
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/setup",
    requiresCli: true,
  },
  // ... additional agents
};
```

### Exit Codes (src/lib/errors.ts)

```typescript
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

## Development Workflow

### Building

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type-check without emitting
```

### Testing

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
```

### Running Locally

```bash
npm run dev -- --help                    # Run CLI in development
npm run dev -- init my-project --ai copilot
npx . check                              # Run built CLI
```

### Linting & Formatting

```bash
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Best Practices

### Node.js/TypeScript Guidelines

1. **Use ES Modules** - All imports use ESM syntax (`import`/`export`)
2. **Strict TypeScript** - Enable strict mode, avoid `any`
3. **Async/Await** - Prefer async/await over raw Promises
4. **Error Handling** - Use custom error classes with exit codes
5. **Path Handling** - Use `path.join()` for cross-platform paths
6. **File Operations** - Use `fs-extra` for enhanced functionality

### Code Style

- Use `const` by default, `let` when reassignment needed
- Prefer early returns to reduce nesting
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Testing Guidelines (Martin Fowler's Test Pyramid)

Follow the [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) principles.
For detailed testing patterns, see [testing.instructions.md](testing.instructions.md).

1. **Write tests with different granularity** - Unit, Integration, and E2E tests
2. **The higher you go, the fewer tests you should have** - Many unit tests, some integration tests, few E2E tests
3. **Push tests as far down the pyramid as you can** - Prefer unit tests over integration tests when possible

**Unit Tests** (`tests/lib/`):
- Test individual functions and classes in isolation
- Use mocks/stubs for external dependencies (Test Doubles)
- Should be fast (thousands in minutes) and deterministic
- Follow "Arrange, Act, Assert" or "Given, When, Then" structure
- Test observable behavior, not implementation details

**Integration Tests** (`tests/commands/`):
- Test integration points with external systems (GitHub API, file system, git)
- Use narrow integration tests - one integration point at a time
- Mock external services with tools like Wiremock patterns
- Write integration tests for all serialization/deserialization boundaries

**End-to-End Tests** (`tests/e2e/`):
- Test complete user journeys through the CLI
- Completeness over speed - tests can run as long as needed
- Must be reliable and deterministic (no flaky tests)
- Cover all critical user workflows for shipping confidence

**Test Code Quality**:
- Test code is as important as production code
- Test one condition per test
- Avoid test duplication across pyramid layers
- If a higher-level test fails, write a lower-level test to catch it
- Eliminate redundant high-level tests that are covered at lower levels

---

## Platform Compatibility

### Cross-Platform Considerations

- **Path separators**: Always use `path.join()` or `path.resolve()`
- **Tool detection**: Use `where` on Windows, `which` on Unix
- **Script permissions**: Only set chmod on Unix systems
- **Default script type**: PowerShell on Windows, Bash elsewhere
- **Line endings**: Be aware of CRLF vs LF differences

### Tool Detection

```typescript
// Use 'where' on Windows, 'which' on Unix
const cmd = process.platform === 'win32' ? `where ${tool}` : `which ${tool}`;
```

### Script Permissions

```typescript
// Only set executable permissions on Unix
if (process.platform !== 'win32') {
  chmodSync(scriptPath, 0o755);
}
```

---

## GitHub API Integration

### Rate Limit Handling

The CLI includes sophisticated rate limit handling:

- Parse `X-RateLimit-*` headers
- Display remaining requests and reset time
- Suggest using `--github-token` for higher limits
- Handle 403 and 429 responses gracefully

### Authentication

```typescript
// Token priority: CLI flag > GH_TOKEN > GITHUB_TOKEN
function getGitHubToken(cliToken?: string): string | undefined {
  return (cliToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim() || undefined;
}
```

---

## Resources

- [Original Python Implementation](https://github.com/github/spec-kit) - Reference implementation
- [Agent Configuration Guide](../AGENTS.md) - Adding new AI agents
- [Spec-Driven Development Methodology](../spec-driven.md)

---

## Contributing

1. Create a feature branch
2. Write tests for new functionality
3. Implement the feature
4. Ensure all tests pass (`npm test`)
5. Run linting (`npm run lint`)
6. Submit a pull request

---

*This is a pure Node.js/TypeScript implementation. For the original Python version, see [github/spec-kit](https://github.com/github/spec-kit).*
