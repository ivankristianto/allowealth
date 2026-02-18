# Services Refactor Design

**Date:** 2026-02-18
**Status:** Approved
**Scope:** Service layer abstractions — factory functions for CRUD, meta, and token patterns

---

## Background

A [services analysis](./2026-02-18-services-analysis.md) identified 8 abstraction opportunities across 25 services. After review against actual code, Wave 3 (count/exists/soft-delete/history helpers) was dropped — those patterns are too service-specific to generalize cleanly. Dead code removal (Phase 1 of the analysis) was also dropped; the analysis had significant false positives (5 of 11 "dead" functions are actively used in MCP server and page files).

The approved scope is **two waves of factory abstractions**, targeting ~500 lines of reduction.

---

## Decisions

| Decision          | Choice                                                | Reason                                                                 |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| CRUD pattern      | Factory function (composition)                        | Avoids inheritance chain, easier to mix with service-specific behavior |
| Cache pattern     | `cacheOrFetch` utility (explicit wrapper)             | No TS decorator config needed, easier to trace                         |
| Token services    | Refactor password-reset from module functions → class | Consistency with email-verification                                    |
| Wave 3            | Dropped                                               | Count/exists/history patterns are too varied to generalize             |
| Dead code removal | Dropped                                               | Analysis had false positives; not worth the risk                       |

---

## Architecture

### New files

```
src/services/base/
  crud.factory.ts       # createCrudService<T, TCreate, TUpdate>()
  meta.factory.ts       # createMetaService<TKey>()
  token.factory.ts      # createTokenService()

src/lib/cache/
  cache-or-fetch.ts     # cacheOrFetch<T>() utility
```

### No changes to

- Service public APIs (method signatures, return types)
- Error classes (`service-errors.ts`)
- Cache keys / tags (remain per-service)
- Validation logic (Zod schemas stay in services)
- `PerfCollector` / `trackQuery` usage (stays in services)

---

## Wave 1: `createCrudService` Factory

### Interface

```typescript
// src/services/base/crud.factory.ts

interface CrudConfig {
  getTable: () => AnyTable;
  getQuery: () => { findFirst: (...args: any[]) => any; findMany: (...args: any[]) => any };
  getId: () => AnyColumn;
  getWorkspaceId: () => AnyColumn;
}

export function createCrudService<T, TCreate, TUpdate>(
  db: IDatabase,
  config: CrudConfig
): {
  findById(id: string, workspaceId: string): Promise<T | null>;
  findAll(workspaceId: string): Promise<T[]>;
  create(input: TCreate): Promise<T>;
  update(id: string, workspaceId: string, input: Partial<TUpdate>): Promise<T>;
  delete(id: string, workspaceId: string): Promise<void>;
};
```

### What the factory handles

- Raw Drizzle query boilerplate (`findFirst`, `findMany`, `insert`, `update`, `delete`)
- `workspaceId` scoping in WHERE clauses
- `.returning()` and unwrapping the first result

### What stays in each service

- Zod validation before insert/update
- Cache read / write / invalidation
- `trackQuery` / `PerfCollector`
- Service-specific error classes and codes
- `findAll` with filters (filter logic varies per service)
- Any joins, computed fields, or complex WHERE conditions

### Usage pattern

```typescript
export class CategoryService {
  private crud = createCrudService<Category, CreateCategoryInput, UpdateCategoryInput>(this.db, {
    getTable: () => getActiveSchema().categories,
    getQuery: () => this.db.query.categories,
    getId: () => getActiveSchema().categories.id,
    getWorkspaceId: () => getActiveSchema().categories.workspace_id,
  });

  constructor(private db: IDatabase) {}

  // Simple delegation — no more boilerplate
  findById(id: string, workspaceId: string) {
    return this.crud.findById(id, workspaceId);
  }

  // Service-specific logic stays here
  async create(input: CreateCategoryInput, perf?: PerfCollector) {
    const validated = createCategorySchema.parse(input);
    const [category] = await trackQuery('CategoryService.create', perf, () =>
      this.db.insert(getActiveSchema().categories).values(validated).returning()
    );
    await this.invalidateCache(validated.workspace_id);
    return category;
  }
}
```

### Services migrated

