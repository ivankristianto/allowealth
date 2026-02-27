# Recurring Transactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a recurring transactions system where users create templates that generate monthly occurrences, confirmed manually via a dedicated `/recurring` page.

**Architecture:** Two-table model (recurring_templates + recurring_occurrences). Templates define the recurring bill/income. Occurrences are generated on-demand and require manual confirmation to create actual transactions. No in-app background scheduler — occurrence generation relies on CLI cron job (`bun run aw recurring generate`) run externally.

**Tech Stack:** Drizzle ORM (dual SQLite/PostgreSQL), Zod validation, Astro server-rendered pages, DaisyUI components, nanoid, Lucide icons.

**Design doc:** `docs/plans/2026-02-24-recurring-transactions-design.md`

**Revised:** 2026-02-25 (consolidated review feedback + Codex issue fixes: future-date bypass, compensating logic, audit path/types, end condition both-allowed, cancel semantics, filtering signatures, route protection, event names, file paths, generation triggers, pagination, partial refresh, start_month conversion, CLI schema import)

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
- Indexes: `recurring_templates_workspace_id_idx`, `recurring_templates_workspace_id_status_idx`, `recurring_templates_category_id_idx`

**Step 2: Create `src/db/schema/sqlite/recurring-occurrences.ts`**

- Table name: `recurring_occurrences`
- `id`: text PK
- `template_id`: text FK → recurringTemplates.id, cascade delete
- `workspace_id`: text FK → workspaces.id, cascade delete
- `due_date`: text, notNull (ISO date string)
- `occurrence_number`: integer, notNull
- `status`: text enum `['pending', 'confirmed', 'skipped']`, default 'pending', notNull
- `transaction_id`: text FK → transactions.id (nullable, **unique**)
- `confirmed_amount`: text (nullable)
- `skip_reason`: text (nullable)
- `confirmed_at`: integer timestamp (nullable)
- `created_at`: integer timestamp, default sqliteTimestampNow, notNull
- `updated_at`: integer timestamp, default sqliteTimestampNow, notNull
- Indexes: `recurring_occurrences_template_id_idx`, `recurring_occurrences_workspace_id_status_idx`, `recurring_occurrences_workspace_id_due_date_idx`, `recurring_occurrences_transaction_id_idx`
- **UNIQUE constraint:** `unique('recurring_occurrences_template_occurrence_unique').on(table.template_id, table.occurrence_number)` — prevents duplicate generation

**Step 3: Add exports to `src/db/schema/sqlite/index.ts`**

Add after transactions export (dependency order — recurring depends on transactions):

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
- Add CHECK constraint on recurring_templates: `CHECK (NOT is_installment OR total_occurrences IS NOT NULL)`
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

> **Note:** If `db:generate:prod` / `db:migrate:prod` scripts don't exist in `package.json`, add them with the appropriate drizzle config flag for PostgreSQL dialect, or use `drizzle-kit generate --dialect=postgresql` directly. Check current `drizzle.config.ts` for the setup pattern.

**Step 3: Apply SQLite migration (dev)**

```bash
bun run db:migrate
```

**Step 4: Commit migration files**

---

### Task 4: Enums, Types, Validation Schemas, and Service Errors

**Files:**

- Modify: `src/lib/enums.ts`
- Create: `src/lib/types/recurring.ts`
- Modify: `src/lib/types/index.ts`
- Create: `src/lib/validation/recurring.ts`
- Modify: `src/services/service-errors.ts`

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

- `RecurringTemplate` — DB model interface (all columns from schema, including `updated_at` on occurrences)
- `RecurringTemplateOutput` — API output with category/account names, `nextDueDate: string | null`
- `RecurringOccurrence` — DB model interface
- `RecurringOccurrenceOutput` — API output with template name, category info, `templateAmount`, `templateType`
- `RecurringStats` — `{ pendingCount: number, pendingByCurrency: { currency: string, amount: string }[], overdueCount: number, confirmedThisMonth: number }`
- `RecurringCalendarDay` — `{ date: string, occurrences: RecurringOccurrenceOutput[] }`

**Step 3: Export from `src/lib/types/index.ts`**

```typescript
export * from './recurring';
```

**Step 4: Create `src/lib/validation/recurring.ts`**

Follow `src/lib/validation/transactions.ts` pattern with two layers:

**Service layer schemas:**

