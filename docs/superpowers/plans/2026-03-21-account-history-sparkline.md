# Account History Sparkline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-side SVG sparkline above the inline history table, add a % change column, and fix balance currency formatting.

**Architecture:** All changes are server-side — pure Astro frontmatter SVG computation, no new client JS, no new dependencies. The API route gains one extra service call (`findByIdIncludingClosed`) to obtain the account's currency. The partial gains a `currency` prop and computes SVG point coordinates from the already-fetched 10 entries.

**Tech Stack:** Astro 5, Bun, TypeScript, inline SVG, `formatCurrency` from `@/lib/formatting`, `Currency` type from `@/lib/constants/currency`

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/__tests__/account-history-partial.test.ts` | **Create** | Static source assertions for all new behaviour |
| `src/components/partials/AccountHistoryPartial.astro` | **Modify** | Add `currency` prop, sparkline SVG, % column, remove notes column |
| `src/pages/api/accounts/[id]/history.ts` | **Modify** | Call `findByIdIncludingClosed`, pass `currency` to partial |

---

### Task 1: Write the failing tests

Tests in this codebase use `readFileSync` to assert on source-file content. They fail immediately on the unchanged file and pass once the implementation is correct.

**Files:**
- Create: `src/__tests__/account-history-partial.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const content = readFileSync('src/components/partials/AccountHistoryPartial.astro', 'utf8');
const normalize = (s: string) => s.replace(/\s+/g, ' ');

describe('AccountHistoryPartial', () => {
  it('declares currency prop', () => {
    expect(content).toContain('currency: Currency');
  });

  it('imports Currency type and formatCurrency', () => {
    expect(content).toContain("from '@/lib/constants/currency'");
    expect(content).toContain("from '@/lib/formatting'");
    expect(content).toContain('formatCurrency');
  });

  it('formats balance with currency symbol', () => {
    expect(content).toContain('formatCurrency(balance, currency)');
  });

  it('does not render a notes column', () => {
    expect(content).not.toContain('Notes');
    expect(content).not.toContain('entry.notes');
  });

  it('renders percentage change column', () => {
    expect(content).toContain('Math.abs(prevBalance)');
  });

  it('guards percent column against zero prevBalance', () => {
    expect(content).toContain('prevBalance === 0');
  });

  it('renders SVG sparkline elements for multi-entry history', () => {
    expect(content).toContain('<polyline');
    expect(content).toContain('<circle');
    expect(content).toContain('viewBox="0 0 100 44"');
  });

  it('skips sparkline when fewer than two entries', () => {
    expect(content).toContain('entries.length >= 2');
  });

  it('handles flat-line case with explicit mid-height', () => {
    expect(content).toContain('range === 0');
    expect(content).toContain('? 22');
  });

  it('skips growth annotation when oldestBalance is zero', () => {
    expect(content).toContain('oldestBalance === 0');
  });

  it('renders growth annotation with period labels', () => {
    expect(content).toContain('Now');
  });
});
```

- [ ] **Step 2: Run tests — confirm all fail**

```bash
bun test src/__tests__/account-history-partial.test.ts
```

Expected: all 11 tests fail (current file has none of these strings).

---

### Task 2: Implement the new AccountHistoryPartial

**Files:**
- Modify: `src/components/partials/AccountHistoryPartial.astro`

- [ ] **Step 3: Replace the file's frontmatter and template**

Replace the full file content with:

```astro
---
/**
 * AccountHistoryPartial
 *
 * Server-rendered partial for account inline history table.
 * Used by both initial page render and API HTML responses.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 *
 * @param {HistoryEntry[]} entries - Array of history entries (newest-first)
 * @param {string} accountId - Account ID for the "View all history" link
 * @param {Currency} currency - Account currency for balance formatting
 */

import { formatCurrency } from '@/lib/formatting';
import type { Currency } from '@/lib/constants/currency';

export interface HistoryEntry {
  id: string;
  balance: string;
  notes: string | null;
  recorded_at: string;
}

export interface Props {
  entries: HistoryEntry[];
  accountId: string;
  currency: Currency;
}

