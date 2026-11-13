# ADR 008: Cache Abstraction Layer

## Status

Accepted

## Context

The application serves data-heavy pages where repeated workspace queries can dominate response time. We need a runtime-compatible cache abstraction that works across Bun local development and edge/runtime deployments.

## Decision

Use a service-layer cache-aside architecture with driver abstraction and tag-based invalidation.

### Components

- `CacheManager`: central runtime manager for cache operations.
- `CacheDriver` interface: consistent API for all drivers.
- `RedisDriver`: production cache backend (TCP via Bun.Redis, Bun-only). Docker Compose sets `CACHE_DRIVER=redis` by default and runs a bundled Redis service.
- `UpstashDriver`: optional hosted backend (REST API), used when `CACHE_DRIVER=upstash`.
- `MemoryDriver`: in-process cache. The default when `CACHE_DRIVER` is unset, used in dev and tests.
- `NoopDriver`: explicit no-cache mode (tests or disabled cache).

### Canonical Driver Interface

```ts
export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
}
```

`invalidatePattern` is not part of the current interface and should not be used in new code.

### Service-Level Pattern

1. Service reads from cache key.
2. On hit, return cached value.
3. On miss, query DB and cache response with tags.
4. Mutation paths invalidate relevant tags.

### Invalidation Policy

`invalidateTags(tags)` is the standard helper. The app cache drivers log and swallow backend errors, so a cache outage never fails the write that triggered it. A failed invalidation can leave stale entries until their TTL expires.

### Tag Contract

- Workspace scope: `CacheTags.workspace(workspaceId)`
- User scope: `CacheTags.user(userId)`
- No global domain tags. `invalidateByTags` deletes the union of its tags, so a global tag such as `accounts` would flush that entity's cache in every workspace. A write invalidates its whole workspace (or user) instead.

## Consequences

Positive:

- Consistent cache API across environments.
- Lower repeated DB query load for hot paths.
- Clear invalidation semantics through tags and policy.

Tradeoffs:

- Cache correctness depends on complete mutation invalidation coverage.
- Tag taxonomy must remain consistent across services.

## References

- Cache implementation: `src/lib/cache/`
- Shared invalidation helper: `src/lib/cache/invalidate.ts`
- Tags: `src/lib/cache/tags.ts`
- Manager: `src/lib/cache/cache-manager.ts`
