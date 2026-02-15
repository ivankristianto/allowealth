# Learned Patterns

Patterns learned from experience during development. These capture common mistakes and their fixes.

## Input Validation

### Currency Parsing

- ❌ **Use `parseFloat()` for currency validation** - accepts malformed input like `"100abc"`
- ✅ **Use `Number()` instead** - `parseFloat("1,000")` returns `1`, silently corrupts data
- ❌ **Default empty amounts to `'0'`** - silently zeros out budgets, corrupts user data
- ❌ **Use `parseCurrency` without locale-aware decimal detection** - IDR format `Rp480.000,00` parsed as 48M instead of 480K

### CSV Parsing

- ✅ **Parse CSV with proper parser, not `split(',')`** - handles quoted fields containing commas
- ✅ **Strip BOM from CSV files before parsing** - Excel UTF-8 exports include BOM (`\uFEFF`)

### Token Parsing

- ✅ **Read CSRF token with proper decoding loop** - don't use `split('=')[1]` (breaks on base64)

```typescript
// ✅ Correct
function getCsrfToken(): string | null {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// ❌ Wrong
const token = document.cookie.split('csrf_token=')[1]; // Breaks on base64
```

## Database Patterns

### Transactions

- ✅ **Use sync callbacks with better-sqlite3 transactions** - `db.transaction((tx) => { /* sync code */ })`
- ❌ **Use `async/await` in better-sqlite3 transactions** - driver is synchronous, throws "cannot return a promise"
- ✅ **Wrap multi-step DB operations in transactions** - ensures atomicity

### Query Optimization

- ❌ **Add extra DB queries as the lazy first solution** - use subqueries or JOINs
- ✅ **Query budgets directly instead of cached overview** - guarantees schema fields like `id` are present
- ❌ **Rely on cached data when schema fields are critical** - cache may be stale

### ORM Issues

- ✅ **Verify ORM-generated SQL with diagnostic queries** - Drizzle `extras` can silently produce wrong SQL
- ❌ **Use `(obj as any).field` when proper typing is available** - use interface references

### Audit Queries

- ❌ **Include `create` action in history/audit queries** - only `update`/`delete` count

## Frontend Patterns

### Astro Components

- ❌ **Use TypeScript types in client-side `<script>` tags** - Astro's inline scripts don't support TS annotations
- ❌ **Access `user.attributes.property`** - User type has properties directly (`user.name`, `user.email`)
- ❌ **Declare `Astro.locals` types in multiple files** - centralize in `src/env.d.ts` only
- ❌ **Mix `define:vars`, `is:inline`, or `type="module"` with npm imports** - pass server values via `data-*` attributes instead
- ✅ **Extract `data-action` from DOM, don't use `define:vars`** - NPM imports break with `define:vars/is:inline`

### Bundle Size

- ✅ **Check bundle budget after every dependency change** - 250 kB gzipped budget
- ❌ **Assume `manualChunks` captures transitive dependencies** - `motion: ['motion']` only captures the wrapper, not `motion-dom`/`framer-motion`

### Design System

- ✅ **Use DaisyUI classes directly on elements** - `<button class="btn btn-accent">`
- ❌ **Use `@apply btn` in custom classes** - creates CSS cascade issues
- ✅ **Use semantic size classes** - `text-sm`, `text-base`, not `text-[10px]`
- ❌ **Hardcode sizes like `text-[10px]`** - breaks design system consistency
- ❌ **Use inline styles for interactive states** - use CSS classes instead
- ❌ **Use `@xl:` container queries inside Card components** - Card.astro has no `@container`, queries resolve against page-level container. Use regular breakpoints (`xl:`) instead
- ❌ **Use `hoverable` on read-only Card components** - hover effect implies interactivity (clickable). Only use `hoverable` when the card triggers an action
- ❌ **Put title/description in ProtectedLayout header slot** - Header component renders title/subtitle from props. Slot is only for action buttons (refresh, export)
- ✅ **Add `data-testid` to major page sections and cards** - text-based locators (`h2:has-text(...)`) break when heading text changes

## Testing Patterns

### Playwright

