# Recurring Transactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a recurring transactions system where users create templates that generate monthly occurrences, confirmed manually via a dedicated `/recurring` page.

**Architecture:** Two-table model (recurring_templates + recurring_occurrences). Templates define the recurring bill/income. Occurrences are generated on-demand and require manual confirmation to create actual transactions. No background scheduler.

**Tech Stack:** Drizzle ORM (dual SQLite/PostgreSQL), Zod validation, Astro server-rendered pages, DaisyUI components, nanoid, Lucide icons.

**Design doc:** `docs/plans/2026-02-24-recurring-transactions-design.md`

---

## Phase 1: Foundation (Schema, Types, Validation)

### Task 1: Database Schema — SQLite

**Files:**

- Create: `src/db/schema/sqlite/recurring-templates.ts`
- Create: `src/db/schema/sqlite/recurring-occurrences.ts`
- Modify: `src/db/schema/sqlite/index.ts`
- Modify: `src/db/schema/sqlite/relations.ts`

**Step 1: Create `src/db/schema/sqlite/recurring-templates.ts`**

Follow the exact pattern from `src/db/schema/sqlite/transactions.ts`. Key points:

- Import `sqliteTable, text, integer, index` from `drizzle-orm/sqlite-core`
- Import `sqliteTimestampNow` from `./base`
- Import `workspaces` from `./workspaces`, `users` from `./users`, `categories` from `./categories`, `accounts` from `./accounts`
- Table name: `recurring_templates`
- Columns match the design doc exactly (see `2026-02-24-recurring-transactions-design.md` §recurring_templates table)
- `id`: text PK
- `workspace_id`: text FK → workspaces.id, cascade delete
- `created_by_user_id`: text FK → users.id
- `name`: text, notNull
- `type`: text enum `['expense', 'income']`, notNull
- `amount`: text, notNull (string for decimal precision)
- `currency`: text, notNull
- `category_id`: text FK → categories.id, notNull
- `account_id`: text FK → accounts.id, notNull
- `day_of_month`: integer, notNull (1-31)
- `start_date`: text, notNull (ISO date string like '2026-02-01')
- `end_date`: text (nullable)
- `total_occurrences`: integer (nullable)
- `is_installment`: integer boolean, default false, notNull
- `installment_label`: text (nullable)
- `starting_occurrence_number`: integer, default 1, notNull
- `description`: text (nullable)
- `status`: text enum `['active', 'paused', 'completed', 'cancelled']`, default 'active', notNull
- `created_at`: integer timestamp, default sqliteTimestampNow, notNull
- `updated_at`: integer timestamp, default sqliteTimestampNow, notNull
- Indexes: `workspace_id`, `workspace_id + status`, `category_id`

**Step 2: Create `src/db/schema/sqlite/recurring-occurrences.ts`**

- Table name: `recurring_occurrences`
- `id`: text PK
- `template_id`: text FK → recurringTemplates.id, cascade delete
- `workspace_id`: text FK → workspaces.id, cascade delete
- `due_date`: text, notNull (ISO date string)
- `occurrence_number`: integer, notNull
- `status`: text enum `['pending', 'confirmed', 'skipped']`, default 'pending', notNull
- `transaction_id`: text FK → transactions.id (nullable)
- `confirmed_amount`: text (nullable)
- `skip_reason`: text (nullable)
- `confirmed_at`: integer timestamp (nullable)
- `created_at`: integer timestamp, default sqliteTimestampNow, notNull
- Indexes: `template_id`, `workspace_id + status`, `workspace_id + due_date`, `transaction_id`

**Step 3: Add exports to `src/db/schema/sqlite/index.ts`**

Add before the relations export:

```typescript
export * from './recurring-templates';
export * from './recurring-occurrences';
```

**Step 4: Add relations to `src/db/schema/sqlite/relations.ts`**

Import both new tables. Add:

- `recurringTemplatesRelations`: workspace (one), createdBy (one), category (one), account (one), occurrences (many)
- `recurringOccurrencesRelations`: template (one), workspace (one), transaction (one)
- Update `workspacesRelations` to add `recurringTemplates: many(recurringTemplates)`
- Update `categoriesRelations` to add `recurringTemplates: many(recurringTemplates)`
- Update `accountsRelations` to add `recurringTemplates: many(recurringTemplates)`

**Step 5: Run typecheck**

```bash
bun run typecheck
```

**Step 6: Commit**

```bash
git add src/db/schema/sqlite/recurring-templates.ts src/db/schema/sqlite/recurring-occurrences.ts src/db/schema/sqlite/index.ts src/db/schema/sqlite/relations.ts
git commit -m "feat(db): add recurring_templates and recurring_occurrences SQLite schema"
```

---

### Task 2: Database Schema — PostgreSQL

