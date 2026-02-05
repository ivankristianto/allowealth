# Component Audit Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unused UI components referenced only by tests/comments, align Storybook with current atoms, and document replacements for obsolete components.

**Architecture:** This is a UI-only cleanup. Remove dead components and their stories, update regression tests and toast docs to reflect the single ToastContainer system, and add missing Storybook stories using the existing HTML-story pattern. Replacement mapping is delivered in the final response (no runtime changes required).

**Tech Stack:** Astro components, Storybook HTML stories, Bun test runner, DaisyUI/Tailwind.

---

### Task 1: Remove components referenced only by tests/comments

**Files:**

- Delete: `src/components/molecules/Toast.astro`
- Delete: `src/components/molecules/Toast.stories.ts`
- Delete: `src/components/organisms/AssetUpdateTodoList.astro`
- Delete: `src/components/organisms/AssetUpdateTodoList.stories.ts`
- Delete: `src/components/organisms/PaymentMethodConfirmModal.astro`
- Modify: `src/__tests__/review-feedback-regressions.test.ts`
- Modify: `src/lib/animations/toast.ts`
- Modify: `docs/architecture/001-toast-architecture.md`
- Modify: `design-system/02-components.md`

**Step 1: Write/update failing tests**

- Update `src/__tests__/review-feedback-regressions.test.ts` to remove checks against deleted files.

**Step 2: Run tests to verify failure (if applicable)**
Run: `bun test src/__tests__/review-feedback-regressions.test.ts`
Expected: FAIL due to stale file references.

**Step 3: Remove components and update references**

- Delete the listed component + story files.
- Update `src/lib/animations/toast.ts` to remove `@see Toast.astro` reference.
- Update toast architecture and component inventory docs to remove references to Toast.astro.

**Step 4: Run tests to verify pass**
Run: `bun test src/__tests__/review-feedback-regressions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/review-feedback-regressions.test.ts src/lib/animations/toast.ts docs/architecture/001-toast-architecture.md design-system/02-components.md
# plus deleted files
git commit -m "refactor: remove unused toast and asset update components"
```

---

### Task 2: Fix Storybook broken import

**Files:**

- Modify: `src/components/molecules/CalculatorResultCard.stories.ts`

**Step 1: Write/update failing test**

- Not applicable (Storybook stories are not unit-tested).

**Step 2: Implement minimal fix**

- Remove or correct the invalid `./Currency.astro` import.

**Step 3: Verify (manual)**

- Open Storybook and confirm the story renders.

**Step 4: Commit**

```bash
git add src/components/molecules/CalculatorResultCard.stories.ts
git commit -m "fix(storybook): remove invalid Currency import"
```

---

### Task 3: Add missing atom stories

**Files:**

- Create: `src/components/atoms/AssetSelect.stories.ts`
- Create: `src/components/atoms/CategorySelect.stories.ts`
- Create: `src/components/atoms/CurrencyInput.stories.ts`

**Step 1: Write/update failing test**

- Not applicable (Storybook stories are not unit-tested).

**Step 2: Implement stories**

- Use HTML story pattern consistent with existing atoms (helper functions + args).
- Include default, error, disabled, and sample-data states.

**Step 3: Verify (manual)**

- Open Storybook and confirm the new stories render.

**Step 4: Commit**

```bash
git add src/components/atoms/AssetSelect.stories.ts src/components/atoms/CategorySelect.stories.ts src/components/atoms/CurrencyInput.stories.ts
git commit -m "docs(storybook): add missing atom stories"
```

---

### Task 4: Report obsolete component replacements

**Files:**

- None (report in final response).

**Step 1: Map replacements**

- Identify current components/partials that supersede the obsolete ones.

**Step 2: Verify**

- Use `rg` to confirm usages and replacements.

**Step 3: Respond**

- Provide a clear mapping in the final response.
