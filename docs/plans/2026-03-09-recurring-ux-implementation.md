# Recurring UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-impact UX issues on `/recurring` by making the queue filters real, aligning the month/copy, and simplifying the recurring form so open-ended schedules are the default.

**Architecture:** Keep `/recurring` server-rendered and preserve the existing recurring API contract. Implement the queue filter as lightweight client-side state on top of the existing partial refresh flow, and refactor the form UI so it still submits the same payload fields while relaxing validation to allow open-ended recurring templates.

**Tech Stack:** Astro 5, TypeScript, Bun test, DaisyUI, Zod validation, existing recurring services and client scripts

**Design doc:** `docs/plans/2026-03-09-recurring-ux-design.md`

---

### Task 1: Allow open-ended recurring templates in validation

**Files:**
- Create: `src/lib/validation/recurring.test.ts`
- Modify: `src/lib/validation/recurring.ts`
- Modify: `src/services/recurring-template.service.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/validation/recurring.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { createRecurringTemplateAPISchema, createRecurringTemplateSchema } from './recurring';

const basePayload = {
  workspace_id: 'workspace-1',
  created_by_user_id: 'user-1',
  name: 'Salary',
  type: 'income' as const,
  amount: '15000000',
  currency: 'IDR' as const,
  category_id: 'cat-1',
  account_id: 'account-1',
  day_of_month: 25,
  frequency: 'monthly' as const,
  interval_count: 1,
  start_date: '2026-01-25',
  is_installment: false,
  starting_occurrence_number: 1,
  status: 'active' as const,
};

describe('recurring validation', () => {
  it('accepts open-ended recurring templates in the service schema', () => {
    const parsed = createRecurringTemplateSchema.parse(basePayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });

  it('accepts open-ended recurring templates in the API schema', () => {
    const {
      workspace_id: _workspaceId,
      created_by_user_id: _createdByUserId,
      ...apiPayload
    } = basePayload;
    const parsed = createRecurringTemplateAPISchema.parse(apiPayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });
});
```

Update `src/services/recurring-template.service.test.ts` by replacing the first rejection test with a create test:

```typescript
it('creates open-ended recurring templates', async () => {
  const template = createMockRecurringTemplate({ total_occurrences: null, end_date: null });
  const category = createMockCategory();
  const account = createMockAccount();

  (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(category);
  (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
  (mockDb.query.recurringTemplates.findFirst as any)
    .mockResolvedValueOnce(template)
    .mockResolvedValueOnce({ ...template, category, account });
  (mockDb.query.recurringOccurrences.findFirst as any).mockResolvedValueOnce(undefined);

  const result = await recurringTemplateService.create({
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'Salary',
    type: 'income',
    amount: '15000000',
    currency: 'IDR',
    category_id: 'cat-1',
    account_id: 'account-1',
    day_of_month: 25,
    start_date: '2026-01-25',
    is_installment: false,
    starting_occurrence_number: 1,
  });

  expect(result.id).toBeDefined();
});
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
bun test src/lib/validation/recurring.test.ts src/services/recurring-template.service.test.ts
```

Expected: FAIL with `At least one end condition is required`.

**Step 3: Write the minimal implementation**

In `src/lib/validation/recurring.ts`, remove the rule that requires either `total_occurrences` or `end_date`, but keep:

- monthly schedules requiring `day_of_month`
- installments requiring `total_occurrences`
- `starting_occurrence_number <= total_occurrences` when a count exists

The refine section should move from:

```typescript
.refine((data: any) => Boolean(data.total_occurrences || data.end_date), {
  message: 'At least one end condition is required',
  path: ['total_occurrences'],
})
```

to no equivalent open-ended requirement.

**Step 4: Run the tests to verify they pass**

Run:

```bash
bun test src/lib/validation/recurring.test.ts src/services/recurring-template.service.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/validation/recurring.test.ts src/lib/validation/recurring.ts src/services/recurring-template.service.test.ts
git commit -m "feat(recurring): allow open-ended templates" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Allow editing a non-installment template back to “No end”

**Files:**
- Modify: `src/services/recurring-template.service.test.ts`
- Modify: `src/services/recurring-template.service.ts`

**Step 1: Write the failing test**

Add to `src/services/recurring-template.service.test.ts`:

```typescript
it('allows clearing total_occurrences when the merged template is not an installment', async () => {
  const category = createMockCategory();
  const account = createMockAccount();

  (mockDb.query.recurringTemplates.findFirst as any)
    .mockResolvedValueOnce({
      ...createMockRecurringTemplate({
        total_occurrences: 6,
        end_date: null,
        is_installment: false,
      }),
      category,
      account,
    })
    .mockResolvedValueOnce({
      ...createMockRecurringTemplate({
        total_occurrences: null,
        end_date: null,
        is_installment: false,
      }),
      category,
      account,
    });

  const result = await recurringTemplateService.update('rt-1', 'workspace-1', {
    workspace_id: 'workspace-1',
    total_occurrences: null,
  });

  expect(result.totalOccurrences).toBeNull();
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bun test src/services/recurring-template.service.test.ts
```

Expected: FAIL if merge validation still rejects the open-ended final state.

**Step 3: Write the minimal implementation**

If the test fails, adjust the merged-state validation in `src/services/recurring-template.service.ts` so this call passes:

```typescript
createRecurringTemplateSchema.parse({
  // ...
  end_date: mergedEndDate ?? undefined,
  total_occurrences: mergedTotalOccurrences ?? undefined,
});
```

Do not add a special-case bypass. Let the updated schema enforce the final rules.

**Step 4: Run the test to verify it passes**

Run:

```bash
bun test src/services/recurring-template.service.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/recurring-template.service.test.ts src/services/recurring-template.service.ts
git commit -m "feat(recurring): support no-end edits" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Make the queue heading and copy month-aware

**Files:**
- Create: `src/__tests__/recurring-page-ux.test.ts`
- Modify: `src/pages/recurring/index.astro`
- Modify: `src/components/organisms/RecurringPendingList.astro`
- Modify: `src/components/molecules/RecurringPendingCard.astro`

**Step 1: Write the failing tests**

Create `src/__tests__/recurring-page-ux.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring page UX', () => {
  it('uses a month-aware queue heading on the recurring page', () => {
    const page = read('src/pages/recurring/index.astro');

    expect(page).toContain('const actionInboxTitle');
    expect(page).toContain("selectedMonthLabel.split(' ')[0]");
    expect(page).toContain('{actionInboxTitle}');
  });

  it('uses due wording instead of availability wording in queue states', () => {
    const desktop = read('src/components/organisms/RecurringPendingList.astro');
    const mobile = read('src/components/molecules/RecurringPendingCard.astro');

    expect(desktop).toContain('Due {dueLabel}');
    expect(desktop).not.toContain('Available on {dueLabel}');
    expect(mobile).toContain('Due {dueDateLabel}');
    expect(mobile).not.toContain('Available on {dueDateLabel}');
  });
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bun test src/__tests__/recurring-page-ux.test.ts
```

Expected: FAIL because the page still hardcodes `Due This Month`, and queue items still say `Available on`.

**Step 3: Write the minimal implementation**

In `src/pages/recurring/index.astro`, derive the heading from the selected month:

```typescript
const currentMonthHeadingLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(
  'en-US',
  { month: 'long', year: 'numeric' }
);
const actionInboxTitle =
  selectedMonthLabel === currentMonthHeadingLabel
    ? 'Due This Month'
    : `Due in ${selectedMonthLabel.split(' ')[0].toUpperCase()}`;
```

Use `{actionInboxTitle}` in the `<h2>`.

In both queue render paths, replace:

```astro
Available on {dueLabel}
```

with:

```astro
Due {dueLabel}
```

and:

```astro
Available on {dueDateLabel}
```

with:

```astro
Due {dueDateLabel}
```

**Step 4: Run the test to verify it passes**

Run:

```bash
bun test src/__tests__/recurring-page-ux.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/recurring-page-ux.test.ts src/pages/recurring/index.astro src/components/organisms/RecurringPendingList.astro src/components/molecules/RecurringPendingCard.astro
git commit -m "feat(recurring): align queue heading and due copy" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Turn the queue pills into real filters

**Files:**
- Create: `src/__tests__/recurring-queue-filters.test.ts`
- Modify: `src/components/organisms/RecurringPendingList.astro`
- Modify: `src/components/molecules/RecurringPendingCard.astro`
- Modify: `src/components/organisms/RecurringPage.client.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/recurring-queue-filters.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring queue filters', () => {
  it('renders queue pills as toggle buttons and tags queue items by type', () => {
    const list = read('src/components/organisms/RecurringPendingList.astro');
    const card = read('src/components/molecules/RecurringPendingCard.astro');

    expect(list).toContain('data-pending-filter="income"');
    expect(list).toContain('data-pending-filter="expense"');
    expect(list).toContain('data-occurrence-type={occurrence.templateType}');
    expect(card).toContain('data-occurrence-type={occurrence.templateType}');
  });

  it('reapplies the pending filter after queue refreshes', () => {
    const client = read('src/components/organisms/RecurringPage.client.ts');

    expect(client).toContain("let pendingTypeFilter: 'all' | 'income' | 'expense' = 'all';");
    expect(client).toContain('function applyPendingQueueFilter()');
    expect(client).toContain('applyPendingQueueFilter();');
  });
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bun test src/__tests__/recurring-queue-filters.test.ts
```

Expected: FAIL because the queue pills are plain `<span>` badges, and the client script has no filter helper.

**Step 3: Write the minimal implementation**

In `src/components/organisms/RecurringPendingList.astro`:

- Replace the decorative pills with `button[type="button"]`
- Add `data-pending-filter="income"` and `data-pending-filter="expense"`
- Add `aria-pressed` handling hooks
- Add `data-occurrence-type={occurrence.templateType}` to desktop rows

In `src/components/molecules/RecurringPendingCard.astro`:

- Add `data-occurrence-type={occurrence.templateType}` to the root `<article>`

In `src/components/organisms/RecurringPage.client.ts`:

- add `let pendingTypeFilter: 'all' | 'income' | 'expense' = 'all';`
- add `function applyPendingQueueFilter(): void`
- register click listeners for `[data-pending-filter]`
- call `applyPendingQueueFilter()` after `refreshPendingList()` replaces the container HTML

The filter logic should only show items whose `data-occurrence-type` matches the active filter. When no filter is active, show all items.

**Step 4: Run the test to verify it passes**

Run:

```bash
bun test src/__tests__/recurring-queue-filters.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/recurring-queue-filters.test.ts src/components/organisms/RecurringPendingList.astro src/components/molecules/RecurringPendingCard.astro src/components/organisms/RecurringPage.client.ts
git commit -m "feat(recurring): add queue type filters" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Redesign the recurring form markup

**Files:**
- Modify: `src/components/organisms/RecurringTemplateForm.test.ts`
- Modify: `src/components/organisms/RecurringTemplateForm.astro`
- Modify: `docs/sites/src/content/docs/end-users/recurring.md`
- Modify: `src/__tests__/recurring-copy-consistency.test.ts`

**Step 1: Write the failing tests**

Update `src/components/organisms/RecurringTemplateForm.test.ts` with these assertions:

```typescript
it('uses a merged schedule control', () => {
  const source = readRecurringTemplateForm();
  expect(source).toContain('data-recurring-schedule-block');
  expect(source).toContain('>Schedule<');
  expect(source).not.toContain('>Frequency<');
  expect(source).not.toContain('>Cycle<');
});

it('uses a no-end default end mode without required or optional badges', () => {
  const source = readRecurringTemplateForm();
  expect(source).toContain('data-end-mode="none"');
  expect(source).toContain('No end');
  expect(source).not.toContain('>Required<');
  expect(source).not.toContain('>Optional<');
});
```

Update `src/__tests__/recurring-copy-consistency.test.ts` so the docs match the new form wording:

```typescript
it('documents schedule presets and the no-end default', () => {
  const docs = readRecurringDocs();

  expect(docs).toContain('- **Schedule** - Set how often it repeats with presets such as Weekly, Monthly, Quarterly, Semi-annual, or Annual');
  expect(docs).toContain('- **End** - Leave it on No end for ongoing bills, subscriptions, or salary');
});
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
bun test src/components/organisms/RecurringTemplateForm.test.ts src/__tests__/recurring-copy-consistency.test.ts
```

Expected: FAIL because the form still shows `Frequency`, `Cycle`, `Required`, and `Optional`.

**Step 3: Write the minimal implementation**

In `src/components/organisms/RecurringTemplateForm.astro`:

- rename the block to `Schedule`
- keep the preset buttons
- keep `select[name="frequency"]` and `input[name="interval_count"]`, but present them as one row
- add a wrapper marker such as `data-recurring-schedule-block`
- replace the checkbox-style end controls with a single-choice radio group:

```astro
<input type="radio" name="end_mode" value="none" data-end-mode="none" checked />
<input type="radio" name="end_mode" value="count" data-end-mode="count" />
<input type="radio" name="end_mode" value="date" data-end-mode="date" />
```

- remove the `Required` and `Optional` badges

In `docs/sites/src/content/docs/end-users/recurring.md`, update the creation section to match:

- `Schedule`
- `No end`
- installment only for fixed-count payments

**Step 4: Run the tests to verify they pass**

Run:

```bash
bun test src/components/organisms/RecurringTemplateForm.test.ts src/__tests__/recurring-copy-consistency.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/organisms/RecurringTemplateForm.test.ts src/components/organisms/RecurringTemplateForm.astro docs/sites/src/content/docs/end-users/recurring.md src/__tests__/recurring-copy-consistency.test.ts
git commit -m "feat(recurring): simplify schedule form markup" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Update the form client logic for the new end modes

**Files:**
- Create: `src/__tests__/recurring-template-form-client.test.ts`
- Modify: `src/components/organisms/RecurringTemplateForm.client.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/recurring-template-form-client.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring template form client logic', () => {
  it('defaults new templates to no-end mode', () => {
    const client = read('src/components/organisms/RecurringTemplateForm.client.ts');

    expect(client).toContain("const endModeInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name=\"end_mode\"]'))");
    expect(client).toContain("setEndMode('none');");
  });

  it('builds payloads without forcing an end condition', () => {
    const client = read('src/components/organisms/RecurringTemplateForm.client.ts');

    expect(client).not.toContain("showError('At least one end condition is required.')");
    expect(client).toContain("if (selectedEndMode === 'count' && totalOccurrencesInput?.value)");
    expect(client).toContain("if (selectedEndMode === 'date' && endDateInput?.value)");
    expect(client).toContain('payload.total_occurrences = null;');
    expect(client).toContain('payload.end_date = null;');
  });
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bun test src/__tests__/recurring-template-form-client.test.ts
```

Expected: FAIL because the client still uses `use_count` / `use_date` checkboxes and blocks submissions with no end mode selected.

**Step 3: Write the minimal implementation**

In `src/components/organisms/RecurringTemplateForm.client.ts`:

- replace `useCount` / `useDate` handling with `end_mode`
- add helpers such as:

```typescript
const getSelectedEndMode = (): 'none' | 'count' | 'date' => { /* ... */ };
const setEndMode = (mode: 'none' | 'count' | 'date'): void => { /* ... */ };
```

- update `resetFormState()` to call `setEndMode('none')`
- update `populateEditState()` so:
  - `total_occurrences` => `count`
  - `end_date` => `date`
  - neither => `none`
- update payload creation so:
  - `none` sends no end fields on create
  - `none` sends `total_occurrences: null` and `end_date: null` on edit
  - installment is only enabled in `count` mode

Do not change `frequency`, `interval_count`, or `start_date` payload names.

**Step 4: Run the test to verify it passes**

Run:

```bash
bun test src/__tests__/recurring-template-form-client.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/recurring-template-form-client.test.ts src/components/organisms/RecurringTemplateForm.client.ts
git commit -m "feat(recurring): default form to no-end schedules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Run full verification and commit any follow-up fixes

**Files:**
- Modify: any files changed by lint, format, or follow-up fixes

**Step 1: Run the focused recurring test suite**

Run:

```bash
bun test \
  src/lib/validation/recurring.test.ts \
  src/services/recurring-template.service.test.ts \
  src/__tests__/recurring-page-ux.test.ts \
  src/__tests__/recurring-queue-filters.test.ts \
  src/components/organisms/RecurringTemplateForm.test.ts \
  src/__tests__/recurring-template-form-client.test.ts \
  src/__tests__/recurring-copy-consistency.test.ts
```

Expected: PASS.

**Step 2: Run the repo quality gates**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Expected: PASS on all commands.

**Step 3: Review the diff**

Run:

```bash
git --no-pager diff --stat
git --no-pager diff -- src/pages/recurring/index.astro src/components/organisms/RecurringPendingList.astro src/components/molecules/RecurringPendingCard.astro src/components/organisms/RecurringPage.client.ts src/components/organisms/RecurringTemplateForm.astro src/components/organisms/RecurringTemplateForm.client.ts src/lib/validation/recurring.ts docs/sites/src/content/docs/end-users/recurring.md
```

Expected: only recurring UX changes, tests, and docs updates.

**Step 4: Commit any follow-up fixes from verification**

```bash
git add src/lib/validation/recurring.test.ts src/lib/validation/recurring.ts src/services/recurring-template.service.test.ts src/services/recurring-template.service.ts src/__tests__/recurring-page-ux.test.ts src/__tests__/recurring-queue-filters.test.ts src/__tests__/recurring-template-form-client.test.ts src/__tests__/recurring-copy-consistency.test.ts src/pages/recurring/index.astro src/components/organisms/RecurringPendingList.astro src/components/molecules/RecurringPendingCard.astro src/components/organisms/RecurringPage.client.ts src/components/organisms/RecurringTemplateForm.test.ts src/components/organisms/RecurringTemplateForm.astro src/components/organisms/RecurringTemplateForm.client.ts docs/sites/src/content/docs/end-users/recurring.md
git commit -m "chore(recurring): polish queue and form follow-ups" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
