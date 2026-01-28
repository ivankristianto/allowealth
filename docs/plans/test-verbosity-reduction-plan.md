# Test Verbosity Reduction Plan

**Version:** 2.1.0
**Date:** 2026-01-28
**Status:** Wave 1 Complete - Ready for Wave 2

## Executive Summary

This plan removes **1,458 non-functional assertions** (`expect(true).toBe(true)`) across **39 behavior test files**. Before deletion, valuable design system documentation is extracted to Storybook stories. The plan uses **parallel agent execution** across 3 waves.

## Current State

| Metric                    | Count | Issue                               |
| ------------------------- | ----- | ----------------------------------- |
| Total test files          | 484   | -                                   |
| `.behavior.test.ts` files | 39    | Documentation masquerading as tests |
| `expect(true).toBe(true)` | 1,458 | Zero regression protection          |
| Shared mock utilities     | 1     | Insufficient infrastructure         |
| Timing-based tests        | ~3    | Flaky, slow execution               |

## Target State

| Metric                    | Before | After | Change      |
| ------------------------- | ------ | ----- | ----------- |
| Test files                | 484    | ~445  | -39 files   |
| `expect(true).toBe(true)` | 1,458  | 0     | -100%       |
| Shared mock files         | 1      | 2     | +1 file     |
| Stories with docs         | ~10    | ~47   | +37 files   |
| Timing-based tests        | ~3     | 0     | Fake timers |

