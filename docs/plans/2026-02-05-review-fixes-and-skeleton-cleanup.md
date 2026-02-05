# Review Fixes and Skeleton Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove remaining loading-state `animate-pulse` regressions and enforce review fixes with tests, then verify and commit.

**Architecture:** Add targeted regression tests that fail on remaining `animate-pulse` loading placeholders, then replace those placeholders with the shared Skeleton atom. Verify period-change constant usage and modal behavior via existing tests. Run local quality gates before commit.

**Tech Stack:** Astro 5, Bun, bun:test, DaisyUI, shared Skeleton atom.

### Task 1: Add regression tests for remaining `animate-pulse` loading placeholders

**Files:**

- Modify: `src/__tests__/review-feedback-regressions.test.ts`

**Step 1: Write the failing test**

```typescript
it('loading placeholders should not use animate-pulse in remaining components', () => {
  const files = [
    'src/components/organisms/AssetUpdateTodoList.astro',
    'src/components/molecules/RecentTransactionsList.astro',
    'src/components/molecules/TransactionCard.astro',
  ];

  files.forEach((path) => {
    const content = read(path);
    expect(content).not.toContain('animate-pulse');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/review-feedback-regressions.test.ts`

Expected: FAIL because the files still contain `animate-pulse`.

### Task 2: Replace remaining `animate-pulse` loading placeholders with Skeleton

**Files:**

- Modify: `src/components/organisms/AssetUpdateTodoList.astro`
- Modify: `src/components/molecules/RecentTransactionsList.astro`
- Modify: `src/components/molecules/TransactionCard.astro`

**Step 1: Write minimal implementation**

- Import `Skeleton` from `@/components/atoms/Skeleton.astro` in each file.
- Replace `animate-pulse` containers with Skeleton rectangles/circles that match the existing layout.
- Remove `loading && 'animate-pulse'` from `TransactionCard` classes (use Skeleton for loading state only).

**Step 2: Run test to verify it passes**

Run: `bun test src/__tests__/review-feedback-regressions.test.ts`

Expected: PASS.

### Task 3: Verification and commit

**Files:**

- Modified files from Tasks 1-2.

**Step 1: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass.

**Step 2: Commit**

```bash
git add src/__tests__/review-feedback-regressions.test.ts \
  src/components/organisms/AssetUpdateTodoList.astro \
  src/components/molecules/RecentTransactionsList.astro \
  src/components/molecules/TransactionCard.astro

git commit -m "fix: replace remaining loading pulses"
```