- `createRecurringTemplateSchema` — validates all fields, `.strict()`, `.refine()` for: at least one end condition (total_occurrences or end_date), is_installment requires total_occurrences, `starting_occurrence_number >= 1`, `starting_occurrence_number <= total_occurrences` (when set), `day_of_month` range 1-31
- `updateRecurringTemplateSchema` — partial version, all optional except workspace_id
- `confirmOccurrenceSchema` — `{ amount: amountValidation, transaction_date: z.date(), category_id: z.string(), account_id: z.string(), workspace_id, user_id }` — **no future-date restriction** (unlike `createTransactionSchema` which has `z.date().refine(date => date <= new Date())` at `src/lib/validation/transactions.ts:30`)

**Implementation for future-date bypass:** Add an optional `skipDateValidation?: boolean` parameter to `TransactionService.create()`. When `true`, use a schema variant without the future-date refine. The `RecurringOccurrenceService.confirm()` method passes `skipDateValidation: true` when calling `TransactionService.create()`. This keeps the bypass explicit and auditable — normal transaction creation still rejects future dates.

- `skipOccurrenceSchema` — `{ skip_reason: z.string().max(200).optional() }`

**API layer schemas:**

- `createRecurringTemplateAPISchema` — same but `start_date` and `end_date` as YYYY-MM-DD strings, `day_of_month` as `z.coerce.number().int().min(1).max(31)`
- `confirmOccurrenceAPISchema` — `amount` as string, `transaction_date` as YYYY-MM-DD string, `category_id` and `account_id` as strings

Export all types via `z.infer`.

**Step 5: Extend audit types in `src/lib/audit-log.ts`**

Add to `AuditAction` union type: `'recurring_template.create'`, `'recurring_template.update'`, `'recurring_template.pause'`, `'recurring_template.resume'`, `'recurring_template.cancel'`, `'recurring_template.delete'`, `'recurring_occurrence.confirm'`, `'recurring_occurrence.skip'`

Add to `AuditEntityType` union type: `'recurring_template'`, `'recurring_occurrence'`

**Note:** `logAuditEvent()` uses its own global DB connection (not transaction-scoped). This means audit logs are written outside the confirm transaction — they will persist even if the transaction rolls back. This is acceptable since audit logs should survive failures for debugging.

**Step 6: Add `RecurringServiceError` to `src/services/service-errors.ts`**

Add error class and codes following existing pattern:

```typescript
// Error codes
RECURRING_TEMPLATE_NOT_FOUND;
RECURRING_OCCURRENCE_NOT_FOUND;
OCCURRENCE_ALREADY_CONFIRMED;
OCCURRENCE_ALREADY_SKIPPED;
TEMPLATE_NOT_ACTIVE;
TEMPLATE_ALREADY_CANCELLED;
```

**Step 7: Run typecheck**
**Step 8: Commit**

---

### Task 5: Cache Keys and Tags

**Files:**

- Modify: `src/lib/cache/tags.ts`
- Modify: `src/lib/cache/keys.ts`

**Step 1: Add tags to `src/lib/cache/tags.ts`**

```typescript
RECURRING: 'recurring' as const,
RECURRING_OCCURRENCES: 'recurring-occurrences' as const,
RECURRING_CALENDAR: 'recurring-calendar' as const,
```

**Step 2: Add keys to `src/lib/cache/keys.ts`**

```typescript
/** Recurring templates list: cache:recurring:{workspaceId}:{filtersHash} */
recurring: (workspaceId: string, filtersHash: string): string =>
  `${PREFIX}:recurring:${workspaceId}:${filtersHash}`,

/** Recurring stats: cache:recurring-stats:{workspaceId} */
recurringStats: (workspaceId: string): string =>
  `${PREFIX}:recurring-stats:${workspaceId}`,

/** Recurring occurrences list: cache:recurring-occurrences:{workspaceId}:{filtersHash} */
recurringOccurrences: (workspaceId: string, filtersHash: string): string =>
  `${PREFIX}:recurring-occurrences:${workspaceId}:${filtersHash}`,

/** Recurring calendar: cache:recurring-calendar:{workspaceId}:{year}:{month} */
recurringCalendar: (workspaceId: string, year: number, month: number): string =>
  `${PREFIX}:recurring-calendar:${workspaceId}:${year}:${month}`,
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
- Test: cancel deletes pending occurrences, preserves confirmed
- Test: generateOccurrences is idempotent (second call creates no duplicates)

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
import { logAuditEvent } from '@/lib/audit-log';

export class RecurringTemplateService {
  private schema = getActiveSchema(); // property, NOT getter
  private db: IDatabase;

  constructor(db: IDatabase) { this.db = db; }

  async create(input: CreateRecurringTemplateInput) { ... }
  async findAll(workspaceId: string, filters?: { status?: string, page?: number, limit?: number }, perf?: PerfCollector) { ... }
  async findById(id: string, workspaceId: string) { ... }
  async update(id: string, workspaceId: string, data: UpdateRecurringTemplateInput) { ... }
  async pause(id: string, workspaceId: string) { ... }
  async resume(id: string, workspaceId: string) { ... }
  async cancel(id: string, workspaceId: string) { ... }
  async delete(id: string, workspaceId: string) { ... }
  async generateOccurrences(workspaceId: string, perf?: PerfCollector) { ... }

  // Internal: generate for a single template (used by create, resume, and generateOccurrences)
  private async _generateForTemplate(template: RecurringTemplate) { ... }
}
```

