# Specify CLI Test Suite

This directory contains the test suite for the Specify CLI Node.js implementation.

## Test Structure

```
tests/
├── setup.ts                    # Test setup and shared utilities
├── platform.test.ts            # Platform-specific behavior tests
├── commands/                   # CLI command tests
│   ├── check.test.ts           # 'specify check' command
│   ├── check-prerequisites.test.ts
│   ├── create-new-feature.test.ts
│   ├── exit-codes.test.ts      # Exit code behavior
│   ├── init.test.ts            # 'specify init' command
│   ├── init-js-script.test.ts  # Init with JS script type
│   ├── setup-plan.test.ts
│   ├── update-agent-context.test.ts
│   └── version.test.ts         # 'specify version' command
├── lib/                        # Library unit tests
│   ├── common.test.ts          # Common utilities
│   ├── config.test.ts          # Configuration constants
│   ├── errors.test.ts          # Error handling
│   ├── github/                 # GitHub API tests
│   │   ├── client.test.ts
│   │   ├── rate-limit.test.ts
│   │   ├── tls.test.ts
│   │   └── token.test.ts
│   ├── template/               # Template processing tests
│   │   ├── download.test.ts
│   │   ├── extract.test.ts
│   │   ├── merge.test.ts
│   │   └── permissions.test.ts
│   ├── tools/                  # Tool detection tests
│   │   ├── detect.test.ts
│   │   └── git.test.ts
│   └── ui/                     # UI component tests
│       ├── banner.test.ts
│       ├── select.test.ts
│       └── tracker.test.ts
└── e2e/                        # End-to-end tests
    └── speckit-workflows.test.ts
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- tests/lib/config.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --grep "AGENT_CONFIG"
```

### Run Specific Test Suite

```bash
npm test -- tests/commands/
npm test -- tests/lib/github/
```

## Test Categories

### Unit Tests (Fast, No I/O)

- `tests/lib/config.test.ts` - Configuration constants and AGENT_CONFIG
- `tests/lib/errors.test.ts` - Error classes and exit codes
- `tests/lib/common.test.ts` - Common utility functions
- `tests/lib/ui/*.test.ts` - UI component rendering

### Mock-Based Tests

- `tests/lib/github/*.test.ts` - GitHub API with mocked fetch
- `tests/lib/template/*.test.ts` - Template handling with mocked file system
- `tests/lib/tools/*.test.ts` - Tool detection with mocked execSync

### Integration Tests

- `tests/commands/*.test.ts` - Full command execution
- `tests/e2e/*.test.ts` - End-to-end workflows

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });

  it('should handle errors', () => {
    expect(() => myFunction(badInput)).toThrow('Error message');
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';
import * as fs from 'fs-extra';

// Mock a module
vi.mock('fs-extra');

// Mock a specific function
vi.spyOn(fs, 'existsSync').mockReturnValue(true);

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, MY_VAR: 'test' };
});
afterEach(() => {
  process.env = originalEnv;
});
```

### Testing Async Code

```typescript
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toEqual({ data: 'value' });
});
```

### Testing CLI Commands

```typescript
import { execSync } from 'child_process';

function runCli(args: string): string {
  return execSync(`node bin/specify.js ${args}`, {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
}

it('should display help', () => {
  const output = runCli('--help');
  expect(output).toContain('Usage:');
});
```

## Test Utilities

### Temporary Directories

```typescript
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'specify-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});
```

### Environment Mocking

```typescript
function withEnv(vars: Record<string, string>, fn: () => void) {
  const original = { ...process.env };
  Object.assign(process.env, vars);
  try {
    fn();
  } finally {
    process.env = original;
  }
}
```

## Key Behaviors Tested

### 1. AGENT_CONFIG Structure

All 15 agents are tested for correct configuration:

- `name`: Human-readable display name
- `folder`: Directory path
- `installUrl`: Installation URL (or null)
- `requiresCli`: CLI requirement flag

### 2. GitHub Token Resolution

Priority order tested:
1. `--github-token` CLI argument
2. `GH_TOKEN` environment variable
3. `GITHUB_TOKEN` environment variable

### 3. Tool Detection

- Uses `which` (Unix) or `where` (Windows)
- Special handling for Claude at `~/.claude/local/claude`

### 4. Template Processing

- ZIP extraction with nested directory handling
- VS Code settings merge (deep merge, not overwrite)
- Script permissions on Unix (chmod +x for .sh files)

### 5. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Missing dependency |
| 3 | Invalid argument |
| 4 | Network error |
| 5 | File system error |

## CI Integration

Tests run on all platforms in CI:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

## Troubleshooting

### Tests Failing After Code Changes

```bash
# Rebuild the project
npm run build

# Run tests
npm test
```

### TypeScript Errors

```bash
# Check types
npm run typecheck

# View all errors
npx tsc --noEmit
```

### Platform-Specific Failures

Some tests are platform-specific:

```typescript
it.skipIf(process.platform === 'win32')('Unix only test', () => {
  // ...
});

it.skipIf(process.platform !== 'win32')('Windows only test', () => {
  // ...
});
```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test with debugging
node --inspect-brk node_modules/vitest/vitest.mjs run tests/lib/config.test.ts
```

## Coverage

Coverage reports are generated in the `coverage/` directory:

```bash
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```