**Files:**

- Create: `src/db/schema/postgresql/recurring-templates.ts`
- Create: `src/db/schema/postgresql/recurring-occurrences.ts`
- Modify: `src/db/schema/postgresql/index.ts`
- Modify: `src/db/schema/postgresql/relations.ts`

Mirror Task 1 exactly but use PostgreSQL conventions:

- Import from `drizzle-orm/pg-core` instead of `drizzle-orm/sqlite-core`
- Use `pgTable` instead of `sqliteTable`
- Use `timestamp('column')` instead of `integer('column', { mode: 'timestamp' })`
- Use `boolean('column')` instead of `integer('column', { mode: 'boolean' })`
- Use `.defaultNow()` instead of `.default(sqliteTimestampNow)`
- Add `.enableRLS()` and `pgPolicy` (follow `src/db/schema/postgresql/transactions.ts` pattern)
- Update relations file identically to SQLite

**Step 1:** Create `src/db/schema/postgresql/recurring-templates.ts`
**Step 2:** Create `src/db/schema/postgresql/recurring-occurrences.ts`
**Step 3:** Add exports to `src/db/schema/postgresql/index.ts`
**Step 4:** Add relations to `src/db/schema/postgresql/relations.ts` (same additions as Task 1 Step 4)
**Step 5:** Run typecheck: `bun run typecheck`
**Step 6:** Commit

---

### Task 3: Database Migrations

**Step 1: Generate SQLite migration**

```bash
bun run db:generate
```

**Step 2: Generate PostgreSQL migration**

```bash
bun run db:generate:prod
```

**Step 3: Apply SQLite migration (dev)**

```bash
bun run db:migrate
```

**Step 4: Commit migration files**

---

### Task 4: Enums, Types, and Validation Schemas

**Files:**

- Modify: `src/lib/enums.ts`
- Create: `src/lib/types/recurring.ts`
- Modify: `src/lib/types/index.ts`
- Create: `src/lib/validation/recurring.ts`

**Step 1: Add enums to `src/lib/enums.ts`**

```typescript
// Recurring template status enum
export const recurringTemplateStatusEnum = z.enum(['active', 'paused', 'completed', 'cancelled']);
export type RecurringTemplateStatus = z.infer<typeof recurringTemplateStatusEnum>;

// Recurring occurrence status enum
export const recurringOccurrenceStatusEnum = z.enum(['pending', 'confirmed', 'skipped']);
export type RecurringOccurrenceStatus = z.infer<typeof recurringOccurrenceStatusEnum>;
```

**Step 2: Create `src/lib/types/recurring.ts`**

Define interfaces:

- `RecurringTemplate` — DB model interface (all columns from schema)
- `RecurringTemplateOutput` — API output with category/account names
- `RecurringOccurrence` — DB model interface
- `RecurringOccurrenceOutput` — API output with template name, category info
- `RecurringStats` — `{ pendingCount: number, pendingAmount: string, overdueCount: number, confirmedThisMonth: number }`
- `RecurringCalendarDay` — `{ date: string, occurrences: RecurringOccurrenceOutput[] }`

**Step 3: Export from `src/lib/types/index.ts`**

```typescript
export * from './recurring';
```

**Step 4: Create `src/lib/validation/recurring.ts`**

Follow `src/lib/validation/transactions.ts` pattern with two layers:

**Service layer schemas:**

- `createRecurringTemplateSchema` — validates all fields, `.strict()`, `.refine()` for: at least one end condition (total_occurrences or end_date), is_installment requires total_occurrences, starting_occurrence_number < total_occurrences
- `updateRecurringTemplateSchema` — partial version, all optional except workspace_id
- `confirmOccurrenceSchema` — `{ amount: amountValidation, transaction_date: z.date(), workspace_id, user_id }`
- `skipOccurrenceSchema` — `{ skip_reason: z.string().max(200).optional() }`

**API layer schemas:**

- `createRecurringTemplateAPISchema` — same but `start_date` and `end_date` as YYYY-MM-DD strings, `day_of_month` as `z.coerce.number().int().min(1).max(31)`
- `confirmOccurrenceAPISchema` — `amount` as string, `transaction_date` as YYYY-MM-DD string

Export all types via `z.infer`.

**Step 5: Run typecheck**
**Step 6: Commit**

---

### Task 5: Cache Keys and Tags

**Files:**

- Modify: `src/lib/cache/tags.ts`
- Modify: `src/lib/cache/keys.ts`

**Step 1: Add tag to `src/lib/cache/tags.ts`**

```typescript
RECURRING: 'recurring' as const,
```

**Step 2: Add keys to `src/lib/cache/keys.ts`**

