# Recurring Frequency & Forecast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add flexible frequency support (weekly, monthly, quarterly, semi-annual, annual) to recurring templates and build a 12-month forecast page at `/recurring/forecast`.

**Architecture:** Two-field frequency model (`frequency` enum + `interval_count` integer) on `recurring_templates`. Forecast page computes projections via pure date math from active templates with 6-hour cache TTL. No new DB rows for forecasts.

**Tech Stack:** Astro 5 (SSR), Drizzle ORM (SQLite + PostgreSQL), Zod validation, DaisyUI v5, Tailwind CSS v4, `bun:test`

**Design Doc:** `docs/plans/2026-03-07-recurring-frequency-forecast-design.md`

---

## Task 1: Schema — Add frequency columns to SQLite

**Files:**
- Modify: `src/db/schema/sqlite/recurring-templates.ts`

**Step 1: Add `frequency` and `interval_count` columns**

Add after `day_of_month` (line 28):

```typescript
frequency: text('frequency', { enum: ['weekly', 'monthly'] }).default('monthly').notNull(),
interval_count: integer('interval_count').default(1).notNull(),
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS (new columns have defaults, no breaking changes)

**Step 3: Commit**

```bash
git add src/db/schema/sqlite/recurring-templates.ts
git commit -m "feat(schema): add frequency and interval_count to recurring_templates (sqlite)"
```

---

## Task 2: Schema — Add frequency columns to PostgreSQL

**Files:**
- Modify: `src/db/schema/postgresql/recurring-templates.ts`

**Step 1: Add `frequency` and `interval_count` columns**

Add after `day_of_month` (line 37):

```typescript
frequency: text('frequency', { enum: ['weekly', 'monthly'] }).default('monthly').notNull(),
interval_count: integer('interval_count').default(1).notNull(),
```

**Step 2: Generate migrations**

```bash
bun run db:generate
bun run db:generate:prod
```

**Step 3: Apply SQLite migration locally**

```bash
bun run db:push
```

**Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/db/schema/postgresql/recurring-templates.ts drizzle/
git commit -m "feat(schema): add frequency and interval_count to recurring_templates (postgresql)"
```

---

## Task 3: Rewrite `calculateDueDate` — tests first

**Files:**
- Modify: `src/lib/utils/recurring-dates.test.ts`
- Modify: `src/lib/utils/recurring-dates.ts`

**Step 1: Add failing tests for frequency-aware calculateDueDate**

Add to `src/lib/utils/recurring-dates.test.ts` inside the `calculateDueDate` describe block:

```typescript
// Existing tests still pass (backward compat with defaults)

test('monthly interval=3 (quarterly)', () => {
  expect(calculateDueDate('2026-01-15', 15, 0, 'monthly', 3)).toBe('2026-01-15');
  expect(calculateDueDate('2026-01-15', 15, 1, 'monthly', 3)).toBe('2026-04-15');
  expect(calculateDueDate('2026-01-15', 15, 2, 'monthly', 3)).toBe('2026-07-15');
});

test('monthly interval=6 (semi-annual)', () => {
  expect(calculateDueDate('2026-01-12', 12, 0, 'monthly', 6)).toBe('2026-01-12');
  expect(calculateDueDate('2026-01-12', 12, 1, 'monthly', 6)).toBe('2026-07-12');
  expect(calculateDueDate('2026-01-12', 12, 2, 'monthly', 6)).toBe('2027-01-12');
});

test('monthly interval=12 (annual)', () => {
  expect(calculateDueDate('2026-01-01', 1, 0, 'monthly', 12)).toBe('2026-01-01');
  expect(calculateDueDate('2026-01-01', 1, 1, 'monthly', 12)).toBe('2027-01-01');
});

test('weekly interval=1', () => {
  expect(calculateDueDate('2026-01-12', 0, 0, 'weekly', 1)).toBe('2026-01-12');
  expect(calculateDueDate('2026-01-12', 0, 1, 'weekly', 1)).toBe('2026-01-19');
  expect(calculateDueDate('2026-01-12', 0, 4, 'weekly', 1)).toBe('2026-02-09');
});

test('weekly interval=2 (biweekly)', () => {
  expect(calculateDueDate('2026-01-12', 0, 0, 'weekly', 2)).toBe('2026-01-12');
  expect(calculateDueDate('2026-01-12', 0, 1, 'weekly', 2)).toBe('2026-01-26');
  expect(calculateDueDate('2026-01-12', 0, 2, 'weekly', 2)).toBe('2026-02-09');
});

test('weekly ignores dayOfMonth parameter', () => {
  expect(calculateDueDate('2026-01-12', 31, 1, 'weekly', 1)).toBe('2026-01-19');
});

test('defaults to monthly interval=1 when params omitted', () => {
  // Backward compatibility: existing callers without frequency/intervalCount
  expect(calculateDueDate('2026-01-01', 15, 1)).toBe('2026-02-15');
});
```

**Step 2: Run tests to verify they fail**

```bash
bun test src/lib/utils/recurring-dates.test.ts
```

Expected: FAIL — current `calculateDueDate` has 3 parameters

**Step 3: Rewrite `calculateDueDate` to be frequency-aware**

Replace the function in `src/lib/utils/recurring-dates.ts` (lines 22-40):

```typescript
export function calculateDueDate(
  startDate: Date | string,
  dayOfMonth: number,
  occurrenceOffset: number,
  frequency: 'weekly' | 'monthly' = 'monthly',
  intervalCount: number = 1
): string {
  const start = toUtcDate(startDate);

  if (frequency === 'weekly') {
    const daysOffset = occurrenceOffset * intervalCount * 7;
    const target = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + daysOffset)
    );
    return toIsoDate(target);
  }

  // Monthly: offset by occurrenceOffset * intervalCount months
  const monthOffset = occurrenceOffset * intervalCount;
  const target = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthOffset, 1)
  );

  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const resolvedDay = Math.min(Math.max(dayOfMonth, 1), daysInTargetMonth);
  target.setUTCDate(resolvedDay);

  return toIsoDate(target);
}
```

**Step 4: Run tests to verify they pass**

```bash
bun test src/lib/utils/recurring-dates.test.ts
```

Expected: ALL PASS

**Step 5: Run full typecheck**

```bash
bun run typecheck
```

Expected: PASS (new params have defaults, backward compatible)

**Step 6: Commit**

```bash
git add src/lib/utils/recurring-dates.ts src/lib/utils/recurring-dates.test.ts
git commit -m "feat: make calculateDueDate frequency-aware with weekly/monthly support"
```

---

## Task 4: Update types and enums

**Files:**
- Modify: `src/lib/types/recurring.ts`

**Step 1: Add frequency fields to RecurringTemplate interface**

Add after `day_of_month: number;` (line 18 of `src/lib/types/recurring.ts`):

