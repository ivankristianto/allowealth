# Workspace Name in Browser Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **IMPORTANT (user instruction):** Do NOT commit anything. Leave all changes in the working tree. Skip any commit steps.

**Goal:** Workspace-scoped pages render the browser tab title as `{Page} | {Workspace Name} - allowealth` so users with multiple workspaces can tell tabs apart.

**Architecture:** `ProtectedLayout` already fetches workspace data in a cached `Promise.all` (`LayoutData`, 5-min TTL, invalidated on workspace rename via `CacheTags.workspace`). Add the workspace name there and thread it as an optional prop: `ProtectedLayout` → `MainLayout` → `BaseLayout`. `BaseLayout` formats the `<title>`. Pages without a workspace (login, admin, public) keep the current `{Page} | allowealth` format.

**Tech Stack:** Astro 6 layouts, `bun:test` source-shape tests (matching the existing `BaseLayout.test.ts` / `MainLayout.test.ts` pattern).

**Title format decisions (approved by user):**
- With workspace: `Dashboard | Family Budget - allowealth` (lowercase brand, matching current titles)
- Without workspace (or fetch failed / stale cache without the field): `Dashboard | allowealth` (unchanged)
- Home/brand-only title: `allowealth` (unchanged)

---

### Task 1: BaseLayout — accept `workspaceName` and format the title

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (Props interface at lines 8–16)
- Test: `src/layouts/BaseLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `src/layouts/BaseLayout.test.ts` (keep the existing theme test untouched):

```typescript
describe('BaseLayout browser title', () => {
  it('includes workspace name in the title when provided', () => {
    const source = readFileSync('src/layouts/BaseLayout.astro', 'utf8');

    expect(source).toContain('workspaceName?: string;');
    expect(source).toContain('`${title} | ${workspaceName} - allowealth`');
    expect(source).toContain('`${title} | allowealth`');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/layouts/BaseLayout.test.ts`
Expected: FAIL — `workspaceName?: string;` not found in source.

- [ ] **Step 3: Implement in `src/layouts/BaseLayout.astro`**

Replace the Props interface and title construction (currently lines 8–16):

```astro
interface Props {
  title?: string;
  ssrTheme?: string;
  workspaceName?: string;
}

const { title = 'allowealth', ssrTheme, workspaceName } = Astro.props;

// Construct browser title:
// - "Page Title | Workspace Name - allowealth" for workspace-scoped pages
// - "Page Title | allowealth" when no workspace context
// - "allowealth" for home/brand-only pages
const browserTitle =
  title && title !== 'allowealth'
    ? workspaceName
      ? `${title} | ${workspaceName} - allowealth`
      : `${title} | allowealth`
    : 'allowealth';
```

Nothing else in the file changes — `<title>{browserTitle}</title>` already exists at line 39.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/layouts/BaseLayout.test.ts`
Expected: PASS (both describe blocks).

- [ ] **Step 5: Do NOT commit** (user instruction — leave changes in working tree)

---

### Task 2: MainLayout — accept and forward `workspaceName`

**Files:**
- Modify: `src/layouts/MainLayout.astro` (Props interface at lines 25–35, destructuring at lines 37–47, `<BaseLayout>` tag at line 52)
- Test: `src/layouts/MainLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `src/layouts/MainLayout.test.ts`:

```typescript
describe('MainLayout workspace name forwarding', () => {
  it('accepts workspaceName and forwards it to BaseLayout', () => {
    const source = readFileSync('src/layouts/MainLayout.astro', 'utf8');

    expect(source).toContain('workspaceName?: string;');
    expect(source).toContain(
      '<BaseLayout title={title} ssrTheme={ssrTheme} workspaceName={workspaceName}>'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/layouts/MainLayout.test.ts`
Expected: FAIL — `workspaceName?: string;` not found in source.

- [ ] **Step 3: Implement in `src/layouts/MainLayout.astro`**

Add `workspaceName?: string;` to the `Props` interface (after `currentDate?: Date;`):

```typescript
interface Props {
  title?: string;
  currentPath?: string;
  user?: User | null;
  subtitle?: string;
  ssrTheme?: string;
  primaryCurrency?: Currency;
  secondaryCurrency?: Currency | null;
  userName?: string;
  currentDate?: Date;
  workspaceName?: string;
}
```

Add `workspaceName` to the destructuring:

```typescript
const {
  title = 'allowealth',
  currentPath = '/',
  user,
  subtitle,
  ssrTheme,
  primaryCurrency,
  secondaryCurrency,
  userName,
  currentDate,
  workspaceName,
} = Astro.props;
```

Update the `<BaseLayout>` open tag (line 52):

```astro
<BaseLayout title={title} ssrTheme={ssrTheme} workspaceName={workspaceName}>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/layouts/MainLayout.test.ts`
Expected: PASS (both describe blocks).

- [ ] **Step 5: Do NOT commit** (user instruction — leave changes in working tree)

---

### Task 3: ProtectedLayout — fetch workspace name into cached layout data

**Files:**
- Modify: `src/layouts/ProtectedLayout.astro` (imports at lines 35–41, `LayoutData` at lines 46–52, defaults at lines 75–88, cached path at lines 104–109, fetch path at lines 110–147, `<MainLayout>` tag at lines 183–193)
- Test: `src/layouts/ProtectedLayout.test.ts` (new file — there is currently no test for this layout)

- [ ] **Step 1: Write the failing test**

Create `src/layouts/ProtectedLayout.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ProtectedLayout workspace name', () => {
  const source = readFileSync('src/layouts/ProtectedLayout.astro', 'utf8');

  it('includes workspaceName in cached layout data', () => {
    expect(source).toContain('workspaceName: string;');
    expect(source).toContain('workspaceService.findById(user.workspaceId)');
    expect(source).toContain('workspaceName = cached.workspaceName ?? workspaceName;');
  });

  it('passes workspaceName to MainLayout', () => {
    expect(source).toContain('workspaceName={workspaceName}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/layouts/ProtectedLayout.test.ts`
Expected: FAIL — `workspaceName: string;` not found in source.

- [ ] **Step 3: Implement in `src/layouts/ProtectedLayout.astro`**

3a. Add `workspaceService` to the existing `@/services` import (lines 35–41):

```typescript
import {
  categoryService,
  accountService,
  userMetaService,
  transactionService,
  workspaceMetaService,
  workspaceService,
} from '@/services';
```

(`workspaceService` is exported from `src/services/index.ts:78` — verified.)

3b. Add `workspaceName` to the `LayoutData` interface (lines 46–52):

```typescript
interface LayoutData {
  categories: Array<{ id: string; name: string; type: string; currency?: string }>;
  accounts: Array<{ id: string; name: string; type: string; account_class: string }>;
  userSettings: UserSettings;
  categoryUsageCounts: Array<{ category_id: string; count: number }>;
  workspaceCurrencies: { primary: Currency; secondary: Currency | null };
  workspaceName: string;
}
```

3c. Add the default after the `workspaceCurrencies` default (lines 85–88):

```typescript
let workspaceName = '';
```

3d. In the cached branch (`if (cached) {`, lines 104–109), add after the `workspaceCurrencies` line — `??` fallback keeps stale cache entries (written before this field existed) working until TTL expiry:

```typescript
  workspaceName = cached.workspaceName ?? workspaceName;
```

3e. In the fetch branch, extend the `Promise.all` (lines 112–119). The workspace fetch maps to the name inline so the destructured value is already a string:

```typescript
    [categories, accounts, userSettings, categoryUsageCounts, workspaceCurrencies, workspaceName] =
      await Promise.all([
        categoryService.findAll(user.workspaceId, { is_active: true }),
        accountService.findAll(user.workspaceId),
        userMetaService.getUserSettings(user.id),
        transactionService.getCategoryUsageCounts(user.workspaceId, user.id),
        workspaceMetaService.getWorkspaceCurrencies(user.workspaceId),
        workspaceService.findById(user.workspaceId).then((workspace) => workspace?.name ?? ''),
      ]);
```

3f. Add `workspaceName` to the cached payload (the `cache.set<LayoutData>` call, lines 123–137):

```typescript
        await cache.set<LayoutData>(
          cacheKey,
          {
            categories,
            accounts,
            userSettings,
            categoryUsageCounts,
            workspaceCurrencies,
            workspaceName,
          },
          {
```

(TTL and tags unchanged.)

3g. Pass to `<MainLayout>` (lines 183–193), after `secondaryCurrency`:

```astro
  secondaryCurrency={workspaceCurrencies.secondary}
  workspaceName={workspaceName}
>
```

**Error handling note:** the whole fetch branch is already wrapped in `try/catch` (fail-soft, page renders without drawer data). If the fetch fails, `workspaceName` stays `''` and `BaseLayout` falls back to the current title format. Do NOT add extra error handling.

**Cache invalidation note:** no changes needed — workspace rename (`src/pages/api/workspace/settings.ts:166`) already invalidates `CacheTags.workspace(workspaceId)` + `CacheTags.LAYOUT`, which covers this cache entry.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/layouts/ProtectedLayout.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Do NOT commit** (user instruction — leave changes in working tree)

---

### Task 4: Quality gates and full verification

**Files:** none (verification only)

- [ ] **Step 1: Run all layout tests**

Run: `bun test src/layouts/`
Expected: PASS — BaseLayout, MainLayout, ProtectedLayout, AuthLayout tests all green.

- [ ] **Step 2: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass with no errors. If `format:fix` reformats the new code, re-run the layout tests (`bun test src/layouts/`) to confirm the source-shape assertions still match the formatted output.

- [ ] **Step 3: Run the full unit test suite**

Run: `bun run test`
Expected: PASS, no regressions.

- [ ] **Step 4: Do NOT commit** (user instruction — report results and stop)
