---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.astro'
---

# Performance Rules

**Philosophy:** Performance is a feature, not an afterthought.

## Performance Targets

### Core Web Vitals (WCAG 2.1 AAA)

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **FCP (First Contentful Paint):** < 1.5s
- **TTFB (Time to First Byte):** < 200ms (edge) / < 500ms (origin)

### Page Load Targets

- Dashboard: < 500ms (p95)
- Budget page: < 500ms (p95)
- Transactions: < 500ms (p95)
- Settings: < 500ms (p95)

### Bundle Budget

- **Total Client JS:** < 250 kB gzipped
- **Chart.js:** < 180 kB (tree-shaken)
- **Motion:** < 10 kB (motion/mini only)
- **No server libraries** in client bundle (Decimal.js, database drivers)

## Database Query Optimization

### N+1 Query Prevention

```typescript
// ❌ Wrong: N+1 queries (1 + N)
const budgets = await db.select().from(budgets);
for (const budget of budgets) {
  const spent = await db.select().from(transactions).where(eq(transactions.budgetId, budget.id));
}

// ✅ Correct: Use subquery or JOIN (1 query)
const budgets = await db
  .select({
    id: budgets.id,
    spent: sql`(SELECT SUM(amount) FROM transactions WHERE budget_id = budgets.id)`,
  })
  .from(budgets);
```

**Rules:**

- ✅ **Use subqueries or JOINs** instead of loops with queries
- ✅ **Batch operations** - use bulk insert/update when possible
- ❌ **Loop with queries** - always profile and optimize

### Bulk Operations

```typescript
// ❌ Wrong: 500 individual inserts (500 queries + 500 cache invalidations)
for (const row of csvRows) {
  await transactionService.create(row); // 3-4 queries per row
}

// ✅ Correct: Bulk insert (5 queries total)
// 1. Pre-load: categories map (1 query)
// 2. Pre-load: assets map (1 query)
// 3. Duplicate detection: date-scoped query (1 query)
// 4. Batch insert: single transaction (1 query)
// 5. Single cache invalidation (1 query)
const result = await transactionService.bulkInsert(validRows);
```

**CSV Import Performance:**

- Old: ~3,000 queries for 500 rows
- New: ~5 queries for 500 rows (600x improvement)

**Rules:**

- ✅ **Two-phase validation**: Pre-load maps → validate all → insert all in transaction
- ✅ **Date-scoped duplicate detection** instead of fetching all records
- ✅ **Single audit log** per bulk operation, not per row
- ✅ **Single cache invalidation** per bulk operation
- ❌ **Per-row queries** in loops

### Query Complexity

```typescript
// ✅ Correct: Use indexes
const transactions = await db
  .select()
  .from(transactions)
  .where(and(eq(transactions.workspaceId, id), eq(transactions.date, date)));
// Composite index on (workspace_id, date)

// ✅ Correct: Limit results
const recent = await db.select().from(transactions).orderBy(desc(transactions.date)).limit(10);

// ❌ Wrong: Fetch all, filter in memory
const all = await db.select().from(transactions);
const filtered = all.filter((t) => t.workspaceId === id);
```

**Rules:**

- ✅ **Add composite indexes** for frequently queried columns
- ✅ **Use LIMIT** when you don't need all results
- ✅ **Push filtering to database** - use WHERE, not in-memory filter
- ❌ **Fetch everything** and filter client-side

### Database Connection Optimization

```typescript
// ✅ Correct: Fresh connections per request in Workers
export async function onRequest(context) {
  const db = createConnection(getEnv('DATABASE_URL'));
  // Use db...
  await db.close();
}

// ✅ Correct: Use Hyperdrive for Workers
// - Local proxy with 0 overhead
// - Connection pooling
// - Direct connection (port 5432), not transaction pooler
```

**Rules:**

- ✅ **Use Hyperdrive for Workers database connections** - local proxy, 0 overhead
- ✅ **Fresh connections per request in Workers** - no singletons
- ❌ **Use Supabase transaction pooler with Hyperdrive** - use direct connection
- ❌ **Singleton connections in Workers** - edge runtime doesn't support

## Cache Strategy

### Cache-Aside Pattern

```typescript
// Service layer caching
async getBudget(id: string, userId: string) {
  const cacheKey = `budget:${id}`;

  // 1. Check cache
  const cached = await cache.get<Budget>(cacheKey);
  if (cached) return cached;

  // 2. Query database
  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });

  // 3. Set cache with TTL and tags
  await cache.set(cacheKey, budget, {
    ttl: 300, // 5 minutes
    tags: [`budget:${id}`, `user:${userId}`, 'budgets'],
  });

  return budget;
}
```

### Tag-Based Invalidation