Key implementation details for `create()`:

1. Validate input with Zod schema
2. Insert template with `nanoid()` ID
3. Call `_generateForTemplate()` for this template to create first occurrence(s)
4. Audit log: `logAuditEvent('recurring_template.create', ...)`
5. Invalidate cache

Key implementation for `_generateForTemplate(template)`:

1. Find max occurrence_number from existing occurrences for this template
2. Calculate next due dates using `calculateDueDate()`
3. Check `shouldGenerateOccurrence()` — generate up to current month + 1 month lookahead
4. Insert new pending occurrences with `onConflictDoNothing()` on the unique constraint (idempotent)
5. Mark template completed if all occurrences generated

Key implementation for `generateOccurrences(workspaceId)`:

1. Find all active templates for workspace
2. For each template, call `_generateForTemplate(template)`

Key implementation for `cancel()`:

1. Update template status to 'cancelled'
2. Delete **future** pending occurrences only (where `due_date > today`). Preserve past pending, confirmed, and skipped occurrences.
3. Audit log: `logAuditEvent('recurring_template.cancel', ...)`
4. Invalidate cache

Key implementation for `delete()`:

1. **Hard delete** template (CASCADE deletes occurrences)
2. Confirmed occurrences' linked transactions are preserved (FK is one-directional)
3. Audit log: `logAuditEvent('recurring_template.delete', ...)`
4. Invalidate cache

**Step 4: Run tests to verify they pass**
**Step 5: Commit**

---

### Task 8: RecurringOccurrenceService

**Files:**

- Create: `src/services/recurring-occurrence.service.ts`
- Create: `src/services/recurring-occurrence.service.test.ts`

**Step 1: Write failing tests for `findPending()`, `confirm()`, `skip()`, `getStats()`**

- Test: findPending returns only pending occurrences for workspace, sorted by due_date
- Test: confirm creates transaction via TransactionService.create(), updates occurrence atomically
- Test: confirm with custom amount stores confirmed_amount
- Test: confirm on already-confirmed occurrence throws OCCURRENCE_ALREADY_CONFIRMED
- Test: concurrent confirm attempts — second attempt fails (race condition safety)
- Test: skip marks occurrence as skipped with reason
- Test: getStats returns correct per-currency amounts

**Step 2: Run tests to verify they fail**

**Step 3: Implement `RecurringOccurrenceService`**

```typescript
export class RecurringOccurrenceService {
  private schema = getActiveSchema(); // property, NOT getter
  private db: IDatabase;
  private transactionService: TransactionService;

  constructor(db: IDatabase, transactionService?: TransactionService) {
    this.db = db;
    this.transactionService = transactionService ?? new TransactionService(db);
  }

  async findPending(workspaceId: string, filters?: { month?: string, status?: string, due_within?: string }, perf?: PerfCollector) { ... }
  async findByTemplate(templateId: string, workspaceId: string) { ... }
  async confirm(id: string, workspaceId: string, input: ConfirmOccurrenceInput) { ... }
  async skip(id: string, workspaceId: string, reason?: string) { ... }
  async getCalendarData(workspaceId: string, year: number, month: number) { ... }
  async getStats(workspaceId: string) { ... }
}
```

Key implementation for `confirm()` — **ATOMIC with compensating logic**:

```typescript
async confirm(id: string, workspaceId: string, input: ConfirmOccurrenceInput) {
  return await runTransaction(this.db, async (tx) => {
    // 1. Optimistic guard: UPDATE ... WHERE status = 'pending'
    //    If 0 rows updated → throw OCCURRENCE_ALREADY_CONFIRMED
    // 2. Find template for category_id, account_id defaults
    // 3. Build description (installment label if applicable)
    let createdTransactionId: string | null = null;
    try {
      // 4. Create transaction via new TransactionService(tx).create()
      //    → Uses tx handle for atomicity
      //    → Uses confirmOccurrenceSchema (no future-date restriction)
      //    → Store createdTransactionId for compensation
      createdTransactionId = result.id;
      // 5. Update occurrence: status='confirmed', transaction_id,
      //    confirmed_amount (always store), confirmed_at=new Date()
    } catch (error) {
      // COMPENSATING LOGIC (critical for SQLite/D1 where runTransaction is no-op):
      // If step 5 fails after step 4, delete orphaned transaction
      if (createdTransactionId) {
        await new TransactionService(tx).delete(createdTransactionId, workspaceId);
      }
      throw error;
    }
    // 6. Audit log: logAuditEvent('recurring_occurrence.confirm', ...)
    //    Note: logAuditEvent uses global DB, not tx — logs persist even on rollback
  });
  // 7. Invalidate cache (RECURRING + RECURRING_OCCURRENCES + RECURRING_CALENDAR + TRANSACTIONS + DASHBOARD)
}
```

Key implementation for `getStats()`:

1. Count pending occurrences where due_date <= today (overdue)
2. Count pending occurrences for current month
3. Sum pending amounts **grouped by currency** (not cross-currency)
4. Count confirmed this month
5. Return `RecurringStats` object with per-currency breakdown

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

// Singletons — pass transactionService to avoid duplicate instances
export const recurringTemplateService = new RecurringTemplateService(db);
export const recurringOccurrenceService = new RecurringOccurrenceService(db, transactionService);
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
- CSRF validation on POST/PUT/DELETE

**GET /api/recurring:**

1. Auth check
2. Parse query params: `status` filter (active/paused/completed/cancelled/all), `page`, `limit`, `_render=html`
3. Call `recurringTemplateService.findAll(workspaceId, filters, perf)`
4. **Do NOT call `generateOccurrences()`** — generation is handled by CLI cron job only, not on page load or API endpoints
5. Return JSON or render HTML partial via `RecurringTemplateListPartial.astro`

**POST /api/recurring:**

1. Auth check, CSRF validation, validate Content-Type
2. Validate body with `createRecurringTemplateAPISchema`
3. Convert date strings
4. Call `recurringTemplateService.create({ workspace_id, created_by_user_id, ...validated })`
5. Return 201

**GET /api/recurring/[id]:**

1. Auth check, get id from params
2. Call `recurringTemplateService.findById(id, workspaceId)`
3. Return template with occurrence history

**PUT /api/recurring/[id]:**

1. Auth check, CSRF validation, validate body
2. Call `recurringTemplateService.update(id, workspaceId, data)`
3. Return updated template

**DELETE /api/recurring/[id]:**

1. Auth check, CSRF validation
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

1. Auth check, CSRF validation
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
3. Call `recurringOccurrenceService.findPending(workspaceId, { month, status, due_within })`
4. Support HTML rendering via `RecurringPendingListPartial.astro`

**POST /api/recurring/occurrences/[id]/confirm:**

1. Auth check, CSRF validation
2. Validate body with `confirmOccurrenceAPISchema`
3. Convert `transaction_date` string to Date
4. Call `recurringOccurrenceService.confirm(id, workspaceId, { amount, transaction_date, category_id, account_id, userId })`
5. Return created transaction

**POST /api/recurring/occurrences/[id]/skip:**

1. Auth check, CSRF validation
2. Parse optional `skip_reason` from body
3. Call `recurringOccurrenceService.skip(id, workspaceId, reason)`
4. Return success

**GET /api/recurring/calendar:**

1. Auth check
2. Parse `year` and `month` from query
3. Call `recurringOccurrenceService.getCalendarData(workspaceId, year, month)`
4. Support HTML rendering via `RecurringCalendarPartial.astro`
5. Return array of days with occurrences

**GET /api/recurring/stats:**

1. Auth check
2. Call `recurringOccurrenceService.getStats(workspaceId)`
3. Return stats object

