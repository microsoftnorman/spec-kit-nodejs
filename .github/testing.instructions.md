# Testing Instructions for Specify CLI

This file defines the Node.js testing patterns and best practices for the Specify CLI codebase,
following [Martin Fowler's Testing Guide](https://martinfowler.com/testing/) and the
[Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html).

## Core Testing Philosophy

### Self-Testing Code

We aim to write [Self-Testing Code](https://martinfowler.com/bliki/SelfTestingCode.html) - comprehensive
automated tests that can be invoked with a single command (`npm test`). When tests pass ("go green"),
we have confidence the software is ready for production.

### The Test Pyramid

Follow the [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) principle:

```
        /\
       /  \      Few E2E Tests (Broad Stack)
      /----\
     /      \    Some Integration Tests
    /--------\
   /          \  Many Unit Tests
  --------------
```

**Key Rules:**
1. **Write tests with different granularity** - Unit, Integration, and E2E
2. **The higher you go, the fewer tests you should have**
3. **Push tests as far down the pyramid as you can**

Avoid the "test ice-cream cone" anti-pattern where you have many slow E2E tests and few unit tests.

## Testing Framework

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, ESM-native test runner
- **Assertions**: Vitest's built-in `expect` API (Jest-compatible)
- **Mocking**: Vitest's `vi` mock utilities (Test Doubles)

## Test File Organization

### Test Pyramid Structure

Our test suite follows the [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html):

```
tests/
├── lib/                # UNIT TESTS (Many, Fast)
│   ├── config.test.ts
│   ├── errors.test.ts
│   ├── common.test.ts
│   ├── github/         # GitHub API unit tests
│   ├── template/       # Template processing
│   ├── tools/          # Tool detection
│   └── ui/             # UI components
├── commands/           # INTEGRATION TESTS (Some, Medium)
│   ├── check.test.ts
│   ├── init.test.ts
│   └── ...
├── e2e/                # E2E TESTS (Few, Slow)
│   └── speckit-workflows.test.ts
└── setup.ts            # Shared utilities
```

### Unit Tests (tests/lib/) - The Foundation

Unit tests form the **base of the pyramid**. Write many of these.

**Characteristics:**
- Test individual functions/classes in isolation
- Use [Test Doubles](https://martinfowler.com/bliki/TestDouble.html) (mocks, stubs, fakes) for dependencies
- Fast execution (thousands in minutes)
- No I/O, network, or file system access
- Deterministic results

**What to test:**
- Public interfaces (not private methods)
- Observable behavior, not implementation details
- Edge cases and error conditions
- Skip trivial code (simple getters/setters)

**Sociable vs Solitary Unit Tests:**
- **Solitary**: Stub all collaborators for perfect isolation
- **Sociable**: Allow real collaborators, only stub slow/side-effect-prone ones
- Both are valid - choose based on confidence needs

### Integration Tests (tests/commands/) - The Middle Layer

Integration tests verify components work together. Write some of these.

**Characteristics:**
- Test one integration point at a time (narrow integration tests)
- May use real file system, mocked network calls
- Slower than unit tests (seconds to minutes)
- Test serialization/deserialization boundaries

**When to write integration tests:**
- Calls to REST APIs (use mocked servers)
- Reading/writing to file systems
- Process execution (git, tool detection)
- Any code that serializes or deserializes data

### End-to-End Tests (tests/e2e/) - The Safety Net

E2E tests verify complete user journeys. Write as many as needed for confidence.

**Characteristics:**
- Test the entire application as users would use it
- Execution time is not a concern - completeness matters
- Must be deterministic and reliable (no flaky tests)
- Cover all critical user workflows

**What to test:**
- All valuable user workflows
- Real-world usage scenarios
- Full command interactions
- Edge cases that could break in production

**Philosophy:**
- When E2E tests pass, we can ship with confidence
- Duplication with lower levels is acceptable for E2E
- Reliability over speed - tests can run as long as needed

### File Naming

- Test files: `*.test.ts` (not `*.spec.ts`)
- Test file mirrors source: `src/lib/config.ts` → `tests/lib/config.test.ts`
- Descriptive test names: `'should return true when tool exists'`

## Test Structure Pattern

### Arrange, Act, Assert (AAA)

Use the ["Arrange, Act, Assert"](https://martinfowler.com/bliki/GivenWhenThen.html) pattern (also known as "Given, When, Then"):

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ModuleName', () => {
  // Group related tests
  describe('functionName', () => {
    beforeEach(() => {
      // Setup before each test
    });

    afterEach(() => {
      // Cleanup after each test
      vi.restoreAllMocks();
    });

    it('should do expected behavior', () => {
      // Arrange (Given)
      const input = 'test';
      
      // Act (When)
      const result = functionName(input);
      
      // Assert (Then)
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => functionName(null)).toThrow('Error message');
    });
  });
});
```

### Async Test Pattern

```typescript
it('should fetch data asynchronously', async () => {
  const result = await fetchData();
  expect(result).toEqual({ data: 'value' });
});

it('should reject on error', async () => {
  await expect(fetchBadData()).rejects.toThrow('Network error');
});
```

## Mocking Patterns (Test Doubles)

[Test Doubles](https://martinfowler.com/bliki/TestDouble.html) replace real objects with fake versions for testing.
Common types: **Mocks**, **Stubs**, **Fakes**, **Dummies**, **Spies**.

### Module Mocking

```typescript
import { vi } from 'vitest';

// Mock entire module
vi.mock('fs-extra', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Import after mock declaration
import { existsSync } from 'fs-extra';
```

### Function Spying

```typescript
import * as fs from 'fs-extra';

it('should call writeFileSync', () => {
  const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  
  myFunction();
  
  expect(spy).toHaveBeenCalledWith('/path/file.txt', 'content');
});
```

### Environment Variables

```typescript
describe('with environment variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use GH_TOKEN', () => {
    process.env.GH_TOKEN = 'test-token';
    expect(getGitHubToken()).toBe('test-token');
  });
});
```

### Mocking Child Process

```typescript
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