```typescript
/** Recurring templates list: cache:recurring:{workspaceId}:{filtersHash} */
recurring: (workspaceId: string, filtersHash: string): string =>
  `${PREFIX}:recurring:${workspaceId}:${filtersHash}`,

/** Recurring stats: cache:recurring-stats:{workspaceId} */
recurringStats: (workspaceId: string): string =>
  `${PREFIX}:recurring-stats:${workspaceId}`,
```

**Step 3: Run typecheck, commit**

---

## Phase 2: Service Layer

### Task 6: Occurrence Date Calculation Utility (TDD)

**Files:**

- Create: `src/lib/utils/recurring-dates.ts`
- Create: `src/lib/utils/recurring-dates.test.ts`

This is a pure function — perfect for TDD.

**Step 1: Write failing tests in `src/lib/utils/recurring-dates.test.ts`**

Test `calculateDueDate(startDate, dayOfMonth, occurrenceOffset)`:

- Normal month: start=2026-01, day=15, offset=0 → 2026-01-15
- Next month: start=2026-01, day=15, offset=1 → 2026-02-15
- Day 31 in 30-day month: start=2026-01, day=31, offset=3 → 2026-04-30
- Day 31 in Feb: start=2026-01, day=31, offset=1 → 2026-02-28
- Day 29 in Feb leap year: start=2028-01, day=29, offset=1 → 2028-02-29
- Day 29 in Feb non-leap: start=2026-01, day=29, offset=1 → 2026-02-28

Test `shouldGenerateOccurrence(template, occurrenceNumber, targetDate)`:

- Within count: total=12, current=5 → true
- At count limit: total=12, current=12 → true
- Exceeds count: total=12, current=13 → false
- Before end_date: end_date=2026-12-31, target=2026-06-15 → true
- After end_date: end_date=2026-06-30, target=2026-07-15 → false
- Both conditions, count first: total=3, end_date=2027-12-31, current=4 → false

Test `generateInstallmentDescription(name, label, occurrenceNumber, totalOccurrences)`:

- Normal: "iPhone 17 Pro", "Installment", 3, 12 → "iPhone 17 Pro - Installment 03/12"
- Pad single digit: occurrence=1, total=12 → "01/12"
- Custom label: label="Cicilan" → "iPhone 17 Pro - Cicilan 03/12"

**Step 2: Run tests to verify they fail**

```bash
bun test src/lib/utils/recurring-dates.test.ts
```

**Step 3: Implement `src/lib/utils/recurring-dates.ts`**

Three exported functions: `calculateDueDate`, `shouldGenerateOccurrence`, `generateInstallmentDescription`.

For `calculateDueDate`:

```typescript
export function calculateDueDate(
  startDate: string,
  dayOfMonth: number,
  monthOffset: number
): string {
  const [year, month] = startDate.split('-').map(Number);
  const targetMonth = month - 1 + monthOffset; // 0-based
  const targetDate = new Date(year, Math.floor(targetMonth / 12) + (year - year), 0); // ...
  // Use new Date(year, month, 0).getDate() to get last day of month
  // Clamp dayOfMonth to lastDay
  // Return ISO date string YYYY-MM-DD
}
```

**Step 4: Run tests to verify they pass**
**Step 5: Commit**

---

### Task 7: RecurringTemplateService

**Files:**

- Create: `src/services/recurring-template.service.ts`
- Create: `src/services/recurring-template.service.test.ts`

**Step 1: Write failing tests for `create()`, `findAll()`, `findById()`, `update()`**

Follow `src/services/transaction.service.test.ts` pattern:

- Use `bun:test` with `describe/it/expect`
- Import service class, create with mock DB or real test DB
- Test: create returns template with generated occurrences
- Test: create with installment generates correct description
- Test: create rejects when neither end_date nor total_occurrences set
- Test: findAll returns templates with occurrence stats (pending/confirmed counts)

**Step 2: Run tests to verify they fail**

**Step 3: Implement `RecurringTemplateService`**

Follow `src/services/transaction.service.ts` pattern exactly:

```typescript
import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { createLogger } from '@/lib/logger';
const log = createLogger('recurring-template');
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createRecurringTemplateSchema, type CreateRecurringTemplateInput } from '@/lib/validation/recurring';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';

export class RecurringTemplateService {
  private get schema() { return getActiveSchema(); }
  private db: IDatabase;

  constructor(db: IDatabase) { this.db = db; }

  async create(input: CreateRecurringTemplateInput) { ... }
  async findAll(workspaceId: string) { ... }
  async findById(id: string, workspaceId: string) { ... }
  async update(id: string, workspaceId: string, data: UpdateRecurringTemplateInput) { ... }
  async pause(id: string, workspaceId: string) { ... }
  async resume(id: string, workspaceId: string) { ... }
  async cancel(id: string, workspaceId: string) { ... }
  async delete(id: string, workspaceId: string) { ... }
  async generateOccurrences(workspaceId: string) { ... }
}
```