```typescript
frequency: 'weekly' | 'monthly';
interval_count: number;
```

**Step 2: Add forecast types**

Add at the end of `src/lib/types/recurring.ts`:

```typescript
export interface ForecastFilters {
  accountIds?: string[];
  type?: 'income' | 'expense';
  status?: 'active' | 'paused' | 'all';
}

export interface ForecastRow {
  templateId: string;
  templateName: string;
  templateType: Exclude<TransactionType, 'transfer'>;
  frequencyLabel: string;
  currency: Currency;
  status: RecurringTemplateStatus;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  account: {
    id: string;
    name: string;
  };
  months: Record<string, string | null>;
}

export interface ForecastCurrencyTotals {
  currency: Currency;
  months: Record<string, { income: string; expense: string; net: string }>;
}

export interface ForecastResult {
  rows: ForecastRow[];
  totals: ForecastCurrencyTotals[];
  monthKeys: string[];
}
```

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: FAIL — services/components referencing RecurringTemplate need the new fields. This is expected and will be fixed in subsequent tasks.

**Step 4: Commit**

```bash
git add src/lib/types/recurring.ts
git commit -m "feat: add frequency fields to RecurringTemplate and forecast types"
```

---

## Task 5: Update validation schemas

**Files:**
- Modify: `src/lib/validation/recurring.ts`

**Step 1: Add frequency enum**

Add at the top of `src/lib/validation/recurring.ts`, after the existing imports (line 8):

```typescript
const frequencyEnum = z.enum(['weekly', 'monthly']);
```

**Step 2: Add frequency fields to baseRecurringTemplateSchema**

Add these two fields to `baseRecurringTemplateSchema` (after `day_of_month` line 32):

```typescript
frequency: frequencyEnum.default('monthly'),
interval_count: z.number().int().min(1).max(52).default(1),
```

**Step 3: Make `day_of_month` conditional**

Change `day_of_month` validation from required to optional with default:

```typescript
day_of_month: z.number().int().min(1).max(31).optional(),
```

Add a refinement to `refineRecurringTemplate` to require `day_of_month` for monthly:

```typescript
.refine(
  (data: any) => data.frequency === 'weekly' || (data.day_of_month !== undefined && data.day_of_month !== null),
  {
    message: 'Day of month is required for monthly frequency',
    path: ['day_of_month'],
  }
)
```

**Step 4: Update updateRecurringTemplateSchema**

Add to `updateRecurringTemplateSchema` (after `day_of_month` around line 82):

```typescript
frequency: frequencyEnum.optional(),
interval_count: z.number().int().min(1).max(52).optional(),
```

**Step 5: Update API schemas**

Add to `createRecurringTemplateAPISchema` (after `day_of_month`):

```typescript
frequency: frequencyEnum.default('monthly'),
interval_count: z.coerce.number().int().min(1).max(52).default(1),
```

Change `day_of_month` in API schema to optional:

```typescript
day_of_month: z.coerce.number().int().min(1).max(31).optional(),
```

Add to `updateRecurringTemplateAPISchema` (after `day_of_month`):

```typescript
frequency: frequencyEnum.optional(),
interval_count: z.coerce.number().int().min(1).max(52).optional(),
```

**Step 6: Run typecheck**

```bash
bun run typecheck
```

Note any errors — they will guide Task 6 (service updates).

**Step 7: Commit**

```bash
git add src/lib/validation/recurring.ts
git commit -m "feat: add frequency and interval_count to recurring validation schemas"
```

---

## Task 6: Update RecurringTemplateService

**Files:**
- Modify: `src/services/recurring-template.service.ts`

**Step 1: Update `create()` to pass new fields**

In the `create()` method (around line 211), add `frequency` and `interval_count` to the `.values()` call:

```typescript
frequency: validated.frequency,
interval_count: validated.interval_count,
```

**Step 2: Update `update()` to allow new fields**

In the `update()` method, add `'frequency'` and `'interval_count'` to the update keys loop (around line 442-457):

```typescript
for (const key of [
  'name',
  'type',
  'amount',
  'currency',
  'category_id',
  'account_id',
  'day_of_month',
  'frequency',
  'interval_count',
  'start_date',
  // ... rest unchanged
] as const) {
```

Also add `frequency` and `interval_count` to the `createRecurringTemplateSchema.parse()` merge validation (around line 479-498):

```typescript
frequency: updatePayload.frequency ?? existing.frequency,
interval_count: updatePayload.interval_count ?? existing.interval_count,
```

**Step 3: Update `_generateForTemplate()` to use frequency-aware calculateDueDate**

In `_generateForTemplate()` (around line 825-829), change the `calculateDueDate` call:

```typescript
const dueDate = calculateDueDate(
  template.start_date,
  template.day_of_month,
  occurrenceNumber - startOccurrence,
  template.frequency ?? 'monthly',
  template.interval_count ?? 1
);
```

**Step 4: Run typecheck**

```bash
bun run typecheck
```

**Step 5: Run existing tests**

```bash
bun test src/services/recurring-template.service.test.ts
```

Expected: PASS (existing tests don't set frequency, defaults apply)

**Step 6: Commit**

```bash
git add src/services/recurring-template.service.ts
git commit -m "feat: handle frequency and interval_count in RecurringTemplateService"
```

---

## Task 7: Update API routes

**Files:**
- Modify: `src/pages/api/recurring/index.ts`

**Step 1: Pass new fields in POST handler**

In the POST handler (around line 114-132), add `frequency` and `interval_count` to the create payload:

```typescript
frequency: payload.frequency,
interval_count: Number(payload.interval_count || 1),
```

**Step 2: Check the PUT handler in `[id]/index.ts`**

Read `src/pages/api/recurring/[id]/index.ts` and ensure the update handler passes through validated fields. Since it uses `updateRecurringTemplateAPISchema` and passes validated data directly, it should work if the schema is updated. Verify and fix if needed.

**Step 3: Run typecheck**

```bash
bun run typecheck
```

**Step 4: Commit**

```bash
git add src/pages/api/recurring/index.ts src/pages/api/recurring/[id]/index.ts
git commit -m "feat: accept frequency and interval_count in recurring API endpoints"
```

---

## Task 8: Update RecurringTemplateForm UI

**Files:**
- Modify: `src/components/organisms/RecurringTemplateForm.astro`
- Modify: `src/components/organisms/RecurringTemplateForm.client.ts`

**Step 1: Add frequency section to form Astro component**

Add between the type selector (after line 75 closing `</div>`) and the amount field in `RecurringTemplateForm.astro`:

```astro
<div class="space-y-2" data-recurring-frequency-block>
  <span class="text-xs font-semibold uppercase tracking-wider text-neutral/50">Frequency</span>
  <div class="flex flex-wrap gap-1.5" role="group" aria-label="Frequency presets" data-frequency-presets>
    <button type="button" class="btn btn-xs btn-ghost rounded-lg" data-frequency-preset="weekly-1">Weekly</button>
    <button type="button" class="btn btn-xs btn-active rounded-lg" data-frequency-preset="monthly-1">Monthly</button>
    <button type="button" class="btn btn-xs btn-ghost rounded-lg" data-frequency-preset="monthly-3">Quarterly</button>
    <button type="button" class="btn btn-xs btn-ghost rounded-lg" data-frequency-preset="monthly-6">Semi-annual</button>
    <button type="button" class="btn btn-xs btn-ghost rounded-lg" data-frequency-preset="monthly-12">Annual</button>
  </div>
  <div class="flex items-center gap-2">
    <select
      name="frequency"
      class="select select-bordered select-sm h-9 rounded-lg border border-base-300 bg-base-100 text-sm font-medium"
    >
      <option value="weekly">Weekly</option>
      <option value="monthly" selected>Monthly</option>
    </select>
    <span class="text-xs text-base-content/60">every</span>
    <input
      type="number"
      name="interval_count"
      min="1"
      max="52"
      value="1"
      class="input input-bordered input-sm h-9 w-16 rounded-lg border border-base-300 bg-base-100 text-center text-sm font-medium"
    />
    <span class="text-xs text-base-content/60" data-interval-unit-label>month(s)</span>
  </div>
</div>
```

**Step 2: Conditionally show/hide "Day of month"**

Wrap the existing "Day of month" `<label>` (around line 149) with a container:

```astro
<div data-recurring-day-of-month-block>
  <!-- existing day_of_month label and select -->
</div>
```

**Step 3: Update client script**

In `RecurringTemplateForm.client.ts`:

a) Add `frequency` and `interval_count` to `RecurringTemplateLike` interface (after `day_of_month`, line 18):

