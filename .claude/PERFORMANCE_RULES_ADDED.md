# Performance Rules Addition

**Date:** 2025-02-12
**Added:** `.claude/rules/performance.md`

## What Was Added

Comprehensive performance rules extracted from:

- Git commit history (performance, cache, bundle commits)
- Architecture docs (ADR 005, 008, 009)
- CSV import optimization (3000 → 5 queries)
- PRD Core Web Vitals requirements
- Cache abstraction strategy

## Coverage

### 1. Performance Targets

- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1, FCP < 1.5s
- **Page Load**: < 500ms (p95) for all pages
- **Bundle**: < 250 kB gzipped
- **Cache Hit Rate**: > 80%
- **Query Performance**: < 200ms per query

### 2. Database Query Optimization

- **N+1 Prevention**: Subqueries/JOINs instead of loops
- **Bulk Operations**: CSV import optimization (3000 → 5 queries)
- **Query Complexity**: Indexes, LIMIT, WHERE clauses
- **Connection Optimization**: Hyperdrive, fresh connections per request

**Real-world example:**

```
CSV Import: 500 rows
Before: ~3,000 queries (per-row validation + insert)
After: ~5 queries (bulk pre-load + batch insert)
Result: 600x improvement
```

### 3. Cache Strategy

- **Cache-Aside Pattern**: Check cache → Query DB → Set cache
- **Tag-Based Invalidation**: `workspace:123`, `budget:456`, `budgets`
- **TTL Guidelines**:
  - Short (60s): Dashboards, aggregations
  - Medium (300s): Lists, budgets
  - Long (3600s): Categories, settings

**Performance impact:**

```
Without Cache:
- Dashboard: 7,000ms (10+ queries × 400ms RTT)
- Budget: 7,500ms
- Settings: 11,000ms

With Cache:
- All pages: < 500ms (cache hit < 100ms)
```

### 4. Performance Logging

- **Structured Logging**: JSON format with duration tracking
- **Performance Markers**: Track operation phases (parse, validate, insert)
- **Thresholds**:
  - Single query: < 200ms
  - Page load: < 500ms
  - Bulk operation: < 3s

### 5. Core Web Vitals Optimization

- **LCP**: Preload critical resources, lazy load below-fold
- **FID**: Debounce handlers, requestIdleCallback for non-critical work
- **CLS**: Set image dimensions, use skeletons, reserve space

### 6. Prerendering & Code Splitting

- Static prerendering for public pages
- Lazy loading charts with Intersection Observer
- Client-side auth detection

## Performance Patterns Summary

### Database

- ✅ Bulk insert over loops (600x faster)
- ✅ Subqueries/JOINs, no N+1
- ✅ Date-scoped duplicate detection
- ✅ Composite indexes for common queries

### Cache

- ✅ Service-layer caching with tags
- ✅ Tag-based invalidation on mutations
- ✅ Graceful fallback to database
- ✅ Target >80% hit rate

### Frontend

- ✅ Bundle < 250 kB gzipped
- ✅ Lazy load below-fold content
- ✅ Set image dimensions (prevent CLS)
- ✅ Debounce expensive handlers

### Monitoring

- ✅ Log query duration (warn > 200ms)
- ✅ Track operation phases
- ✅ Monitor bundle size on every change
- ✅ Test Core Web Vitals before commit

## Files Updated

1. ✅ `.claude/rules/performance.md` - New comprehensive performance rules
2. ✅ `.claude/memory/MEMORY.md` - Added performance targets to quick reference
3. ✅ `.claude/CLAUDE.md` - Added performance.md to rules list
4. ✅ `.claude/README.md` - Added performance.md to structure diagram

## Integration

Performance rules are automatically loaded for all TypeScript and Astro files:

```yaml
---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.astro'
---
```

## Quick Reference

**Before committing performance-related changes:**

```bash
# 1. Check bundle size
bun run build:analyze

# 2. Profile queries (add to service)
log.info('query', { duration, rows, query });

# 3. Verify cache strategy
# - Service layer? ✅
# - Proper tags? ✅
# - Invalidation on mutation? ✅

# 4. Test Core Web Vitals
npm run lighthouse
```

## Next Steps

Performance rules are ready to use. Consider:

1. **Add performance tests** - E2E tests for page load times
2. **Set up monitoring** - Cloudflare Analytics, Supabase dashboard
3. **Create performance dashboard** - Track metrics over time
4. **Regular audits** - Monthly performance reviews

---

**Performance is now a first-class citizen in the development workflow.**