Key implementation details for `create()`:

1. Validate input with Zod schema
2. Insert template with `nanoid()` ID
3. Call `generateOccurrences()` for this template to create first occurrence(s)
4. Invalidate cache

Key implementation for `generateOccurrences()`:

1. Find all active templates for workspace
2. For each template, find max occurrence_number from existing occurrences
3. Calculate next due dates using `calculateDueDate()`
4. Check `shouldGenerateOccurrence()` — generate up to current month + 1 month lookahead
5. Insert new pending occurrences
6. Mark template completed if all occurrences generated

Key implementation for `cancel()`:

1. Update template status to 'cancelled'
2. Delete all pending occurrences (preserve confirmed/skipped)
3. Invalidate cache

**Step 4: Run tests to verify they pass**
**Step 5: Commit**

---

### Task 8: RecurringOccurrenceService

**Files:**

- Create: `src/services/recurring-occurrence.service.ts`
- Create: `src/services/recurring-occurrence.service.test.ts`

**Step 1: Write failing tests for `findPending()`, `confirm()`, `skip()`, `getStats()`**

- Test: findPending returns only pending occurrences for workspace, sorted by due_date
- Test: confirm creates transaction via TransactionService.create(), updates occurrence
- Test: confirm with custom amount stores confirmed_amount
- Test: skip marks occurrence as skipped with reason
- Test: getStats returns correct counts and amounts

**Step 2: Run tests to verify they fail**

**Step 3: Implement `RecurringOccurrenceService`**

```typescript
export class RecurringOccurrenceService {
  private get schema() { return getActiveSchema(); }
  private db: IDatabase;
  private transactionService: TransactionService;

  constructor(db: IDatabase) {
    this.db = db;
    this.transactionService = new TransactionService(db);
  }

  async findPending(workspaceId: string, month?: string) { ... }
  async findByTemplate(templateId: string, workspaceId: string) { ... }
  async confirm(id: string, workspaceId: string, input: ConfirmOccurrenceInput) { ... }
  async skip(id: string, workspaceId: string, reason?: string) { ... }
  async getCalendarData(workspaceId: string, year: number, month: number) { ... }
  async getStats(workspaceId: string) { ... }
}
```

Key implementation for `confirm()`:

1. Find occurrence by id + workspace_id, verify status = 'pending'
2. Find template to get category_id, account_id, etc.
3. Build transaction description (installment label if applicable)
4. Call `this.transactionService.create({ ...template fields, amount: input.amount, transaction_date: input.transaction_date })`
5. Update occurrence: status='confirmed', transaction_id, confirmed_amount, confirmed_at=new Date()
6. Invalidate cache (RECURRING + TRANSACTIONS + DASHBOARD)

Key implementation for `getStats()`:

1. Count pending occurrences where due_date <= today (overdue)
2. Count pending occurrences for current month
3. Sum pending amounts
4. Count confirmed this month
5. Return `RecurringStats` object

**Step 4: Run tests to verify they pass**
**Step 5: Commit**

---

### Task 9: Register Service Singletons

**Files:**

- Modify: `src/services/index.ts`

**Step 1: Add imports and exports**

```typescript
import { RecurringTemplateService } from './recurring-template.service';
import { RecurringOccurrenceService } from './recurring-occurrence.service';

// Re-exports
export * from './recurring-template.service';
export * from './recurring-occurrence.service';

// Singletons
export const recurringTemplateService = new RecurringTemplateService(db);
export const recurringOccurrenceService = new RecurringOccurrenceService(db);
```

**Step 2: Run typecheck, commit**

---

## Phase 3: API Layer

### Task 10: Template CRUD API Routes

**Files:**

- Create: `src/pages/api/recurring/index.ts` (GET list, POST create)
- Create: `src/pages/api/recurring/[id]/index.ts` (GET detail, PUT update, DELETE)

Follow `src/pages/api/transactions/index.ts` pattern exactly:

- `getAuthenticatedUser(context)` for auth
- `validateBody(request, schema)` for POST/PUT validation
- `successResponse()` / `errorResponse()` for responses
- HTML rendering support via `createRenderHelper(url)` + `AstroContainer` (for partials)
- Workspace scoping on all queries

**GET /api/recurring:**

1. Auth check
2. Parse query params: `status` filter (active/paused/completed/cancelled/all), `_render=html`
3. Call `recurringTemplateService.findAll(workspaceId)`
4. Also call `recurringTemplateService.generateOccurrences(workspaceId)` (on-demand generation)
5. Return JSON or render HTML partial

**POST /api/recurring:**