```typescript
frequency?: 'weekly' | 'monthly';
interval_count?: number;
```

b) Add DOM references after the existing ones (around line 98):

```typescript
const frequencySelect = form.querySelector('select[name="frequency"]') as HTMLSelectElement | null;
const intervalCountInput = form.querySelector('input[name="interval_count"]') as HTMLInputElement | null;
const intervalUnitLabel = form.querySelector('[data-interval-unit-label]') as HTMLElement | null;
const dayOfMonthBlock = form.querySelector('[data-recurring-day-of-month-block]') as HTMLElement | null;
const frequencyPresets = form.querySelectorAll<HTMLButtonElement>('[data-frequency-preset]');
```

c) Add frequency sync function:

```typescript
const syncFrequencyUI = (): void => {
  const freq = frequencySelect?.value || 'monthly';
  if (intervalUnitLabel) {
    intervalUnitLabel.textContent = freq === 'weekly' ? 'week(s)' : 'month(s)';
  }
  if (dayOfMonthBlock) {
    dayOfMonthBlock.classList.toggle('hidden', freq === 'weekly');
  }
  // Update preset button styles
  const currentPreset = `${freq}-${intervalCountInput?.value || '1'}`;
  frequencyPresets.forEach((btn) => {
    btn.classList.toggle('btn-active', btn.dataset.frequencyPreset === currentPreset);
    btn.classList.toggle('btn-ghost', btn.dataset.frequencyPreset !== currentPreset);
  });
};
```

d) Add event listeners for frequency changes:

```typescript
frequencySelect?.addEventListener('change', () => syncFrequencyUI(), { signal });
intervalCountInput?.addEventListener('input', () => syncFrequencyUI(), { signal });

frequencyPresets.forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.frequencyPreset || 'monthly-1';
    const [freq, count] = preset.split('-');
    if (frequencySelect) frequencySelect.value = freq;
    if (intervalCountInput) intervalCountInput.value = count;
    syncFrequencyUI();
  }, { signal });
});
```

e) Add `frequency` and `interval_count` to `buildPayload()` (around line 418):

```typescript
const frequency = frequencySelect?.value || 'monthly';
const intervalCount = Number(intervalCountInput?.value || '1');

// In the payload object:
payload.frequency = frequency;
payload.interval_count = intervalCount;

// For weekly, set day_of_month from the start_date
if (frequency === 'weekly') {
  delete payload.day_of_month;
}
```

f) Update `resetFormState()` to reset frequency:

```typescript
if (frequencySelect) frequencySelect.value = 'monthly';
if (intervalCountInput) intervalCountInput.value = '1';
syncFrequencyUI();
```

g) Update `populateEditState()` to populate frequency:

```typescript
setFieldValue('frequency', template.frequency || 'monthly');
setFieldValue('interval_count', String(template.interval_count || 1));
syncFrequencyUI();
```

**Step 4: Run typecheck and lint**

```bash
bun run typecheck && bun run lint:fix
```

**Step 5: Commit**

```bash
git add src/components/organisms/RecurringTemplateForm.astro src/components/organisms/RecurringTemplateForm.client.ts
git commit -m "feat: add frequency selector with presets to recurring template form"
```

---

## Task 9: Update RecurringTemplateRow display

**Files:**
- Modify: `src/components/molecules/RecurringTemplateRow.astro`

**Step 1: Add frequency label helper**

Add a helper function in the frontmatter (after `daySuffix`, around line 31):

```typescript
function frequencyLabel(template: RecurringTemplateOutput): string {
  const freq = (template as any).frequency || 'monthly';
  const interval = (template as any).interval_count || 1;

  if (freq === 'weekly') {
    if (interval === 1) return 'Weekly';
    if (interval === 2) return 'Biweekly';
    return `Every ${interval} weeks`;
  }

  if (interval === 1) return `Every ${daySuffix(template.day_of_month)}`;
  if (interval === 3) return 'Quarterly';
  if (interval === 6) return 'Semi-annual';
  if (interval === 12) return 'Annual';
  return `Every ${interval} months`;
}
```

**Step 2: Replace the hardcoded "Every Nth" display**

Replace the frequency display cell (lines 76-84):

```astro
<td class="py-3.5 px-4">
  <span class="text-sm text-base-content/60 font-medium block">{frequencyLabel(template)}</span>
  {
    template.nextDueDate && (
      <span class="text-xs text-base-content/40 block mt-0.5">Next: {template.nextDueDate}</span>
    )
  }
</td>
```

**Step 3: Run typecheck**

```bash
bun run typecheck
```

**Step 4: Commit**

```bash
git add src/components/molecules/RecurringTemplateRow.astro
git commit -m "feat: display frequency label in recurring template rows"
```

---

## Task 10: Add cache key and tag for forecast

**Files:**
- Modify: `src/lib/cache/keys.ts`
- Modify: `src/lib/cache/tags.ts`

**Step 1: Add forecast cache key**

Add to `CacheKeys` in `src/lib/cache/keys.ts` (after `recurringCalendar`, around line 53):

