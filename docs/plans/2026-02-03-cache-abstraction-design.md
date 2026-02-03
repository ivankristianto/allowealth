# Cache Abstraction Layer Design

**Date:** 2026-02-03
**Status:** Approved
**Goal:** Reduce page response times from 4-11 seconds to <500ms

## Problem

Current performance is unacceptable:

| Page            | Render Time | Bottleneck                                        |
| --------------- | ----------- | ------------------------------------------------- |
| `/budget`       | 7,500ms     | Multiple DB queries to Supabase (~400ms RTT each) |
| `/dashboard`    | 7,000ms     | Aggregation queries                               |
| `/transactions` | 4,500ms     | List queries with filters                         |
| `/settings`     | 11,000ms    | Multiple settings lookups                         |

Existing in-memory caches (session-cache, layout-cache) only work in Node.js/Bun, not Cloudflare Workers.

## Decisions

| Decision          | Choice                                  | Rationale                                   |
| ----------------- | --------------------------------------- | ------------------------------------------- |
| Deployment target | Vendor-agnostic (CF Workers + Node/Bun) | Flexibility                                 |
| Caching strategy  | Service-level                           | Matches architecture, easier invalidation   |
| Cache provider    | Upstash Redis only                      | REST API works everywhere, simple ops       |
| TTL strategy      | Long TTL + active invalidation          | Best performance, data changes infrequently |
| Fallback behavior | Fail silently, hit DB                   | Graceful degradation                        |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  (BudgetService, TransactionService, SessionService)    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    CacheManager                          │
│  - get<T>(key): Promise<T | null>                       │
│  - set<T>(key, value, ttl): Promise<void>               │
│  - invalidate(pattern): Promise<void>                   │
│  - invalidateByTags(tags): Promise<void>                │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    CacheDriver (interface)               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │  UpstashDriver  │  │ MemoryDriver  │  │ NoopDriver│ │
│  │  (production)   │  │  (dev/test)   │  │ (disabled)│ │
│  └─────────────────┘  └───────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Driver Selection

| Environment             | Driver                         | Reason                        |
| ----------------------- | ------------------------------ | ----------------------------- |
| Production (CF Workers) | `UpstashDriver`                | No persistent memory          |
| Production (Node/Bun)   | `UpstashDriver`                | Shared cache across instances |
| Development             | `MemoryDriver`                 | No external deps needed       |
| Testing                 | `MemoryDriver` or `NoopDriver` | Isolated, fast tests          |

## Cache Keys & TTL

| Data              | Cache Key                                              | TTL    | Example                            |
| ----------------- | ------------------------------------------------------ | ------ | ---------------------------------- |
| Budget overview   | `cache:budget:{workspaceId}:{year}:{month}:{currency}` | 1 hour | `cache:budget:ws_123:2026:2:IDR`   |
| Dashboard summary | `cache:dashboard:{workspaceId}:{year}:{month}`         | 1 hour | `cache:dashboard:ws_123:2026:2`    |
| Transaction list  | `cache:transactions:{workspaceId}:{filtersHash}`       | 30 min | `cache:transactions:ws_123:a1b2c3` |
| User settings     | `cache:settings:{userId}`                              | 1 hour | `cache:settings:usr_456`           |
| Session           | `cache:session:{sessionId}`                            | 5 min  | `cache:session:sid_789`            |

## Tag-Based Invalidation

Each cached entry is tagged for bulk invalidation:

```typescript
// When caching budget overview
cache.set(key, data, {
  ttl: 3600,
  tags: ['workspace:ws_123', 'budget', 'transactions'],
});

// When user creates a transaction
cache.invalidateByTags(['workspace:ws_123', 'transactions']);
// → Invalidates: budget overview, dashboard, transaction list
```

### Invalidation Triggers

| User Action                      | Invalidate Tags                  |
| -------------------------------- | -------------------------------- |
| Create/Update/Delete Transaction | `workspace:{id}`, `transactions` |
| Create/Update/Delete Budget      | `workspace:{id}`, `budget`       |
| Update User Settings             | `user:{id}`, `settings`          |
| Logout / Session Change          | `session:{id}`                   |
| Create/Update/Delete Category    | `workspace:{id}`, `categories`   |

## File Structure

```
src/lib/cache/
├── index.ts                 # Re-exports, getCacheManager()
├── types.ts                 # CacheDriver interface, CacheConfig
├── cache-manager.ts         # CacheManager class (orchestrates drivers)
├── drivers/
│   ├── upstash.ts          # UpstashDriver implementation
│   ├── memory.ts           # MemoryDriver implementation
│   └── noop.ts             # NoopDriver (disabled cache)
├── keys.ts                  # Cache key builders & constants
└── tags.ts                  # Tag constants & helpers
```

