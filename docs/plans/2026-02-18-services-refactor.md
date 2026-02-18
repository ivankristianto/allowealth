# Services Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce ~500 lines of service layer boilerplate by extracting three factory functions (`createCrudService`, `createMetaService`, `createTokenService`) and a `cacheOrFetch` utility.

**Architecture:** Factory functions return plain objects with typed methods. Services instantiate factories in their constructor and delegate mechanical DB operations to them. All validation, caching, error handling, and perf tracking remain per-service. No public APIs change.

**Tech Stack:** Bun + TypeScript strict, Drizzle ORM, `bun:test`, existing `IDatabase` / `PerfCollector` / `CacheManager` abstractions.

**Design doc:** `docs/plans/2026-02-18-services-refactor-design.md`

---

## Key imports reference

```typescript
import type { IDatabase } from '@/db';
import { getActiveSchema } from '@/db';
import { eq, and } from 'drizzle-orm';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import type { CacheSetOptions } from '@/lib/cache';
import type { PerfCollector } from '@/lib/perf';
import { trackQuery } from '@/lib/perf';
```

Test setup pattern (from `category.service.test.ts`):

```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
beforeEach(() => resetCacheManager());
const mockDb: any = {
  insert: mock(() => ({ values: mock(() => ({ returning: mock(() => Promise.resolve([row])) })) })),
  update: mock(() => ({
    set: mock(() => ({ where: mock(() => ({ returning: mock(() => Promise.resolve([row])) })) })),
  })),
  delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  query: {
    tableName: {
      findFirst: mock(() => Promise.resolve(row)),
      findMany: mock(() => Promise.resolve([row])),
    },
  },
};
```

Run tests: `bun test src/path/to/file.test.ts`
Run all tests: `bun run test`

---

## Task 1: `cacheOrFetch` utility

**Files:**

- Create: `src/lib/cache/cache-or-fetch.ts`
- Create: `src/lib/cache/cache-or-fetch.test.ts`
- Modify: `src/lib/cache/index.ts` (add export)

**Step 1: Write the failing test**

```typescript
// src/lib/cache/cache-or-fetch.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { cacheOrFetch } from './cache-or-fetch';

describe('cacheOrFetch', () => {
  beforeEach(() => resetCacheManager());

  it('calls fetch and returns result on cache miss', async () => {
    const result = await cacheOrFetch('test:miss', { ttl: 60 }, async () => ({ value: 42 }));
    expect(result).toEqual({ value: 42 });
  });

  it('returns cached value without calling fetch again on cache hit', async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      return 'data';
    };

    await cacheOrFetch('test:hit', { ttl: 60 }, fetch);
    const second = await cacheOrFetch('test:hit', { ttl: 60 }, fetch);

    expect(second).toBe('data');
    expect(calls).toBe(1);
  });

  it('uses different keys independently', async () => {
    await cacheOrFetch('key:a', { ttl: 60 }, async () => 'A');
    await cacheOrFetch('key:b', { ttl: 60 }, async () => 'B');

    const a = await cacheOrFetch('key:a', { ttl: 60 }, async () => 'WRONG');
    const b = await cacheOrFetch('key:b', { ttl: 60 }, async () => 'WRONG');

    expect(a).toBe('A');
    expect(b).toBe('B');
  });
});
```

**Step 2: Run test — verify it fails**

```bash
bun test src/lib/cache/cache-or-fetch.test.ts
```

Expected: `Cannot find module './cache-or-fetch'`

**Step 3: Implement**

```typescript
// src/lib/cache/cache-or-fetch.ts
import { getCacheManager } from '@/lib/cache/cache-manager';
import type { CacheSetOptions } from '@/lib/cache/types';
import type { PerfCollector } from '@/lib/perf';

export async function cacheOrFetch<T>(
  key: string,
  options: CacheSetOptions,
  fetch: () => Promise<T>,
  perf?: PerfCollector
): Promise<T> {
  const cache = getCacheManager();

  try {
    const cached = await cache.get<T>(key, perf);
    if (cached !== null) return cached;
  } catch {
    // Cache read failure — fall through to fetch
  }

  const result = await fetch();

  try {
    await cache.set(key, result, options);
  } catch {
    // Cache write failure — return result without caching
  }

  return result;
}
```

Add to `src/lib/cache/index.ts`:

```typescript
export { cacheOrFetch } from './cache-or-fetch';
```

**Step 4: Run test — verify it passes**

```bash
bun test src/lib/cache/cache-or-fetch.test.ts
```

Expected: 3 tests pass.