```typescript
/** Recurring forecast: cache:recurring-forecast:{workspaceId}:{filtersHash} */
recurringForecast: (workspaceId: string, filtersHash: string): string =>
  `${PREFIX}:recurring-forecast:${workspaceId}:${filtersHash}`,
```

**Step 2: Add forecast cache tag**

Add to `CacheTags` in `src/lib/cache/tags.ts` (after `RECURRING_CALENDAR`, around line 24):

```typescript
RECURRING_FORECAST: 'recurring-forecast' as const,
```

**Step 3: Update invalidation in services**

Add `CacheTags.RECURRING_FORECAST` to the `invalidateWorkspaceCache()` tag arrays in:
- `src/services/recurring-template.service.ts` (line 55)
- `src/services/recurring-occurrence.service.ts` (line 130)

Both already have `CacheTags.RECURRING_CALENDAR` in the array — add `CacheTags.RECURRING_FORECAST` right after it.

**Step 4: Run typecheck**

```bash
bun run typecheck
```

**Step 5: Commit**

```bash
git add src/lib/cache/keys.ts src/lib/cache/tags.ts src/services/recurring-template.service.ts src/services/recurring-occurrence.service.ts
git commit -m "feat: add recurring forecast cache key, tag, and invalidation"
```

---

## Task 11: Build RecurringForecastService — tests first

**Files:**
- Create: `src/services/recurring-forecast.service.test.ts`
- Create: `src/services/recurring-forecast.service.ts`

**Step 1: Write failing tests**

Create `src/services/recurring-forecast.service.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { computeForecast, getFrequencyLabel } from './recurring-forecast.service';
import type { RecurringTemplateOutput } from '@/lib/types/recurring';

function makeTemplate(overrides: Partial<RecurringTemplateOutput> & { frequency?: string; interval_count?: number }): RecurringTemplateOutput {
  return {
    id: 'tpl-1',
    workspace_id: 'ws-1',
    created_by_user_id: 'user-1',
    name: 'Test Template',
    type: 'expense',
    amount: '1000',
    currency: 'IDR' as any,
    category_id: 'cat-1',
    account_id: 'acc-1',
    day_of_month: 15,
    frequency: 'monthly' as any,
    interval_count: 1,
    start_date: '2026-01-01',
    end_date: null,
    total_occurrences: null,
    is_installment: false,
    installment_label: null,
    starting_occurrence_number: 1,
    description: null,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    category: { id: 'cat-1', name: 'Test', type: 'expense' as any, icon: 'icon', color: '#000' },
    account: { id: 'acc-1', name: 'Cash', type: 'checking' },
    nextDueDate: null,
    pendingCount: 0,
    confirmedCount: 0,
    skippedCount: 0,
    ...overrides,
  };
}

describe('getFrequencyLabel', () => {
  it('returns "Weekly" for weekly/1', () => {
    expect(getFrequencyLabel('weekly', 1)).toBe('Weekly');
  });
  it('returns "Biweekly" for weekly/2', () => {
    expect(getFrequencyLabel('weekly', 2)).toBe('Biweekly');
  });
  it('returns "Monthly" for monthly/1', () => {
    expect(getFrequencyLabel('monthly', 1)).toBe('Monthly');
  });
  it('returns "Quarterly" for monthly/3', () => {
    expect(getFrequencyLabel('monthly', 3)).toBe('Quarterly');
  });
  it('returns "Semi-annual" for monthly/6', () => {
    expect(getFrequencyLabel('monthly', 6)).toBe('Semi-annual');
  });
  it('returns "Annual" for monthly/12', () => {
    expect(getFrequencyLabel('monthly', 12)).toBe('Annual');
  });
});

describe('computeForecast', () => {
  it('projects monthly template across 3 months', () => {
    const template = makeTemplate({
      start_date: '2026-01-01',
      day_of_month: 15,
      amount: '5000',
      end_date: '2027-12-31',
    });
    const result = computeForecast([template], 2026, 1, 3);

    expect(result.monthKeys).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].months['2026-01']).toBe('5000');
    expect(result.rows[0].months['2026-02']).toBe('5000');
    expect(result.rows[0].months['2026-03']).toBe('5000');
  });

  it('projects quarterly template — shows amount only in matching months', () => {
    const template = makeTemplate({
      start_date: '2026-01-15',
      day_of_month: 15,
      frequency: 'monthly' as any,
      interval_count: 3,
      amount: '300',
      end_date: '2028-12-31',
    });
    const result = computeForecast([template], 2026, 1, 6);

    expect(result.rows[0].months['2026-01']).toBe('300');
    expect(result.rows[0].months['2026-02']).toBeNull();
    expect(result.rows[0].months['2026-03']).toBeNull();
    expect(result.rows[0].months['2026-04']).toBe('300');
    expect(result.rows[0].months['2026-05']).toBeNull();
    expect(result.rows[0].months['2026-06']).toBeNull();
  });

  it('projects weekly template — counts occurrences per month', () => {
    const template = makeTemplate({
      start_date: '2026-01-05',
      frequency: 'weekly' as any,
      interval_count: 1,
      amount: '100',
      end_date: '2026-12-31',
    });
    const result = computeForecast([template], 2026, 1, 2);

    // January has ~4 weekly occurrences, February has ~4
    expect(result.rows[0].months['2026-01']).not.toBeNull();
    expect(result.rows[0].months['2026-02']).not.toBeNull();
  });

  it('computes totals by currency — only active templates', () => {
    const active = makeTemplate({
      id: 'tpl-1',
      amount: '1000',
      currency: 'IDR' as any,
      type: 'expense',
      status: 'active',
      start_date: '2026-01-01',
      day_of_month: 15,
      end_date: '2027-12-31',
    });
    const paused = makeTemplate({
      id: 'tpl-2',
      amount: '500',
      currency: 'IDR' as any,
      type: 'expense',
      status: 'paused',
      start_date: '2026-01-01',
      day_of_month: 10,
      end_date: '2027-12-31',
    });
    const result = computeForecast([active, paused], 2026, 1, 1);

    expect(result.rows).toHaveLength(2);
    // Totals only count active
    const idrTotals = result.totals.find((t) => t.currency === 'IDR');
    expect(idrTotals?.months['2026-01']?.expense).toBe('1000');
  });

  it('excludes templates that have ended before the forecast window', () => {
    const template = makeTemplate({
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      day_of_month: 15,
    });
    const result = computeForecast([template], 2026, 1, 3);
    expect(result.rows[0].months['2026-01']).toBeNull();
  });

  it('handles templates exceeding total_occurrences', () => {
    const template = makeTemplate({
      start_date: '2026-01-01',
      day_of_month: 15,
      total_occurrences: 2,
      end_date: null,
    });
    const result = computeForecast([template], 2026, 1, 4);
    expect(result.rows[0].months['2026-01']).toBe('1000');
    expect(result.rows[0].months['2026-02']).toBe('1000');
    expect(result.rows[0].months['2026-03']).toBeNull();
    expect(result.rows[0].months['2026-04']).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
bun test src/services/recurring-forecast.service.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement RecurringForecastService**

Create `src/services/recurring-forecast.service.ts`:

```typescript
import { and, eq, inArray } from 'drizzle-orm';
import { type IDatabase, getActiveSchema } from '@/db';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import type {
  RecurringTemplateOutput,
  ForecastFilters,
  ForecastRow,
  ForecastCurrencyTotals,
  ForecastResult,
} from '@/lib/types/recurring';
import type { Currency } from '@/lib/enums';
import { calculateDueDate, shouldGenerateOccurrence } from '@/lib/utils/recurring-dates';

