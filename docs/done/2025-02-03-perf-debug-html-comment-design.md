# Performance Debug HTML Comment

## Overview

Add an HTML comment at the end of `</body>` containing server performance stats for development debugging. Enabled via `PERF_DEBUG=true` environment variable.

## Goals

- Zero UI impact - only visible in View Source / DevTools
- Request-scoped metrics collection
- Human-readable output format
- Development-only (not for production)

## Stats Collected

| Stat                  | Description                          |
| --------------------- | ------------------------------------ |
| Cache hits/misses     | Cumulative count per request         |
| DB query count + time | Number of queries and total duration |
| Service timings       | Breakdown by service call            |
| Render time           | Page rendering duration              |
| Memory usage          | Process heap memory at request end   |
| Total time            | Full request duration                |

## Output Format

```html
<!--
[PERF DEBUG] 2025-02-03 14:32:05
Route: /transactions
Cache: 3 hits, 1 miss
DB: 4 queries in 23ms
  - findCategories: 8ms
  - findTransactions: 12ms
  - countTransactions: 3ms
Services: CategoryService 10ms, DashboardService 45ms
Render: 67ms
Memory: 48.2 MB
Total: 112ms
-->
```

## Architecture

### PerfCollector Class

Request-scoped collector that accumulates metrics throughout the request lifecycle.

```typescript
// src/lib/perf/collector.ts
export class PerfCollector {
  private startTime = performance.now();
  private cacheHits = 0;
  private cacheMisses = 0;
  private dbQueries: { name: string; duration: number }[] = [];
  private serviceCalls: { name: string; duration: number }[] = [];
  private route = '';

  cacheHit(): void {
    this.cacheHits++;
  }
  cacheMiss(): void {
    this.cacheMisses++;
  }

  recordDbQuery(name: string, duration: number): void {
    this.dbQueries.push({ name, duration });
  }

  recordService(name: string, duration: number): void {
    this.serviceCalls.push({ name, duration });
  }

  setRoute(route: string): void {
    this.route = route;
  }

  toHtmlComment(): string {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const totalTime = performance.now() - this.startTime;
    const dbTime = this.dbQueries.reduce((sum, q) => sum + q.duration, 0);
    const memory = process.memoryUsage().heapUsed / 1024 / 1024;

    const lines = [
      `[PERF DEBUG] ${now}`,
      `Route: ${this.route}`,
      `Cache: ${this.cacheHits} hits, ${this.cacheMisses} misses`,
      `DB: ${this.dbQueries.length} queries in ${dbTime.toFixed(1)}ms`,
    ];

    // Add individual query breakdown
    for (const q of this.dbQueries) {
      lines.push(`  - ${q.name}: ${q.duration.toFixed(1)}ms`);
    }

    // Add service timings
    if (this.serviceCalls.length > 0) {
      const serviceStr = this.serviceCalls
        .map((s) => `${s.name} ${s.duration.toFixed(0)}ms`)
        .join(', ');
      lines.push(`Services: ${serviceStr}`);
    }

    // Calculate render time (total minus tracked work)
    const trackedTime = dbTime + this.serviceCalls.reduce((sum, s) => sum + s.duration, 0);
    const renderTime = totalTime - trackedTime;
    lines.push(`Render: ${renderTime.toFixed(0)}ms`);
    lines.push(`Memory: ${memory.toFixed(1)} MB`);
    lines.push(`Total: ${totalTime.toFixed(0)}ms`);

    return `<!--\n${lines.join('\n')}\n-->`;
  }
}
```

### Helper Functions

```typescript
// src/lib/perf/helpers.ts
import type { PerfCollector } from './collector';

export async function trackQuery<T>(
  name: string,
  perf: PerfCollector | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!perf) return fn();

  const start = performance.now();
  const result = await fn();
  perf.recordDbQuery(name, performance.now() - start);
  return result;
}

export async function trackService<T>(
  name: string,
  perf: PerfCollector | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!perf) return fn();

  const start = performance.now();
  const result = await fn();
  perf.recordService(name, performance.now() - start);
  return result;
}
```

### Integration Points

#### 1. Middleware (request start)

```typescript
// src/middleware.ts
import { PerfCollector } from '@/lib/perf';

const onRequest = defineMiddleware(async (context, next) => {
  // Create collector if debug enabled
  if (import.meta.env.PERF_DEBUG === 'true') {
    context.locals.perf = new PerfCollector();
    context.locals.perf.setRoute(context.url.pathname);
  }

  return next();
});
```

#### 2. Astro.locals type

```typescript
// src/env.d.ts
import type { PerfCollector } from '@/lib/perf';

declare global {
  namespace App {
    interface Locals {
      user?: User | null;
      session?: Session | null;
      perf?: PerfCollector;
    }
  }
}
```

#### 3. Cache Manager

```typescript
// src/lib/cache/cache-manager.ts
async get<T>(key: string, perf?: PerfCollector): Promise<T | null> {
  try {
    const result = await this.driver.get<T>(key);
    if (perf) {
      result !== null ? perf.cacheHit() : perf.cacheMiss();
    }
    return result;
  } catch {
    perf?.cacheMiss();
    return null;
  }
}
```

#### 4. BaseLayout (output injection)

```astro
---
// src/layouts/BaseLayout.astro
const perf = Astro.locals.perf;
const debugEnabled = import.meta.env.PERF_DEBUG === 'true';
---

<html>
  <head></head>...
  <body>
    <slot />
    {debugEnabled && perf && <Fragment set:html={perf.toHtmlComment()} />}
  </body>
</html>
```

#### 5. Service Usage Example

```typescript
// src/services/category.service.ts
import { trackQuery } from '@/lib/perf';

export class CategoryService {
  async findAll(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('findCategories', perf, async () => {
      return this.db.query.categories.findMany({
        where: eq(this.schema.categories.workspace_id, workspaceId),
      });
    });
  }
}
```

## File Structure

```
src/lib/perf/
├── collector.ts      # PerfCollector class
├── helpers.ts        # trackQuery, trackService wrappers
└── index.ts          # Public exports
```

## Changes Required

| File                             | Change                                         |
| -------------------------------- | ---------------------------------------------- |
| `src/lib/perf/collector.ts`      | New - PerfCollector class                      |
| `src/lib/perf/helpers.ts`        | New - Tracking helper functions                |
| `src/lib/perf/index.ts`          | New - Public exports                           |
| `src/middleware.ts`              | Create collector at request start              |
| `src/env.d.ts`                   | Add `perf?: PerfCollector` to Locals           |
| `src/layouts/BaseLayout.astro`   | Inject HTML comment before `</body>`           |
| `src/lib/cache/cache-manager.ts` | Accept optional perf param, record hits/misses |
| Services (incremental)           | Use `trackQuery` wrapper for DB calls          |

## Environment Variable

```bash
# .env.development
PERF_DEBUG=true
```

## Future Enhancements (not in scope)

- Browser DevTools extension to parse and display stats
- Threshold warnings (highlight slow queries > 100ms)
- Historical comparison across page loads
- Export to performance monitoring tools
