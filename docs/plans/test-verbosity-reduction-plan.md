# Test Verbosity Reduction Plan

**Version:** 1.0.0
**Date:** 2026-01-27
**Status:** Draft

## Executive Summary

This document outlines the plan to reduce verbosity in the unit test suite. Analysis reveals **1,458 non-functional assertions** (`expect(true).toBe(true)`) across **39 behavior test files** that provide zero regression protection. Additionally, timing-based tests create flakiness and shared mock infrastructure is missing. This plan removes fake tests, introduces mock utilities, and replaces real timers with fake timers.

## Background

### Current State

Test suite analysis from `bun test` reveals:

| Metric                    | Count | Issue                               |
| ------------------------- | ----- | ----------------------------------- |
| Total test files          | 484   | -                                   |
| `.behavior.test.ts` files | 39    | Documentation masquerading as tests |
| `expect(true).toBe(true)` | 1,458 | Zero regression protection          |
| Shared mock utilities     | 1     | Insufficient infrastructure         |
| Timing-based tests        | ~3    | Flaky, slow execution               |

### Key Issues Identified

1. **Non-Functional Behavior Tests** - 39 files contain tests that only assert `expect(true).toBe(true)`. These inflate test counts but catch zero regressions. Example from `Input.behavior.test.ts`:

```typescript
test('should use h-10 (2.5rem/40px) for input height', () => {
  // Matches styles.json specification: height: "2.5rem"
  expect(true).toBe(true); // ← Provides no actual validation
});
```

2. **Repetitive Mock Setup** - Browser API mocks (`crypto.randomUUID`, `localStorage`, `matchMedia`) are duplicated across test files:

```typescript
// Duplicated in toastStore.test.ts, ThemeToggle.test.ts, etc.
function mockRandomUUID(): string {
  const parts = mockUuid.split('-');
  const counter = String(uuidCounter++).padStart(12, '0');
  return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${counter}`;
}
```

3. **Timing-Based Tests** - Tests use real `setTimeout` causing slow and flaky execution:

```typescript
// From toastStore.test.ts - waits 150ms real time
it('should auto-dismiss toasts with duration > 0', async () => {
  addToast('Auto-dismiss', 'success', { duration: 100 });
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(toasts.get()).toHaveLength(0);
});
```

4. **Limited Test Utilities** - Only one utility file exists (`budget-health-test-utils.ts`) with narrow scope.

### Target State

After refactoring:

| Metric                    | Before | After | Change                    |
| ------------------------- | ------ | ----- | ------------------------- |
| Test files                | 484    | ~445  | -39 files                 |
| `expect(true).toBe(true)` | 1,458  | 0     | -100%                     |
| Shared mock utilities     | 1      | 2     | +1 file                   |
| Timing-based tests        | ~3     | 0     | Replaced with fake timers |
| Test execution time       | ~5s    | ~3s   | ~40% faster               |

## Technical Architecture

### Mock Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CURRENT (Scattered Mocks)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ toastStore.test  │  │ ThemeToggle.test │  │ filtersStore.test│      │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │      │
│  │ │mockRandomUUID│ │  │ │mockMatchMedia│ │  │ │mockLocalStore│ │      │
│  │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                         │
│  Problem: Same mocks duplicated, no shared infrastructure               │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                      TARGET (Centralized Mocks)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                 src/__tests__/mocks/browser.ts                │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │      │
│  │  │mockCrypto()│  │mockStorage│  │mockMatchMedia(matches)  │  │      │
│  │  └────────────┘  └────────────┘  └────────────────────────┘  │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│              ┌───────────────┼───────────────┐                         │
│              ▼               ▼               ▼                         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐       │
│  │ toastStore.test  │ │ ThemeToggle.test │ │ filtersStore.test│       │
│  │ import { mock* } │ │ import { mock* } │ │ import { mock* } │       │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘       │
│                                                                         │
│  Benefit: Single source of truth, consistent behavior                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fake Timers Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CURRENT (Real Timers)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  test('auto-dismiss', async () => {                                     │
│    addToast('msg', 'success', { duration: 100 });                       │
│    await new Promise(r => setTimeout(r, 150));  // Real 150ms wait     │
│    expect(toasts.get()).toHaveLength(0);                                │
│  });                                                                    │
│                                                                         │
│  Problems: Slow (150ms real time), flaky on CI                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                    TARGET (Fake Timers)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  import { mock } from 'bun:test';                                       │
│                                                                         │
│  beforeEach(() => mock.setSystemTime(new Date('2026-01-27')));          │
│  afterEach(() => mock.restore());                                       │
│                                                                         │
│  test('auto-dismiss', () => {                                           │
│    addToast('msg', 'success', { duration: 100 });                       │
│    mock.advanceTimersByTime(150);  // Instant, deterministic            │
│    expect(toasts.get()).toHaveLength(0);                                │
│  });                                                                    │
│                                                                         │
│  Benefits: Fast (instant), deterministic, no flakiness                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Structure Changes

```
src/
├── __tests__/                          # NEW: Shared test infrastructure
│   └── mocks/
│       └── browser.ts                  # NEW: Browser API mocks (~50 LOC)
│
├── components/
│   ├── atoms/
│   │   ├── Input.behavior.test.ts      # DELETE (71 assertions)
│   │   ├── Card.behavior.test.ts       # DELETE (46 assertions)
│   │   ├── Badge.behavior.test.ts      # DELETE
│   │   ├── ErrorMessage.behavior.test.ts # DELETE (52 assertions)
│   │   └── PasswordField.behavior.test.ts # DELETE (4 assertions)
│   ├── molecules/
│   │   ├── AuthValidationMessages.behavior.test.ts  # DELETE
│   │   ├── ForgotPasswordForm.behavior.test.ts      # DELETE
│   │   ├── LoginForm.behavior.test.ts               # DELETE
│   │   ├── RegistrationForm.behavior.test.ts        # DELETE
│   │   ├── BudgetHealthWidget.behavior.test.ts      # DELETE
│   │   ├── Toast.behavior.test.ts                   # DELETE
│   │   ├── ToastContainer.behavior.test.ts          # DELETE
│   │   ├── Modal.behavior.test.ts                   # DELETE
│   │   ├── QuickActions.behavior.test.ts            # DELETE
│   │   ├── PasswordChangeForm.behavior.test.ts      # DELETE
│   │   ├── CalculatorResultCard.behavior.test.ts    # DELETE
│   │   ├── GrowthScheduleTable.behavior.test.ts     # DELETE
│   │   ├── TabSwitcher.behavior.test.ts             # DELETE
│   │   ├── CSVImportForm.behavior.test.ts           # DELETE
│   │   ├── TransactionFilters.behavior.test.ts      # DELETE
│   │   └── TransactionForm.behavior.test.ts         # DELETE
│   ├── organisms/
│   │   ├── BudgetHistoryComparison.behavior.test.ts # DELETE
│   │   ├── DashboardError.behavior.test.ts          # DELETE
│   │   ├── AssetUpdateTodoList.behavior.test.ts     # DELETE
│   │   ├── SummaryCards.behavior.test.ts            # DELETE
│   │   ├── RecentTransactionsList.behavior.test.ts  # DELETE
│   │   ├── TransactionList.behavior.test.ts         # DELETE
│   │   └── TransactionModal.behavior.test.ts        # DELETE
│   └── layouts/
│       ├── Header.behavior.test.ts                  # DELETE
│       ├── Navigation.behavior.test.ts              # DELETE
│       └── UserProfile.behavior.test.ts             # DELETE
│
├── pages/
│   ├── budget/
│   │   ├── history.behavior.test.ts                 # DELETE
│   │   └── index.behavior.test.ts                   # DELETE
│   ├── transactions/
│   │   ├── export.behavior.test.ts                  # DELETE
│   │   └── import.behavior.test.ts                  # DELETE
│   ├── categories/
│   │   └── categories.behavior.test.ts              # DELETE
│   ├── register.behavior.test.ts                    # DELETE
│   └── dashboard.behavior.test.ts                   # DELETE
│
└── lib/
    └── stores/
        └── toastStore.test.ts                       # REFACTOR: Use fake timers