const log = createLogger('recurring-forecast');

const FORECAST_TTL = 21600; // 6 hours

export function getFrequencyLabel(frequency: string, intervalCount: number): string {
  if (frequency === 'weekly') {
    if (intervalCount === 1) return 'Weekly';
    if (intervalCount === 2) return 'Biweekly';
    return `Every ${intervalCount} weeks`;
  }
  if (intervalCount === 1) return 'Monthly';
  if (intervalCount === 3) return 'Quarterly';
  if (intervalCount === 6) return 'Semi-annual';
  if (intervalCount === 12) return 'Annual';
  return `Every ${intervalCount} months`;
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function computeForecast(
  templates: RecurringTemplateOutput[],
  startYear: number,
  startMonth: number,
  monthCount: number
): ForecastResult {
  const monthKeys: string[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
    monthKeys.push(toMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1));
  }

  const rows: ForecastRow[] = [];
  const currencyTotals = new Map<string, Map<string, { income: number; expense: number }>>();

  for (const tpl of templates) {
    const freq = (tpl as any).frequency || 'monthly';
    const interval = (tpl as any).interval_count || 1;
    const startOccurrence = tpl.starting_occurrence_number || 1;

    const months: Record<string, string | null> = {};
    for (const mk of monthKeys) {
      months[mk] = null;
    }

    // Project occurrences: iterate up to a reasonable limit
    const maxIterations = freq === 'weekly' ? monthCount * 6 : monthCount * 2;
    for (let offset = 0; offset < maxIterations; offset++) {
      const occurrenceNumber = startOccurrence + offset;
      const dueDate = calculateDueDate(tpl.start_date, tpl.day_of_month, offset, freq, interval);

      if (!shouldGenerateOccurrence(tpl, occurrenceNumber, dueDate)) break;

      // Parse due date into month key
      const dueDateMonthKey = dueDate.slice(0, 7);

      // Past the forecast window?
      if (dueDateMonthKey > monthKeys[monthKeys.length - 1]) break;
      // Before the forecast window?
      if (dueDateMonthKey < monthKeys[0]) continue;

      if (months[dueDateMonthKey] !== undefined) {
        // For weekly, multiple occurrences may land in the same month — accumulate
        const existing = months[dueDateMonthKey];
        if (existing === null) {
          months[dueDateMonthKey] = tpl.amount;
        } else {
          const sum = Number.parseFloat(existing) + Number.parseFloat(tpl.amount);
          months[dueDateMonthKey] = sum.toString();
        }
      }
    }

    rows.push({
      templateId: tpl.id,
      templateName: tpl.name,
      templateType: tpl.type,
      frequencyLabel: getFrequencyLabel(freq, interval),
      currency: tpl.currency,
      status: tpl.status,
      category: tpl.category,
      account: tpl.account,
      months,
    });

    // Accumulate totals for active templates only
    if (tpl.status === 'active') {
      if (!currencyTotals.has(tpl.currency)) {
        const monthMap = new Map<string, { income: number; expense: number }>();
        for (const mk of monthKeys) {
          monthMap.set(mk, { income: 0, expense: 0 });
        }
        currencyTotals.set(tpl.currency, monthMap);
      }
      const ctMap = currencyTotals.get(tpl.currency)!;
      for (const mk of monthKeys) {
        const val = months[mk];
        if (val !== null) {
          const entry = ctMap.get(mk)!;
          const amount = Number.parseFloat(val);
          if (tpl.type === 'income') {
            entry.income += amount;
          } else {
            entry.expense += amount;
          }
        }
      }
    }
  }

  const totals: ForecastCurrencyTotals[] = Array.from(currencyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, monthMap]) => ({
      currency: currency as Currency,
      months: Object.fromEntries(
        Array.from(monthMap.entries()).map(([mk, { income, expense }]) => [
          mk,
          {
            income: income.toString(),
            expense: expense.toString(),
            net: (income - expense).toString(),
          },
        ])
      ),
    }));

  return { rows, totals, monthKeys };
}

export class RecurringForecastService {
  private schema = getActiveSchema();
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  async getForecast(
    workspaceId: string,
    filters: ForecastFilters = {},
    monthCount: number = 12,
    perf?: PerfCollector
  ): Promise<ForecastResult> {
    const normalizedFilters = {
      accountIds: filters.accountIds?.sort() ?? null,
      type: filters.type ?? null,
      status: filters.status ?? 'active',
      monthCount,
    };

    const cache = getCacheManager();
    const cacheKey = CacheKeys.recurringForecast(workspaceId, hashFilters(normalizedFilters));

    try {
      const cached = await cache.get<ForecastResult>(cacheKey);
      if (cached) return cached;
    } catch (error) {
      log.warn('cache read failed for recurring forecast:', error);
    }

    const result = await trackQuery('RecurringForecastService.getForecast', perf, async () => {
      const conditions = [eq(this.schema.recurringTemplates.workspace_id, workspaceId)];

      // Status filter
      const statusFilter = filters.status ?? 'active';
      if (statusFilter === 'all') {
        conditions.push(
          inArray(this.schema.recurringTemplates.status, ['active', 'paused'])
        );
      } else {
        conditions.push(eq(this.schema.recurringTemplates.status, statusFilter));
      }

      if (filters.type) {
        conditions.push(eq(this.schema.recurringTemplates.type, filters.type));
      }

      if (filters.accountIds && filters.accountIds.length > 0) {
        conditions.push(
          inArray(this.schema.recurringTemplates.account_id, filters.accountIds)
        );
      }

      const templates = await this.db.query.recurringTemplates.findMany({
        where: and(...conditions),
        with: {
          category: true,
          account: true,
        },
      });

      // Map to RecurringTemplateOutput shape (minimal — forecast only needs template data)
      const templateOutputs: RecurringTemplateOutput[] = templates.map((t) => ({
        ...t,
        category: {
          id: (t as any).category.id,
          name: (t as any).category.name,
          type: (t as any).category.type,
          icon: (t as any).category.icon,
          color: (t as any).category.color,
        },
        account: {
          id: (t as any).account.id,
          name: (t as any).account.name,
          type: (t as any).account.type,
        },
        nextDueDate: null,
        pendingCount: 0,
        confirmedCount: 0,
        skippedCount: 0,
      } as RecurringTemplateOutput));

      const now = new Date();
      return computeForecast(templateOutputs, now.getUTCFullYear(), now.getUTCMonth() + 1, monthCount);
    });

    try {
      await cache.set(cacheKey, result, {
        ttl: FORECAST_TTL,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING_FORECAST],
      });
    } catch (error) {
      log.warn('cache write failed for recurring forecast:', error);
    }

