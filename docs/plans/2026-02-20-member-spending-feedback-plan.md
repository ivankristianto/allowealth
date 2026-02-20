# Member Spending Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 feedback items: rename "Family" stat labels, add breadcrumb navigation replacing header slot nav, and fix CategoryDrillDown button on member spending page.

**Architecture:** Pure UI changes — new Breadcrumb atom component, edits to two page files. No service/API changes.

**Tech Stack:** Astro components, DaisyUI `breadcrumbs` class, client-side event delegation.

**Design doc:** `docs/plans/2026-02-20-member-spending-feedback-design.md`

---

### Task 1: Create Breadcrumb atom component

**Files:**

- Create: `src/components/atoms/Breadcrumb.astro`

**Step 1: Create the component**

```astro
---
/**
 * Breadcrumb Component (Atom)
 *
 * Reusable breadcrumb navigation using DaisyUI's `breadcrumbs` class.
 * Last item renders as plain text (current page), all others as links.
 *
 * @example
 * <Breadcrumb items={[
 *   { label: "Reports", href: "/reports" },
 *   { label: "Member Spending" }
 * ]} />
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface Props {
  items: BreadcrumbItem[];
}

const { items } = Astro.props;
---

<nav aria-label="Breadcrumb">
  <div class="breadcrumbs text-sm">
    <ul>
      {
        items.map((item) => (
          <li>{item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}</li>
        ))
      }
    </ul>
  </div>
</nav>
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS (no errors related to Breadcrumb)

**Step 3: Commit**

```bash
git add src/components/atoms/Breadcrumb.astro
git commit -m "feat(ui): add reusable Breadcrumb atom component"
```

---

### Task 2: Update reports page — breadcrumb replaces header nav

**Files:**

- Modify: `src/pages/reports/index.astro`

**Step 1: Update imports**

Replace:

```typescript
import Button from '@/components/atoms/Button.astro';
import { Users } from '@lucide/astro';
```

With:

```typescript
import Breadcrumb from '@/components/atoms/Breadcrumb.astro';
```

**Step 2: Simplify header slot — remove Member Spending button**

Replace the header slot (lines 198-209):

```astro
<div slot="header" class="flex items-center gap-2" data-selector-container>
  <Button variant="ghost" size="sm" href="/reports/members">
    <Users class="w-4 h-4" />
    Member Spending
  </Button>
  <ReportSelector
    selectedRange={defaultRange}
    selectedPeriod={defaultPeriod}
    monthlyPeriods={monthlyPeriods}
    yearlyPeriods={yearlyPeriods}
  />
</div>
```

With:

```astro
<div slot="header" data-selector-container>
  <ReportSelector
    selectedRange={defaultRange}
    selectedPeriod={defaultPeriod}
    monthlyPeriods={monthlyPeriods}
    yearlyPeriods={yearlyPeriods}
  />
</div>
```

**Step 3: Add Breadcrumb as first child inside the body container**

Inside the `<div class="max-w-7xl mx-auto sm:px-2 lg:px-6 space-y-6 md:space-y-8 pb-10">`, add as first child:

```astro
<Breadcrumb
  items={[{ label: 'Reports' }, { label: 'Member Spending', href: '/reports/members' }]}
/>
```

Note: "Reports" has no `href` because we're already on the reports page — it's the current context. "Member Spending" is a link to navigate to.

**Step 4: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/reports/index.astro
git commit -m "feat(ui): replace header nav with breadcrumb on reports page"
```

---

### Task 3: Update member spending page — rename stat labels + add breadcrumb + simplify header

**Files:**

- Modify: `src/pages/reports/members/index.astro`

**Step 1: Update imports**

Add import:

```typescript
import Breadcrumb from '@/components/atoms/Breadcrumb.astro';
```

Remove unused imports:

- Remove `Button` import (no longer used after removing header back buttons)
- Remove `ArrowLeft` from lucide imports (no longer needed)

After change, the lucide import should be:

```typescript
import { ChevronRight, Users } from '@lucide/astro';
```

**Step 2: Rename stat card titles**

Replace these three `StatCard` titles:

- `"FAMILY INCOME"` → `"TOTAL INCOME"`
- `"FAMILY EXPENSES"` → `"TOTAL EXPENSES"`
- `"FAMILY NET"` → `"NET SAVINGS"`

**Step 3: Simplify header slot — remove back buttons**

Replace the entire header slot (lines 179-199):