it('should detect tool', () => {
  vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/git'));
  expect(checkTool('git')).toBe(true);
});

it('should handle missing tool', () => {
  vi.mocked(execSync).mockImplementation(() => {
    throw new Error('not found');
  });
  expect(checkTool('missing')).toBe(false);
});
```

## Test Data Patterns

### Temporary Directories

```typescript
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('file operations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'specify-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create file in temp directory', () => {
    const filePath = join(tempDir, 'test.txt');
    writeFileSync(filePath, 'content');
    expect(existsSync(filePath)).toBe(true);
  });
});
```

### Fixtures

```typescript
// Define reusable test data
const sampleAgentConfig = {
  name: 'Test Agent',
  folder: '.test/',
  installUrl: 'https://example.com',
  requiresCli: true,
};

const sampleRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Remaining': '59',
  'X-RateLimit-Reset': '1234567890',
});
```

## Platform-Specific Tests

### Skip by Platform

```typescript
import { describe, it } from 'vitest';

// Skip on Windows
it.skipIf(process.platform === 'win32')('should set Unix permissions', () => {
  // Unix-only test
});

// Skip on non-Windows
it.skipIf(process.platform !== 'win32')('should use where command', () => {
  // Windows-only test
});

// Run only on specific platform
describe.runIf(process.platform === 'darwin')('macOS specific', () => {
  // macOS-only tests
});
```

### Platform-Aware Assertions

```typescript
it('should use correct command', () => {
  const expected = process.platform === 'win32' ? 'where git' : 'which git';
  expect(getToolCheckCommand('git')).toBe(expected);
});
```

## Testing CLI Commands

### Command Execution Pattern

```typescript
import { execSync } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(__dirname, '../../bin/specify.js');

function runCli(args: string, options: { cwd?: string } = {}): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: 'utf-8',
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, NO_COLOR: '1' },
  });
}

it('should display help', () => {
  const output = runCli('--help');
  expect(output).toContain('Usage:');
  expect(output).toContain('specify');
});

it('should return version', () => {
  const output = runCli('version');
  expect(output).toMatch(/Specify CLI v\d+\.\d+\.\d+/);
});
```

### Exit Code Testing

```typescript
import { spawnSync } from 'child_process';

function getExitCode(args: string): number {
  const result = spawnSync('node', [CLI_PATH, ...args.split(' ')], {
    encoding: 'utf-8',
  });
  return result.status ?? 1;
}

it('should exit with code 0 on success', () => {
  expect(getExitCode('--help')).toBe(0);
});

it('should exit with code 3 on invalid argument', () => {
  expect(getExitCode('--invalid-flag')).toBe(3);
});
```

## Assertion Best Practices

### Preferred Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(obj).toEqual(expected);          // Deep equality
expect(obj).toStrictEqual(expected);    // Deep equality + same types

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(num).toBeGreaterThan(5);
expect(num).toBeLessThanOrEqual(10);
expect(float).toBeCloseTo(0.3, 5);

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/regex/);
expect(str).toHaveLength(5);

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);
expect(arr).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('nested.key', 'value');
expect(obj).toMatchObject({ key: 'value' });

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('message');
expect(() => fn()).toThrow(ErrorClass);
await expect(asyncFn()).rejects.toThrow();

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenLastCalledWith(arg);
```