1. Auth check, validate Content-Type
2. Validate body with `createRecurringTemplateAPISchema`
3. Convert date strings
4. Call `recurringTemplateService.create({ workspace_id, created_by_user_id, ...validated })`
5. Return 201

**GET /api/recurring/[id]:**

1. Auth check, get id from params
2. Call `recurringTemplateService.findById(id, workspaceId)`
3. Return template with occurrence history

**PUT /api/recurring/[id]:**

1. Auth check, validate body
2. Call `recurringTemplateService.update(id, workspaceId, data)`
3. Return updated template

**DELETE /api/recurring/[id]:**

1. Auth check
2. Call `recurringTemplateService.delete(id, workspaceId)`
3. Return 204

**Commit after implementing and passing typecheck.**

---

### Task 11: Template Action API Routes

**Files:**

- Create: `src/pages/api/recurring/[id]/pause.ts` (POST)
- Create: `src/pages/api/recurring/[id]/resume.ts` (POST)
- Create: `src/pages/api/recurring/[id]/cancel.ts` (POST)

Each follows same pattern:

1. Auth check
2. Get `id` from `context.params`
3. Call service method
4. Return success response

**Commit after implementing.**

---

### Task 12: Occurrence API Routes

**Files:**

- Create: `src/pages/api/recurring/occurrences/index.ts` (GET pending)
- Create: `src/pages/api/recurring/occurrences/[id]/confirm.ts` (POST)
- Create: `src/pages/api/recurring/occurrences/[id]/skip.ts` (POST)
- Create: `src/pages/api/recurring/calendar.ts` (GET)
- Create: `src/pages/api/recurring/stats.ts` (GET)

**GET /api/recurring/occurrences:**

1. Auth check
2. Parse query params: `month` (YYYY-MM), `status`, `due_within` (e.g., '7d')
3. Call `recurringOccurrenceService.findPending(workspaceId, month)`
4. Support HTML rendering for partials

**POST /api/recurring/occurrences/[id]/confirm:**

1. Auth check
2. Validate body with `confirmOccurrenceAPISchema`
3. Convert `transaction_date` string to Date
4. Call `recurringOccurrenceService.confirm(id, workspaceId, { amount, transaction_date, userId })`
5. Return created transaction

**POST /api/recurring/occurrences/[id]/skip:**

1. Auth check
2. Parse optional `skip_reason` from body
3. Call `recurringOccurrenceService.skip(id, workspaceId, reason)`
4. Return success

**GET /api/recurring/calendar:**

1. Auth check
2. Parse `year` and `month` from query
3. Call `recurringOccurrenceService.getCalendarData(workspaceId, year, month)`
4. Return array of days with occurrences

**GET /api/recurring/stats:**

1. Auth check
2. Call `recurringOccurrenceService.getStats(workspaceId)`
3. Return stats object

**Commit after implementing.**

---

## Phase 4: UI — /recurring Page

### Task 13: Navigation Sidebar Update

**Files:**

- Modify: `src/components/layouts/Navigation.astro`

**Step 1: Add Recurring to navItems array**

Insert after the Transactions entry (between `Receipt` and `Donut`):

```typescript
{ href: '/recurring', label: 'Recurring', icon: RefreshCw },
```

Import `RefreshCw` from `@lucide/astro`.

**Step 2: Verify in browser**

Run dev server, check sidebar shows "Recurring" nav item.

**Step 3: Commit**

---

### Task 14: /recurring Page — List View

**Files:**

- Create: `src/pages/recurring/index.astro`
- Create: `src/components/organisms/RecurringPendingList.astro`
- Create: `src/components/molecules/RecurringPendingCard.astro`
- Create: `src/components/organisms/RecurringTemplateList.astro`
- Create: `src/components/molecules/RecurringTemplateRow.astro`

**Step 1: Create page `src/pages/recurring/index.astro`**

Follow `src/pages/transactions/index.astro` pattern:

- Import ProtectedLayout
- Frontmatter: auth, fetch templates + pending occurrences via services
- Trigger on-demand generation: `recurringTemplateService.generateOccurrences(workspaceId)`
- Layout: header with title + "+ New Template" button, view toggle tabs (List/Calendar), month navigator
- Render `RecurringPendingList` (pending this month section) and `RecurringTemplateList` (all templates)

**Step 2: Create `RecurringPendingList.astro`**

Props: `occurrences: RecurringOccurrenceOutput[]`

- Section header: "PENDING THIS MONTH (N)"
- Empty state if no pending
- Map occurrences to `RecurringPendingCard`

**Step 3: Create `RecurringPendingCard.astro`**

Props: `occurrence: RecurringOccurrenceOutput`