**Commit after implementing.**

---

### Task 12.5: OpenAPI Documentation

**Files:**

- Create: `openapi/paths/recurring.yml`
- Create: `openapi/schemas/RecurringTemplate.yml`
- Create: `openapi/schemas/RecurringOccurrence.yml`
- Create: `openapi/schemas/RecurringStats.yml`
- Create: `openapi/schemas/ConfirmOccurrenceRequest.yml`
- Modify: `openapi.yml` (project root)

Document all 14 endpoints from Tasks 10-12 following existing OpenAPI patterns in the `openapi/` directory.

**Commit after implementing.**

---

## Phase 4: UI — /recurring Page

### Task 13: Navigation Sidebar + Route Protection

**Files:**

- Modify: `src/components/layouts/Navigation.astro`
- Modify: `src/middleware/route-guard.ts`

**Step 1: Add Recurring to navItems array**

Insert after the Transactions entry (between `Receipt` and `Donut`):

```typescript
{ href: '/recurring', label: 'Recurring', icon: RefreshCw },
```

Import `RefreshCw` from `@lucide/astro`.

**Step 2: Add `/recurring` to `PROTECTED_PREFIXES` in `src/middleware/route-guard.ts`**

The `/recurring` route must be auth-protected. Add `'/recurring'` to the `PROTECTED_PREFIXES` array (currently missing — see existing entries at line ~10).

**Step 3: Verify in browser**

Run dev server, check sidebar shows "Recurring" nav item. Verify unauthenticated access to `/recurring` redirects to login.

**Step 4: Commit**

---

### Task 14: /recurring Page — List View + Partials

**Files:**

- Create: `src/pages/recurring/index.astro`
- Create: `src/components/organisms/RecurringPendingList.astro`
- Create: `src/components/molecules/RecurringPendingCard.astro`
- Create: `src/components/organisms/RecurringTemplateList.astro`
- Create: `src/components/molecules/RecurringTemplateRow.astro`
- Create: `src/components/partials/RecurringPendingListPartial.astro`
- Create: `src/components/partials/RecurringTemplateListPartial.astro`

**Step 1: Create page `src/pages/recurring/index.astro`**

Follow `src/pages/transactions/index.astro` pattern:

- Import ProtectedLayout
- Frontmatter: auth, then fetch templates + pending occurrences + stats via services (NO `generateOccurrences()` call — generation is handled by CLI cron job only, not on page load)
- Parse URL params: `view` (list|calendar, default list), `month` (YYYY-MM, default current)
- Layout: header with title + "+ New Template" button in header actions slot
- Use `TabSwitcher` for view toggle (list/calendar), `PeriodNavigator` for month navigation
- Summary stats row using `StatCard` atoms (pending amount, overdue count, confirmed this month)
- Render `RecurringPendingList` and `RecurringTemplateList`
- Add `data-testid` attributes: `recurring-pending-section`, `recurring-template-list`

**Step 2: Create `RecurringPendingList.astro`**

Props: `occurrences: RecurringOccurrenceOutput[]`

- Section header: "PENDING THIS MONTH (N)"
- **Empty state A** (no templates at all): `EmptyState` with `RefreshCw` icon, "No recurring transactions yet", CTA "+ New Template"
- **Empty state B** (pending empty, templates exist): `EmptyState` with `CheckCircle` icon, "All caught up!", "No pending bills for [Month Year]."
- Map occurrences to `RecurringPendingCard`

**Step 3: Create `RecurringPendingCard.astro`**

Props: `occurrence: RecurringOccurrenceOutput`

- Card with: Lucide status icon (AlertCircle for overdue, Clock for pending), name, amount (formatted), due date, installment label if applicable
- Overdue badge: `badge badge-error badge-sm` if `due_date < today`
- `border-l-4` left-border color: overdue=`border-error`, pending=`border-warning`
- [Confirm] button (opens confirm modal) and [Skip] button
- Use DaisyUI card classes: `card bg-base-100 border border-base-300 rounded-card shadow-sm overflow-hidden`
- Pass occurrence data via `data-occurrence` attribute (JSON, Astro-escaped)
- Mobile: stack action buttons full-width at bottom of card (min 44px touch target)
- Add `data-testid="recurring-pending-card"`

**Step 4: Create `RecurringTemplateList.astro`**

Props: `templates: RecurringTemplateOutput[]`

