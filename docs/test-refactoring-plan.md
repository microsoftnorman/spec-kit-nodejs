# Test Suite Refactoring Plan

## Current Test Map

### Source → Test File Mapping

| Source File | Test File | Tests | Coverage | Status |
|-------------|-----------|-------|----------|--------|
| **Entry Points** |
| `src/cli.ts` | ❌ None | 0 | 0% | Needs integration tests |
| `src/index.ts` | ❌ None | 0 | 0% | Needs integration tests |
| **Commands** |
| `src/commands/check.ts` | `commands/check.test.ts` | 14 | 0% | Tests exist but don't import source |
| `src/commands/check-prerequisites.ts` | `commands/check-prerequisites.test.ts` | 14 | 0% | Tests exist but don't import source |
| `src/commands/create-new-feature.ts` | `commands/create-new-feature.test.ts` | 33 | 0% | Tests exist but don't import source |
| `src/commands/init.ts` | `commands/init.test.ts` + `init-js-script.test.ts` | 2+46 | 0% | Tests exist but don't import source |
| `src/commands/setup-plan.ts` | `commands/setup-plan.test.ts` | 11 | 0% | Tests exist but don't import source |
| `src/commands/update-agent-context.ts` | `commands/update-agent-context.test.ts` | 46 | 0% | Tests exist but don't import source |
| `src/commands/version.ts` | `commands/version.test.ts` | 17 | 0% | Tests exist but don't import source |
| **Library - Core** |
| `src/lib/common.ts` | `lib/common.test.ts` | 28 | 0% | ⚠️ Tests don't import source functions |
| `src/lib/config.ts` | `lib/config.test.ts` | 30 | 100% | ✅ Complete |
| `src/lib/errors.ts` | `lib/errors.test.ts` | 25 | 100% | ✅ Complete |
| `src/lib/index.ts` | ❌ None | 0 | 0% | Re-export only, skip |
| **Library - GitHub** |
| `src/lib/github/client.ts` | `lib/github/client.test.ts` | 16 | 100% | ✅ Complete |
| `src/lib/github/rate-limit.ts` | `lib/github/rate-limit.test.ts` | 13 | 100% | ✅ Complete |
| `src/lib/github/token.ts` | `lib/github/token.test.ts` | 12 | 100% | ✅ Complete |
| `src/lib/github/tls.ts` | `lib/github/tls.test.ts` | 14 | N/A | ✅ Complete (not in coverage) |
| **Library - Template** |
| `src/lib/template/builtin.ts` | ❌ None | 0 | 0% | ❌ Needs tests |
| `src/lib/template/download.ts` | `lib/template/download.test.ts` | 17 | 57.5% | ⚠️ Needs more tests |
| `src/lib/template/extract.ts` | `lib/template/extract.test.ts` | 10 | 37.4% | ⚠️ Needs more tests |
| `src/lib/template/merge.ts` | `lib/template/merge.test.ts` | 19 | 100% | ✅ Complete |
| `src/lib/template/permissions.ts` | `lib/template/permissions.test.ts` | 17 | 70% | ⚠️ Needs more tests |
| **Library - Tools** |
| `src/lib/tools/detect.ts` | `lib/tools/detect.test.ts` | 8 | 86% | ⚠️ Near complete |
| `src/lib/tools/git.ts` | `lib/tools/git.test.ts` | 7 | 85% | ⚠️ Near complete |
| **Library - UI** |
| `src/lib/ui/banner.ts` | `lib/ui/banner.test.ts` | 10 | 100% | ✅ Complete |
| `src/lib/ui/console.ts` | ❌ None | 0 | 0% | ❌ Needs tests |
| `src/lib/ui/select.ts` | `lib/ui/select.test.ts` | 20 | 73% | ⚠️ Needs more tests |
| `src/lib/ui/tracker.ts` | `lib/ui/tracker.test.ts` | 27 | 99% | ✅ Complete |
| **Types** |
| `src/types/index.ts` | ❌ None | 0 | N/A | Type definitions only, skip |
| **Other Tests** |
| N/A | `platform.test.ts` | 5 | N/A | Platform compatibility |
| N/A | `commands/exit-codes.test.ts` | 20 | N/A | Exit code verification |
| N/A | `e2e/speckit-workflows.test.ts` | 37 | N/A | E2E workflows |

### Test Count by Layer

| Layer | Files | Tests | Purpose |
|-------|-------|-------|---------|
| **Unit** (`tests/lib/`) | 17 | 293 | Test library functions in isolation |
| **Integration** (`tests/commands/`) | 9 | 183 | Test command orchestration |
| **E2E** (`tests/e2e/`) | 1 | 37 | Test complete user workflows |
| **Other** | 1 | 5 | Platform compatibility |
| **Total** | 28 | 518 | |

---

## Future Test Map

### Target Structure

