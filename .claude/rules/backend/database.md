---
paths:
  - 'src/db/**/*.ts'
  - 'src/services/**/*.ts'
  - 'drizzle/**/*.sql'
---

# Database Patterns

## Dual-Dialect Architecture

The project uses **SQLite** (local dev) and **PostgreSQL/Supabase** (production) with Drizzle ORM.

### Schema Maintenance

**CRITICAL:** All schema changes MUST generate migrations for **both** dialects.

```bash
# 1. Edit both schema files
# - src/db/schema/sqlite/<table>.ts
# - src/db/schema/postgresql/<table>.ts

# 2. Generate migrations for BOTH dialects
bun run db:generate        # SQLite
bun run db:generate:prod   # PostgreSQL

# 3. Apply locally
bun run db:migrate

# 4. Commit both drizzle/sqlite/ and drizzle/postgresql/ directories

# 5. Deploy production
bun run db:migrate:prod
```

### Migration Rules

- ✅ **Use `db:generate` + `db:migrate`** for tracked, incremental changes
- ✅ **Use `db:push`** only for local SQLite rapid iteration (never for production)
- ✅ **Handle timestamps correctly** - SQLite uses integers, PostgreSQL uses native timestamps
- ❌ **Use `db:push` for PostgreSQL/Supabase** - known drizzle-kit bug crashes it
- ❌ **Generate migrations for only one dialect** - always do both
- ❌ **Manually edit migration SQL files** - regenerate instead
- ❌ **Check for double-prefix bugs** during mass replace (`this.schema.this.schema`)
- ✅ **Always add `.default()` when adding NOT NULL columns** - `ALTER TABLE ADD COLUMN ... NOT NULL` without `DEFAULT` fails on non-empty tables in SQLite
- ✅ **Squash broken migrations before committing** - if iterating on schema locally, delete intermediate migrations and regenerate a clean one
- ❌ **Use `parseFloat` chains for financial calculations** - use SQL conditional aggregation (`CASE WHEN ... THEN CAST(amount AS NUMERIC)`) for precision; JS floats lose precision with large IDR values

## Service Pattern

Use `getActiveSchema()` to get the correct dialect-specific schema.

```typescript
import { getActiveSchema } from '@/db/connection';

class BudgetService {
  private schema = getActiveSchema();

  async getBudget(id: string) {
    return await this.schema.budgets.findFirst({
      where: eq(this.schema.budgets.id, id),
    });
  }
}
```

**Rules:**

- ✅ **Use `getActiveSchema()` and `this.schema.tableName`** pattern in services
- ❌ **Import tables directly** - breaks dual-dialect support

## Transaction Patterns

### SQLite (Local Dev)

SQLite with Drizzle uses `bun:sqlite`. Async transaction callbacks are not supported by the SQLite driver — use `runTransaction()` from `@/db` which handles dialect differences automatically.

```typescript
// ✅ Correct: Use runTransaction() for cross-dialect compatibility
import { runTransaction } from '@/db';

await runTransaction(db, async (tx) => {
  await tx.insert(budgets).values({ ... });
  await tx.update(categories).set({ ... });
});
```

**Rules:**

- ✅ **Use `runTransaction()` for transactions** - handles SQLite/PostgreSQL differences
- ✅ **Wrap multi-step DB operations in transactions** - ensures atomicity

### PostgreSQL (Production)

```typescript
// ✅ Correct: async/await
await db.transaction(async (tx) => {
  await tx.insert(budgets).values({ ... });
  await tx.update(categories).set({ ... });
});
```

## Query Patterns

### Direct Queries vs Cached Data

```typescript
// ✅ Correct: Query directly when schema fields are critical
const budget = await this.schema.budgets.findFirst({
  where: eq(this.schema.budgets.id, budgetId),
});
// Guarantees `id`, `userId`, etc. fields are present

// ❌ Wrong: Rely on cached data for critical operations
const budget = cache.get('budget:overview'); // May be stale or missing fields
```

**Rules:**

- ✅ **Query budgets directly instead of cached overview** - guarantees schema fields like `id` are present
- ❌ **Rely on cached data when schema fields are critical** - cache may be stale

### Avoid Extra Queries

```typescript
// ✅ Correct: Use subqueries or JOINs
const budgets = await db
  .select({
    id: budgets.id,
    spent: sql`(SELECT SUM(amount) FROM transactions WHERE budget_id = budgets.id)`,
  })
  .from(budgets);

// ❌ Wrong: N+1 query problem
const budgets = await db.select().from(budgets);
for (const budget of budgets) {
  const spent = await db.select().from(transactions).where(eq(transactions.budgetId, budget.id));
}
```

**Rules:**