    return result;
  }
}
```

**Step 4: Run tests**

```bash
bun test src/services/recurring-forecast.service.test.ts
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/services/recurring-forecast.service.ts src/services/recurring-forecast.service.test.ts
git commit -m "feat: add RecurringForecastService with 12-month projection and caching"
```

---

## Task 12: Register forecast service in barrel export

**Files:**
- Modify: `src/services/index.ts`

**Step 1: Import and export forecast service**

Add import (around line 28):

```typescript
import { RecurringForecastService } from './recurring-forecast.service';
```

Add singleton export (around line 75):

```typescript
export const recurringForecastService = new RecurringForecastService(db);
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

**Step 3: Commit**

```bash
git add src/services/index.ts
git commit -m "feat: export recurringForecastService singleton"
```

---

## Task 13: Create forecast API endpoint

**Files:**
- Create: `src/pages/api/recurring/forecast.ts`

**Step 1: Create the API route**

```typescript
import type { APIRoute } from 'astro';
import { recurringForecastService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import type { ForecastFilters } from '@/lib/types/recurring';

export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const type = context.url.searchParams.get('type');
    const status = context.url.searchParams.get('status') || 'active';
    const accountIdsParam = context.url.searchParams.get('accounts');

    const filters: ForecastFilters = {};
    if (type === 'income' || type === 'expense') {
      filters.type = type;
    }
    if (status === 'active' || status === 'paused' || status === 'all') {
      filters.status = status;
    }
    if (accountIdsParam) {
      filters.accountIds = accountIdsParam.split(',').filter(Boolean);
    }

    const result = await recurringForecastService.getForecast(
      auth.workspaceId,
      filters,
      12,
      perf
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch recurring forecast', 500);
  }
};
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

**Step 3: Commit**

```bash
git add src/pages/api/recurring/forecast.ts
git commit -m "feat: add GET /api/recurring/forecast endpoint"
```

---

## Task 14: Create forecast page

**Files:**
- Create: `src/pages/recurring/forecast/index.astro`

**Step 1: Create the forecast page**

Check `src/pages/recurring/index.astro` for the layout pattern used (ProtectedLayout import, auth check, service imports). Create:

```astro
---
import ProtectedLayout from '@/layouts/ProtectedLayout.astro';
import { ArrowLeft } from '@lucide/astro';
import { formatCurrency } from '@/lib/formatting';
import { recurringForecastService, accountService } from '@/services';
import type { ForecastFilters } from '@/lib/types/recurring';

const user = Astro.locals.user;
if (!user?.id) {
  return Astro.redirect('/login');
}

const url = Astro.url;
const typeParam = url.searchParams.get('type');
const statusParam = url.searchParams.get('status') || 'active';
const accountsParam = url.searchParams.get('accounts');

const filters: ForecastFilters = {};
if (typeParam === 'income' || typeParam === 'expense') {
  filters.type = typeParam;
}
if (statusParam === 'active' || statusParam === 'paused' || statusParam === 'all') {
  filters.status = statusParam;
}
if (accountsParam) {
  filters.accountIds = accountsParam.split(',').filter(Boolean);
}

const perf = Astro.locals.perf;
const [forecast, accounts] = await Promise.all([
  recurringForecastService.getForecast(user.workspaceId, filters, 12, perf),
  accountService.findAll(user.workspaceId, undefined, perf),
]);

const selectedAccountIds = new Set(filters.accountIds ?? []);
---

