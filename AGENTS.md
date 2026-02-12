# Project Overview

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

# Critical Rules

## Agent Initialization

**Before any task, read the constitution and design system.**

```
1. Read `docs/constitution.md` — understand principles and fences
2. Read `design-system/START.md` — understand design patterns and tokens
3. Read task context (spec, plan, or issue)
4. Use TodoWrite to make the plan of execution
5. Execute
```

Agents must internalize:

- **Implementation order**: UI → Service → API → CLI → Seeder
- **Quality gates**: Which block, which don't
- **Refactor checklist**: Apply each loop, not at the end

**If constitution conflicts with task instructions, constitution wins.**

## Session Behavior

- ✅ Follow implementation order: UI → Service → API → CLI → Seeder
- ✅ Run quality gates before committing (lint, stylelint, format, typecheck)
- ✅ Update OpenAPI docs when modifying API endpoints
- ✅ Update `COMMANDS.md` when adding or modifying `package.json` scripts or CLI tools
- ✅ Create a plan before coding
- ✅ Deliver a written plan in the first response (not after extensive exploration)
- ✅ Run `bun run build` after bug fixes to verify no new errors
- ✅ Run relevant tests related to the fix, check all usages of changed code
- ✅ Understand all requirements before implementing — clarify unclear items upfront
- ✅ Push back with technical reasoning if reviewer is wrong — technical correctness > comfort
- ✅ Admit when you're wrong quickly — state the correction and reason, move on
- ❌ Suggest fixes without verification or claim bugs are fixed without running tests
- ❌ Spend entire session reading without producing a plan
- ❌ Implement partial lists — complete all items or clarify first
- ❌ Use gratitude expressions — no "Thanks!", "Great point!", "You're absolutely right!"
- ❌ Apologize excessively — just fix and move on
- ❌ Defend why you pushed back — state technical facts only

## Quality Gates

**Before every commit:**

```bash
# 1. Check for Bun-specific imports in shared code
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"

# 2. Run quality gates (all must pass)
bun run lint:fix          # ESLint (blocking)
bun run stylelint:fix     # Stylelint (blocking)
bun run format:fix        # Prettier (blocking)
bun run typecheck         # TypeScript (blocking)
```

**CRITICAL:** If `bun:` imports are found in middleware-imported files, REFACTOR before committing.

This is a **TypeScript-primary codebase**:

- ✅ Write TypeScript with strict type checking, use `tsc --noEmit` to verify
- ✅ Define explicit types instead of using `any`, use type inference where appropriate
- ✅ Import project types from `@/lib/auth/lucia` etc., not library packages directly
- ❌ Use `any` type without justification or skip typecheck

# Architecture

## Tech Stack

- **Runtime:** Bun 1.x
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Motion/mini (client-side animations)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / PostgreSQL/Supabase (prod)
- **Auth:** Lucia Auth

## ADR Quick Reference

| Category                | Use This ✅                              | Not This ❌                                    | Reference                         |
| ----------------------- | ---------------------------------------- | ---------------------------------------------- | --------------------------------- |
| **HTML Rendering**      | Server-rendered Astro components         | Client-side DOM construction                   | `002-interactive-pages.md`        |
| **Interactive Updates** | Fetch `?_render=html` from API           | Build HTML strings in JS                       | `002-interactive-pages.md`        |
| **Client Scripts**      | `.client.ts` files + `data-*` attributes | `define:vars` with npm imports                 | `002-interactive-pages.md`        |
| **Styling**             | DaisyUI classes (`bg-base-200`)          | Tailwind colors (`bg-slate-100`)               | `design-system/START.md`          |
| **Design Tokens**       | Import from `@/lib/tokens`               | Hardcoded values (`#10b981`)                   | `design-system/01-foundations.md` |
| **Icons**               | `@lucide/astro`                          | Custom SVG or emojis                           | `design-system/START.md`          |
| **Animations**          | `motion/mini`                            | `motion` (full) or CSS-only                    | `design-system/08-animations.md`  |
| **State**               | Nano Stores                              | Local state scattered                          | N/A                               |
| **Feedback**            | Toast notifications                      | `alert()`, `confirm()`                         | N/A                               |
| **TypeScript**          | Separate `.ts` files                     | Types in `<script>` tags                       | N/A                               |
| **Database**            | `better-sqlite3` (shared code)           | `bun:sqlite` (middleware)                      | `docs/constitution.md`            |
| **Schema Selection**    | `getActiveSchema()` in services          | Direct table imports                           | Dual SQLite/PostgreSQL support    |
| **Environment Vars**    | `getEnv()` for runtime secrets           | `import.meta.env` (build-time only on Workers) | Cross-runtime compat              |
| **Testing**             | `bun:test`                               | `vitest`                                       | `docs/constitution.md`            |
| **API Docs**            | Update OpenAPI files                     | Comments only                                  | `openapi/README.md`               |
| **Bundle Size**         | Specific imports (`@/lib/utils/client`)  | Barrel exports (`@/lib/utils`)                 | `005-bundle-performance.md`       |
| **Chart.js**            | `@/lib/chart-setup` (tree-shaken)        | `chart.js/auto`                                | `005-bundle-performance.md`       |
| **Server Libraries**    | Type-only imports (`import type`)        | Runtime imports in client                      | `005-bundle-performance.md`       |
| **Password Hashing**    | PBKDF2-SHA256 (Web Crypto API)           | oslo/argon2 (native addon)                     | Cross-runtime compatibility       |
| **Caching**             | CacheManager + Tag-based drivers         | Direct Redis or local-only cache               | `008-cache-abstraction.md`        |
| **Logging**             | Structured consola loggers               | `console.log`                                  | `009-logger-abstraction.md`       |
| **MCP Server**          | Hybrid (stdio + HTTP) with shared tools  | Logic scattered in routes                      | `010-mcp-server-architecture.md`  |