- Section header: "ALL TEMPLATES (N)"
- **Empty state**: `EmptyState` with `RefreshCw` icon, "No recurring templates yet"
- Desktop: table with columns — Name, Amount, Day, Next Due, Status, Actions (kebab dropdown)
- Mobile: card layout (same pattern as TransactionCard responsive)
- Status badges: Active=`badge-success`, Paused=`badge-warning`, Completed=`badge-ghost`, Cancelled=`badge-error`
- Paused rows: `opacity-60` for visual distinction
- Installment templates: `ProgressBar` atom (64px) + "5/12" text
- "Next Due" column: next pending occurrence date, or "—" for completed/cancelled
- Add `data-testid="recurring-template-list"`

**Step 5: Create `RecurringTemplateRow.astro`**

Props: `template: RecurringTemplateOutput`

- Row with name, type icon, formatted amount, "Nth" day, next due date, status badge
- If installment: show progress bar + "5/12"
- Actions: kebab dropdown (`EllipsisVertical`, `dropdown dropdown-end`) with Edit, Pause/Resume, Cancel
- Add `data-testid="recurring-template-row"`

**Step 6: Create partials**

- `RecurringPendingListPartial.astro` — thin wrapper rendering `RecurringPendingList` without page scaffold, for `?_render=html` API responses
- `RecurringTemplateListPartial.astro` — same for template list

**Step 7: Run typecheck and verify in browser**
**Step 8: Commit**

---

### Task 15: Create/Edit Template Form (Drawer)

**Files:**

- Create: `src/components/organisms/RecurringTemplateForm.astro`
- Create: `src/components/organisms/RecurringTemplateForm.client.ts`

**Step 1: Create `RecurringTemplateForm.astro`**

Uses `Drawer` component (`w-full sm:max-w-md`) — NOT a modal. Follow TransactionDrawer pattern:

- Fields: name, type (expense/income toggle), amount, category (filtered by type), account, day_of_month (1-31 native `<select>`), start_month (month picker — converted to `start_date` ISO string by appending `-01`, e.g., `2026-02` → `2026-02-01`)
- End condition: checkbox group (by count / by date) — both can be set simultaneously (whichever triggers first ends the template)
  - Validation hint: "At least one end condition is required" (shown on submit if neither checked)
  - Each checkbox toggles visibility of its corresponding input field
- Installment checkbox: **disabled until "By count" selected and count > 0**
  - When checked, shows starting_occurrence_number and installment_label inputs
  - "of [Y]" auto-populates from count
- Description textarea (optional)
- Cancel and Save buttons (Save shows "Saving..." during submit)
- Form POSTs to `/api/recurring` (create) or PUTs to `/api/recurring/[id]` (edit)
- Pre-fill for edit mode via `data-template` attribute

**Step 2: Create client script `RecurringTemplateForm.client.ts`**

Scoped as a reusable component script (like `TransactionDrawer.client.ts`):

- Handle form submission via fetch API **with CSRF token** (`X-CSRF-Token` header)
- Toggle category list based on type selection
- Show/hide installment fields based on checkbox
- Disable installment checkbox until "By count" is checked and count > 0
- Show/hide end condition fields based on checkbox state (both can be active simultaneously)
- Submit loading state: disable button + "Saving..." text
- Success: close drawer, refresh template list via `?_render=html` partial fetch
- Error: show inline validation errors in form + toast

**Step 3: Verify form works in browser**
**Step 4: Commit**

---

### Task 16a: Confirm Modal

**Files:**

- Create: `src/components/organisms/RecurringConfirmModal.astro`

**Step 1: Create `RecurringConfirmModal.astro`**

Uses `Modal` component (small form — 4 fields):

- Amount input (pre-filled, editable) — if edited, show original amount struck through
- Date input (pre-filled with due_date, editable — **future dates allowed**)
- Category select (pre-filled from template, **editable**)
- Account select (pre-filled from template, **editable**)
- Inline error area: `<div role="alert" class="alert alert-error hidden">` above buttons
- Cancel and Confirm buttons
- Dynamic title set via `data-modal-title` attribute + client script
- Occurrence data passed via `data-occurrence` attribute on trigger button (JSON, validated before use)

**Focus management:** On open, focus to Amount input. On close, return focus to trigger button.

**Error handling:** On API error, modal stays OPEN, inline alert-error shown, Confirm button re-enabled, toast as secondary.

---