```

## Implementation Plan

### Phase 1: Create Mock Infrastructure (Priority: High)

**Estimated Effort:** ~50 LOC

#### Step 1.1: Create Browser Mocks Module

Create `src/__tests__/mocks/browser.ts`:

```typescript
/**
 * Browser API Mocks
 *
 * Shared mock utilities for testing code that depends on browser APIs.
 * Import these in test files to avoid duplicating mock implementations.
 */

/**
 * Creates a deterministic UUID generator for testing.
 * Returns UUIDs in format: 00000000-0000-0000-0000-000000000001
 */
export function createMockCrypto() {
  let counter = 0;

  const mockRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
    const id = String(counter++).padStart(12, '0');
    return `00000000-0000-0000-0000-${id}`;
  };

  return {
    install: () => {
      globalThis.crypto = {
        ...globalThis.crypto,
        randomUUID: mockRandomUUID,
      } as Crypto;
    },
    reset: () => {
      counter = 0;
    },
  };
}

/**
 * Creates an in-memory localStorage mock.
 */
export function createMockLocalStorage() {
  let store: Record<string, string> = {};

  return {
    install: () => {
      globalThis.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null,
      };
    },
    reset: () => {
      store = {};
    },
    getStore: () => ({ ...store }),
  };
}

/**
 * Creates a matchMedia mock for theme testing.
 */