# Learned Patterns

## Frontend

### Design System & Styling

- ✅ Import design tokens from `@/lib/tokens` for colors, spacing, typography
- ✅ Use DaisyUI classes first, then Tailwind utilities
- ✅ Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`)
- ✅ Follow mobile-first responsive design (base styles for mobile, `md:` for desktop)
- ✅ Ensure keyboard navigation (Tab, Enter, Space, Esc)
- ✅ Add ARIA labels and roles for accessibility
- ✅ Maintain color contrast ratios (text ≥4.5:1, UI ≥3:1)
- ✅ Use minimum touch targets of 44x44px for mobile
- ✅ Include visible labels for all form inputs
- ✅ Use Lucide icons with text labels
- ✅ **Use DaisyUI classes directly on elements** - `<button class="btn btn-accent">`
- ✅ **Use semantic size classes** - `text-sm`, `text-base`, not `text-[10px]`
- ❌ Hardcode colors, spacing, or font sizes (use design tokens)
- ❌ Build desktop-first layouts (use mobile-first)
- ❌ Remove focus outlines without replacement
- ❌ Use placeholder text as labels
- ❌ Rely on color alone to convey information
- ❌ **Use `@apply btn` in custom classes** - creates CSS cascade issues
- ❌ **Hardcode sizes like `text-[10px]`** - breaks design system consistency
- ❌ **Use inline styles for interactive states** - use CSS classes instead

### Astro Components

- ✅ Use toast system (`addToast`) for user feedback instead of inline alerts
- ✅ All atomic components must have Storybook stories (`.stories.ts`)
- ❌ **Use TypeScript types in client-side `<script>` tags** - Astro's inline scripts don't support TS annotations
- ❌ **Access `user.attributes.property`** - User type has properties directly (`user.name`, `user.email`)
- ❌ **Declare `Astro.locals` types in multiple files** - centralize in `src/env.d.ts` only
- ❌ **Mix `define:vars`, `is:inline`, or `type="module"` with npm imports** - pass server values via `data-*` attributes instead:

```astro
<!-- ✅ Correct: Use data attributes -->
<dialog data-modal data-backdrop-close={backdropClose ? 'true' : 'false'}>
  <script>
    import { animate } from 'motion/mini'; // Works!
    const modal = document.querySelector('dialog[data-modal]');
    const backdropClose = modal?.dataset.backdropClose === 'true';
  </script>

  <!-- ❌ Wrong: define:vars breaks npm imports -->
  <script define:vars={{ backdropClose }}>
    import { animate } from 'motion/mini'; // Error!
  </script>