### Task 16b: Skip Modal

**Files:**

- Create: `src/components/organisms/RecurringSkipModal.astro`

Uses `ConfirmationModal` base with `details` slot:

- Title: "Skip [template name]?"
- Optional reason textarea with character counter (`aria-live="polite"`, "0 / 200 characters")
- Cancel / Skip buttons (Skip uses `btn-warning`)
- On success: refresh pending list, stats row, AND calendar (if active) via `?_render=html` partial fetches, show toast
- On error: show error toast

---

### Task 17: Calendar View

**Files:**

- Create: `src/components/organisms/RecurringCalendar.astro`
- Create: `src/components/partials/RecurringCalendarPartial.astro`

**Step 1: Create `RecurringCalendar.astro`**

Server-rendered, responsive:

- Props: `calendarData: RecurringCalendarDay[]`, `year: number`, `month: number`
- Wrap in `@container` div
- **Desktop** (`@3xl` / 768px+): 7-column CSS grid (Mon-Sun), each cell shows day number + occurrence name + Lucide status icon
- **Mobile** (< 768px): date-grouped list — each entry shows date, occurrence name, amount, status icon
- Clicking a pending occurrence opens the confirm modal (same modal as list view)
- Legend: AlertCircle=Overdue, Clock=Pending, CheckCircle=Confirmed, MinusCircle=Skipped
- Empty state: `EmptyState` centered, "No recurring transactions scheduled for [Month Year]."

**Step 2: Calendar data is fetched client-side when calendar tab is activated** — not embedded in SSR. This keeps initial page load fast. Uses `GET /api/recurring/calendar?year=X&month=Y&_render=html`.

**Step 3: Create `RecurringCalendarPartial.astro`** for `?_render=html` API rendering.

\*\*Step 4: Month navigation handled by `PeriodNavigator` (reused, no custom navigator needed). PeriodNavigator fires `periodChange` events (import `PERIOD_CHANGE_EVENT` from `@/lib/constants/events`) consumed by the central client script.

**Step 5: Verify in browser (desktop and mobile)**
**Step 6: Commit**

---

### Task 18: Central Page Client Script

**Files:**

- Create: `src/components/organisms/RecurringPage.client.ts`

**Step 1: Implement**

Single central orchestrator for the recurring page (follows `TransactionsPage.client.ts` pattern):

- **AbortController** + cleanup on `astro:before-swap` (view transitions support)
- **Re-initialization** on `astro:page-load`
- View toggle (list/calendar) — updates URL param `?view=`, shows/hides containers
- Month navigation — listens to `periodChange` events from `PeriodNavigator` (import `PERIOD_CHANGE_EVENT` from `@/lib/constants/events`), updates URL `?month=`, re-fetches data via `?_render=html` partials
- Calendar data lazy-load — fetch `GET /api/recurring/calendar?_render=html` on first tab activation
- Confirm flow — listen for [Confirm] clicks on pending cards, populate modal from `data-occurrence` JSON, POST to API with CSRF token, on success refresh: pending list partial, stats row partial, AND calendar view partial (if active)
- Skip flow — listen for [Skip] clicks, open skip modal, POST to API with CSRF token, on success refresh: pending list partial, stats row partial, AND calendar view partial (if active)
- "+ New Template" button opens the drawer
- Template row actions (edit, pause, resume, cancel) via fetch API calls with CSRF token
  - Cancel: opens `ConfirmationModal` first (`confirmVariant="error"`)
  - Pause/Resume: direct API call (no confirmation needed — reversible)

All event listeners use `{ signal }` from AbortController. Import formatCurrency from `@/lib/formatting/currency-client` (not server barrel).

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
- Shows: "N bills pending" with primary currency total amount
- Overdue count if > 0: `badge badge-error`
- CTA link text: "Review pending bills →"
- Follow existing widget pattern (consistent card styling)

**Step 3: Add widget to `src/pages/dashboard.astro`**

Import and render `RecurringBillsWidget` with stats data from dashboard service.

**Step 4: Verify in browser**
**Step 5: Commit**

---