export function createMockMatchMedia(prefersDark = false) {
  return {
    install: () => {
      globalThis.matchMedia = (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
    },
  };
}
```

### Phase 2: Delete Non-Functional Tests (Priority: High)

**Estimated Impact:** -1,458 fake assertions, -39 files

#### Step 2.1: Remove Behavior Test Files

Delete all 39 `.behavior.test.ts` files listed in the file structure above.

**Verification:**

```bash
# Before deletion - count behavior test files
find src -name "*.behavior.test.ts" | wc -l  # Should be 39

# After deletion - verify none remain
find src -name "*.behavior.test.ts" | wc -l  # Should be 0

# Verify expect(true).toBe(true) is eliminated
grep -r "expect(true).toBe(true)" src/ | wc -l  # Should be ~0
```

### Phase 3: Refactor Timing-Based Tests (Priority: Medium)

**Estimated Impact:** Faster, deterministic tests

#### Step 3.1: Update toastStore.test.ts

Refactor timing-based tests to use Bun's mock timers:

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { createMockCrypto } from '@/__tests__/mocks/browser';
import { toasts, addToast, removeToast } from './toastStore';

const mockCrypto = createMockCrypto();

describe('toastStore', () => {
  beforeEach(() => {
    toasts.set([]);
    mockCrypto.reset();
    mockCrypto.install();
    mock.setSystemTime(new Date('2026-01-27T00:00:00Z'));
  });

  afterEach(() => {
    toasts.set([]);
    mock.restore();
  });

  it('should auto-dismiss toasts with duration > 0', () => {
    addToast('Auto-dismiss', 'success', { duration: 100 });
    expect(toasts.get()).toHaveLength(1);

    // Advance timers instantly - no real waiting
    mock.advanceTimersByTime(150);

    expect(toasts.get()).toHaveLength(0);
  });

  it('should not auto-dismiss persistent toasts (duration = 0)', () => {
    addToast('Persistent error', 'error'); // Error has default duration 0
    expect(toasts.get()).toHaveLength(1);

    mock.advanceTimersByTime(10000); // Even after 10 seconds

    expect(toasts.get()).toHaveLength(1); // Still there
  });
});
```

#### Step 3.2: Update Other Timing-Dependent Tests

Search for other files using `setTimeout` in tests:

```bash
grep -r "setTimeout" src/**/*.test.ts
```

Apply same fake timer pattern.

### Phase 4: Update Existing Tests to Use Shared Mocks (Priority: Low)

#### Step 4.1: Refactor Tests Using Duplicated Mocks

Files to update:

- `src/lib/stores/toastStore.test.ts` - Use `createMockCrypto()`
- `src/components/atoms/ThemeToggle.test.ts` - Use `createMockMatchMedia()`
- Any other files with inline browser mocks

## Implementation Checklist

### Phase 1: Mock Infrastructure

- [ ] Create `src/__tests__/mocks/browser.ts`
- [ ] Export `createMockCrypto()`
- [ ] Export `createMockLocalStorage()`
- [ ] Export `createMockMatchMedia()`
- [ ] Verify imports work from test files

### Phase 2: Delete Non-Functional Tests

- [ ] Delete `src/components/atoms/*.behavior.test.ts` (5 files)
- [ ] Delete `src/components/molecules/*.behavior.test.ts` (16 files)
- [ ] Delete `src/components/organisms/*.behavior.test.ts` (7 files)
- [ ] Delete `src/components/layouts/*.behavior.test.ts` (3 files)
- [ ] Delete `src/pages/**/*.behavior.test.ts` (6 files)
- [ ] Delete `.storybook/*.behavior.test.ts` if any
- [ ] Run `bun test` to verify no regressions
- [ ] Verify `expect(true).toBe(true)` count is ~0

### Phase 3: Refactor Timing Tests

- [ ] Update `toastStore.test.ts` to use fake timers
- [ ] Search for other `setTimeout` usage in tests
- [ ] Refactor any found timing-based tests
- [ ] Verify all tests pass with `bun test`

### Phase 4: Shared Mock Adoption

- [ ] Update `toastStore.test.ts` to import from `@/__tests__/mocks/browser`
- [ ] Update `ThemeToggle.test.ts` to import shared mocks
- [ ] Remove inline mock definitions from updated files
- [ ] Verify tests still pass

## Success Metrics

| Metric                          | Before | Target | Verification   |
| ------------------------------- | ------ | ------ | -------------- |
| `expect(true).toBe(true)` count | 1,458  | 0      | `grep -r`      |
| `.behavior.test.ts` files       | 39     | 0      | `find` command |
| Timing-based tests              | ~3     | 0      | Code review    |
| Shared mock files               | 1      | 2      | File count     |
| Test execution time             | ~5s    | <3s    | `bun test`     |

## Security Considerations

| Risk                              | Mitigation                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| Test files included in production | Verify `.test.ts` exclusion in `tsconfig.json` and build config    |
| Mocks leaking into production     | Keep mocks in `__tests__/` directory, never import from `src/lib/` |
| Credential exposure in test data  | Use obviously fake data (`test@example.com`, `password123`)        |

## Risks and Mitigations

| Risk                                   | Impact | Mitigation                                                    |
| -------------------------------------- | ------ | ------------------------------------------------------------- |
| Documentation loss from behavior tests | Low    | Key specs are in component comments and design system docs    |
| Coverage metrics appear to drop        | Low    | True coverage more accurate; fake assertions inflated numbers |
| Fake timer edge cases                  | Medium | Test thoroughly; fall back to real timers if issues arise     |
| Import path changes break tests        | Low    | Use TypeScript path aliases consistently                      |

## Dependencies

| Dependency      | Type     | Purpose                                              |
| --------------- | -------- | ---------------------------------------------------- |
| `bun:test`      | Built-in | Testing framework (already in use)                   |
| `bun:test` mock | Built-in | `mock.setSystemTime()`, `mock.advanceTimersByTime()` |
| No new packages | -        | Bun provides all needed mocking capabilities         |

## References

- [Bun Test Runner Documentation](https://bun.sh/docs/cli/test)
- [Bun Mock Documentation](https://bun.sh/docs/test/mocks)
- [Testing Best Practices](https://kentcdodds.com/blog/write-tests)