- ✅ **Use `expect.poll()` for condition-based waiting** - not manual loops or waitForTimeout
- ✅ **Set Playwright workers=1 for shared database tests** - prevents race conditions
- ✅ **Use `domcontentloaded` instead of `networkidle`** - faster, still reliable
- ✅ **Use `waitForResponse()` for AJAX-driven updates** - `waitForPageLoad(domcontentloaded)` fires before client-side fetch/re-render completes
- ✅ **Increase `beforeAll` hook timeouts for `drizzle-kit push`** - schema push can exceed default 5000ms; use 30000ms
- ✅ **Update page objects when UI components change** - select-to-chips, dual-layout, new selectors break existing locators
- ✅ **Use `data-testid` locators over text/CSS class selectors in E2E tests** - `[data-testid="runtime-card"]` survives heading text changes, CSS class renames, and HTML element swaps (`td` → `dt`)
- ✅ **Check E2E tests when refactoring UI** - heading text changes, element type changes (`td` → `dt`), and CSS class renames (`badge-primary` → `badge-accent`) silently break locators
- ❌ **Rely on Playwright's `webServer.env`** when `reuseExistingServer: true` - env block is not applied to already-running server

### Test Data

- ✅ **Remove precomputed hashes when changing algorithms** - prevents seed mismatches
- ✅ **Use dynamic dates for current month in seed data** - not hardcoded

## Deployment Patterns

### Wrangler Configuration

- ❌ **Use wildcards (`/*`) or paths in Custom Domain routes** - Custom Domains only accept bare domain names
- ✅ **Use bare domain in `custom_domain` routes** - `{ pattern = "example.io", custom_domain = true }`, not `"example.io/*"`

### Cloudflare Workers

- ✅ **Use Web Crypto API (PBKDF2-SHA256) for password hashing** - works in all runtimes
- ✅ **Replace native Node modules with platform-agnostic alternatives** - no native addons
- ✅ **Serialize Date objects explicitly when returning from services** - PostgreSQL Date objects can't JSON-serialize in Workers
- ✅ **Set `runtimeEnv` from middleware on first request** - Workers secrets aren't available at module load
- ✅ **Create fresh DB connections per request in Workers** - no singletons in edge runtime
- ✅ **Use tag-based cache invalidation** (`user:123`, `budget:123`) with configurable TTLs
- ✅ **Handle cache errors gracefully** - fall back to database queries
- ✅ **Use Hyperdrive for Workers database connections** - provides local proxy with 0 overhead
- ✅ **Trace dependency chains when builds fail** - e.g., oslo → @node-rs/argon2 → native addon
- ✅ **Use `getEnv()` for ALL runtime env vars on Workers** - `import.meta.env` only has build-time inlined values
- ✅ **Audit ALL `import.meta.env` usages when deploying to Workers** - categorize as: Vite built-in (safe), CLI-only (safe), runtime secret (needs `getEnv()`)
- ❌ **Use `script-src 'unsafe-inline'` for CSP** - inject nonces into Astro-generated scripts
- ❌ **Change DATABASE_URL to sqlite fallback in prod config** - fail fast instead
- ❌ **Assume fetch counter captures all subrequests** - TCP sockets via nodejs_compat bypass fetch wrappers
- ❌ **Use Supabase transaction pooler with Hyperdrive** - use direct connection (port 5432)
- ❌ **Name Astro API endpoints with `_` prefix** - Astro treats `_`-prefixed files as private, silently 404s
- ❌ **Mutate `import.meta.env` directly in tests** - use `setTestEnv()` to match the production code path

## Debugging Workflow

### Root Cause Analysis

- ✅ **Fix root cause of typecheck errors** - update API usage, fix imports
- ✅ **Trace bugs through full flow** - DB → Service → API → Session → UI
- ✅ **Test after every code change**
- ✅ **Check all usages after changing types or imports** - `grep` the codebase
- ✅ **Verify root cause is fixed, not just symptoms**
- ✅ **Stop and ask when blocked or unclear** - don't guess, don't force through
- ✅ **Report actual state, not agent claims** - check VCS diff to verify changes
- ❌ **Suppress warnings with `@ts-expect-error` or `eslint-disable`**
- ❌ **Remove `await` just because TypeScript says "no effect"** - runtime differs
- ❌ **Attempt fix #4 without questioning architecture** - 3+ failures = wrong approach
- ❌ **Fix multiple things at once** - changes must be isolated

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

## Error Messages

- ✅ **Surface actual error messages in API responses** - not generic "Failed to X"

## TypeScript Patterns

- ✅ **Use `declare global { namespace App { ... } }`** when `env.d.ts` has imports
- ✅ **Add `export {}` at the end** of module-scoped type files
- ✅ **Use TypeScript in separate `.ts` files** for client-side code (not inline `<script>`)
- ✅ **Define component props with interfaces**