| Service                           | Methods delegated                        |
| --------------------------------- | ---------------------------------------- |
| `category.service.ts`             | `findById`, `create`, `update`, `delete` |
| `asset-category.service.ts`       | `findById`, `create`, `update`, `delete` |
| `workspace-invitation.service.ts` | `findById`, `create`, `delete`           |
| `budget.service.ts`               | `findById`, `create`, `update`, `delete` |
| `transaction.service.ts`          | `findById`, `create`, `update`           |
| `asset.service.ts`                | `findById`, `create`, `update`           |

`user.service.ts` excluded — scoped by `userId` not `workspaceId`, different shape.

**Estimated reduction: ~210 lines**

---

## Wave 2a: `createMetaService` Factory

### Interface

```typescript
// src/services/base/meta.factory.ts

interface MetaConfig<TKey extends string> {
  getTable: () => AnyTable;
  getEntityIdCol: () => AnyColumn; // user_id or workspace_id
  getKeyCol: () => AnyColumn; // meta_key
  getValueCol: () => AnyColumn; // meta_value
  validateKey: (key: string) => key is TKey;
}

export function createMetaService<TKey extends string>(
  db: IDatabase,
  config: MetaConfig<TKey>
): {
  get(entityId: string, key: TKey): Promise<string | null>;
  set(entityId: string, key: TKey, value: string): Promise<void>;
  delete(entityId: string, key: TKey): Promise<void>;
  getAll(entityId: string): Promise<Partial<Record<TKey, string>>>;
};
```

The factory handles: key validation, 4KB value size enforcement, upsert via `onConflictDoUpdate`.

### What stays per-service

- Type-safe wrappers (`getCurrency`, `getShowConvertedTotals`, etc.)
- Existence checks (`ensureUserExists`, `ensureWorkspaceExists`)
- Defaults merging (`META_DEFAULTS`, `WORKSPACE_META_DEFAULTS`)
- Value validation logic (`validateMetaValue` in workspace-meta)
- Caching (user-meta caches `getUserSettings`; workspace-meta does not)

### Services migrated

- `user-meta.service.ts`
- `workspace-meta.service.ts`

**Estimated reduction: ~120 lines**

---

## Wave 2b: `createTokenService` Factory

### Interface

```typescript
// src/services/base/token.factory.ts

interface TokenConfig {
  getTable: () => AnyTable;
  getUserIdCol: () => AnyColumn;
  getTokenCol: () => AnyColumn;
  getExpiresAtCol: () => AnyColumn;
}

export function createTokenService(
  db: IDatabase,
  config: TokenConfig
): {
  // Deletes existing tokens for user, inserts new 64-char nanoid token
  createToken(userId: string, expiryMinutes: number): Promise<string>;
  // Returns { userId } if token valid and not expired, null otherwise
  validateToken(token: string): Promise<{ userId: string } | null>;
  // Deletes the token (single-use enforcement)
  consumeToken(token: string): Promise<void>;
};
```

### Additional change: password-reset refactor

`password-reset.service.ts` currently uses module-level functions with a global `db` singleton — inconsistent with the rest of the codebase. Migrate to a class during this wave for consistency with `EmailVerificationService`.

### Services migrated

- `email-verification.service.ts`
- `password-reset.service.ts` (also refactored from module functions → class)

**Estimated reduction: ~100 lines**

---

## Wave 2c: `cacheOrFetch` Utility

### Interface

```typescript
// src/lib/cache/cache-or-fetch.ts

export async function cacheOrFetch<T>(
  key: string,
  options: { ttl: number; tags: string[] },
  fetch: () => Promise<T>,
  perf?: PerfCollector
): Promise<T>;
```

Replaces the repeated 12-line try/catch pattern in every cached method with a 5-line call. Cache failures remain silent (fail-open). Applied to ~10 cached methods across services.

**Estimated reduction: ~70 lines**

---

## Summary

| Wave      | Deliverable                                                               | Est. reduction |
| --------- | ------------------------------------------------------------------------- | -------------- |
| Wave 1    | `createCrudService` + migrate 6 services                                  | ~210 lines     |
| Wave 2a   | `createMetaService` + migrate 2 meta services                             | ~120 lines     |
| Wave 2b   | `createTokenService` + migrate 2 token services + refactor password-reset | ~100 lines     |
| Wave 2c   | `cacheOrFetch` utility + apply to all cached methods                      | ~70 lines      |
| **Total** |                                                                           | **~500 lines** |

No public APIs change. No behavioral changes. All existing tests should pass without modification.