**Step 5: Commit**

```bash
git add src/lib/cache/cache-or-fetch.ts src/lib/cache/cache-or-fetch.test.ts src/lib/cache/index.ts
git commit -m "feat(cache): add cacheOrFetch utility to replace manual try/catch pattern"
```

---

## Task 2: `createCrudService` factory

**Files:**

- Create: `src/services/base/crud.factory.ts`
- Create: `src/services/base/crud.factory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/base/crud.factory.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { createCrudService } from './crud.factory';

const mockRow = { id: '1', workspace_id: 'ws-1', name: 'Test' };

function makeDb() {
  return {
    query: {
      things: {
        findFirst: mock(() => Promise.resolve(mockRow)),
        findMany: mock(() => Promise.resolve([mockRow])),
      },
    },
    insert: mock(() => ({
      values: mock(() => ({ returning: mock(() => Promise.resolve([mockRow])) })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({ returning: mock(() => Promise.resolve([mockRow])) })),
      })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'things_table' as any,
    getQuery: () => db.query.things,
    getId: () => ({ name: 'id' }) as any,
    getWorkspaceId: () => ({ name: 'workspace_id' }) as any,
  };
}

describe('createCrudService', () => {
  it('findById calls findFirst with id and workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.findById('1', 'ws-1');
    expect(result).toEqual(mockRow);
    expect(db.query.things.findFirst).toHaveBeenCalledTimes(1);
  });

  it('findAll calls findMany with workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.findAll('ws-1');
    expect(result).toEqual([mockRow]);
    expect(db.query.things.findMany).toHaveBeenCalledTimes(1);
  });

  it('create inserts and returns row', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.create({ name: 'Test', workspace_id: 'ws-1' });
    expect(result).toEqual(mockRow);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('update modifies and returns updated row', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.update('1', 'ws-1', { name: 'Updated' });
    expect(result).toEqual(mockRow);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('delete removes row by id and workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    await crud.delete('1', 'ws-1');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test — verify it fails**

```bash
bun test src/services/base/crud.factory.test.ts
```

Expected: `Cannot find module './crud.factory'`

**Step 3: Implement**

```typescript
// src/services/base/crud.factory.ts
import { eq, and } from 'drizzle-orm';
import type { IDatabase } from '@/db';

export interface CrudConfig {
  getTable: () => any;
  getQuery: () => {
    findFirst: (config?: any) => Promise<any>;
    findMany: (config?: any) => Promise<any[]>;
  };
  getId: () => any;
  getWorkspaceId: () => any;
}

export function createCrudService<T, TCreate, TUpdate = Partial<TCreate>>(
  db: IDatabase,
  config: CrudConfig
) {
  return {
    async findById(id: string, workspaceId: string): Promise<T | null> {
      return (
        (await config.getQuery().findFirst({
          where: and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)),
        })) ?? null
      );
    },

    async findAll(workspaceId: string): Promise<T[]> {
      return config.getQuery().findMany({
        where: eq(config.getWorkspaceId(), workspaceId),
      });
    },

    async create(input: TCreate): Promise<T> {
      const [row] = await db
        .insert(config.getTable())
        .values(input as any)
        .returning();
      return row as T;
    },

    async update(id: string, workspaceId: string, input: TUpdate): Promise<T> {
      const [row] = await db
        .update(config.getTable())
        .set(input as any)
        .where(and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)))
        .returning();
      return row as T;
    },

    async delete(id: string, workspaceId: string): Promise<void> {
      await db
        .delete(config.getTable())
        .where(and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)));
    },
  };
}
```

**Step 4: Run test — verify it passes**

```bash
bun test src/services/base/crud.factory.test.ts
```

Expected: 5 tests pass.

**Step 5: Commit**

```bash
git add src/services/base/crud.factory.ts src/services/base/crud.factory.test.ts
git commit -m "feat(services): add createCrudService factory for shared DB operation boilerplate"
```

---

## Task 3: Migrate `category.service.ts`

**Files:**

- Modify: `src/services/category.service.ts`

**Step 1: Run existing tests — verify green baseline**

```bash
bun test src/services/category.service.test.ts
```

Expected: All pass.

**Step 2: Add crud factory instantiation**

In `category.service.ts`, add import at top:

```typescript
import { createCrudService } from './base/crud.factory';
```

In the `CategoryService` class, add a `crud` property and update `constructor`:

```typescript
export class CategoryService {
  private crud = createCrudService<
    Awaited<ReturnType<IDatabase['query']['categories']['findFirst']>>,
    Parameters<IDatabase['insert']>[0] extends infer T ? any : any,
    any
  >(this.db, {
    getTable: () => getActiveSchema().categories,
    getQuery: () => this.db.query.categories,
    getId: () => getActiveSchema().categories.id,
    getWorkspaceId: () => getActiveSchema().categories.workspace_id,
  });