```typescript
// On mutation: Invalidate related tags
async updateBudget(id: string, data: UpdateBudgetData) {
  const budget = await db.update(budgets).set(data).where(eq(budgets.id, id));

  // Invalidate all cache entries with these tags
  await cache.invalidateTags([
    `budget:${id}`,
    `user:${budget.userId}`,
    'budgets',
    'dashboard',
  ]);

  return budget;
}
```

**Tag Strategy:**

- **Workspace:** `workspace:ws_123` - invalidate on any workspace change
- **Entity:** `budget:123`, `transaction:456` - specific entity changes
- **Collection:** `budgets`, `transactions` - list views
- **Page:** `dashboard`, `overview` - page-level aggregations

**Rules:**

- ✅ **Cache at service layer** - not in routes or components
- ✅ **Use cache-aside pattern** - check cache → query DB → set cache
- ✅ **Tag everything** - every cache entry needs tags for invalidation
- ✅ **Invalidate proactively** - on create/update/delete
- ✅ **Handle cache errors gracefully** - fall back to database
- ❌ **Cache in routes** - service layer only
- ❌ **Forget to invalidate** - leads to stale data

### Cache TTLs

```typescript
// Short TTL for frequently changing data
await cache.set('dashboard:summary', data, {
  ttl: 60, // 1 minute
  tags: ['dashboard', `workspace:${id}`],
});

// Medium TTL for semi-static data
await cache.set('budget:list', budgets, {
  ttl: 300, // 5 minutes
  tags: ['budgets', `workspace:${id}`],
});

// Long TTL for rarely changing data
await cache.set('categories', categories, {
  ttl: 3600, // 1 hour
  tags: ['categories'],
});
```

**Rules:**

- ✅ **Short TTL (60s)** - dashboards, aggregations, frequently updated
- ✅ **Medium TTL (300s)** - lists, budgets, transactions
- ✅ **Long TTL (3600s)** - categories, settings, rarely changing
- ✅ **Always use tags** - even with TTL, for immediate invalidation

### Performance Impact

**Without Cache:**

- Dashboard: 7,000ms (10+ queries × 400ms RTT)
- Budget: 7,500ms (12+ queries)
- Settings: 11,000ms (20+ queries)

**With Cache:**

- Dashboard: <500ms (cache hit <100ms)
- Budget: <500ms
- Settings: <500ms

**Cache Hit Rate Target:** >80%

## Performance Logging

### Structured Logging

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

// ✅ Correct: Log query performance
const start = performance.now();
const result = await db.query();
const duration = performance.now() - start;

log.info('query executed', {
  duration: `${duration.toFixed(2)}ms`,
  rows: result.length,
  query: 'getBudgets',
});

if (duration > 1000) {
  log.warn('slow query detected', {
    duration: `${duration.toFixed(2)}ms`,
    query: 'getBudgets',
  });
}
```

### Performance Markers

```typescript
// Track operation performance
async processCSV(file: File) {
  const totalStart = performance.now();

  log.info('csv import started', { fileSize: file.size });

  // Phase 1: Parse
  const parseStart = performance.now();
  const rows = parseCSV(file);
  log.info('csv parsed', {
    duration: `${(performance.now() - parseStart).toFixed(2)}ms`,
    rows: rows.length,
  });

  // Phase 2: Validate
  const validateStart = performance.now();
  const { valid, errors } = validateRows(rows);
  log.info('csv validated', {
    duration: `${(performance.now() - validateStart).toFixed(2)}ms`,
    valid: valid.length,
    errors: errors.length,
  });

  // Phase 3: Insert
  const insertStart = performance.now();
  await bulkInsert(valid);
  log.info('csv inserted', {
    duration: `${(performance.now() - insertStart).toFixed(2)}ms`,
    rows: valid.length,
  });

  const totalDuration = performance.now() - totalStart;
  log.info('csv import completed', {
    totalDuration: `${totalDuration.toFixed(2)}ms`,
    imported: valid.length,
    errors: errors.length,
  });
}
```

**Rules:**

- ✅ **Log query duration** - identify slow queries
- ✅ **Log operation phases** - understand where time is spent
- ✅ **Use structured logs** - JSON format for querying in production
- ✅ **Warn on slow operations** - duration > 1000ms
- ❌ **Use console.log** - use `createLogger()` instead

### Query Performance Thresholds

```typescript
const PERF_THRESHOLDS = {
  query: 200, // Single query should be <200ms
  page: 500, // Page load should be <500ms
  bulk: 3000, // Bulk operations can take up to 3s
};