</dialog>
```

### Bundle Size

- ✅ **Check bundle budget after every dependency change** - 250 kB gzipped budget
- ❌ **Assume `manualChunks` captures transitive dependencies** - `motion: ['motion']` only captures the wrapper, not `motion-dom`/`framer-motion`

## Data Layer

### Input Validation

- ✅ **Use `Number()` instead of `parseFloat()` for validation** - `parseFloat("1,000")` returns `1`, silently corrupts data
- ✅ **Parse CSV with proper parser, not `split(',')`** - handles quoted fields containing commas
- ✅ **Strip BOM from CSV files before parsing** - Excel UTF-8 exports include BOM (`\uFEFF`)
- ✅ **Read CSRF token with proper decoding loop** - don't use `split('=')[1]` (breaks on base64)
- ✅ **Surface actual error messages in API responses** - not generic "Failed to X"
- ✅ **Extract `data-action` from DOM, don't use `define:vars`** - NPM imports break with `define:vars/is:inline`
- ❌ **Use `parseFloat()` for currency validation** - accepts malformed input like `"100abc"`
- ❌ **Default empty amounts to `'0'`** - silently zeros out budgets, corrupts user data
- ❌ **Use `parseCurrency` without locale-aware decimal detection** - IDR format `Rp480.000,00` parsed as 48M instead of 480K

### Database

- ✅ **Use sync callbacks with better-sqlite3 transactions** - `db.transaction((tx) => { /* sync code */ })`
- ✅ **Wrap multi-step DB operations in transactions** - ensures atomicity
- ✅ **Query budgets directly instead of cached overview** - guarantees schema fields like `id` are present
- ✅ **Verify ORM-generated SQL with diagnostic queries** - Drizzle `extras` can silently produce wrong SQL
- ❌ **Use `async/await` in better-sqlite3 transactions** - driver is synchronous, throws "cannot return a promise"
- ❌ **Rely on cached data when schema fields are critical** - cache may be stale
- ❌ **Add extra DB queries as the lazy first solution** - use subqueries or JOINs
- ❌ **Use `(obj as any).field` when proper typing is available** - use interface references
- ❌ **Include `create` action in history/audit queries** - only `update`/`delete` count

### PostgreSQL & Dual-Dialect Migrations

- ✅ Use `getActiveSchema()` and `this.schema.tableName` pattern in services
- ✅ Handle timestamps correctly: SQLite uses integers, PostgreSQL uses native timestamps
- ❌ Check for double-prefix bugs during mass replace (`this.schema.this.schema`)

**CRITICAL:** All schema changes MUST generate migrations for **both** SQLite and PostgreSQL.

1. Edit both `src/db/schema/sqlite/<table>.ts` and `src/db/schema/postgresql/<table>.ts`
2. Generate: `bun run db:generate` (SQLite) + `bun run db:generate:prod` (PostgreSQL)
3. Apply locally: `bun run db:migrate`
4. Commit both `drizzle/sqlite/` and `drizzle/postgresql/` directories
5. Deploy: `bun run db:migrate:prod`

- ✅ Use `db:generate` + `db:migrate` for tracked, incremental changes
- ✅ Use `db:push` only for local SQLite rapid iteration (never for production)
- ❌ Use `db:push` for PostgreSQL/Supabase (known drizzle-kit bug crashes it)
- ❌ Generate migrations for only one dialect and forget the other
- ❌ Manually edit migration SQL files

## Deployment (Cloudflare Workers)

- ✅ Use Web Crypto API (PBKDF2-SHA256) for password hashing - works in all runtimes
- ✅ Replace native Node modules with platform-agnostic alternatives (no native addons)
- ✅ Serialize Date objects explicitly when returning from services - PostgreSQL Date objects can't JSON-serialize in Workers
- ✅ Set `runtimeEnv` from middleware on first request - Workers secrets aren't available at module load
- ✅ Create fresh DB connections per request in Workers (no singletons in edge runtime)
- ✅ Use tag-based cache invalidation (`user:123`, `budget:123`) with configurable TTLs
- ✅ Handle cache errors gracefully - fall back to database queries
- ✅ Use Hyperdrive for Workers database connections - provides local proxy with 0 overhead
- ✅ Trace dependency chains when builds fail - e.g., oslo → @node-rs/argon2 → native addon
- ✅ **Use `getEnv()` for ALL runtime env vars on Workers** - `import.meta.env` only has build-time inlined values
- ✅ **Audit ALL `import.meta.env` usages when deploying to Workers** - categorize as: Vite built-in (safe), CLI-only (safe), runtime secret (needs `getEnv()`)
- ❌ Use `script-src 'unsafe-inline'` for CSP - inject nonces into Astro-generated scripts
- ❌ Change DATABASE_URL to sqlite fallback in prod config
- ❌ Assume fetch counter captures all subrequests - TCP sockets via nodejs_compat bypass fetch wrappers
- ❌ Use Supabase transaction pooler with Hyperdrive - use direct connection (port 5432)
- ❌ **Name Astro API endpoints with `_` prefix** - Astro treats `_`-prefixed files as private, silently 404s
- ❌ **Mutate `import.meta.env` directly in tests** - use `setTestEnv()` to match the production code path

## Testing

### E2E & Playwright

- ✅ Use expect.poll() for condition-based waiting (not manual loops or waitForTimeout)
- ✅ Set Playwright workers=1 for shared database tests (prevents race conditions)
- ✅ Use domcontentloaded instead of networkidle (faster, still reliable)
- ✅ Follow systematic-debugging skill for test failures (find root cause)
- ✅ Remove precomputed hashes when changing algorithms (prevents seed mismatches)
- ✅ Use dynamic dates for current month in seed data (not hardcoded)
- ✅ **Use `waitForResponse()` for AJAX-driven updates** - `waitForPageLoad(domcontentloaded)` fires before client-side fetch/re-render completes
- ✅ **Increase `beforeAll` hook timeouts for `drizzle-kit push`** - schema push can exceed default 5000ms; use 30000ms
- ✅ **Update page objects when UI components change** - select-to-chips, dual-layout, new selectors break existing locators
- ❌ Don't rely on Playwright's `webServer.env` when `reuseExistingServer: true` - env block is not applied to already-running server

### TypeScript

- ✅ Use `declare global { namespace App { ... } }` when `env.d.ts` has imports
- ✅ Add `export {}` at the end of module-scoped type files
- ✅ Use TypeScript in separate `.ts` files for client-side code (not inline `<script>`)
- ✅ Define component props with interfaces

## Workflow

### Code Quality

- ✅ Write clear, explicit code (clarity over cleverness)
- ✅ Follow Single Responsibility Principle (one function = one responsibility)
- ✅ Use descriptive variable names that explain purpose (not `data`, `temp`, `x`)
- ✅ Document _what_ and _why_ in commit messages
- ✅ Write unit tests first (fail first, then implement)
- ✅ Validate inputs at system boundaries (user input, external APIs)
- ✅ Define performance targets upfront (e.g., <200ms p95)
- ✅ Follow refactor checklist: Maintainability → Security → Performance → Consistency → Abstraction
- ❌ Add unnecessary error handling for impossible scenarios
- ❌ Use backwards-compatibility hacks (delete unused code completely)

### Debugging

- ✅ Fix root cause of typecheck errors (update API usage, fix imports)
- ✅ Trace bugs through full flow: DB → Service → API → Session → UI
- ✅ Test after every code change
- ✅ Check all usages after changing types or imports (`grep` the codebase)
- ✅ Verify root cause is fixed, not just symptoms
- ✅ Stop and ask when blocked or unclear - don't guess, don't force through
- ✅ Report actual state, not agent claims - check VCS diff to verify changes
- ❌ Suppress warnings with `@ts-expect-error` or `eslint-disable`
- ❌ Remove `await` just because TypeScript says "no effect" (runtime differs)
- ❌ Attempt fix #4 without questioning architecture - 3+ failures = wrong approach
- ❌ Fix multiple things at once - changes must be isolated

### Feature Completeness

- ✅ **Trace ALL consumers of a shared component before declaring done** - check every render path (SSR, API, Dashboard, etc.)
- ✅ **Fix tests before committing, never push with known failures**
- ✅ **Verify return types don't silently strip new fields** - explicit inline return types discard unlisted properties
- ✅ **Use systematic debugging from the start** - diagnose root cause with evidence before changing code
- ✅ **Confirm user intent before implementing UI changes** - ask clarifying questions first
- ✅ **Think through mobile vs desktop UX separately** - mobile uses dropdowns, desktop uses inline icons
- ✅ **Add tooltips/labels to icon-only buttons proactively**
- ✅ **Update tests to match user intent, not broken implementation**
- ✅ **Verify feature requests against existing codebase before creating issues**
- ✅ **Confirm with user before deleting "dead" code** - endpoints may be used externally
- ✅ **Check bundle budget after every dependency change**
- ❌ **Claim "done" without verifying all render paths**
- ❌ **Guess at fixes** - use systematic debugging immediately
- ❌ **Thrash method signatures** - if you edit 3x and end at the original, you didn't think first
- ❌ **Forget cross-session context** - if user asked to remove something prior, don't leave it
- ❌ **Delete tests without replacing coverage**
- ❌ **Assume endpoints are "dead" because grep finds no client references**

# Reference

- **Routes**: `src/pages/` (file-based routing). Transaction creation/editing uses TransactionDrawer in ProtectedLayout, not dedicated pages.
- **Project Structure**: `src/` directory — components (atoms/molecules/organisms/partials), services, db, lib, middleware, pages
- **Interactive Pages**: `docs/architecture/002-interactive-pages.md` — server-rendered HTML fragments, no client-side DOM construction
- **API Documentation**: `openapi/README.md` — OpenAPI 3.1.0 modular structure
- **Design System**: `design-system/START.md` — tokens, DaisyUI, accessibility
- **Constitution**: `docs/constitution.md` — principles and fences
- **Commands**: `COMMANDS.md` — all available scripts and CLI tools