```astro
<div slot="header" class="flex items-center gap-2">
  {
    urlUserId ? (
      <Button variant="ghost" size="sm" href={overviewUrl} aria-label="Back to member overview">
        <ArrowLeft class="w-4 h-4" />
        <span class="hidden sm:inline">Overview</span>
      </Button>
    ) : (
      <Button variant="ghost" size="sm" href="/reports" aria-label="Back to reports">
        <ArrowLeft class="w-4 h-4" />
        <span class="hidden sm:inline">Reports</span>
      </Button>
    )
  }
  <ReportSelector
    selectedRange={range}
    selectedPeriod={defaultPeriod}
    monthlyPeriods={monthlyPeriods}
    yearlyPeriods={yearlyPeriods}
  />
</div>
```

With:

```astro
<div slot="header">
  <ReportSelector
    selectedRange={range}
    selectedPeriod={defaultPeriod}
    monthlyPeriods={monthlyPeriods}
    yearlyPeriods={yearlyPeriods}
  />
</div>
```

**Step 4: Add breadcrumb inside the detail view container**

In the detail view (urlUserId branch), add breadcrumb as first child of the `max-w-7xl` div:

```astro
<Breadcrumb
  items={[
    { label: 'Reports', href: '/reports' },
    { label: 'Member Spending', href: overviewUrl },
    { label: selectedMemberName },
  ]}
/>
```

**Step 5: Add breadcrumb inside the overview container**

In the overview (non-urlUserId branch), add breadcrumb as first child of the `max-w-7xl` div:

```astro
<Breadcrumb items={[{ label: 'Reports', href: '/reports' }, { label: 'Member Spending' }]} />
```

**Step 6: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/pages/reports/members/index.astro
git commit -m "feat(ui): rename Family labels, add breadcrumb nav to member spending page"
```

---

### Task 4: Fix CategoryDrillDown detail button on member spending page

**Files:**

- Modify: `src/pages/reports/members/index.astro` (inline `<script>` block)

**Root cause:** The inline script only handles `reportRangeChange` and `reportPeriodChange` events. It does NOT handle clicks on `[data-view-details]` buttons rendered by `CategoryTablePartial`. The main reports page works because it imports `ReportsPage.client.ts` which has event delegation for these buttons.

**Step 1: Add drill-down click handler to the inline script**

Inside the `initMembersPage()` function, after the clickable rows section (after line ~480), add:

```typescript
// Category drill-down — handle [data-view-details] clicks via event delegation
document.addEventListener('click', (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const btn = target.closest('[data-view-details]') as HTMLElement;
  if (!btn) return;

  const categoryId = btn.getAttribute('data-category-id');
  const categoryName = btn.getAttribute('data-category-name');
  const categoryIcon = btn.getAttribute('data-category-icon');
  const categoryColor = btn.getAttribute('data-category-color');
  const spent = parseFloat(btn.getAttribute('data-spent') || '0');
  const budgetLimitAttr = btn.getAttribute('data-budget-limit');

  if (categoryId && categoryName) {
    const customEvent = new CustomEvent('open-category-drilldown', {
      detail: {
        categoryId,
        categoryName,
        categoryIcon,
        categoryColor,
        spent,
        budgetLimit: budgetLimitAttr ? parseFloat(budgetLimitAttr) : null,
        period: currentPeriod,
      },
    });
    document.dispatchEvent(customEvent);
  }
});
```

This mirrors the `handleDrillDownClick` function from `ReportsPage.client.ts` (lines 247-275). It uses `currentPeriod` which is already available in the inline script's closure.

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/reports/members/index.astro
git commit -m "fix: enable CategoryDrillDown detail button on member spending page"
```

---

### Task 5: Quality gates + visual verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass.

**Step 2: Run build**

```bash
bun run build
```

Expected: Build succeeds with no errors.

**Step 3: Visual verification in browser**

Start dev server and verify:

1. `/reports` page — breadcrumb shows `Reports » Member Spending` (Member Spending is clickable link)
2. `/reports/members` page — breadcrumb shows `Reports » Member Spending` (Reports is clickable link)
3. `/reports/members?user_id=X` page — breadcrumb shows `Reports » Member Spending » [Name]`
4. Stat cards show "TOTAL INCOME", "TOTAL EXPENSES", "NET SAVINGS" (no "Family")
5. Header slot on both pages has only ReportSelector (no back buttons)
6. On member detail page, clicking "Details" button in category table opens the drilldown modal

**Step 4: Fix any issues found, then final commit**

```bash
git add -A
git commit -m "chore: quality gate fixes for member spending feedback"
```