### Task 20: Transaction Page Badge

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro`
- Modify: `src/services/transaction.service.ts`

**Step 1: Add recurring badge logic**

Modify `TransactionService.findAll()` to include a subquery check:

```sql
EXISTS (SELECT 1 FROM recurring_occurrences WHERE transaction_id = transactions.id) as is_recurring
```

Add `is_recurring: boolean` to `TransactionOutput`.

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

In `DashboardService.getDashboardData()`, add a call to get pending occurrences due within next 7 days.

**Step 2: Convert to CashFlowEntry format**

Map recurring occurrences to `CashFlowEntry[]` using `templateAmount` (from template, not `confirmed_amount`):

```typescript
const recurringEntries: CashFlowEntry[] = upcomingBills.map((occ) => ({
  name: occ.templateName,
  date: occ.due_date,
  amount: parseFloat(occ.templateAmount),
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
        const { db, getActiveSchema } = await import('@/db');
        const { RecurringTemplateService } = await import('@/services/recurring-template.service');
        const schema = getActiveSchema();
        const service = new RecurringTemplateService(db);
        // Fetch ALL workspace IDs, iterate, generate for each
        const workspaces = await db.select({ id: schema.workspaces.id }).from(schema.workspaces);
        for (const ws of workspaces) {
          console.log(`Generating for workspace ${ws.id}...`);
          await service.generateOccurrences(ws.id);
        }
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
    startDate: '2026-01-01',
  },
  {
    name: 'Netflix',
    type: 'expense',
    amount: '199000',
    dayOfMonth: 15,
    category: 'Entertainment',
    totalOccurrences: 12,
    startDate: '2026-01-01',
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
    startDate: '2025-10-01',
  },
  {
    name: 'Gym Membership',
    type: 'expense',
    amount: '500000',
    dayOfMonth: 5,
    category: 'Health',
    status: 'paused',
    startDate: '2026-01-01',
    totalOccurrences: 12,
  },
  {
    name: 'Monthly Salary',
    type: 'income',
    amount: '15000000',
    dayOfMonth: 25,
    category: 'Salary',
    endDate: '2027-12-31',
    startDate: '2026-01-01',
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

## Phase 7: E2E Tests + Quality Gates

### Task 26: E2E Tests

**Files:**

- Create: `e2e/tests/recurring.spec.ts`

Test scenarios:

1. Navigate to `/recurring`, verify page loads with empty state
2. Create a new template via drawer, verify it appears in template list
3. Verify pending occurrence is generated and appears in pending section
4. Confirm a pending occurrence — verify transaction is created, pending card removed
5. Skip a pending occurrence — verify it shows as skipped with reason
6. Cancel a template — verify future pending occurrences removed
7. Calendar view — verify occurrences displayed, month navigation works

Use `data-testid` attributes for reliable locators.

**Commit after implementing.**

---

### Task 27: Final Quality Gates and Build

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
Task 4 (Enums/Types/Validation/Errors) ── can parallel with Task 3
Task 5 (Cache keys) ── can parallel with Task 3
  ↓
Task 6 (Date utility) ── depends on 4
Task 7 (TemplateService) ── depends on 3, 4, 5, 6
Task 8 (OccurrenceService) ── depends on 7
Task 9 (Service singletons) ── depends on 7, 8
  ↓
Task 10-12 (API routes) ── depends on 9, can parallel with each other
Task 12.5 (OpenAPI docs) ── depends on 10-12
  ↓
Task 13 (Nav sidebar) ── independent
Task 14 (List view + partials) ── depends on 10-12
Task 15 (Template form drawer) ── depends on 14
Task 16a (Confirm modal) ── depends on 14
Task 16b (Skip modal) ── depends on 14
Task 17 (Calendar view) ── depends on 14
Task 18 (Central client script) ── depends on 14, 15, 16a, 16b, 17
  ↓
Task 19-23 (Integrations) ── depends on 9, can parallel with each other
Task 24-25 (CLI + Seeder) ── depends on 7, 8
  ↓
Task 26 (E2E tests) ── depends on 14-18
Task 27 (Quality gates) ── depends on all
```

### Parallelization Opportunities

**Wave 1 (Foundation):** Tasks 1+2 in parallel, then 3+4+5 in parallel
**Wave 2 (Services):** Task 6 first, then 7→8→9 sequential
**Wave 3 (API):** Tasks 10+11+12 in parallel, then 12.5
**Wave 4 (UI):** Task 13 independent, then 14→15+16a+16b+17 (parallel after 14)→18
**Wave 5 (Integrations):** Tasks 19+20+21+22+23+24+25 all parallel (different files)
**Wave 6 (Final):** Task 26 (E2E), then Task 27 (quality gates)
