# Bundle Size Optimization Plan

**Version:** 1.0.0
**Date:** 2026-01-27
**Status:** Draft

## Executive Summary

This document outlines the plan to optimize client-side bundle sizes for the Expenses application. The current total client bundle is ~388 kB (140 kB gzipped), with Chart.js alone contributing 207 kB. By implementing tree-shaking and strategic code splitting, we can reduce the bundle size by approximately 40-50%.

## Background

### Current State

Build analysis from `bun run build` reveals the following client-side bundles:

| Bundle         | Size        | Gzipped     | Source                       |
| -------------- | ----------- | ----------- | ---------------------------- |
| `auto.*.js`    | 207.03 kB   | 70.87 kB    | Chart.js (auto-registration) |
| `index.*.js`   | 58.59 kB    | 20.70 kB    | Motion library               |
| `decimal.*.js` | 32.29 kB    | 12.99 kB    | Decimal.js                   |
| Page scripts   | ~90 kB      | ~35 kB      | Various component scripts    |
| **Total**      | **~388 kB** | **~140 kB** |                              |

### Key Issues Identified

1. **Chart.js auto-registration** - All 4 chart components import from `chart.js/auto`, which bundles ALL chart types (bar, line, pie, radar, scatter, bubble, polar, etc.) even though only doughnut charts are used.

2. **Decimal.js client bundling** - Precision math library is bundled to client despite being primarily needed for server-side calculations.

3. **Motion library** - Animation library included on all pages even when not all pages need complex animations.

4. **No bundle monitoring** - No tooling in place to track bundle size regressions.

### Target State

After optimization:

| Bundle     | Current | Target             | Reduction     |
| ---------- | ------- | ------------------ | ------------- |
| Chart.js   | 207 kB  | ~70 kB             | ~66%          |
| Motion     | 58 kB   | 58 kB (lazy)       | Deferred load |
| Decimal.js | 32 kB   | 0 kB (server-only) | 100%          |
| **Total**  | ~388 kB | ~220 kB            | ~43%          |

## Technical Architecture

### Chart.js Tree-Shaking Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CURRENT (chart.js/auto)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ BarController │  │LineController │  │ PieController│  │ Doughnut  │  │
│  │    (unused)   │  │   (unused)    │  │   (unused)   │  │ Controller│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │RadarController│  │ScatterControl │  │BubbleControl │  │PolarControl│  │
│  │    (unused)   │  │   (unused)    │  │   (unused)   │  │  (unused) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                         │
│  Total: 207 kB (all controllers + scales + elements registered)         │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                    OPTIMIZED (explicit imports)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ DoughnutController│  │  ArcElement  │  │   Tooltip    │              │
│  │     (used)        │  │    (used)    │  │    (used)    │              │
│  └──────────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────────┐                                                   │
│  │     Legend       │                                                   │
│  │     (used)       │                                                   │
│  └──────────────────┘                                                   │
│                                                                         │
│  Total: ~60-80 kB (only doughnut-related code)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Structure Changes

```
src/
├── components/
│   └── organisms/
│       ├── SpendingChart.astro           # UPDATE: Tree-shaken imports
│       ├── WealthTrajectory.astro        # UPDATE: Tree-shaken imports
│       ├── FinancialVelocityChart.astro  # UPDATE: Tree-shaken imports
│       └── ResourceAllocationChart.astro # UPDATE: Tree-shaken imports
│
├── lib/
│   ├── chart-setup.ts                    # NEW: Shared Chart.js registration
│   └── utils/
│       └── currency.ts                   # UPDATE: Server-only decimal usage
│
└── astro.config.ts                       # UPDATE: Build optimizations
```

## Implementation Plan

### Phase 1: Chart.js Tree-Shaking (High Priority)

**Estimated Impact:** -120 kB (~45 kB gzipped)

#### Step 1.1: Create Shared Chart.js Setup Module

Create `src/lib/chart-setup.ts`:

```typescript
/**
 * Chart.js Setup Module
 *
 * Registers only the chart types and plugins needed by the application.
 * This enables tree-shaking to remove unused chart types from the bundle.
 */

import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

// Register only what we need
Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

export { Chart };
export type { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
```

#### Step 1.2: Update Chart Components

**Files to modify:**

- `src/components/organisms/SpendingChart.astro`
- `src/components/organisms/WealthTrajectory.astro`
- `src/components/organisms/FinancialVelocityChart.astro`
- `src/components/organisms/ResourceAllocationChart.astro`

**Change pattern:**

```typescript
// ❌ Before
import Chart from 'chart.js/auto';

// ✅ After
import { Chart } from '@/lib/chart-setup';
```

#### Step 1.3: Verify Chart Functionality

Test all chart components:

- [ ] SpendingChart renders correctly
- [ ] WealthTrajectory renders correctly
- [ ] FinancialVelocityChart renders correctly
- [ ] ResourceAllocationChart renders correctly
- [ ] Tooltips work
- [ ] Hover interactions work
- [ ] Theme switching works (dark/light mode)

### Phase 2: Decimal.js Server-Only (Medium Priority)

**Estimated Impact:** -32 kB (~13 kB gzipped)

#### Step 2.1: Audit Decimal.js Usage

Current usage locations:

- `src/lib/utils/currency.ts` - Currency formatting (server-side)
- `src/lib/utils/decimal.ts` - Decimal utilities (server-side)
- `src/lib/forecast/calculations.ts` - Forecast calculations (server-side)
- `src/pages/api/forecast/index.ts` - API endpoint (server-side)

**Finding:** All Decimal.js usage is already server-side. The bundle inclusion is likely due to type imports pulling in the module.

#### Step 2.2: Separate Type Exports

Update `src/lib/forecast/index.ts` to use explicit type-only exports:

```typescript
// ❌ Before
export * from './types';
export * from './calculations';

// ✅ After
export type * from './types';
// calculations stay server-only, not exported to client
```

#### Step 2.3: Verify Client Bundle

After changes, verify decimal.js is no longer in client bundle:

```bash
bun run build 2>&1 | grep decimal
```

### Phase 3: Build Configuration (Medium Priority)

#### Step 3.1: Add Bundle Visualizer

Install:

```bash
bun add -D rollup-plugin-visualizer
```

Update `astro.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            chartjs: ['chart.js'],
            motion: ['motion'],
          },
        },
      },
    },
  },
});
```

#### Step 3.2: Add Bundle Size Check Script

Add to `package.json`:

```json
{
  "scripts": {
    "build:analyze": "bun run build && echo 'Bundle analysis available at dist/stats.html'"
  }
}
```

### Phase 4: Motion Library Optimization (Low Priority)

**Estimated Impact:** Deferred loading, not size reduction

#### Step 4.1: Identify Critical vs Non-Critical Animations

**Critical (keep eager):**

- Toast notifications
- Modal open/close

**Non-Critical (can lazy load):**

- Chart animations
- Page transition effects
- List item animations

#### Step 4.2: Implement Lazy Loading Pattern

```typescript
// Lazy load motion only when needed
async function animateElement(element: HTMLElement) {
  const { animate } = await import('motion');
  animate(element, { opacity: [0, 1] }, { duration: 0.3 });
}
```

### Phase 5: Ongoing Monitoring

#### Step 5.1: Add CI Bundle Size Check

Create `.github/workflows/bundle-check.yml` or add to existing CI:

```yaml
- name: Build and check bundle size
  run: |
    bun run build 2>&1 | tee build.log
    # Extract total size and fail if over threshold
    TOTAL_SIZE=$(grep -E "dist/client.*\.js" build.log | awk '{sum += $1} END {print sum}')
    echo "Total client JS: ${TOTAL_SIZE} kB"
    if [ "$TOTAL_SIZE" -gt 250 ]; then
      echo "Bundle size exceeds 250 kB threshold!"
      exit 1
    fi
```

#### Step 5.2: Document Bundle Budget

Add to `CLAUDE.md` or create `docs/bundle-budget.md`:

```markdown
## Bundle Size Budget

| Category        | Budget | Current |
| --------------- | ------ | ------- |
| Total Client JS | 250 kB | TBD     |
| Chart.js        | 80 kB  | TBD     |
| Motion          | 60 kB  | TBD     |
| Page Scripts    | 110 kB | TBD     |
```

## Implementation Checklist

### Phase 1: Chart.js Tree-Shaking

- [ ] Create `src/lib/chart-setup.ts`
- [ ] Update `SpendingChart.astro`
- [ ] Update `WealthTrajectory.astro`
- [ ] Update `FinancialVelocityChart.astro`
- [ ] Update `ResourceAllocationChart.astro`
- [ ] Test all chart interactions
- [ ] Verify bundle size reduction

### Phase 2: Decimal.js Server-Only

- [ ] Update `src/lib/forecast/index.ts` exports
- [ ] Verify no client-side decimal imports
- [ ] Verify bundle size reduction

### Phase 3: Build Configuration

- [ ] Install rollup-plugin-visualizer
- [ ] Update `astro.config.ts`
- [ ] Add `build:analyze` script
- [ ] Generate initial bundle report

### Phase 4: Motion Optimization (Future)

- [ ] Audit animation usage
- [ ] Identify lazy-load candidates
- [ ] Implement lazy loading pattern
- [ ] Test animation performance

### Phase 5: Monitoring

- [ ] Add CI bundle check
- [ ] Document bundle budget
- [ ] Create baseline metrics

## Success Metrics

| Metric                 | Before | Target   | Verification           |
| ---------------------- | ------ | -------- | ---------------------- |
| Total Client JS        | 388 kB | < 250 kB | `bun run build` output |
| Chart.js Bundle        | 207 kB | < 80 kB  | Bundle visualizer      |
| Decimal.js in Client   | 32 kB  | 0 kB     | Bundle visualizer      |
| Lighthouse Performance | TBD    | > 90     | Lighthouse CI          |

## Risks and Mitigations

| Risk                                          | Impact | Mitigation                                      |
| --------------------------------------------- | ------ | ----------------------------------------------- |
| Chart functionality breaks after tree-shaking | High   | Comprehensive testing of all chart interactions |
| Type-only imports still bundle code           | Medium | Verify with bundle visualizer                   |
| Motion lazy loading causes jank               | Medium | Keep critical animations eager                  |
| CI bundle check too strict                    | Low    | Set reasonable threshold with buffer            |

## References

- [Chart.js Tree-Shaking Guide](https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Astro Performance Guide](https://docs.astro.build/en/guides/performance/)
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