  constructor(private db: IDatabase) {}
  // ... rest unchanged
```

> **Note on typing:** Use `any` for TCreate/TUpdate — the existing Zod-validated input and the existing method signatures already provide type safety. The factory's generics are for consumers who want typed returns.

**Step 3: Replace `findById` with delegation**

Find the existing `findById` method and replace the body with:

```typescript
async findById(id: string, workspaceId: string, perf?: PerfCollector) {
  return trackQuery('CategoryService.findById', perf, () =>
    this.crud.findById(id, workspaceId)
  );
}
```

**Step 4: Apply `cacheOrFetch` to `findAll`**

Find `findAll`. It currently has a manual 12-line try/catch cache pattern. Replace with:

```typescript
async findAll(workspaceId: string, filters?: CategoryFilters, perf?: PerfCollector) {
  const filtersHashValue = hashFilters(filters || {});
  const cacheKey = CacheKeys.categories(workspaceId, filtersHashValue);

  return cacheOrFetch(
    cacheKey,
    { ttl: 3600, tags: [CacheTags.workspace(workspaceId), CacheTags.CATEGORIES] },
    () => trackQuery('CategoryService.findAll', perf, () =>
      this.db.query.categories.findMany({
        where: this.buildWhereClause(workspaceId, filters),
        orderBy: ..., // keep existing orderBy
      })
    ),
    perf
  );
}
```

> `findAll` keeps its own query because it uses `buildWhereClause` with filters — the factory's `findAll` is unfiltered and not used here.

Add import at top:

```typescript
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';
```

**Step 5: Run tests — verify still green**

```bash
bun test src/services/category.service.test.ts
```

Expected: All pass.

**Step 6: Commit**

```bash
git add src/services/category.service.ts
git commit -m "refactor(services): migrate CategoryService to use crud factory and cacheOrFetch"
```

---

## Task 4: Migrate `asset-category.service.ts`

**Files:**

- Modify: `src/services/asset-category.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/asset-category.service.test.ts
```

**Step 2: Add crud factory**

Same pattern as Task 3. In `AssetCategoryService`:

```typescript
import { createCrudService } from './base/crud.factory';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';

// In class:
private crud = createCrudService<any, any, any>(this.db, {
  getTable: () => getActiveSchema().assetCategories,
  getQuery: () => this.db.query.assetCategories,
  getId: () => getActiveSchema().assetCategories.id,
  getWorkspaceId: () => getActiveSchema().assetCategories.workspace_id,
});
```

**Step 3: Replace `findById` body**

```typescript
async findById(id: string, workspaceId: string) {
  return this.crud.findById(id, workspaceId);
}
```

**Step 4: Apply `cacheOrFetch` to `findAll`**

Same pattern as Task 3 — find the manual try/catch in `findAll` and replace with `cacheOrFetch(cacheKey, { ttl: 3600, tags: [...] }, () => query)`.

**Step 5: Run tests**

```bash
bun test src/services/asset-category.service.test.ts
```

**Step 6: Commit**

```bash
git add src/services/asset-category.service.ts
git commit -m "refactor(services): migrate AssetCategoryService to use crud factory and cacheOrFetch"
```

---

## Task 5: Migrate `workspace-invitation.service.ts`

**Files:**

- Modify: `src/services/workspace-invitation.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/workspace-invitation.service.test.ts
```

**Step 2: Add crud factory (no caching in this service)**

```typescript
import { createCrudService } from './base/crud.factory';

private crud = createCrudService<any, any, any>(this.db, {
  getTable: () => getActiveSchema().workspaceInvitations,
  getQuery: () => this.db.query.workspaceInvitations,
  getId: () => getActiveSchema().workspaceInvitations.id,
  getWorkspaceId: () => getActiveSchema().workspaceInvitations.workspace_id,
});
```

**Step 3: Delegate `findById` and `delete` (no `update` in this service)**

```typescript
async findById(id: string, workspaceId: string) {
  return this.crud.findById(id, workspaceId);
}

// delete by id+workspaceId (find the matching method and replace its body):
async delete(id: string, workspaceId: string) {
  return this.crud.delete(id, workspaceId);
}
```

> `create` stays as-is — it sends an email, which the factory can't do.

**Step 4: Run tests and commit**

```bash
bun test src/services/workspace-invitation.service.test.ts
git add src/services/workspace-invitation.service.ts
git commit -m "refactor(services): migrate WorkspaceInvitationService to use crud factory"
```

---

## Task 6: Migrate `budget.service.ts`

**Files:**

- Modify: `src/services/budget.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/budget.service.test.ts
```

**Step 2: Add crud factory**

```typescript
import { createCrudService } from './base/crud.factory';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';

private crud = createCrudService<any, any, any>(this.db, {
  getTable: () => getActiveSchema().budgets,
  getQuery: () => this.db.query.budgets,
  getId: () => getActiveSchema().budgets.id,
  getWorkspaceId: () => getActiveSchema().budgets.workspace_id,
});
```

**Step 3: Delegate `findById`; apply `cacheOrFetch` to `getBudgetHistory` and `getMonthlyOverview`**

For `findById`:

```typescript
async findById(id: string, workspaceId: string, perf?: PerfCollector) {
  return trackQuery('BudgetService.findById', perf, () =>
    this.crud.findById(id, workspaceId)
  );
}
```

For cached methods (`getBudgetHistory`, `getMonthlyOverview`) — find each manual try/catch cache block and replace with `cacheOrFetch`. Keep the existing DB query logic inside the fetch callback.

**Step 4: Run tests and commit**

```bash
bun test src/services/budget.service.test.ts
git add src/services/budget.service.ts
git commit -m "refactor(services): migrate BudgetService to use crud factory and cacheOrFetch"
```

---

## Task 7: Migrate `transaction.service.ts`

**Files:**

- Modify: `src/services/transaction.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/transaction.service.test.ts
```

**Step 2: Add crud factory**

```typescript
import { createCrudService } from './base/crud.factory';

private crud = createCrudService<any, any, any>(this.db, {
  getTable: () => getActiveSchema().transactions,
  getQuery: () => this.db.query.transactions,
  getId: () => getActiveSchema().transactions.id,
  getWorkspaceId: () => getActiveSchema().transactions.workspace_id,
});
```

**Step 3: Delegate `findById`**

`transaction.service.ts` is a complex service (1300+ lines). Only `findById` is a clean delegation candidate. `create` and `update` both have multi-step business logic (balance updates, category checks, asset validation) that cannot be delegated.

```typescript
async findById(id: string, workspaceId: string, perf?: PerfCollector) {
  return trackQuery('TransactionService.findById', perf, () =>
    this.crud.findById(id, workspaceId)
  );
}
```

**Step 4: Run tests and commit**

```bash
bun test src/services/transaction.service.test.ts
git add src/services/transaction.service.ts
git commit -m "refactor(services): migrate TransactionService findById to crud factory"
```

---

## Task 8: Migrate `asset.service.ts`

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/__tests__/asset-service-cache.test.ts
bun test src/services/__tests__/asset-close.test.ts
```

**Step 2: Add crud factory**

```typescript
import { createCrudService } from './base/crud.factory';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';

private crud = createCrudService<any, any, any>(this.db, {
  getTable: () => getActiveSchema().assets,
  getQuery: () => this.db.query.assets,
  getId: () => getActiveSchema().assets.id,
  getWorkspaceId: () => getActiveSchema().assets.workspace_id,
});
```

**Step 3: Delegate `findById`; apply `cacheOrFetch` to `findAll`**

`findById` delegation (same pattern as previous tasks).

For `findAll` — apply `cacheOrFetch` to replace the manual cache try/catch.

**Step 4: Run tests and commit**

```bash
bun test src/services/__tests__/asset-service-cache.test.ts
bun test src/services/__tests__/asset-close.test.ts
bun test src/services/__tests__/asset-closed-protection.test.ts
git add src/services/asset.service.ts
git commit -m "refactor(services): migrate AssetService to use crud factory and cacheOrFetch"
```

---

## Task 9: `createMetaService` factory

**Files:**

- Create: `src/services/base/meta.factory.ts`
- Create: `src/services/base/meta.factory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/base/meta.factory.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMetaService } from './meta.factory';

type TestKey = 'key_a' | 'key_b';
const isTestKey = (k: string): k is TestKey => k === 'key_a' || k === 'key_b';

const mockMetaRow = { id: '1', user_id: 'u1', meta_key: 'key_a', meta_value: 'hello' };

function makeDb(overrides: any = {}) {
  return {
    query: {
      userMeta: {
        findFirst: mock(() => Promise.resolve(mockMetaRow)),
        findMany: mock(() => Promise.resolve([mockMetaRow])),
        ...overrides.findFirst,
      },
    },
    insert: mock(() => ({
      values: mock(() => ({
        onConflictDoUpdate: mock(() => Promise.resolve()),
      })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'user_meta' as any,
    getQuery: () => db.query.userMeta,
    getEntityIdCol: () => ({ name: 'user_id' }) as any,
    getKeyCol: () => ({ name: 'meta_key' }) as any,
    getValueCol: () => ({ name: 'meta_value' }) as any,
    validateKey: isTestKey,
  };
}

describe('createMetaService', () => {
  it('get returns value when row exists', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.get('u1', 'key_a');
    expect(result).toBe('hello');
  });

  it('get returns null when row not found', async () => {
    const db = makeDb();
    db.query.userMeta.findFirst = mock(() => Promise.resolve(null));
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.get('u1', 'key_a');
    expect(result).toBeNull();
  });

  it('set calls insert with onConflictDoUpdate', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await meta.set('u1', 'key_a', 'new-value');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('set throws on invalid key', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await expect(meta.set('u1', 'invalid_key' as TestKey, 'v')).rejects.toThrow();
  });

  it('set throws when value exceeds 4KB', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const bigValue = 'x'.repeat(4097);
    await expect(meta.set('u1', 'key_a', bigValue)).rejects.toThrow();
  });

  it('delete calls db.delete', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await meta.delete('u1', 'key_a');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('getAll returns keyed record', async () => {
    const db = makeDb();
    db.query.userMeta.findMany = mock(() =>
      Promise.resolve([
        { meta_key: 'key_a', meta_value: 'hello' },
        { meta_key: 'key_b', meta_value: 'world' },
      ])
    );
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.getAll('u1');
    expect(result).toEqual({ key_a: 'hello', key_b: 'world' });
  });
});
```

**Step 2: Run test — verify it fails**

```bash
bun test src/services/base/meta.factory.test.ts
```

**Step 3: Implement**

```typescript
// src/services/base/meta.factory.ts
import { eq, and } from 'drizzle-orm';
import type { IDatabase } from '@/db';

const META_VALUE_MAX_BYTES = 4096;

export interface MetaConfig<TKey extends string> {
  getTable: () => any;
  getQuery: () => {
    findFirst: (config?: any) => Promise<any>;
    findMany: (config?: any) => Promise<any[]>;
  };
  getEntityIdCol: () => any;
  getKeyCol: () => any;
  getValueCol: () => any;
  validateKey: (key: string) => key is TKey;
}

export function createMetaService<TKey extends string>(db: IDatabase, config: MetaConfig<TKey>) {
  return {
    async get(entityId: string, key: TKey): Promise<string | null> {
      const row = await config.getQuery().findFirst({
        where: and(eq(config.getEntityIdCol(), entityId), eq(config.getKeyCol(), key)),
      });
      return row?.meta_value ?? null;
    },

    async set(entityId: string, key: TKey, value: string): Promise<void> {
      if (!config.validateKey(key)) {
        throw new Error(`Invalid meta key: ${key}`);
      }
      const byteLength = new TextEncoder().encode(value).length;
      if (byteLength > META_VALUE_MAX_BYTES) {
        throw new Error(`Meta value exceeds ${META_VALUE_MAX_BYTES} byte limit`);
      }
      await db
        .insert(config.getTable())
        .values({
          [config.getEntityIdCol().name]: entityId,
          meta_key: key,
          meta_value: value,
        } as any)
        .onConflictDoUpdate({
          target: [config.getEntityIdCol(), config.getKeyCol()],
          set: { meta_value: value },
        });
    },

    async delete(entityId: string, key: TKey): Promise<void> {
      await db
        .delete(config.getTable())
        .where(and(eq(config.getEntityIdCol(), entityId), eq(config.getKeyCol(), key)));
    },

    async getAll(entityId: string): Promise<Partial<Record<TKey, string>>> {
      const rows = await config.getQuery().findMany({
        where: eq(config.getEntityIdCol(), entityId),
      });
      return Object.fromEntries(rows.map((r: any) => [r.meta_key, r.meta_value])) as Partial<
        Record<TKey, string>
      >;
    },
  };
}
```

**Step 4: Run test — verify it passes**

```bash
bun test src/services/base/meta.factory.test.ts
```

**Step 5: Commit**

```bash
git add src/services/base/meta.factory.ts src/services/base/meta.factory.test.ts
git commit -m "feat(services): add createMetaService factory for key-value meta pattern"
```

---

## Task 10: Migrate `user-meta.service.ts`

**Files:**

- Modify: `src/services/user-meta.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/user-meta.service.test.ts
```

**Step 2: Add meta factory**

In `UserMetaService`, add import and instantiate:

```typescript
import { createMetaService } from './base/meta.factory';
import { isValidMetaKey } from '@/lib/constants/user-meta-keys'; // existing import

// In class:
private meta = createMetaService<UserMetaKey>(this.db, {
  getTable: () => getActiveSchema().userMeta,
  getQuery: () => this.db.query.userMeta,
  getEntityIdCol: () => getActiveSchema().userMeta.user_id,
  getKeyCol: () => getActiveSchema().userMeta.meta_key,
  getValueCol: () => getActiveSchema().userMeta.meta_value,
  validateKey: isValidMetaKey,
});
```

**Step 3: Replace `getUserMeta`, `setUserMeta`, `deleteUserMeta`, `getUserMetaAll` bodies**

```typescript
async getUserMeta(userId: string, key: UserMetaKey): Promise<string | null> {
  await this.ensureUserExists(userId);
  return this.meta.get(userId, key);
}

async setUserMeta(userId: string, key: UserMetaKey, value: string): Promise<void> {
  await this.ensureUserExists(userId);
  return this.meta.set(userId, key, value);
}

async deleteUserMeta(userId: string, key: UserMetaKey): Promise<void> {
  await this.ensureUserExists(userId);
  return this.meta.delete(userId, key);
}

async getUserMetaAll(userId: string): Promise<Partial<Record<UserMetaKey, string>>> {
  await this.ensureUserExists(userId);
  return this.meta.getAll(userId);
}
```

> The `ensureUserExists` check and the type-safe wrappers (`getShowConvertedTotals`, etc.) remain unchanged. `getUserSettings` with its caching also stays unchanged — apply `cacheOrFetch` to it if the pattern matches.

**Step 4: Run tests and commit**

```bash
bun test src/services/user-meta.service.test.ts
git add src/services/user-meta.service.ts
git commit -m "refactor(services): migrate UserMetaService to use meta factory"
```

---

## Task 11: Migrate `workspace-meta.service.ts`

**Files:**

- Modify: `src/services/workspace-meta.service.ts`

**Step 1: Run baseline** (no test file exists — verify manually via `bun run typecheck`)

```bash
bun run typecheck
```

**Step 2: Add meta factory** (same pattern as Task 10)

```typescript
import { createMetaService } from './base/meta.factory';
import { isValidWorkspaceMetaKey } from '@/lib/constants/workspace-meta-keys'; // check actual export path

private meta = createMetaService<WorkspaceMetaKey>(this.db, {
  getTable: () => getActiveSchema().workspaceMeta,
  getQuery: () => this.db.query.workspaceMeta,
  getEntityIdCol: () => getActiveSchema().workspaceMeta.workspace_id,
  getKeyCol: () => getActiveSchema().workspaceMeta.meta_key,
  getValueCol: () => getActiveSchema().workspaceMeta.meta_value,
  validateKey: isValidWorkspaceMetaKey,
});
```

**Step 3: Replace `get`, `set`, `delete`, `getAll` bodies** with `this.meta.get/set/delete/getAll` calls (same delegation pattern). The `ensureWorkspaceExists` call stays before each delegation.

**Step 4: Run typecheck and commit**

```bash
bun run typecheck
git add src/services/workspace-meta.service.ts
git commit -m "refactor(services): migrate WorkspaceMetaService to use meta factory"
```

---

## Task 12: `createTokenService` factory

**Files:**

- Create: `src/services/base/token.factory.ts`
- Create: `src/services/base/token.factory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/base/token.factory.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { createTokenService } from './token.factory';

const futureDate = new Date(Date.now() + 3_600_000);
const pastDate = new Date(Date.now() - 1000);

const mockToken = { id: 'tid', user_id: 'u1', token: 'abc123', expires_at: futureDate };

function makeDb(tokenRow: any = mockToken) {
  return {
    query: {
      tokens: {
        findFirst: mock(() => Promise.resolve(tokenRow)),
      },
    },
    insert: mock(() => ({ values: mock(() => Promise.resolve()) })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'tokens' as any,
    getQuery: () => db.query.tokens,
    getUserIdCol: () => ({ name: 'user_id' }) as any,
    getTokenCol: () => ({ name: 'token' }) as any,
    getExpiresAtCol: () => ({ name: 'expires_at' }) as any,
  };
}

describe('createTokenService', () => {
  it('createToken returns a 64-char string and inserts row', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    const token = await svc.createToken('u1', 60);
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('createToken deletes existing tokens before inserting', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    await svc.createToken('u1', 60);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('validateToken returns userId when token is valid and not expired', async () => {
    const db = makeDb(mockToken);
    const svc = createTokenService(db as any, makeConfig(db));
    const result = await svc.validateToken('abc123');
    expect(result).toEqual({ userId: 'u1' });
  });

  it('validateToken returns null when token is expired', async () => {
    const db = makeDb({ ...mockToken, expires_at: pastDate });
    const svc = createTokenService(db as any, makeConfig(db));
    // The factory passes gt(expiresAt, new Date()) to findFirst — driver returns null for expired
    db.query.tokens.findFirst = mock(() => Promise.resolve(null));
    const result = await svc.validateToken('abc123');
    expect(result).toBeNull();
  });

  it('validateToken returns null when token not found', async () => {
    const db = makeDb(null);
    db.query.tokens.findFirst = mock(() => Promise.resolve(null));
    const svc = createTokenService(db as any, makeConfig(db));
    const result = await svc.validateToken('notexist');
    expect(result).toBeNull();
  });

  it('consumeToken deletes the token row', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    await svc.consumeToken('abc123');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test — verify it fails**

```bash
bun test src/services/base/token.factory.test.ts
```

**Step 3: Implement**

```typescript
// src/services/base/token.factory.ts
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { IDatabase } from '@/db';

export interface TokenConfig {
  getTable: () => any;
  getQuery: () => { findFirst: (config?: any) => Promise<any> };
  getUserIdCol: () => any;
  getTokenCol: () => any;
  getExpiresAtCol: () => any;
}

export function createTokenService(db: IDatabase, config: TokenConfig) {
  return {
    async createToken(userId: string, expiryMinutes: number): Promise<string> {
      // Delete any existing tokens for this user
      await db.delete(config.getTable()).where(eq(config.getUserIdCol(), userId));

      const token = nanoid(64);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await db.insert(config.getTable()).values({
        id: nanoid(),
        [config.getUserIdCol().name]: userId,
        [config.getTokenCol().name]: token,
        [config.getExpiresAtCol().name]: expiresAt,
      } as any);

      return token;
    },

    async validateToken(token: string): Promise<{ userId: string } | null> {
      const row = await config.getQuery().findFirst({
        where: and(eq(config.getTokenCol(), token), gt(config.getExpiresAtCol(), new Date())),
      });
      if (!row) return null;
      return { userId: row[config.getUserIdCol().name] };
    },

    async consumeToken(token: string): Promise<void> {
      await db.delete(config.getTable()).where(eq(config.getTokenCol(), token));
    },
  };
}
```

**Step 4: Run test — verify it passes**

```bash
bun test src/services/base/token.factory.test.ts
```

**Step 5: Commit**

```bash
git add src/services/base/token.factory.ts src/services/base/token.factory.test.ts
git commit -m "feat(services): add createTokenService factory for shared token lifecycle pattern"
```

---

## Task 13: Migrate `email-verification.service.ts`

**Files:**

- Modify: `src/services/email-verification.service.ts`

**Step 1: Run baseline**

```bash
bun test src/services/email-verification.service.test.ts
```

**Step 2: Add token factory**

```typescript
import { createTokenService } from './base/token.factory';

// In EmailVerificationService class constructor:
private tokens = createTokenService(this.db, {
  getTable: () => getActiveSchema().emailVerificationTokens,
  getQuery: () => this.db.query.emailVerificationTokens,
  getUserIdCol: () => getActiveSchema().emailVerificationTokens.user_id,
  getTokenCol: () => getActiveSchema().emailVerificationTokens.token,
  getExpiresAtCol: () => getActiveSchema().emailVerificationTokens.expires_at,
});
```

**Step 3: Replace token lifecycle code in `createVerificationToken` and `verifyEmail`**

In `createVerificationToken`, replace the delete + insert block with:

```typescript
return this.tokens.createToken(userId, 24 * 60); // 24 hours
```

In `verifyEmail`, replace the findFirst + expiry check + delete with:

```typescript
const tokenData = await this.tokens.validateToken(token);
if (!tokenData) {
  return { success: false, error: 'INVALID_TOKEN' };
}
await this.tokens.consumeToken(token);
// ... rest of verifyEmail (mark user verified etc.) unchanged
```

**Step 4: Run tests and commit**

```bash
bun test src/services/email-verification.service.test.ts
git add src/services/email-verification.service.ts
git commit -m "refactor(services): migrate EmailVerificationService to use token factory"
```

---

## Task 14: Refactor and migrate `password-reset.service.ts`

**Files:**

- Modify: `src/services/password-reset.service.ts`

**Step 1: Run baseline**

```bash
bun run typecheck
```

> No test file exists for password-reset; rely on typecheck + callers.

**Step 2: Convert from module functions to class**

`password-reset.service.ts` currently exports standalone functions (`requestPasswordReset`, `validateResetToken`, `consumeResetToken`). Convert to a class while keeping the same exported function names as thin wrappers to avoid breaking callers.

```typescript
// src/services/password-reset.service.ts
import { createTokenService } from './base/token.factory';
import type { IDatabase } from '@/db';
import { getDb, getActiveSchema } from '@/db';
// ... keep existing imports for email, logger, etc.

export class PasswordResetService {
  private tokens = createTokenService(this.db, {
    getTable: () => getActiveSchema().passwordResetTokens,
    getQuery: () => this.db.query.passwordResetTokens,
    getUserIdCol: () => getActiveSchema().passwordResetTokens.user_id,
    getTokenCol: () => getActiveSchema().passwordResetTokens.token,
    getExpiresAtCol: () => getActiveSchema().passwordResetTokens.expires_at,
  });