```
tests/
├── lib/                          # UNIT TESTS (target: 90%+ coverage)
│   ├── common.test.ts            # REWRITE - test actual functions
│   ├── config.test.ts            # ✅ Complete
│   ├── errors.test.ts            # ✅ Complete
│   ├── github/
│   │   ├── client.test.ts        # ✅ Complete
│   │   ├── rate-limit.test.ts    # ✅ Complete
│   │   ├── tls.test.ts           # ✅ Complete
│   │   └── token.test.ts         # ✅ Complete
│   ├── template/
│   │   ├── builtin.test.ts       # NEW - test built-in template generation
│   │   ├── download.test.ts      # IMPROVE - add error path tests
│   │   ├── extract.test.ts       # IMPROVE - add nested ZIP tests
│   │   ├── merge.test.ts         # ✅ Complete
│   │   └── permissions.test.ts   # IMPROVE - add edge cases
│   ├── tools/
│   │   ├── detect.test.ts        # IMPROVE - test Windows paths
│   │   └── git.test.ts           # IMPROVE - test error branches
│   └── ui/
│       ├── banner.test.ts        # ✅ Complete
│       ├── console.test.ts       # NEW - test console formatting
│       ├── select.test.ts        # IMPROVE - keyboard edge cases
│       └── tracker.test.ts       # ✅ Complete
├── commands/                     # INTEGRATION TESTS (focus on wiring)
│   ├── check.test.ts             # REFACTOR - test command integration only
│   ├── check-prerequisites.test.ts
│   ├── create-new-feature.test.ts # REFACTOR - move unit logic to lib/
│   ├── exit-codes.test.ts        # Keep - cross-command behavior
│   ├── init.test.ts              # MERGE with init-js-script.test.ts
│   ├── init-js-script.test.ts    # REFACTOR - extract unit tests
│   ├── setup-plan.test.ts
│   ├── update-agent-context.test.ts # REFACTOR - reduce duplication
│   └── version.test.ts
├── e2e/                          # E2E TESTS (complete coverage)
│   └── speckit-workflows.test.ts # EXPAND - add more scenarios
├── platform.test.ts              # Keep - platform compatibility
└── setup.ts                      # Shared test utilities
```

---

## Migration Tasks

### 1. Unit Tests to Create (NEW)

| File | Functions to Test | Priority |
|------|-------------------|----------|
| `lib/common.test.ts` | `getRepoRoot()`, `hasGit()`, `getCurrentBranch()`, `getFeaturePaths()`, `sanitizeBranchName()`, `getNextFeatureNumber()`, `generateBranchName()` | HIGH |
| `lib/template/builtin.test.ts` | `getTemplatesDir()`, `generateBuiltinTemplate()`, `copyTemplateFiles()`, `setupAgentDirectories()` | HIGH |
| `lib/ui/console.test.ts` | `centerText()`, `box()`, `printError()`, `printWarning()`, `printSuccess()` | MEDIUM |

### 2. Unit Tests to Improve (ENHANCE)

| File | Current | Target | Work Needed |
|------|---------|--------|-------------|
| `lib/template/extract.test.ts` | 37% | 85% | Test nested ZIPs, error handling, cleanup |
| `lib/template/download.test.ts` | 58% | 90% | Test retry logic, network errors, caching |
| `lib/template/permissions.test.ts` | 70% | 90% | Test various file types, Windows behavior |
| `lib/ui/select.test.ts` | 73% | 90% | Test rapid key presses, terminal resize |
| `lib/tools/detect.test.ts` | 86% | 95% | Test Windows registry, PATH edge cases |
| `lib/tools/git.test.ts` | 85% | 95% | Test detached HEAD, bare repo, worktrees |

### 3. Integration Tests to Refactor (DEDUPE)

| File | Current Tests | Issue | Action |
|------|---------------|-------|--------|
| `commands/init-js-script.test.ts` | 46 | Tests unit logic that belongs in lib/ | Extract to `lib/template/builtin.test.ts` |
| `commands/create-new-feature.test.ts` | 33 | Branch naming tests belong in common | Move to `lib/common.test.ts` |
| `commands/update-agent-context.test.ts` | 46 | Agent config tests duplicate config.test.ts | Remove duplicates |
| `commands/check.test.ts` | 14 | Tool detection tests belong in detect.test.ts | Focus on command wiring |

### 4. E2E Tests to Expand (COMPLETE)

| Scenario | Status | Notes |
|----------|--------|-------|
| Full SDD workflow | ✅ Exists | 37 tests |
| Error recovery | ❌ Missing | Test interruption handling |
| Invalid inputs | ❌ Missing | Test CLI argument validation |
| Cross-platform | ❌ Missing | Test Windows/Unix differences |
| Network failures | ❌ Missing | Test offline behavior |
| Large projects | ❌ Missing | Test with many features |

---

## Implementation Phases

### Phase 1: Complete Unit Test Coverage (Priority: HIGH)

**Goal**: Get `tests/lib/` to 90%+ coverage on all library modules.

#### 1.1 Rewrite `tests/lib/common.test.ts`

The current file tests interface shapes, not actual functions. Rewrite to:

```typescript
// Import and test actual functions:
import { 
  getRepoRoot, 
  hasGit, 
  getCurrentBranch, 
  getFeaturePaths,
  sanitizeBranchName,
  getNextFeatureNumber,
  generateBranchName 
} from '../../src/lib/common.js';
```

#### 1.2 Create `tests/lib/template/builtin.test.ts`

```typescript
// Functions to test:
import {
  getTemplatesDir,
  generateBuiltinTemplate,
  copyTemplateFiles,
  copyCommandFiles,
  setupAgentDirectories,
  createVSCodeSettings
} from '../../../src/lib/template/builtin.js';
```

#### 1.3 Create `tests/lib/ui/console.test.ts`

```typescript
// Functions to test:
import {
  centerText,
  box,
  printError,
  printWarning,
  printSuccess,
  printInfo
} from '../../../src/lib/ui/console.js';
```

#### 1.4 Improve Existing Unit Tests

| File | Current | Target | Work Needed |
|------|---------|--------|-------------|
| `extract.test.ts` | 37% | 85% | Test nested ZIPs, error handling |
| `download.test.ts` | 58% | 90% | Test retry logic, network errors |
| `permissions.test.ts` | 70% | 90% | Test edge cases |
| `select.test.ts` | 73% | 90% | Test keyboard handling |
| `detect.test.ts` | 86% | 95% | Test Windows paths |
| `git.test.ts` | 85% | 95% | Test error branches |

---

### Phase 2: Refactor Integration Tests (Priority: MEDIUM)

**Goal**: Command tests should test CLI integration, not re-implement unit tests.

#### 2.1 Integration Test Pattern

```typescript
describe('CommandName', () => {
  // Test: Does the command wire library functions correctly?
  // Test: Are CLI arguments parsed correctly?
  // Test: Is output formatted correctly?
  // Test: Are exit codes correct?
  
  // DON'T: Re-test library function logic
});
```

#### 2.2 Files to Refactor

| File | Tests | Action |
|------|-------|--------|
| `init-js-script.test.ts` | 46 | Move template generation tests → `builtin.test.ts` |
| `create-new-feature.test.ts` | 33 | Move branch naming tests → `common.test.ts` |
| `update-agent-context.test.ts` | 46 | Remove agent config duplicates |
| `init.test.ts` | 2 | Merge with `init-js-script.test.ts` |
| `check.test.ts` | 14 | Move tool detection → `detect.test.ts` |

---

### Phase 3: E2E Test Completeness (Priority: HIGH)

**Goal**: Ensure E2E tests are comprehensive and reliable. Execution time is not a concern.

#### 3.1 Current E2E Analysis

`speckit-workflows.test.ts` has 37 tests covering the full SDD workflow.

**All tests should**:
- Complete successfully every time
- Cover the full user journey
- Verify real-world usage scenarios
- Be deterministic (no flaky tests)

#### 3.2 E2E Test Philosophy

E2E tests are our safety net. We prioritize:
1. **Completeness** - Cover all critical user workflows
2. **Reliability** - Tests must pass consistently
3. **Confidence** - When E2E passes, we can ship
4. **No shortcuts** - Test real behavior, not mocked abstractions

**We do NOT optimize for**:
- Execution speed (tests can run as long as needed)
- Minimal test count (more coverage is better)
- Avoiding duplication with lower levels (E2E confirms the full stack works)

#### 3.3 E2E Scenarios to Add

| Scenario | Description |
|----------|-------------|
| Error recovery | Test interruption and resume |
| Invalid inputs | Test CLI argument validation |
| Network failures | Test offline behavior |
| Large projects | Test with 10+ features |
| Parallel features | Test concurrent feature development |

---

### Phase 4: Cleanup & Documentation (Priority: LOW)

1. [ ] Ensure all E2E tests pass reliably
2. [ ] Add any missing E2E scenarios
3. [ ] Remove Python acceptance test stubs (`tests/acceptance/*.py`)
4. [ ] Update `tests/README.md`
5. [ ] Verify final coverage targets met

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Overall Statement Coverage | 33.53% | 80%+ |
| Unit Test Coverage (`tests/lib/`) | ~70% | 90%+ |
| Integration Tests | ~150 | Focused on integration points |
| E2E Tests | 37 | Complete coverage (count not limited) |
| Test Execution Time | 28s | Not a constraint |
| Flaky Tests | Unknown | 0 |
| E2E Pass Rate | 100% | 100% (non-negotiable) |

---

## Test Writing Guidelines

When writing new tests, follow [testing.instructions.md](../.github/testing.instructions.md):

1. **Unit tests**: Test one function/behavior at a time
2. **Use AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies**: fs, child_process, network
4. **Don't test implementation**: Test observable behavior
5. **Avoid duplication**: If tested at unit level, don't re-test in integration

---

## References

- [Martin Fowler's Testing Guide](https://martinfowler.com/testing/)
- [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Project Testing Instructions](../.github/testing.instructions.md)