## Parallel Execution Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL EXECUTION WAVES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WAVE 1 (Parallel - No Dependencies)                                       │
│  ├── Agent A: Create src/__tests__/mocks/browser.ts                        │
│  ├── Agent B: Extract docs → atoms/*.stories.ts (5 behavior files)         │
│  ├── Agent C: Extract docs → molecules/*.stories.ts (16 behavior files)    │
│  ├── Agent D: Extract docs → organisms/*.stories.ts (7 behavior files)     │
│  └── Agent E: Extract docs → layouts + pages stories (9 behavior files)    │
│                                                                             │
│  WAVE 2 (Parallel - Depends on Wave 1)                                     │
│  ├── Agent F: Delete all *.behavior.test.ts files (39 files)               │
│  ├── Agent G: Refactor toastStore.test.ts (fake timers + shared mocks)     │
│  └── Agent H: Refactor other timing-based tests                            │
│                                                                             │
│  WAVE 3 (Sequential - Verification)                                        │
│  └── Single agent: bun test, verify metrics, cleanup tsconfig              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dependency Graph

```
Wave 1 (all parallel, no deps)
    │
    ├── [A] browser.ts ────────────────┐
    ├── [B] atoms docs extraction      │
    ├── [C] molecules docs extraction  │
    ├── [D] organisms docs extraction  ├──► Wave 2
    └── [E] layouts+pages docs         │
                                       │
Wave 2 (parallel, depends on Wave 1)   │
    │                                  │
    ├── [F] delete behavior files ◄────┘ (needs B,C,D,E done)
    ├── [G] toastStore refactor ◄──────── (needs A done)
    └── [H] other timing tests ◄───────── (needs A done)
                                       │
Wave 3 (sequential)                    │
    └── [I] verification ◄─────────────┘
```

## Agent Task Definitions

| Agent | Wave | Task                       | Input             | Output                           |
| ----- | ---- | -------------------------- | ----------------- | -------------------------------- |
| A     | 1    | Create browser mocks       | Plan spec         | `src/__tests__/mocks/browser.ts` |
| B     | 1    | Extract atoms docs         | 5 behavior files  | 5 modified stories               |
| C     | 1    | Extract molecules docs     | 16 behavior files | 16 modified stories              |
| D     | 1    | Extract organisms docs     | 7 behavior files  | 7 modified stories               |
| E     | 1    | Extract layouts+pages docs | 9 behavior files  | 9 modified stories               |
| F     | 2    | Delete behavior files      | File list         | 39 files deleted                 |
| G     | 2    | Refactor toastStore        | browser.ts        | Updated test file                |
| H     | 2    | Refactor timing tests      | browser.ts        | Updated test files               |
| I     | 3    | Verify & cleanup           | All above         | Metrics report                   |

## File Structure Changes

```
src/
├── __tests__/
│   └── mocks/
│       └── browser.ts                  # CREATE: ~50 LOC
│
├── components/
│   ├── atoms/
│   │   ├── Input.stories.ts            # MODIFY: +docs.description
│   │   ├── Card.stories.ts             # MODIFY: +docs.description
│   │   ├── Badge.stories.ts            # MODIFY: +docs.description
│   │   ├── ErrorMessage.stories.ts     # MODIFY: +docs.description
│   │   └── PasswordField.stories.ts    # MODIFY: +docs.description
│   ├── molecules/                      # MODIFY: 16 stories
│   ├── organisms/                      # MODIFY: 7 stories
│   └── layouts/                        # MODIFY: 3 stories
│
└── lib/
    └── stores/
        └── toastStore.test.ts          # MODIFY: fake timers + shared mocks

DELETE: 39 *.behavior.test.ts files
MODIFY: ~37 *.stories.ts files
CREATE: 1 file (browser.ts)
```

## Wave 1 Specifications

### Agent A: Create Browser Mocks

Created `src/__tests__/mocks/browser.ts` with consistent API across all mocks:

- `install()` - Install the mock (preserves original)
- `reset()` - Reset internal state
- `uninstall()` - Restore original global

```typescript
// See actual implementation in src/__tests__/mocks/browser.ts
// Key exports:
export function createMockCrypto(): {
  install: () => void;
  reset: () => void;
  uninstall: () => void;
};

export function createMockLocalStorage(): {
  install: () => void;
  reset: () => void;
  uninstall: () => void;
  getStore: () => Record<string, string>;
};

export function createMockMatchMedia(prefersDark?: boolean): {
  install: () => void;
  reset: () => void;
  uninstall: () => void;
};
```

### Agents B-E: Extract Documentation to Storybook

**Pattern for docs extraction:**

Read behavior test file → Extract design specs → Add to story's `parameters.docs.description`.

**Example transformation:**

```typescript
// Before: Input.behavior.test.ts (deleted after extraction)
// Contains: height specs, padding, font size, accessibility notes

// After: Input.stories.ts
const meta: Meta = {
  title: 'Atoms/Input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Height | 40px | \`h-10\` |
| Padding | 0.5rem 2.5rem 0.5rem 0.75rem | \`pt-2 pb-2 pl-3 pr-10\` |
| Font size | 12px | \`text-xs\` |
| Background | Theme-aware | \`bg-base-200\` |
| Border radius | DaisyUI token | \`--radius-field\` |
| Focus ring | 2px accent | \`focus:ring-2 focus:ring-accent\` |

### Accessibility
- \`aria-invalid\` for error state
- \`aria-describedby\` links to error message
- Error messages use \`role="alert"\`
- Label association via \`htmlFor\`
        `,
      },
    },
  },
};
```

### Behavior Files by Agent

**Agent B (atoms - 5 files):**

- `Input.behavior.test.ts` → `Input.stories.ts`
- `Card.behavior.test.ts` → `Card.stories.ts`
- `Badge.behavior.test.ts` → `Badge.stories.ts`
- `ErrorMessage.behavior.test.ts` → `ErrorMessage.stories.ts`
- `PasswordField.behavior.test.ts` → `PasswordField.stories.ts`

**Agent C (molecules - 16 files):**

- `AuthValidationMessages.behavior.test.ts`
- `ForgotPasswordForm.behavior.test.ts`
- `LoginForm.behavior.test.ts`
- `RegistrationForm.behavior.test.ts`
- `BudgetHealthWidget.behavior.test.ts`
- `Toast.behavior.test.ts`
- `ToastContainer.behavior.test.ts`
- `Modal.behavior.test.ts`
- `QuickActions.behavior.test.ts`
- `PasswordChangeForm.behavior.test.ts`
- `CalculatorResultCard.behavior.test.ts`
- `GrowthScheduleTable.behavior.test.ts`
- `TabSwitcher.behavior.test.ts`
- `CSVImportForm.behavior.test.ts`
- `TransactionFilters.behavior.test.ts`
- `TransactionForm.behavior.test.ts`

**Agent D (organisms - 7 files):**

- `BudgetHistoryComparison.behavior.test.ts`
- `DashboardError.behavior.test.ts`
- `AssetUpdateTodoList.behavior.test.ts`
- `SummaryCards.behavior.test.ts`
- `RecentTransactionsList.behavior.test.ts`
- `TransactionList.behavior.test.ts`
- `TransactionModal.behavior.test.ts`

**Agent E (layouts + pages - 9 files):**

- `Header.behavior.test.ts`
- `Navigation.behavior.test.ts`
- `UserProfile.behavior.test.ts`
- `history.behavior.test.ts` (budget)
- `index.behavior.test.ts` (budget)
- `export.behavior.test.ts` (transactions)
- `import.behavior.test.ts` (transactions)
- `categories.behavior.test.ts`
- `register.behavior.test.ts`
- `dashboard.behavior.test.ts`

## Wave 2 Specifications

### Agent F: Delete Behavior Files

```bash
# Delete all behavior test files
find src -name "*.behavior.test.ts" -type f -delete

# Verify deletion
find src -name "*.behavior.test.ts" | wc -l  # Should be 0
```

### Agent G: Refactor toastStore.test.ts

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
    mock.setSystemTime(new Date('2026-01-28T00:00:00Z'));
  });

  afterEach(() => {
    toasts.set([]);
    mock.restore();
  });

  it('should auto-dismiss toasts with duration > 0', () => {
    addToast('Auto-dismiss', 'success', { duration: 100 });
    expect(toasts.get()).toHaveLength(1);

    mock.advanceTimersByTime(150);

    expect(toasts.get()).toHaveLength(0);
  });
});
```

### Agent H: Refactor Other Timing Tests

Search and refactor:

```bash
grep -r "setTimeout" src/**/*.test.ts --include="*.test.ts"
```

Apply same fake timer pattern as Agent G.

## Wave 3 Specifications

### Agent I: Verification

```bash
# 1. Run all tests
bun test