- ❌ **Add extra DB queries as the lazy first solution** - use subqueries or JOINs
- ✅ **Verify ORM-generated SQL with diagnostic queries** - Drizzle `extras` can silently produce wrong SQL

## Input Validation

### Currency Parsing

```typescript
// ✅ Correct: Use Number() with validation
const amount = Number(input);
if (isNaN(amount) || amount < 0) {
  throw new Error('Invalid amount');
}

// ❌ Wrong: parseFloat accepts malformed input
const amount = parseFloat(input); // parseFloat("1,000") → 1, silently corrupts
```

**Rules:**

- ✅ **Use `Number()` instead of `parseFloat()` for validation** - `parseFloat("1,000")` returns `1`, silently corrupts data
- ❌ **Use `parseFloat()` for currency validation** - accepts malformed input like `"100abc"`
- ❌ **Default empty amounts to `'0'`** - silently zeros out budgets, corrupts user data

### CSV Parsing

```typescript
// ✅ Correct: Use proper CSV parser
import { parse } from 'csv-parse/sync';

const content = file.text();
const cleanContent = content.replace(/^\uFEFF/, ''); // Strip BOM
const records = parse(cleanContent, { columns: true });

// ❌ Wrong: Manual split
const lines = content.split('\n');
const values = line.split(','); // Breaks on "Name, LLC" in quoted fields
```

**Rules:**

- ✅ **Parse CSV with proper parser, not `split(',')`** - handles quoted fields containing commas
- ✅ **Strip BOM from CSV files before parsing** - Excel UTF-8 exports include BOM (`\uFEFF`)

### Pagination Inputs

```typescript
// ✅ Correct: Clamp parsed values
const page = Number(input);
const safePage = Number.isFinite(page) && page > 0 ? page : 1;

// ❌ Wrong: Raw parseInt to DB
const offset = parseInt(req.query.page) * limit; // NaN propagates
```

**Rules:**

- ✅ **Clamp `parseInt()` results for pagination params** - `parseInt('abc')` returns `NaN`, propagates through offset calculations; use `Number.isFinite(n) && n > 0 ? n : 1`
- ❌ **Pass raw `parseInt()` to DB `.offset()`/`.limit()`** - NaN/negative values cause undefined DB behavior

### Locale-Aware Currency

```typescript
// ✅ Correct: Detect decimal separator
import { parseCurrency } from '@/lib/formatting';

const amount = parseCurrency('Rp480.000,00', 'IDR'); // → 480000

// ❌ Wrong: Assumes dot as decimal
const amount = parseFloat('Rp480.000,00'.replace(/\D/g, '')); // → 48000000 (wrong!)
```

**Rules:**

- ✅ **Use `parseCurrency` without locale-aware decimal detection** - IDR format `Rp480.000,00` parsed as 48M instead of 480K

## Type Safety

```typescript
// ✅ Correct: Use proper types
interface BudgetRow {
  id: string;
  userId: string;
  amount: number;
}

const budget: BudgetRow = await query();

// ❌ Wrong: Type casting to bypass errors
const budget = (result as any).budget; // Hides real issues
```

**Rules:**

- ❌ **Use `(obj as any).field` when proper typing is available** - use interface references

## Audit/History Queries

```typescript
// ✅ Correct: Only update/delete
const history = await db
  .select()
  .from(budgetHistory)
  .where(inArray(budgetHistory.action, ['update', 'delete']));

// ❌ Wrong: Include create
const history = await db.select().from(budgetHistory); // Shows initial creation too
```

**Rules:**

- ❌ **Include `create` action in history/audit queries** - only `update`/`delete` count
- ❌ **Use fake workspace IDs like `'system'` for audit log fallback** - `audit_logs.workspace_id` has FK constraint on `workspaces.id`; silently fails via `logAuditEvent` catch
- ✅ **Guard audit logging with `if (workspaceId)` check** - skip audit for workspace-less users until schema migration makes `workspace_id` nullable

## Common Patterns

### Service with Schema

```typescript
import { getActiveSchema } from '@/db/connection';
import { eq } from 'drizzle-orm';

export class BudgetService {
  private schema = getActiveSchema();

  async getBudget(id: string, userId: string) {
    return await this.schema.budgets.findFirst({
      where: eq(this.schema.budgets.id, id) && eq(this.schema.budgets.userId, userId),
    });
  }

  async createBudget(data: NewBudget) {
    return await this.schema.budgets.insert(data);
  }
}
```

### Error Messages

```typescript
// ✅ Correct: Surface actual error messages
throw new Error(`Failed to save budget: ${error.message}`);

// ❌ Wrong: Generic message
throw new Error('Failed to save budget');
```

**Rules:**

- ✅ **Surface actual error messages in API responses** - not generic "Failed to X"