### Custom Matchers for This Project

```typescript
// Check exit code error
expect(error).toMatchObject({
  exitCode: ExitCode.NETWORK_ERROR,
  message: expect.stringContaining('rate limit'),
});

// Check agent config structure
expect(AGENT_CONFIG[key]).toMatchObject({
  name: expect.any(String),
  folder: expect.stringMatching(/^\./),
  requiresCli: expect.any(Boolean),
});
```

## Test Coverage

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Thresholds (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

## Anti-Patterns to Avoid

### Avoid Test Duplication Across Layers

From [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html):

1. **If a higher-level test fails, write a lower-level test** to catch it
2. **Push tests as far down the pyramid as you can**
3. **Eliminate redundant high-level tests** covered at lower levels

Don't repeat the same test logic at multiple layers. If unit tests cover edge cases,
don't re-test them in integration or E2E tests.

### ❌ Don't Do This

```typescript
// Don't use real network calls in unit tests
it('should fetch releases', async () => {
  const releases = await fetchFromGitHub(); // Real API call!
});

// Don't share mutable state between tests
let sharedState = [];
it('test 1', () => { sharedState.push(1); });
it('test 2', () => { expect(sharedState).toHaveLength(0); }); // Fails!

// Don't use arbitrary timeouts
it('should complete', async () => {
  await new Promise(r => setTimeout(r, 1000)); // Slow!
});

// Don't test implementation details (brittle tests)
it('should call internal method', () => {
  expect(obj._privateMethod).toHaveBeenCalled(); // Breaks on refactor!
});

// Don't test trivial code
it('should get name', () => {
  const obj = { name: 'test' };
  expect(obj.name).toBe('test'); // Pointless!
});

// Don't tie tests too closely to implementation
it('should call A then B then return sum', () => {
  // Tests implementation, not behavior - breaks on refactor
});
```

### ✅ Do This Instead

```typescript
// Mock network calls
vi.mock('node-fetch');
it('should fetch releases', async () => {
  vi.mocked(fetch).mockResolvedValue(mockResponse);
  const releases = await fetchFromGitHub();
});

// Reset state in beforeEach
let testState: string[];
beforeEach(() => { testState = []; });

// Use fake timers for time-dependent tests
vi.useFakeTimers();
it('should timeout', async () => {
  const promise = waitForTimeout();
  vi.advanceTimersByTime(5000);
  await expect(promise).rejects.toThrow('timeout');
});

// Test observable behavior, not implementation
it('should return formatted output', () => {
  // Test: "if I enter x and y, will the result be z?"
  expect(formatOutput(input)).toBe('expected output');
});

// Write narrow integration tests for external dependencies
it('should save and fetch from database', async () => {
  await repository.save(testData);
  const result = await repository.findById(testData.id);
  expect(result).toEqual(testData);
});
```

### Writing Clean Test Code

From Martin Fowler's guidance:

1. **Test code is as important as production code** - Give it the same care
2. **Test one condition per test** - Keep tests short and focused
3. **Use AAA/GWT structure** - Arrange, Act, Assert (Given, When, Then)
4. **Readability over DRY** - Some duplication is okay if it improves clarity
5. **Use the Rule of Three** - Refactor when you see the same pattern 3 times

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific file
npm test -- tests/lib/config.test.ts

# Pattern matching
npm test -- --grep "AGENT_CONFIG"

# With coverage
npm run test:coverage

# Update snapshots
npm test -- --update
```

## Eradicating Non-Determinism

From [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html):

Non-deterministic tests (tests that sometimes pass, sometimes fail) destroy test suite value.

**Common causes and solutions:**

1. **Lack of isolation** - Reset state in `beforeEach`/`afterEach`
2. **Asynchronous behavior** - Use proper async/await, fake timers
3. **Remote services** - Use test doubles (mocks, stubs)
4. **Time dependencies** - Use [Clock Wrapper](https://martinfowler.com/bliki/ClockWrapper.html) pattern
5. **Resource leaks** - Clean up temp files, close connections

```typescript
// Use fake timers for time-dependent code
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));

// Clean up resources
afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});
```

## References

- [Martin Fowler's Testing Guide](https://martinfowler.com/testing/)
- [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Test Double](https://martinfowler.com/bliki/TestDouble.html)
- [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
- [Self-Testing Code](https://martinfowler.com/bliki/SelfTestingCode.html)
- [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)

---

*Follow these patterns to maintain consistent, reliable, and fast tests across the Specify CLI codebase.*
