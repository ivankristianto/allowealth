# ADR 008: Cache Abstraction Layer

## Status

Accepted

## Context

The application suffers from significant performance bottlenecks due to multiple database queries during page rendering, especially when hitting Supabase from edge runtimes like Cloudflare Workers.

Current performance measurements:

- `/budget`: 7,500ms
- `/dashboard`: 7,000ms
- `/transactions`: 4,500ms
- `/settings`: 11,000ms

The primary bottleneck is the Round-Trip Time (RTT) to the database (approx. 400ms per query). Data-heavy pages executing 10+ queries result in unacceptable latency. Existing in-memory caches are not shared across edge instances and do not persist, making them ineffective for distributed deployments.

## Decision

Implement a vendor-agnostic Cache Abstraction Layer to provide low-latency data access (<100ms) across all deployment environments.

### 1. Architecture Components

- **CacheManager**: The central orchestrator used by services to interact with the cache.
- **CacheDriver (Interface)**: Defines the standard operations for cache providers.
- **UpstashDriver**: Production driver using Redis over REST, ensuring compatibility with Cloudflare Workers and standard Node.js/Bun runtimes.
- **MemoryDriver**: Development driver using local memory, avoiding external dependencies during local work.
- **NoopDriver**: A "no-op" driver that disables caching, primarily used for testing or when caching needs to be globally bypassed.

### 2. Caching Strategy: Service-Level Cache-Aside

Caching logic is integrated into the **Service Layer** (e.g., `BudgetService`, `TransactionService`). This ensures that caching is applied at the right level of abstraction, just above the data access layer.

**Pattern:**

1. Check for data in cache using a specific key.
2. If hit: Return cached data immediately.
3. If miss: Fetch data from the database.
4. Store data in cache with a TTL (Time-To-Live) and associated tags.
5. Return data to the caller.

### 3. Invalidation: Tag-Based System

To prevent stale data, the system uses an active invalidation strategy based on **Tags**.

- **Set**: When data is cached, it is assigned one or more tags (e.g., `workspace:ws_123`, `transactions`, `budget`).
- **Invalidate**: When a mutation occurs (Create, Update, Delete), the service invalidates all cache entries associated with relevant tags.

Example: Adding a transaction invalidates `workspace:{id}` and `transactions` tags, forcing a refresh of the budget overview, dashboard summary, and transaction lists.

### 4. Technical Specifications

**Core Interface:**

```typescript
export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
}
```

**Environment Selection:**

- **Production**: `UpstashDriver` (Shared Redis)
- **Development**: `MemoryDriver` (Isolated local cache)
- **Testing**: `NoopDriver` (Cache disabled)

## Consequences

### Positive

- **Performance**: Dramatically reduced page response times (expected <500ms p95).
- **Scalability**: Reduced load on the primary database.
- **Consistency**: Tag-based invalidation provides a robust way to manage data freshness across complex views.
- **Portability**: Vendor-agnostic design allows switching cache providers with minimal changes.

### Negative

- **Complexity**: Developers must manually manage cache keys and tags in Services.
- **Maintenance**: Requires monitoring of cache hit rates and Upstash REST API usage.
- **Stale Data Risk**: Incorrect or missing invalidation tags can lead to users seeing outdated information.

## Future Considerations

- Automatic cache warming for critical user paths.
- Implementation of a "stale-while-revalidate" pattern for even lower latency.
- Global cache bypass mechanisms for troubleshooting.

## References

- **Implementation**: `src/lib/cache/`
- **Design Document**: `docs/done/2026-02-03-cache-abstraction-design.md`
- **Primary Provider**: [Upstash Redis](https://upstash.com/redis)