## Core Interface

```typescript
// src/lib/cache/types.ts

export interface CacheDriver {
  /** Get value by key, returns null if miss or expired */
  get<T>(key: string): Promise<T | null>;

  /** Set value with optional TTL (seconds) and tags */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Delete a specific key */
  delete(key: string): Promise<void>;

  /** Delete all keys matching pattern (e.g., "cache:budget:ws_123:*") */
  invalidatePattern(pattern: string): Promise<void>;

  /** Delete all keys with any of the given tags */
  invalidateByTags(tags: string[]): Promise<void>;
}

export interface CacheSetOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Tags for bulk invalidation */
  tags?: string[];
}

export interface CacheConfig {
  driver: 'upstash' | 'memory' | 'none';
  upstash?: {
    url: string;
    token: string;
  };
  defaultTtl: number; // seconds
}
```

## Service Integration Pattern

```typescript
// Example: src/services/budget.service.ts

import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';

export class BudgetService {
  private cache = getCacheManager();

  async getMonthlyOverview(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD'
  ): Promise<BudgetSummary> {
    const cacheKey = CacheKeys.budget(workspaceId, year, month, currency);

    // Try cache first
    const cached = await this.cache.get<BudgetSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from DB
    const result = await this.fetchMonthlyOverviewFromDb(workspaceId, year, month, currency);

    // Store in cache with tags
    await this.cache.set(cacheKey, result, {
      ttl: 3600,
      tags: [CacheTags.workspace(workspaceId), 'budget', 'transactions'],
    });

    return result;
  }

  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const budget = await this.insertBudgetToDb(input);

    // Invalidate related caches
    await this.cache.invalidateByTags([CacheTags.workspace(input.workspace_id), 'budget']);

    return budget;
  }
}
```

## Services to Modify

| Service              | Methods to Cache                          | Methods That Invalidate                                       |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `BudgetService`      | `getMonthlyOverview`, `getMonthlyHistory` | `createBudget`, `updateBudget`, `deleteBudget`, `copyBudgets` |
| `TransactionService` | `findAll`, `getDashboardSummary`          | `create`, `update`, `delete`, `bulkDelete`                    |
| `UserMetaService`    | `getAll`, `get`                           | `set`, `delete`                                               |
| Auth (session)       | `validateSession`                         | `invalidateSession`, `invalidateUserSessions`                 |

## Upstash Tag Tracking

Upstash Redis doesn't have native tag support. We use Redis Sets:

```
Key-Value Store:
  cache:budget:ws_123:2026:2:IDR → {serialized BudgetSummary}

Tag Index (Sets):
  tag:workspace:ws_123 → ["cache:budget:ws_123:2026:2:IDR", "cache:dashboard:ws_123:2026:2", ...]
  tag:budget → ["cache:budget:ws_123:2026:2:IDR", "cache:budget:ws_456:2026:2:USD", ...]
```

## Environment Variables

```bash
# Cache driver: "upstash" | "memory" | "none"
CACHE_DRIVER=memory

# Upstash Redis (required when CACHE_DRIVER=upstash)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## Expected Performance

| Page            | Current  | With Cache (Hit) | Improvement    |
| --------------- | -------- | ---------------- | -------------- |
| `/budget`       | 7,500ms  | ~50-100ms        | **98% faster** |
| `/dashboard`    | 7,000ms  | ~50-100ms        | **98% faster** |
| `/transactions` | 4,500ms  | ~50-100ms        | **97% faster** |
| `/settings`     | 11,000ms | ~50-100ms        | **99% faster** |
| `/profile`      | 800ms    | ~50-100ms        | **87% faster** |

## Migration Plan

### Phase 1: Infrastructure (no behavior change)

1. Create cache driver abstraction (`src/lib/cache/`)
2. Add `@upstash/redis` dependency
3. Add environment variables
4. Write unit tests for drivers

### Phase 2: Session Cache Migration

1. Migrate `session-cache.ts` to use new CacheManager
2. Keep existing in-memory as fallback
3. Test auth flow still works

### Phase 3: High-Impact Services

1. Add caching to `BudgetService.getMonthlyOverview`
2. Add caching to `TransactionService.findAll`
3. Add caching to dashboard summary
4. Add invalidation to mutation methods

### Phase 4: Settings & Cleanup

1. Add caching to `UserMetaService`
2. Remove old `layout-cache.ts` (superseded)
3. Update existing `session-cache.ts` integration
4. Add cache stats endpoint for monitoring (optional)

## Dependencies

```bash
bun add @upstash/redis
```