if (duration > PERF_THRESHOLDS.query) {
  log.warn('slow query', { duration, query, threshold: PERF_THRESHOLDS.query });
}
```

## Bundle Performance

See `.claude/rules/frontend/bundle.md` for detailed bundle optimization rules.

**Quick Rules:**

- ✅ **Check bundle after every dependency change**
- ✅ **Use specific imports** - `@/lib/utils/client`, not `@/lib/utils`
- ✅ **Type-only imports for server code** - `import type { User }`
- ✅ **Tree-shaken Chart.js** - `@/lib/chart-setup`
- ❌ **Barrel exports** in client code
- ❌ **chart.js/auto** - bundles everything

## Core Web Vitals Optimization

### LCP (Largest Contentful Paint) < 2.5s

```astro
<!-- ✅ Correct: Preload critical resources -->
<link rel="preload" as="image" href="/hero.webp" />
<link rel="preload" as="font" href="/fonts/inter.woff2" crossorigin />

<!-- ✅ Correct: Priority hints -->
<img src="/hero.webp" loading="eager" fetchpriority="high" />

<!-- ✅ Correct: Lazy load below fold -->
<img src="/feature.webp" loading="lazy" />

<!-- ❌ Wrong: All images eager -->
<img src="/feature.webp" loading="eager" />
```

**Rules:**

- ✅ **Preload hero images** - improve LCP
- ✅ **Eager load above-the-fold** - first image should be eager
- ✅ **Lazy load below-the-fold** - everything else lazy
- ✅ **Optimize images** - WebP format, responsive sizes
- ❌ **Large unoptimized images** - compress and resize

### FID (First Input Delay) < 100ms

```typescript
// ✅ Correct: Debounce expensive operations
import { debounce } from '@/lib/utils/client';

const handleSearch = debounce((query: string) => {
  // Expensive search operation
}, 300);

// ✅ Correct: Use requestIdleCallback for non-critical work
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Non-critical initialization
  });
}

// ❌ Wrong: Heavy synchronous work on input
input.addEventListener('keyup', () => {
  const results = expensiveFilterOperation(data); // Blocks input
});
```

**Rules:**

- ✅ **Debounce expensive handlers** - 300ms for search, 150ms for input
- ✅ **Use requestIdleCallback** for non-critical work
- ✅ **Async chart rendering** - use Intersection Observer
- ❌ **Synchronous heavy operations** on user input

### CLS (Cumulative Layout Shift) < 0.1

```astro
<!-- ✅ Correct: Reserve space for images -->
<img src="/hero.webp" width="800" height="600" alt="Hero" />

<!-- ✅ Correct: Reserve space for dynamic content -->
<div style="min-height: 200px">
  {loading ? <Skeleton height="200px" /> : <Content />}
</div>

<!-- ❌ Wrong: No dimensions, causes shift -->
<img src="/hero.webp" alt="Hero" />

<!-- ❌ Wrong: No placeholder for loading state -->
<div>{loading ? null : <Content />}</div>
```

**Rules:**

- ✅ **Set image dimensions** - width and height attributes
- ✅ **Use skeletons** for loading states
- ✅ **Reserve space** for dynamic content
- ✅ **Use container queries** instead of JS-based layout
- ❌ **Inject content without space** - causes layout shift
- ❌ **Use font-display: swap** without fallback metrics

## Prerendering & Code Splitting

### Static Prerendering

```astro
---
// ✅ Correct: Prerender public pages
export const prerender = true;
---

<!-- Landing page, pricing, about -->
```

**Rules:**

- ✅ **Prerender public pages** - landing, pricing, about
- ✅ **Client-side auth detection** for conditional UI
- ❌ **SSR for static content** - slower, no CDN caching

### Lazy Loading Charts

```typescript
// ✅ Correct: Use Intersection Observer
import { createChartLifecycle } from '@/lib/utils/chart-lifecycle';

const lifecycle = createChartLifecycle(canvas, (canvas) => {
  // Chart initialization happens when visible
  return new Chart(canvas, config);
});
```

**Rules:**

- ✅ **Lazy load charts** - Intersection Observer
- ✅ **Destroy on cleanup** - prevent memory leaks
- ❌ **Render all charts immediately** - slow initial load

## Performance Checklist

Before committing changes that affect performance:

- [ ] Profile query performance (log duration > 200ms)
- [ ] Check cache strategy (service layer, proper tags)
- [ ] Verify bundle size (< 250 kB gzipped)
- [ ] Test Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Add performance logging for new operations
- [ ] Use bulk operations for batch processing
- [ ] Avoid N+1 queries (use subqueries/JOINs)
- [ ] Lazy load below-the-fold content
- [ ] Set image dimensions to prevent CLS

## Performance Monitoring

```bash
# Check bundle size
bun run build:analyze
open dist/stats.html

# Profile database queries (add to service)
log.info('query executed', { duration, rows, query });

# Test Core Web Vitals
# Use Lighthouse or WebPageTest
npm run lighthouse
```

**Monitor in production:**

- Cloudflare Workers Analytics - request duration, cache hit rate
- Supabase Dashboard - query performance, connection pool
- Upstash Console - cache operations, hit rate
