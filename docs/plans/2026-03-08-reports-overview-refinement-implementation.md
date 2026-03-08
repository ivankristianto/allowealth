# Reports Overview Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/reports` easier to scan by shortening the intro copy and redesigning the Income sources and Expense categories preview widgets to match the design system more closely.

**Architecture:** Keep the current overview route, data flow, and partial boundaries intact. Implement the change as a presentation-only update in the Astro page and overview preview partial, and lock the new copy and layout direction with a source-based regression test that matches the existing UI-test pattern in this repo.

**Tech Stack:** Astro 5, Bun test, DaisyUI, Tailwind v4, Lucide icons

**Design Doc:** `docs/plans/2026-03-08-reports-overview-refinement-design.md`

---

## Read First

1. `docs/plans/2026-03-08-reports-overview-refinement-design.md`
2. `src/pages/reports/index.astro`
3. `src/components/partials/OverviewPreviewCardsPartial.astro`
4. `src/components/partials/OverviewSummaryCardsPartial.astro`
5. `src/__tests__/mobile-view-improvements.test.ts`
6. `.claude/rules/frontend/design-system.md`

## Guardrails

- Do not change report queries, API contracts, or URL state behavior.
- Keep currency in the global header; do not add report-local currency controls.
- Use concise, action-oriented copy.
- Use DaisyUI semantic classes and explicit button rounding from the design system.
- Reuse the existing `data-testid` hooks unless a rename is necessary.
- Prefer a source-based regression test for this UI-only change instead of introducing a heavier rendering harness.

---

## Task 1: Add a failing regression test for the new overview copy and widget structure

**Files:**
- Create: `src/__tests__/reports-overview-refinement.test.ts`
- Reference: `src/__tests__/mobile-view-improvements.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/reports-overview-refinement.test.ts` with the same `readFileSync(join(process.cwd(), ...))` helper pattern used in `src/__tests__/mobile-view-improvements.test.ts`.

Add assertions like:

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('reports overview refinement', () => {
  it('uses a short intro card on the overview page', () => {
    const reportsPage = read('src/pages/reports/index.astro');

    expect(reportsPage).toContain(
      'Review this period at a glance, then open Income or Expenses for the full breakdown.'
    );
    expect(reportsPage).not.toContain('How to use this page');
    expect(reportsPage).not.toContain('1. Check coverage');
  });

  it('uses concise preview card copy and direct CTA labels', () => {
    const previews = read('src/components/partials/OverviewPreviewCardsPartial.astro');

    expect(previews).toContain('See the largest income sources for the selected period.');
    expect(previews).toContain('See the spending categories with the biggest impact.');
    expect(previews).toContain('View income breakdown');
    expect(previews).toContain('View expense breakdown');
    expect(previews).not.toContain('for deeper investigation');
    expect(previews).not.toContain('so you can immediately see');
  });
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bun test src/__tests__/reports-overview-refinement.test.ts
```

Expected: FAIL because the current page still contains the long helper copy and the old widget descriptions/CTA labels.

**Step 3: Commit the failing test**

```bash
git add src/__tests__/reports-overview-refinement.test.ts
git commit -m $'test(reports): capture overview refinement expectations\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 2: Replace the long helper block with a short intro card

**Files:**
- Modify: `src/pages/reports/index.astro`
- Test: `src/__tests__/reports-overview-refinement.test.ts`

**Step 1: Remove the old instructional layout**

Delete the current multi-paragraph helper structure:

- the `Info` icon import
- the “How to use this page” eyebrow
- the numbered three-column checklist

**Step 2: Implement the compact intro card**

Replace the existing helper section with a smaller card body, for example:

```astro
<section
  class="card border border-base-300 bg-base-100 shadow-sm"
  data-testid="reports-overview-guide"
>
  <div class="card-body p-4 sm:p-5">
    <p class="text-sm leading-6 text-base-content/70 sm:text-base">
      Review this period at a glance, then open Income or Expenses for the full breakdown.
    </p>
  </div>
</section>
```

Keep the section in the same place on the page so the overall flow remains:

1. section nav
2. short intro
3. summary cards
4. chart
5. preview widgets

**Step 3: Run the regression test**

Run:

```bash
bun test src/__tests__/reports-overview-refinement.test.ts
```

Expected: the intro-card assertion passes, but the preview-card assertion still fails.

**Step 4: Commit**

```bash
git add src/pages/reports/index.astro src/__tests__/reports-overview-refinement.test.ts
git commit -m $'feat(reports): simplify overview intro copy\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 3: Redesign the income and expense preview widgets as standard report cards

**Files:**
- Modify: `src/components/partials/OverviewPreviewCardsPartial.astro`
- Reference: `src/components/partials/OverviewSummaryCardsPartial.astro`
- Test: `src/__tests__/reports-overview-refinement.test.ts`

**Step 1: Keep one shared structure for both cards**

Refactor the two preview cards so they use the same layout pattern:

- card shell: `card border border-base-300 bg-base-100 shadow-sm`
- header row with icon + title on the left
- one short description line under the title
- compact total block on the right at `sm+`
- ranked list with subtle dividers
- direct CTA button at the bottom

**Step 2: Tighten the copy**

Use the approved wording:

```ts
Income:
- title: 'Income sources'
- description: 'See the largest income sources for the selected period.'
- total label: 'Total income'
- CTA: 'View income breakdown'

Expenses:
- title: 'Expense categories'
- description: 'See the spending categories with the biggest impact.'
- total label: 'Total expenses'
- CTA: 'View expense breakdown'
```

**Step 3: Normalize the card styling**

Update the widget markup so the total block and ranked rows feel less bespoke. Use visible but subtle surfaces such as:

```astro
<div class="rounded-2xl border border-base-200 bg-base-200/60 px-4 py-3">
```

and preserve explicit button rounding:

```astro
class="btn btn-outline btn-sm gap-2 rounded-lg sm:rounded-xl"
```

Keep the current sorting, share calculation, empty states, and destination URLs unchanged.

**Step 4: Run the regression test again**

Run:

```bash
bun test src/__tests__/reports-overview-refinement.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/partials/OverviewPreviewCardsPartial.astro src/__tests__/reports-overview-refinement.test.ts
git commit -m $'feat(reports): refine overview preview cards\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 4: Run project checks and do final verification

**Files:**
- Modify if needed: `src/pages/reports/index.astro`
- Modify if needed: `src/components/partials/OverviewPreviewCardsPartial.astro`
- Test: `src/__tests__/reports-overview-refinement.test.ts`

**Step 1: Run the targeted test plus core checks**

Run:

```bash
bun test src/__tests__/reports-overview-refinement.test.ts
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Expected:

- the targeted test passes
- lint/style/format complete without new issues
- typecheck reports zero diagnostics
- build succeeds

**Step 2: Visually verify `/reports`**

Run:

```bash
bun run dev
```

Then open `/reports` and verify:

- the intro is one short sentence
- the two preview widgets feel like standard product cards
- spacing and dividers look balanced on desktop and mobile
- CTA labels are direct and easy to scan

**Step 3: Final commit**

```bash
git add src/pages/reports/index.astro src/components/partials/OverviewPreviewCardsPartial.astro src/__tests__/reports-overview-refinement.test.ts
git commit -m $'feat(reports): tighten overview copy and card design\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```