- Card with: icon (category icon), name, amount (formatted), due date, installment label if applicable
- Overdue badge if `due_date < today`
- [Confirm] button (opens confirm modal) and [Skip] button
- Use DaisyUI card classes: `card bg-base-100 border border-base-300`
- Status colors: overdue=error, pending=warning, confirmed=success

**Step 4: Create `RecurringTemplateList.astro`**

Props: `templates: RecurringTemplateOutput[]`

- Section header: "ALL TEMPLATES (N)"
- Table/card layout with: name, amount, day of month, status badge, occurrence progress (for installments)
- Status badges: Active=badge-success, Paused=badge-warning, Completed=badge-info, Cancelled=badge-error
- Each row links to template detail / has edit/actions dropdown

**Step 5: Create `RecurringTemplateRow.astro`**

Props: `template: RecurringTemplateOutput`

- Row with name, type icon, formatted amount, "Nth" day, status badge
- If installment: show progress "5/12"
- Actions: Edit, Pause/Resume, Cancel

**Step 6: Run typecheck and verify in browser**
**Step 7: Commit**

---

### Task 15: Create/Edit Template Form

**Files:**

- Create: `src/components/organisms/RecurringTemplateForm.astro`
- Create: `src/components/organisms/RecurringTemplateForm.client.ts`

**Step 1: Create `RecurringTemplateForm.astro`**

A modal or drawer form (follow TransactionDrawer pattern):

- Fields: name, type (expense/income toggle), amount, category (filtered by type), account, day_of_month (1-31 select), start_month (month picker)
- End condition: radio group (by count / by date), count input or date picker
- Installment checkbox: shows starting_occurrence_number and installment_label inputs when checked
- Description textarea (optional)
- Cancel and Save buttons
- Form POSTs to `/api/recurring` (create) or PUTs to `/api/recurring/[id]` (edit)
- Pre-fill for edit mode via `data-template` attribute

**Step 2: Create client script `RecurringTemplateForm.client.ts`**

- Handle form submission via fetch API
- Toggle category list based on type selection
- Show/hide installment fields based on checkbox
- Show/hide end condition fields based on radio selection
- Success: close modal, reload pending list via HTMX-style fetch
- Error: show toast with validation errors

**Step 3: Verify form works in browser**
**Step 4: Commit**

---

### Task 16: Confirm Modal

**Files:**

- Create: `src/components/organisms/RecurringConfirmModal.astro`
- Create: `src/components/organisms/RecurringConfirmModal.client.ts`

**Step 1: Create `RecurringConfirmModal.astro`**

DaisyUI modal (`dialog` element):

- Amount input (pre-filled, editable)
- Date input (pre-filled with due_date, editable)
- Category display (read-only, from template)
- Account display (read-only, from template)
- Cancel and Confirm buttons
- Occurrence data passed via `data-occurrence` attribute on trigger button

**Step 2: Create client script**

- Listen for confirm button clicks on pending cards
- Populate modal fields from `data-occurrence` JSON
- On submit: POST to `/api/recurring/occurrences/[id]/confirm`
- On success: close modal, remove card from DOM or refresh section, show success toast
- On error: show error toast

**Step 3: Create skip handler**

In the same client script or a separate one:

- Listen for skip button clicks
- Show small confirm dialog (DaisyUI modal) with optional reason textarea
- POST to `/api/recurring/occurrences/[id]/skip`
- On success: update card status, show toast

**Step 4: Verify in browser**
**Step 5: Commit**

---

### Task 17: Calendar View

**Files:**

- Create: `src/components/organisms/RecurringCalendar.astro`
- Create: `src/components/organisms/RecurringCalendar.client.ts`

**Step 1: Create `RecurringCalendar.astro`**

Server-rendered month calendar grid:

- Props: `calendarData: RecurringCalendarDay[]`, `year: number`, `month: number`
- 7-column grid (Mon-Sun)
- Each day cell shows: day number, occurrence dots (color-coded by status)
- Occurrence names shown on their day
- Legend at bottom: overdue (error), pending (warning), confirmed (success), skipped (neutral)
- Use DaisyUI grid classes

**Step 2: Create client script**

- View toggle between list/calendar (tabs at top of page)
- Month navigation fetches new calendar data via `/api/recurring/calendar?year=X&month=Y`
- Clicking an occurrence in calendar opens confirm modal

**Step 3: Wire up view toggle in `src/pages/recurring/index.astro`**

Add tab buttons and both views (show/hide based on active tab).

**Step 4: Verify in browser**
**Step 5: Commit**

---

### Task 18: /recurring Page Client Script

**Files:**

- Create: `src/pages/recurring/recurring.client.ts`

**Step 1: Implement**

Central client script for the recurring page:

- View toggle (list/calendar tabs)
- Month navigation (previous/next month, updates URL and re-fetches data)
- Refresh pending list after confirm/skip actions
- "+ New Template" button opens the form modal
- Template row actions (edit, pause, resume, cancel) via fetch API calls

Follow the pattern from `src/pages/transactions/transactions.client.ts` (if exists) or use `data-*` attributes for element binding.

**Step 2: Commit**

---

## Phase 5: Integration Points

### Task 19: Dashboard Widget

**Files:**

- Create: `src/components/organisms/RecurringBillsWidget.astro`
- Modify: `src/pages/dashboard.astro`
- Modify: `src/services/dashboard.service.ts`

**Step 1: Add `getRecurringStats()` to DashboardService**

In `src/services/dashboard.service.ts`, add a method that calls `recurringOccurrenceService.getStats(workspaceId)`. Include in the parallel data fetch in `getDashboardData()`.

**Step 2: Create `RecurringBillsWidget.astro`**

Small dashboard card:

- Props: `stats: RecurringStats`
- Shows: "N bills pending" with total amount
- Overdue count if > 0 with error badge
- Link to `/recurring`
- Follow existing widget pattern (consistent card styling)

**Step 3: Add widget to `src/pages/dashboard.astro`**

Import and render `RecurringBillsWidget` with stats data from dashboard service.

**Step 4: Verify in browser**
**Step 5: Commit**

---

### Task 20: Transaction Page Badge

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro`
- Modify: `src/services/transaction.service.ts` (or add query to occurrence service)

**Step 1: Add recurring badge logic**

Option A (efficient): When fetching transactions, LEFT JOIN to recurring_occurrences where transaction_id matches. Add `is_recurring: boolean` to TransactionOutput.

Option B (simpler): In TransactionCard, check if the transaction was created from a recurring template by querying occurrence table. This is less efficient.

**Recommended: Option A.** Modify `TransactionService.findAll()` to include a subquery check:

```sql
EXISTS (SELECT 1 FROM recurring_occurrences WHERE transaction_id = transactions.id) as is_recurring
```

**Step 2: Add badge to `TransactionCard.astro`**

If `transaction.is_recurring`:

```html
<span class="badge badge-sm badge-outline badge-accent gap-1" title="From recurring template">
  <RefreshCw size="{12}" /> Recurring