# 2. Verify no behavior tests remain
find src -name "*.behavior.test.ts" | wc -l  # Should be 0

# 3. Verify expect(true).toBe(true) eliminated
grep -r "expect(true).toBe(true)" src/ | wc -l  # Should be 0

# 4. Verify shared mocks exist
ls src/__tests__/mocks/browser.ts  # Should exist

# 5. Update tsconfig.json - remove behavior test exclusion
# Line to remove: "src/**/*.behavior.test.ts" from exclude array
```

## Security Considerations

| Risk                    | Severity | Mitigation                             |
| ----------------------- | -------- | -------------------------------------- |
| Mock file in production | Low      | `__tests__/` excluded from Astro build |
| Docs exposure           | None     | Storybook is dev-only                  |
| Test credential leaks   | Low      | Using fake data (`test@example.com`)   |

## Success Metrics

| Metric                    | Before | Target | Verification   |
| ------------------------- | ------ | ------ | -------------- |
| `expect(true).toBe(true)` | 1,458  | 0      | `grep -r`      |
| `.behavior.test.ts` files | 39     | 0      | `find` command |
| Stories with docs         | ~10    | ~47    | Manual count   |
| Timing-based tests        | ~3     | 0      | Code review    |
| Test execution time       | ~5s    | <3s    | `bun test`     |

## Dependencies

| Dependency               | Type            | Status          |
| ------------------------ | --------------- | --------------- |
| `bun:test`               | Built-in        | Available       |
| `bun:test` mock API      | Built-in        | Available       |
| `@/__tests__` path alias | tsconfig        | Works via `@/*` |
| Storybook autodocs       | Already enabled | Available       |

## Execution Progress

### Wave 1 Results (Completed 2026-01-28)

| Agent | Task                       | Status      | Output                                                            |
| ----- | -------------------------- | ----------- | ----------------------------------------------------------------- |
| A     | Create browser mocks       | ✅ Complete | 1 file created with `install()`, `reset()`, `uninstall()` methods |
| B     | Extract atoms docs         | ✅ Complete | 5 files modified                                                  |
| C     | Extract molecules docs     | ✅ Complete | 9 files modified, 7 files created                                 |
| D     | Extract organisms docs     | ✅ Complete | 5 files modified, 2 files created                                 |
| E     | Extract layouts+pages docs | ✅ Complete | 2 files modified, 8 files created                                 |

**Quality Gates:**

- ESLint: ✅ Pass
- Stylelint: ✅ Pass
- Prettier: ✅ Pass
- TypeScript: ✅ 0 errors
- Tests: ✅ 3,459 pass, 0 fail

**Code Review Findings (Resolved):**

- P0: Input.stories.ts aria-describedby linkage - Fixed
- P0: TransactionList.stories.ts XSS pattern - Fixed (textContent)
- P1: browser.ts missing reset/uninstall - Fixed
- P1: Label-input association - Fixed
- P1: alert() usage - Fixed (console.log)

**Remaining TODOs (P2/P3):**

- Badge.stories.ts: Consolidate duplicate stories
- Modal.stories.ts: Replace inline onclick
- DashboardPage.stories.ts: Add more story variants
- browser.ts: Bounds check for key() method

## Execution Checklist

### Wave 1

- [x] [A] Create `src/__tests__/mocks/browser.ts`
- [x] [B] Extract atoms docs to stories (5 files)
- [x] [C] Extract molecules docs to stories (16 files)
- [x] [D] Extract organisms docs to stories (7 files)
- [x] [E] Extract layouts+pages docs to stories (10 files)

### Wave 2

- [ ] [F] Delete all 39 `.behavior.test.ts` files
- [ ] [G] Refactor `toastStore.test.ts` with fake timers
- [ ] [H] Refactor other timing-based tests

### Wave 3

- [ ] [I] Run `bun test` - all tests pass
- [ ] [I] Verify metrics meet targets
- [ ] [I] Remove `*.behavior.test.ts` from tsconfig exclude
- [ ] [I] Commit changes
