---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.astro'
  - 'astro.config.mjs'
---

# Bundle Performance

**Budget:** 250 kB gzipped client JS

## Rules

- ✅ **Check bundle budget after every dependency change** - `bun run build` and verify size
- ✅ **Use specific imports** - Import only what you need
- ✅ **Type-only imports for server libraries** - Prevent bundling server code in client
- ❌ **Use barrel exports** (`@/lib/utils`) - imports everything, breaks tree-shaking
- ❌ **Assume a `codeSplitting.groups` `test` regex captures transitive dependencies** - a pattern matching only the wrapper package won't pull in its dependencies; match the whole `node_modules` subtree the chunk needs

## Import Patterns

### Specific Imports

```typescript
// ✅ Correct: Specific path
import { formatCurrency } from '@/lib/utils/client';
import { animate } from 'motion/mini';

// ❌ Wrong: Barrel export
import { formatCurrency } from '@/lib/utils'; // Imports everything
```

### Type-Only Imports

```typescript
// ✅ Correct: Type-only import (won't be bundled in client)
import type { AuthUser } from '@/lib/auth/types';

// ❌ Wrong: Runtime import in client code
import { auth } from '@/lib/auth/server'; // Bundles server code
```

## Chart.js Setup

```typescript
// ✅ Correct: Tree-shaken setup
import { Chart } from '@/lib/chart-setup';

// ❌ Wrong: Auto-imports everything
import { Chart } from 'chart.js/auto'; // +100KB
```

**Pattern**: Use `@/lib/chart-setup` which registers only needed components.

## Code Splitting

Astro 7 builds on Vite 8, which uses Rolldown instead of Rollup. Rollup's
`build.rollupOptions.output.manualChunks` no longer exists. Setting it is
silently ignored, producing an unsplit bundle with no error. Use Rolldown's
`codeSplitting.groups` instead, matching the shape in `astro.config.ts`:

```typescript
// astro.config.ts
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              // ✅ Match the whole node_modules subtree for the package
              { name: 'chartjs', test: /node_modules[\\/]chart\.js/ },
              { name: 'motion', test: /node_modules[\\/](motion|framer-motion)/ },
            ],
          },
        },
      },
    },
  },
});
```

**Rules:**

- ❌ **Use `manualChunks`** - Vite 8 / Rolldown has no such option; it is silently ignored, not an error
- ✅ **Use `codeSplitting.groups`** with a `test` regex per chunk
- ❌ **Write a narrow `test` regex that matches only the wrapper package** - e.g. `/node_modules[\\/]motion$/` misses `motion-dom`/`framer-motion`
- ✅ **Match the shared `node_modules` path prefix** so transitive dependencies pulled in under the same package tree are captured too

## Checking Bundle Size

```bash
# Build and check size
bun run build

# Output shows chunk sizes
dist/_astro/page-chunk.hash.js   45.2 kB │ gzip: 12.8 kB
```

**After adding dependencies:**

1. Run `bun run build`
2. Check `dist/_astro/` sizes
3. Verify total gzipped < 250 kB
4. If over budget, audit imports and consider code splitting

## Common Issues

### Large Dependencies

```typescript
// Problem: Large library bundled in client
import { someUtil } from 'large-server-library';

// Solution 1: Type-only if possible
import type { SomeType } from 'large-server-library';

// Solution 2: Move to server-side
// Use in API routes or Astro component frontmatter, not client scripts

// Solution 3: Find lighter alternative
// Replace with smaller client-friendly library
```

### Unused Imports

```typescript
// ❌ Wrong: Imports unused utilities
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatting';
// Only using formatCurrency

// ✅ Correct: Import only what's used
import { formatCurrency } from '@/lib/formatting';
```

### Duplicate Dependencies

```bash
# Check for duplicate versions
bun pm ls chart.js

# If duplicates found, dedupe
bun dedupe
```

## Verification Checklist

Before committing dependency changes:

- [ ] Run `bun run build`
- [ ] Check `dist/_astro/` chunk sizes
- [ ] Verify gzipped total < 250 kB
- [ ] Test page load performance
- [ ] Document if trading perf for functionality