const { entries, accountId, currency } = Astro.props;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Sparkline: only computed when we have 2+ entries
const showSparkline = entries.length >= 2;

// Balances in oldest-first order for SVG left→right plotting
const balancesOldestFirst = entries
  .map((e) => parseFloat(e.balance))
  .reverse();

// SVG coordinate computation (viewBox 0 0 100 44)
const sparklinePoints = (() => {
  if (!showSparkline) return '';
  const n = balancesOldestFirst.length;
  const min = Math.min(...balancesOldestFirst);
  const max = Math.max(...balancesOldestFirst);
  const range = max - min;
  return balancesOldestFirst
    .map((bal, i) => {
      const x = (i / (n - 1)) * 100;
      const y = range === 0 ? 22 : 42 - ((bal - min) / range) * 40;
      return `${x},${y}`;
    })
    .join(' ');
})();

// Area fill path: close below the polyline to y=44
const sparklineArea = (() => {
  if (!showSparkline || !sparklinePoints) return '';
  const points = sparklinePoints.split(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const firstX = first.split(',')[0];
  const lastX = last.split(',')[0];
  return `M${firstX},44 L${sparklinePoints.replace(/(\S+),(\S+)/g, '$1,$2').split(' ').map(p => `L${p}`).join(' ')} L${lastX},44 Z`.replace('LM', 'M').replace('L L', 'L ');
})();

// Growth annotation
const oldestBalance = balancesOldestFirst[0] ?? 0;
const newestBalance = balancesOldestFirst[balancesOldestFirst.length - 1] ?? 0;
const showGrowthAnnotation = showSparkline && oldestBalance !== 0;
const growthPercent = showGrowthAnnotation
  ? ((newestBalance - oldestBalance) / oldestBalance) * 100
  : 0;
const growthFormatted = `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`;
const growthClass = growthPercent >= 0 ? 'text-success' : 'text-error';
const oldestDateLabel = entries.length > 0 ? formatDate(entries[entries.length - 1].recorded_at) : '';

// Per-row change and % calculation
function calculateChange(balance: number, prevBalance: number, isLastEntry: boolean) {
  if (isLastEntry) {
    return { display: '—', className: 'text-base-content/50', percent: '—' };
  }

  const change = balance - prevBalance;
  const changeClass =
    change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content/50';
  const changePrefix = change > 0 ? '+' : '';
  const changeDisplay = changePrefix + change.toLocaleString();

  const percentDisplay =
    prevBalance === 0
      ? '—'
      : `${change >= 0 ? '+' : ''}${((change / Math.abs(prevBalance)) * 100).toFixed(1)}%`;

  return { display: changeDisplay, className: changeClass, percent: percentDisplay };
}
---

{
  entries.length === 0 ? (
    <p class="px-4 py-2 text-xs text-base-content/50">No history entries yet.</p>
  ) : (
    <>
      {showSparkline && (
        <div class="px-6 pt-3 pb-1 md:px-8">
          <svg
            width="100%"
            height="44"
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={sparklineArea} fill="#16a34a" fill-opacity="0.12" />
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke="#16a34a"
              stroke-width="1.5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            {(() => {
              const lastPoint = sparklinePoints.split(' ').pop() ?? '100,22';
              const [cx, cy] = lastPoint.split(',');
              return <circle cx={cx} cy={cy} r="2" fill="#16a34a" />;
            })()}
          </svg>
          {showGrowthAnnotation && (
            <div class="flex justify-between text-xs mt-0.5">
              <span class="text-base-content/40">{oldestDateLabel}</span>
              <span class={growthClass + ' font-semibold'}>
                {growthFormatted} ({entries.length} entries)
              </span>
              <span class="text-base-content/40">Now</span>
            </div>
          )}
        </div>
      )}

      <table class="w-full border-collapse text-left">
        <thead class="sr-only">
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Balance</th>
            <th scope="col">Change</th>
            <th scope="col">%</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const balance = parseFloat(entry.balance);
            const prevBalance =
              i < entries.length - 1 ? parseFloat(entries[i + 1].balance) : balance;
            const isLastEntry = i === entries.length - 1;
            const changeData = calculateChange(balance, prevBalance, isLastEntry);
            const date = formatDate(entry.recorded_at);

            return (
              <tr class="border-b border-base-300/50 last:border-b-0">
                <td class="py-1.5 pl-6 pr-2 text-xs text-base-content/50 md:pl-8">{date}</td>
                <td class="py-1.5 px-2 text-xs font-semibold tabular-nums text-base-content text-right">
                  {formatCurrency(balance, currency)}
                </td>
                <td
                  class={`py-1.5 px-2 text-xs font-semibold tabular-nums text-right ${changeData.className}`}
                >
                  {changeData.display}
                </td>
                <td class="py-1.5 pl-2 pr-4 text-xs text-base-content/40 text-right md:pr-6">
                  {changeData.percent}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class="py-1.5 pl-6 md:pl-8">
        <a href={`/accounts/history/${accountId}`} class="text-xs text-accent hover:underline">
          View all history &rarr;
        </a>
      </div>
    </>
  )
}
```

> **Note on the area fill path:** The `sparklineArea` string manipulation above can be fragile. If it produces incorrect SVG at runtime, replace the whole `sparklineArea` computation with this equivalent that builds the path directly:
>
> ```typescript
> const sparklineArea = (() => {
>   if (!showSparkline || balancesOldestFirst.length < 2) return '';
>   const n = balancesOldestFirst.length;
>   const min = Math.min(...balancesOldestFirst);
>   const max = Math.max(...balancesOldestFirst);
>   const range = max - min;
>   const pts = balancesOldestFirst.map((bal, i) => {
>     const x = (i / (n - 1)) * 100;
>     const y = range === 0 ? 22 : 42 - ((bal - min) / range) * 40;
>     return `${x},${y}`;
>   });
>   const firstX = pts[0].split(',')[0];
>   const lastX = pts[pts.length - 1].split(',')[0];
>   return `M${firstX},44 ${pts.map(p => `L${p}`).join(' ')} L${lastX},44 Z`;
> })();
> ```
> The path format is: move to bottom-left → trace the line points → close to bottom-right → back to start.

- [ ] **Step 4: Run the tests — confirm they pass**

```bash
bun test src/__tests__/account-history-partial.test.ts
```

Expected: all 11 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. If `Currency` import errors appear, check the import path — it may be `import type { Currency }` to avoid bundling the runtime value.

---

### Task 3: Update the API route to pass currency

**Files:**
- Modify: `src/pages/api/accounts/[id]/history.ts`

- [ ] **Step 6: Add `findByIdIncludingClosed` call and pass `currency` prop**

Inside the `if (render.wantsHtml())` block, add the account lookup before `AstroContainer.create()`. Replace the existing HTML render block:

```typescript
// BEFORE:
if (render.wantsHtml()) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(AccountHistoryPartial, {
    props: {
      entries: history,
      accountId: id,
    },
  });
  return render.html(html);
}

// AFTER:
if (render.wantsHtml()) {
  const account = await accountService.findByIdIncludingClosed(id, auth.workspaceId);
  const container = await AstroContainer.create();
  const html = await container.renderToString(AccountHistoryPartial, {
    props: {
      entries: history,
      accountId: id,
      currency: account.currency,
    },
  });
  return render.html(html);
}
```

> `findByIdIncludingClosed` is used (not `findById`) because a closed/deactivated account may still have history worth viewing.

- [ ] **Step 7: Run typecheck again**

```bash
bun run typecheck
```

Expected: 0 errors. The `currency` prop is now `Currency` on both sides.

---

### Task 4: Quality gates and commit

- [ ] **Step 8: Run the full test suite**

```bash
bun test
```

Expected: all tests pass. If any existing test fails, investigate before committing.

- [ ] **Step 9: Run quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: all pass with no errors.

- [ ] **Step 10: Commit**

```bash
git add \
  src/components/partials/AccountHistoryPartial.astro \
  src/pages/api/accounts/[id]/history.ts \
  src/__tests__/account-history-partial.test.ts
git commit -m "feat(accounts): add sparkline and % change to inline history table (ALL-57)"
```