  constructor(private db: IDatabase) {}

  async requestPasswordReset(email: string): Promise<void> {
    // Email enumeration protection: always return, never reveal if user exists
    const schema = getActiveSchema();
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });
    if (!user || user.deleted_at) return;

    const token = await this.tokens.createToken(user.id, 60); // 1 hour
    await emailService.sendPasswordReset({ email: user.email, token });
  }

  async validateResetToken(token: string): Promise<string | null> {
    // TODO: wire up to password reset UI
    const result = await this.tokens.validateToken(token);
    return result?.userId ?? null;
  }

  async consumeResetToken(token: string): Promise<void> {
    // TODO: wire up to password reset UI
    return this.tokens.consumeToken(token);
  }
}

// Backwards-compatible module-level exports (existing callers unchanged)
const _service = new PasswordResetService(getDb());
export const requestPasswordReset = _service.requestPasswordReset.bind(_service);
export const validateResetToken = _service.validateResetToken.bind(_service);
export const consumeResetToken = _service.consumeResetToken.bind(_service);
```

> The backwards-compat exports ensure `src/pages/api/auth/...` callers require zero changes.

**Step 3: Run typecheck and verify callers compile**

```bash
bun run typecheck
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/services/password-reset.service.ts
git commit -m "refactor(services): convert PasswordResetService to class and use token factory"
```

---

## Task 15: Final verification

**Step 1: Run full test suite**

```bash
bun run test
```

Expected: All tests pass (same count as before — no tests deleted).

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds with no new errors.

**Step 4: Commit if any formatting changes**

```bash
bun run format:fix
git add -A
git commit -m "chore: format after services refactor"
```

---

## Summary

| Task | Deliverable                             | Commit                                                      |
| ---- | --------------------------------------- | ----------------------------------------------------------- |
| 1    | `cacheOrFetch` utility                  | `feat(cache): add cacheOrFetch utility`                     |
| 2    | `createCrudService` factory             | `feat(services): add createCrudService factory`             |
| 3    | Migrate CategoryService                 | `refactor(services): migrate CategoryService`               |
| 4    | Migrate AssetCategoryService            | `refactor(services): migrate AssetCategoryService`          |
| 5    | Migrate WorkspaceInvitationService      | `refactor(services): migrate WorkspaceInvitationService`    |
| 6    | Migrate BudgetService                   | `refactor(services): migrate BudgetService`                 |
| 7    | Migrate TransactionService              | `refactor(services): migrate TransactionService`            |
| 8    | Migrate AssetService                    | `refactor(services): migrate AssetService`                  |
| 9    | `createMetaService` factory             | `feat(services): add createMetaService factory`             |
| 10   | Migrate UserMetaService                 | `refactor(services): migrate UserMetaService`               |
| 11   | Migrate WorkspaceMetaService            | `refactor(services): migrate WorkspaceMetaService`          |
| 12   | `createTokenService` factory            | `feat(services): add createTokenService factory`            |
| 13   | Migrate EmailVerificationService        | `refactor(services): migrate EmailVerificationService`      |
| 14   | Refactor + migrate PasswordResetService | `refactor(services): convert PasswordResetService to class` |
| 15   | Full verification                       | `chore: format after services refactor`                     |
