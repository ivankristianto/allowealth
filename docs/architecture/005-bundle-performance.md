# ADR 005: Bundle Size & Performance

**Status:** Active
**Date:** 2026-01-29
**Context:** Keep client bundle <250 kB to maintain fast page loads

## Bundle Budget

| Category        | Limit  | Current | Notes                                       |
| --------------- | ------ | ------- | ------------------------------------------- |
| Total Client JS | 250 kB | 195 kB  | Under budget after motion/mini migration    |
| Chart.js        | 180 kB | 175 kB  | Tree-shaken (3 chart types)                 |
| Motion          | 60 kB  | 8 kB    | Uses motion/mini (WAAPI-based, ~8x smaller) |
| Decimal.js      | 0 kB   | 0 kB    | Server-only (MUST NOT bundle)               |

## Rules

### ❌ Never Do This

```typescript
// DON'T: Barrel exports in client code
import { debounce } from '@/lib/utils'; // Bundles everything!

// DON'T: chart.js/auto
import Chart from 'chart.js/auto'; // Bundles all chart types

// DON'T: Runtime imports in client
import { calculateForecast } from '@/lib/forecast'; // Bundles Decimal.js
```

### ✅ Always Do This

```typescript
// DO: Specific imports
import { debounce } from '@/lib/utils/client';

// DO: Tree-shaken Chart.js
import { Chart } from '@/lib/chart-setup';

// DO: Type-only imports
import type { ForecastResult } from '@/lib/forecast/types';
```

## Import Patterns

### Server-Only Code (Contains Decimal.js, database, etc.)

**Location:** `/lib/forecast/calculations.ts`, `/services/`, `/lib/utils/decimal.ts`

**Client usage:**

```typescript
// ✅ Types only
import type { ForecastResult } from '@/lib/forecast/types';

// ❌ Runtime imports
import { calculateForecast } from '@/lib/forecast'; // NO!
```

### Client-Safe Code

**Location:** `/lib/utils/client.ts`, `/lib/utils/date.ts`, `/lib/stores/`

**Usage:**

```typescript
// ✅ Direct imports
import { debounce } from '@/lib/utils/client';
import { parseMonthKey } from '@/lib/utils/date';
```

## Tree-Shaking

### Chart.js

**Use:** `/lib/chart-setup.ts` (centralized registration)

```typescript
// ✅ Correct
import { Chart } from '@/lib/chart-setup';

// ❌ Wrong
import Chart from 'chart.js/auto';
```

### Add New Chart Type

Edit `/lib/chart-setup.ts`:

```typescript
import { Chart, BarController, BarElement } from 'chart.js';
Chart.register(BarController, BarElement);
```

## Monitoring

### Check Bundle Size

```bash
# Build and analyze
bun run build:analyze

# View visualization
open dist/stats.html

# Check total
bun run build | grep "dist/client" | awk '{sum+=$1} END {print "Total:",sum,"kB"}'
```

### Before Commit

```bash
# 1. Verify no Decimal.js in client
bun run build | grep decimal  # Should be empty

# 2. Check bundle growth
bun run build | grep "chart-setup"  # Should be <180 kB
```

## Code Review Checklist

- [ ] No barrel exports (`@/lib/utils`) in client code
- [ ] No `chart.js/auto` imports
- [ ] No Decimal.js imports in `.client.ts` or `<script>` tags
- [ ] Type-only imports use `import type`
- [ ] New dependencies justified and documented

## Quick Reference

| Pattern                | ✅ Client-Safe | ❌ Bundles Server Code |
| ---------------------- | -------------- | ---------------------- |
| `@/lib/utils/client`   | ✅             |                        |
| `@/lib/utils/date`     | ✅             |                        |
| `@/lib/utils`          |                | ❌ (barrel export)     |
| `@/lib/forecast/types` | ✅             |                        |
| `@/lib/forecast`       |                | ❌ (has Decimal.js)    |
| `@/lib/chart-setup`    | ✅             |                        |
| `chart.js/auto`        |                | ❌ (all chart types)   |

## Enforcement

**Manual:** Check bundle size in code review
**Automated:** Run `bun run build:analyze` before merging
**CI:** Automated bundle size report posted to every PR (see `.github/workflows/quality-gates.yml`)

---

**See also:**

- `docs/plans/bundle-size-optimization-plan.md` - Implementation details
- `src/lib/chart-setup.ts` - Chart.js configuration