</span>
```

**Step 3: Verify in browser**
**Step 4: Commit**

---

### Task 21: CashFlowWidget Integration

**Files:**

- Modify: `src/lib/cash-flow.ts`
- Modify: `src/components/organisms/CashFlowWidget.astro`
- Modify: `src/services/dashboard.service.ts`

**Step 1: Fetch upcoming recurring bills**

In `DashboardService.getDashboardData()`, add a call to get pending occurrences due within next 7 days:

```typescript
const upcomingBills = await recurringOccurrenceService.findPending(
  workspaceId /* next 7 days filter */
);
```

**Step 2: Convert to CashFlowEntry format**

Map recurring occurrences to `CashFlowEntry[]`:

```typescript
const recurringEntries: CashFlowEntry[] = upcomingBills.map((occ) => ({
  name: occ.templateName,
  date: occ.due_date,
  amount: parseFloat(occ.amount),
  type: occ.templateType as 'income' | 'expense',
  icon: 'calendar' as const,
  currency: occ.currency,
}));
```

Merge with existing cash flow entries, sort by date.

**Step 3: Verify widget shows upcoming bills**
**Step 4: Commit**

---

### Task 22: Reports Integration

**Files:**

- Modify: `src/services/report.service.ts`
- Create: `src/components/organisms/RecurringVsOneTimeChart.astro` (or modify existing reports component)
- Modify: `src/pages/reports/index.astro`

**Step 1: Add recurring breakdown to ReportService**

New method `getRecurringBreakdown(workspaceId, year, month, currency)`:

- Query confirmed occurrences for the month → sum as "recurring expenses"
- Query total expenses for month → subtract recurring = "one-time expenses"
- Return `{ recurringTotal: string, oneTimeTotal: string, recurringByCategory: [...] }`

**Step 2: Create chart component**

Simple bar or donut chart showing recurring vs one-time split.
Use existing Chart.js setup from `@/lib/chart-setup`.

**Step 3: Add to reports page**

Import component, pass data from report service.

**Step 4: Commit**

---

### Task 23: Budget Warning

**Files:**

- Modify: `src/services/budget.service.ts`
- Modify: existing budget components (wherever category budgets are displayed)

**Step 1: Add recurring total to budget data**

In `BudgetService`, when fetching budget overview for a month:

- Query active recurring templates grouped by category_id
- Sum amounts per category
- Compare with budget limit
- Add `recurringTotal` and `isRecurringOverBudget` to budget output

**Step 2: Show warning in budget UI**

Where category budgets are displayed, add a warning badge:

```html
{budget.isRecurringOverBudget && (
<span class="badge badge-sm badge-warning gap-1"> Recurring exceeds budget </span>
)}
```

**Step 3: Commit**

---

## Phase 6: CLI + Seeder

### Task 24: CLI Command

**Files:**

- Create: `src/cli/commands/recurring.ts`
- Modify: `src/cli/index.ts`

**Step 1: Create `src/cli/commands/recurring.ts`**

```typescript
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'recurring', description: 'Recurring transactions management' },
  subCommands: {
    generate: defineCommand({
      meta: {
        name: 'generate',
        description: 'Generate pending occurrences for all active templates',
      },
      async run() {
        const { db } = await import('@/db');
        const { RecurringTemplateService } = await import('@/services/recurring-template.service');
        const service = new RecurringTemplateService(db);
        // Fetch all workspaces, generate for each
        console.log('Generating recurring occurrences...');
        // ... implementation
        console.log('Done.');
      },
    }),
  },
});
```

**Step 2: Register in `src/cli/index.ts`**

Add to subCommands:

```typescript
recurring: () => import('./commands/recurring').then((m) => m.default),
```

**Step 3: Test CLI command**

```bash
bun run aw recurring generate
```

**Step 4: Commit**

---

### Task 25: Seeder Data

**Files:**

- Modify: `src/db/seed.ts`

**Step 1: Add recurring template seed data**

After transaction seeding, add sample recurring templates:

```typescript
// Recurring templates
const recurringTemplateData = [
  {
    name: 'Rent',
    type: 'expense',
    amount: '5000000',
    dayOfMonth: 1,
    category: 'Housing',
    totalOccurrences: 24,
  },
  {
    name: 'Netflix',
    type: 'expense',
    amount: '199000',
    dayOfMonth: 15,
    category: 'Entertainment',
    totalOccurrences: 12,
  },
  {
    name: 'iPhone 17 Pro',
    type: 'expense',
    amount: '1500000',
    dayOfMonth: 20,
    category: 'Shopping',
    totalOccurrences: 12,
    isInstallment: true,
    installmentLabel: 'Installment',
    startingOccurrence: 5,
  },
  {
    name: 'Gym Membership',
    type: 'expense',
    amount: '500000',
    dayOfMonth: 5,
    category: 'Health',
    status: 'paused',
  },
  {
    name: 'Monthly Salary',
    type: 'income',
    amount: '15000000',
    dayOfMonth: 25,
    category: 'Salary',
    endDate: '2027-12-31',
  },
];
```

Insert templates and generate initial occurrences. Confirm a few past occurrences to show mixed states.

**Step 2: Run seeder**

```bash
bun run aw db seed
```

**Step 3: Verify data in browser**
**Step 4: Commit**

---

## Phase 7: Quality Gates

### Task 26: Final Quality Gates and Build

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Run tests**

```bash
bun run test
```

**Step 3: Run build**

```bash
bun run build
```

**Step 4: Fix any issues**

**Step 5: Final commit**

---

## Task Dependencies

```
Task 1 (SQLite schema)
Task 2 (PostgreSQL schema) ── can parallel with Task 1
  ↓
Task 3 (Migrations) ── depends on 1 + 2
Task 4 (Enums/Types/Validation) ── can parallel with Task 3
Task 5 (Cache keys) ── can parallel with Task 3
  ↓
Task 6 (Date utility) ── depends on 4
Task 7 (TemplateService) ── depends on 3, 4, 5, 6
Task 8 (OccurrenceService) ── depends on 7
Task 9 (Service singletons) ── depends on 7, 8
  ↓
Task 10-12 (API routes) ── depends on 9, can parallel with each other
  ↓
Task 13 (Nav sidebar) ── independent
Task 14 (List view page) ── depends on 10-12
Task 15 (Template form) ── depends on 14
Task 16 (Confirm modal) ── depends on 14
Task 17 (Calendar view) ── depends on 14
Task 18 (Client script) ── depends on 14-17
  ↓
Task 19-23 (Integrations) ── depends on 9, can parallel with each other
Task 24-25 (CLI + Seeder) ── depends on 7, 8
  ↓
Task 26 (Quality gates) ── depends on all
```

### Parallelization Opportunities

**Wave 1 (Foundation):** Tasks 1+2 in parallel, then 3+4+5 in parallel
**Wave 2 (Services):** Task 6 first, then 7→8→9 sequential
**Wave 3 (API):** Tasks 10+11+12 in parallel
**Wave 4 (UI):** Task 13 independent, then 14→15+16+17 (15/16/17 parallel after 14)
**Wave 5 (Integrations):** Tasks 19+20+21+22+23+24+25 all parallel (different files)
**Wave 6 (Final):** Task 26