<ProtectedLayout title="Recurring Forecast" currentPath="/recurring/forecast">
  <div class="mx-auto max-w-7xl space-y-5 px-1 pb-10 sm:px-2 lg:px-6">
    <div class="flex items-center gap-3">
      <a
        href="/recurring"
        class="btn btn-ghost btn-sm rounded-lg gap-1.5"
      >
        <ArrowLeft size={16} class="stroke-current" aria-hidden="true" />
        Back
      </a>
      <h1 class="text-lg font-bold text-base-content sm:text-xl">Recurring Forecast</h1>
    </div>

    <section class="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
      <form method="get" class="flex flex-wrap items-end gap-3 pb-4 border-b border-base-200">
        <label class="form-control gap-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral/50">Accounts</span>
          <select
            name="accounts"
            multiple
            class="select select-bordered select-sm h-auto min-h-9 rounded-lg text-sm"
          >
            {accounts.map((acc) => (
              <option value={acc.id} selected={selectedAccountIds.has(acc.id)}>
                {acc.name}
              </option>
            ))}
          </select>
        </label>

        <label class="form-control gap-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral/50">Type</span>
          <select
            name="type"
            class="select select-bordered select-sm h-9 rounded-lg text-sm"
          >
            <option value="" selected={!typeParam}>All</option>
            <option value="income" selected={typeParam === 'income'}>Income</option>
            <option value="expense" selected={typeParam === 'expense'}>Expense</option>
          </select>
        </label>

        <label class="form-control gap-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral/50">Status</span>
          <select
            name="status"
            class="select select-bordered select-sm h-9 rounded-lg text-sm"
          >
            <option value="active" selected={statusParam === 'active'}>Active</option>
            <option value="paused" selected={statusParam === 'paused'}>Paused</option>
            <option value="all" selected={statusParam === 'all'}>All</option>
          </select>
        </label>

        <button type="submit" class="btn btn-sm btn-accent rounded-lg h-9">Filter</button>
      </form>

      <div class="mt-4 overflow-x-auto">
        <table class="table table-sm w-full">
          <thead>
            <tr class="border-b border-base-300">
              <th class="sticky left-0 z-10 bg-base-100 min-w-[160px] text-xs font-semibold uppercase tracking-wider text-base-content/60">Name</th>
              <th class="text-xs font-semibold uppercase tracking-wider text-base-content/60 min-w-[90px]">Freq.</th>
              {forecast.monthKeys.map((mk) => {
                const [y, m] = mk.split('-').map(Number);
                const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return (
                  <th class="text-right text-xs font-semibold uppercase tracking-wider text-base-content/60 min-w-[100px]">
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {forecast.rows.map((row) => (
              <tr
                class:list={[
                  'border-b border-base-200 last:border-b-0',
                  row.status === 'paused' && 'opacity-40',
                ]}
              >
                <td class="sticky left-0 z-10 bg-base-100 py-2.5 px-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class:list={['inline-block h-2 w-2 rounded-full shrink-0', row.templateType === 'income' ? 'bg-success' : 'bg-error']} />
                    <span class="font-semibold text-sm truncate" title={row.templateName}>{row.templateName}</span>
                  </div>
                  <span class="text-xs text-base-content/40 block mt-0.5">{row.account.name}</span>
                </td>
                <td class="py-2.5 px-3 text-xs text-base-content/60 font-medium">{row.frequencyLabel}</td>
                {forecast.monthKeys.map((mk) => {
                  const val = row.months[mk];
                  return (
                    <td class="py-2.5 px-3 text-right text-sm font-medium tabular-nums">
                      {val !== null ? formatCurrency(val, row.currency) : (
                        <span class="text-base-content/20">&mdash;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {forecast.totals.length > 0 && (
            <tfoot>
              {forecast.totals.map((ct) => (
                <>
                  <tr class="border-t-2 border-base-300 bg-success/5">
                    <td class="sticky left-0 z-10 bg-success/5 py-2 px-3 text-xs font-bold uppercase text-success">Income ({ct.currency})</td>
                    <td />
                    {forecast.monthKeys.map((mk) => {
                      const val = ct.months[mk]?.income;
                      return (
                        <td class="py-2 px-3 text-right text-sm font-bold tabular-nums text-success">
                          {val && val !== '0' ? formatCurrency(val, ct.currency) : (
                            <span class="text-base-content/20">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr class="bg-error/5">
                    <td class="sticky left-0 z-10 bg-error/5 py-2 px-3 text-xs font-bold uppercase text-error">Expense ({ct.currency})</td>
                    <td />
                    {forecast.monthKeys.map((mk) => {
                      const val = ct.months[mk]?.expense;
                      return (
                        <td class="py-2 px-3 text-right text-sm font-bold tabular-nums text-error">
                          {val && val !== '0' ? formatCurrency(val, ct.currency) : (
                            <span class="text-base-content/20">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr class="bg-base-200/50">
                    <td class="sticky left-0 z-10 bg-base-200/50 py-2 px-3 text-xs font-bold uppercase text-base-content">Net ({ct.currency})</td>
                    <td />
                    {forecast.monthKeys.map((mk) => {
                      const net = ct.months[mk]?.net;
                      const netNum = Number.parseFloat(net || '0');
                      return (
                        <td class:list={['py-2 px-3 text-right text-sm font-bold tabular-nums', netNum > 0 ? 'text-success' : netNum < 0 ? 'text-error' : 'text-base-content/40']}>
                          {net && net !== '0' ? formatCurrency(net, ct.currency) : (
                            <span class="text-base-content/20">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </>
              ))}
            </tfoot>
          )}
        </table>
      </div>

      {forecast.rows.length === 0 && (
        <div class="py-12 text-center text-sm text-base-content/50">
          No recurring templates match the current filters.
        </div>
      )}
    </section>
  </div>
</ProtectedLayout>
```

**Step 2: Run typecheck and build**

```bash
bun run typecheck && bun run build
```

**Step 3: Commit**

```bash
git add src/pages/recurring/forecast/index.astro
git commit -m "feat: add /recurring/forecast page with 12-month projection table"
```

---

## Task 15: Add navigation link from `/recurring` to forecast

**Files:**
- Modify: `src/pages/recurring/index.astro`

**Step 1: Add forecast link**

Add a "Forecast" button next to the existing header in `src/pages/recurring/index.astro`. In the header area (around line 157, inside the first `<section>` `<div>` after the description `<p>` tag), add:

```astro
<a
  href="/recurring/forecast"
  class="btn btn-sm btn-ghost rounded-lg gap-1.5 text-accent"
>
  <TrendingUp size={16} class="stroke-current" aria-hidden="true" />
  <span class="text-xs font-semibold">Forecast</span>
</a>
```

Import `TrendingUp` from `@lucide/astro` at the top (line 12):

```typescript
import { CalendarDays, Info, List, Plus, TrendingUp } from '@lucide/astro';
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

**Step 3: Commit**

```bash
git add src/pages/recurring/index.astro
git commit -m "feat: add forecast navigation link on recurring page"
```

---

## Task 16: Update seed data with varied frequencies

**Files:**
- Modify: `src/db/seed/data/recurring.ts`
- Modify: `src/db/seed/domains/recurring.ts`

**Step 1: Add frequency fields to RecurringTemplateSeed interface**

In `src/db/seed/data/recurring.ts`, add to `RecurringTemplateSeed` (after `account`, line 11):

```typescript
frequency?: 'weekly' | 'monthly';
intervalCount?: number;
```

**Step 2: Add new seed templates with varied frequencies**

Add to `RECURRING_TEMPLATE_DATA` array:

```typescript
{
  name: 'Weekly Groceries',
  type: 'expense',
  amount: '750000',
  dayOfMonth: 1,
  category: 'Groceries',
  account: 'Cash',
  frequency: 'weekly',
  intervalCount: 1,
  startDate: '2026-01-06',
  endDate: '2026-12-31',
},
{
  name: 'Bond Coupon - ABC',
  type: 'income',
  amount: '3000000',
  dayOfMonth: 12,
  category: 'Investment Income',
  account: 'Transfer',
  frequency: 'monthly',
  intervalCount: 6,
  startDate: '2026-01-12',
  endDate: '2028-12-31',
},
{
  name: 'Quarterly Insurance',
  type: 'expense',
  amount: '2500000',
  dayOfMonth: 1,
  category: 'Insurance',
  account: 'Transfer',
  frequency: 'monthly',
  intervalCount: 3,
  startDate: '2026-01-01',
  endDate: '2027-12-31',
},
```

**Step 3: Update seeder to pass frequency fields**

In `src/db/seed/domains/recurring.ts`, update the `db.insert(recurringTemplates).values()` call (around line 66-87) to include:

```typescript
frequency: seedTemplate.frequency || 'monthly',
interval_count: seedTemplate.intervalCount || 1,
```

Also update the `calculateDueDate` call (around line 96) to pass frequency:

```typescript
const dueDate = calculateDueDate(
  seedTemplate.startDate,
  seedTemplate.dayOfMonth,
  offset,
  seedTemplate.frequency || 'monthly',
  seedTemplate.intervalCount || 1
);
```

**Step 4: Run typecheck**

```bash
bun run typecheck
```

**Step 5: Commit**

```bash
git add src/db/seed/data/recurring.ts src/db/seed/domains/recurring.ts
git commit -m "feat: add seed data with weekly, quarterly, and semi-annual recurring templates"
```

---

## Task 17: Write architecture doc

**Files:**
- Create: `docs/architecture/014-recurring-frequency-forecast.md`

**Step 1: Create ADR**

```markdown
# ADR 014: Recurring Frequency Model & Forecast

## Status

Accepted

## Context

The recurring system originally supported monthly-only recurrence. Users need weekly, quarterly, semi-annual, and annual intervals for bills, bond income, and subscriptions. Users also want a 12-month cash flow forecast showing predicted income and expenses.

## Decision

### Frequency Model

Two-field approach on `recurring_templates`:

- `frequency` (text enum: `weekly` | `monthly`, default `monthly`)
- `interval_count` (integer, default 1)

This combination represents any interval without schema migrations for new frequencies. Weekly intervals derive their day-of-week from `start_date` — no additional column needed.

### Forecast Computation

Forecasts are computed via pure date math, not pre-generated occurrence rows. The `calculateDueDate()` utility is called in a loop for each template to determine which months have occurrences. This avoids database bloat and makes forecast computation stateless.

### Caching

Forecast data uses a 6-hour TTL (21600s) with tag-based invalidation via `CacheTags.RECURRING_FORECAST`. All template mutations (create, update, pause, resume, cancel) and occurrence mutations (confirm, skip) invalidate the forecast cache. This is safe because forecast data only changes when templates change.

## Consequences

Positive:

- Flexible frequency model supports current and future interval needs
- No schema migration needed for new intervals (e.g., biweekly)
- Forecast computation is fast (pure arithmetic) and heavily cached
- Existing monthly templates work unchanged (defaults apply)

Tradeoffs:

- Weekly occurrence generation produces more rows than monthly
- Forecast is a projection, not a guarantee (variable amounts differ)
- Cache invalidation scope includes forecast tag on every template mutation

## References

- Design doc: `docs/plans/2026-03-07-recurring-frequency-forecast-design.md`
- Cache architecture: ADR 008 (`docs/architecture/008-cache-abstraction.md`)
- Forecast service: `src/services/recurring-forecast.service.ts`
- Date calculation: `src/lib/utils/recurring-dates.ts`
```

**Step 2: Commit**

```bash
git add docs/architecture/014-recurring-frequency-forecast.md
git commit -m "docs: add ADR 014 for recurring frequency model and forecast"
```

---

## Task 18: Update user guide — recurring.md

**Files:**
- Modify: `docs/sites/src/content/docs/end-users/recurring.md`

**Step 1: Update the Frequency Options table**

Replace the existing table (around lines 156-163) with:

```markdown
| Frequency   | Description              | Example                |
| ----------- | ------------------------ | ---------------------- |
| Weekly      | Every 7 days             | Weekly allowance       |
| Biweekly    | Every 14 days            | Biweekly paycheck      |
| Monthly     | Same date monthly        | Rent, subscriptions    |
| Quarterly   | Every 3 months           | Insurance premiums     |
| Semi-annual | Every 6 months           | Bond coupon payments   |
| Annual      | Same date annually       | Membership renewals    |
| Custom      | Every N weeks or months  | Every 2 months         |
```

**Step 2: Update Creating Templates section**

Update the frequency bullet in the form fields list (around line 94-99) to:

```markdown
   - **Frequency** - How often it repeats. Choose a preset (Weekly, Monthly, Quarterly, Semi-annual, Annual) or set a custom interval
```

**Step 3: Add Forecast section**

Add before "## Variable Amounts" (around line 171):

```markdown
## Forecast

View projected recurring cash flow for the next 12 months:

1. Click **Forecast** on the recurring page header
2. The table shows each template with monthly columns
3. Filter by account, type, or status
4. Review income and expense totals by currency

See [Recurring Forecast](/end-users/recurring-forecast) for details.
```

**Step 4: Commit**

```bash
git add docs/sites/src/content/docs/end-users/recurring.md
git commit -m "docs: update recurring user guide with frequency options and forecast link"
```

---

## Task 19: Create recurring forecast user guide

**Files:**
- Create: `docs/sites/src/content/docs/end-users/recurring-forecast.md`

**Step 1: Write the user guide**

```markdown
---
title: Recurring Forecast
description: View projected recurring income and expenses for the next 12 months in a tabular format.
draft: false
head: []
sidebar:
  label: Recurring Forecast
  order: 10
audience:
  - user
---

The Recurring Forecast projects your recurring income and expenses across the next 12 months. Use it to plan cash flow, anticipate large expenses, and see when bond coupons or seasonal bills arrive.

## Accessing Forecast

1. Navigate to **Recurring**
2. Click **Forecast** in the page header
3. The forecast table loads with your active templates

## Reading the Table

Each row represents one recurring template:

- **Name** - Template name and linked account
- **Freq.** - Frequency label (Weekly, Monthly, Quarterly, etc.)
- **Month columns** - Amount when an occurrence falls in that month, dash when none

For weekly templates, the month column shows the accumulated total of all occurrences within that month.

## Filtering

Use the filter bar above the table:

### Account Filter

Select one or more accounts to show only templates linked to those accounts. Useful for viewing bond income from a specific investment account.

### Type Filter

- **All** - Show income and expenses
- **Income** - Show only recurring income
- **Expense** - Show only recurring expenses

### Status Filter

- **Active** (default) - Templates currently generating occurrences
- **Paused** - Templates temporarily stopped, shown at reduced opacity
- **All** - Both active and paused templates

Paused templates appear greyed out and their amounts are excluded from the totals.

## Understanding Totals

The footer rows show totals grouped by currency:

| Row | Description |
| --- | --- |
| **Income** | Sum of all active income templates for that month |
| **Expense** | Sum of all active expense templates for that month |
| **Net** | Income minus expenses — positive means surplus |

Each currency gets its own set of total rows. No currency conversion is applied.

## Limitations

- Forecast shows the template amount, not actual payment amounts (which may vary)
- Paused templates do not contribute to totals
- Cancelled and completed templates are excluded
- The forecast does not account for one-time transactions or budget changes

## Related Features

- **Recurring** - Manage templates and confirm occurrences
- **Forecast** - Long-term wealth projection calculator
- **Reports** - Historical spending analysis
```

**Step 2: Commit**

```bash
git add docs/sites/src/content/docs/end-users/recurring-forecast.md
git commit -m "docs: add recurring forecast user guide"
```

---

## Task 20: Quality gates and final verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Run all recurring tests**

```bash
bun test src/lib/utils/recurring-dates.test.ts
bun test src/services/recurring-forecast.service.test.ts
bun test src/services/recurring-template.service.test.ts
bun test src/components/organisms/RecurringTemplateForm.test.ts
```

**Step 3: Run build**

```bash
bun run build
```

**Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "chore: fix quality gate issues for recurring frequency and forecast"
```

**Step 5: Verify with dev server**

```bash
bun --bun run dev
```

Then manually verify:
- `/recurring` page loads, shows Forecast link
- Create a new recurring with quarterly frequency
- `/recurring/forecast` shows the forecast table
- Filters work (type, status, accounts)
- Mobile view scrolls horizontally
