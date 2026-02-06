# Project Overview

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

# Agent Instructions

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

## Fix Quality

When fixing bugs, always verify the fix doesn't break existing functionality by running the build and any related tests before presenting the solution. If a fix introduces new errors, diagnose those before suggesting the fix.

- ✅ Run `bun run build` after bug fixes to verify no new errors
- ✅ Run relevant tests (`bun test`, e2e tests, or integration tests) related to the fix
- ✅ Test the fix in the browser/application to confirm it works as expected
- ✅ Check all usages of changed code to ensure no downstream breakage
- ✅ Run quality gates before committing (lint, typecheck, format)
- ❌ Suggest fixes without verification
- ❌ Claim bugs are fixed without running tests
- ❌ Ignore new errors introduced by fixes
- ❌ Skip quality gates to move faster

## Planning & Research

When asked to plan or brainstorm (e.g., version upgrades, migration strategies), produce a concrete written plan with actionable steps within the first response. Do not spend the entire session only reading files — summarize findings and deliver the plan incrementally.

- ✅ Deliver a written plan in the first response (not after extensive exploration)
- ✅ Include actionable steps, timelines, and dependencies
- ✅ Summarize findings incrementally as you research
- ✅ Provide context and rationale for recommendations
- ✅ Update the plan as new information emerges
- ❌ Spend entire session reading without producing a plan
- ❌ Delay planning until all possible research is complete
- ❌ Create vague plans without concrete next steps

## Language & Stack

This is a **TypeScript-primary codebase**. Always prefer TypeScript idioms, use strict types, and ensure any code changes pass `tsc --noEmit` before considering a task complete.

- ✅ Write code in TypeScript with strict type checking
- ✅ Use `tsc --noEmit` to verify type correctness
- ✅ Prefer TypeScript over plain JavaScript
- ✅ Use strict mode and enable `strict: true` in tsconfig
- ✅ Define explicit types instead of using `any`
- ✅ Use type inference where appropriate (avoid redundant type annotations)
- ✅ Import and use project types (`@/lib/auth/lucia`, etc.)
- ❌ Use `any` type without justification
- ❌ Skip typecheck in pre-commit
- ❌ Leave `tsc --noEmit` errors unfixed

## Do & Don't

### Session Rules (Every Agent Session)

- ✅ Follow implementation order: UI → Service → API → CLI → Seeder
- ✅ Run quality gates before committing (lint, stylelint, format, typecheck)
- ✅ Update OpenAPI docs when modifying API endpoints
- ✅ Update `COMMANDS.md` when adding or modifying `package.json` scripts or CLI tools
- ✅ Apply refactor checklist each loop, not at the end
- ✅ Create a plan before coding
- ❌ Hardcode colors, spacing, or font sizes (use design tokens)
- ❌ Build desktop-first layouts (use mobile-first)
- ❌ Remove focus outlines without replacement
- ❌ Use placeholder text as labels
- ❌ Rely on color alone to convey information

### Architectural Decisions (ADR Quick Reference)

| Category                | Use This ✅                              | Not This ❌                      | Reference                         |
| ----------------------- | ---------------------------------------- | -------------------------------- | --------------------------------- |
| **HTML Rendering**      | Server-rendered Astro components         | Client-side DOM construction     | `002-interactive-pages.md`        |
| **Interactive Updates** | Fetch `?_render=html` from API           | Build HTML strings in JS         | `002-interactive-pages.md`        |
| **Client Scripts**      | `.client.ts` files + `data-*` attributes | `define:vars` with npm imports   | `002-interactive-pages.md`        |
| **Styling**             | DaisyUI classes (`bg-base-200`)          | Tailwind colors (`bg-slate-100`) | `design-system/START.md`          |
| **Design Tokens**       | Import from `@/lib/tokens`               | Hardcoded values (`#10b981`)     | `design-system/01-foundations.md` |
| **Icons**               | `@lucide/astro`                          | Custom SVG or emojis             | `design-system/START.md`          |
| **Animations**          | Motion library                           | CSS transitions only             | `design-system/08-animations.md`  |
| **State**               | Nano Stores                              | Local state scattered            | N/A                               |
| **Feedback**            | Toast notifications                      | `alert()`, `confirm()`           | N/A                               |
| **TypeScript**          | Separate `.ts` files                     | Types in `<script>` tags         | `AGENTS.md`                       |
| **Database**            | `better-sqlite3` (shared code)           | `bun:sqlite` (middleware)        | `docs/constitution.md`            |
| **Schema Selection**    | `getActiveSchema()` in services          | Direct table imports             | Dual SQLite/PostgreSQL support    |
| **Environment Vars**    | `import.meta.env`                        | `process.env`                    | Bun compatibility                 |
| **Testing**             | `bun:test`                               | `vitest`                         | `docs/constitution.md`            |
| **API Docs**            | Update OpenAPI files                     | Comments only                    | `openapi/README.md`               |
| **Bundle Size**         | Specific imports (`@/lib/utils/client`)  | Barrel exports (`@/lib/utils`)   | `005-bundle-performance.md`       |
| **Chart.js**            | `@/lib/chart-setup` (tree-shaken)        | `chart.js/auto`                  | `005-bundle-performance.md`       |
| **Server Libraries**    | Type-only imports (`import type`)        | Runtime imports in client        | `005-bundle-performance.md`       |
| **Password Hashing**    | PBKDF2-SHA256 (Web Crypto API)           | oslo/argon2 (native addon)       | Cross-runtime compatibility       |

### Design System Compliance

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

### Code Quality (Constitution)

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

### Debugging & Problem Solving

- ✅ Fix root cause of typecheck errors (update API usage, fix imports)
- ✅ Trace bugs through full flow: DB → Service → API → Session → UI
- ✅ Test after every code change
- ✅ Check all usages after changing types or imports (`grep` the codebase)
- ✅ Verify root cause is fixed, not just symptoms
- ✅ Stop and ask when blocked or unclear - Don't guess, don't force through
- ✅ Report actual state, not agent claims - Check VCS diff to verify changes
- ❌ Suppress warnings with `@ts-expect-error` or `eslint-disable`
- ❌ Remove `await` just because TypeScript says "no effect" (runtime differs)
- ❌ Don't attempt fix #4 without questioning architecture - 3+ failures = wrong approach
- ❌ Don't fix multiple things at once - Changes must be isolated

### Input Validation & Data Handling

- ✅ **Use `Number()` instead of `parseFloat()` for validation** - `parseFloat("1,000")` returns `1`, `parseFloat("100abc")` returns `100` (silently corrupts data)
- ✅ **Parse CSV with proper parser, not `split(',')`** - Handles quoted fields containing commas
- ✅ **Strip BOM from CSV files before parsing** - Excel UTF-8 exports include BOM (`\uFEFF`)
- ✅ **Read CSRF token with proper decoding loop** - Don't use single-line `split('=')[1]` (breaks on base64)
- ✅ **Surface actual error messages in API responses** - Include details for debugging, not generic "Failed to X"
- ✅ **Extract `data-action` from DOM, don't use `define:vars`** - NPM imports break with `define:vars/is:inline`
- ❌ **Don't use `parseFloat()` for currency validation** - Accepts malformed input like `"1,000"` or `"100abc"`
- ❌ **Don't use `split(',')` for CSV parsing** - Breaks on quoted fields like `"Company, Inc."`
- ❌ **Don't use `split('=')[1]` for CSRF token** - Base64 tokens contain `=` characters
- ❌ **Don't default empty amounts to `'0'`** - Silently zeros out budgets, corrupts user data

### Database Transactions & Queries

- ✅ **Use sync callbacks with better-sqlite3 transactions** - `db.transaction((tx) => { /* sync code */ })`
- ✅ **Wrap multi-step DB operations in transactions** - Ensures atomicity (delete + insert must both succeed)
- ✅ **Query budgets directly instead of cached overview** - Guarantees schema fields like `id` are present
- ❌ **Don't use `async/await` in better-sqlite3 transactions** - Driver is synchronous, throws "Transaction function cannot return a promise"
- ❌ **Don't use `db.transaction(async (tx) => { await ... })` with better-sqlite3** - Works on PostgreSQL, crashes on SQLite
- ❌ **Don't rely on cached data when schema fields are critical** - Cache may be stale or incomplete

### CSS & Styling Patterns

- ✅ **Use DaisyUI classes directly on elements** - `<button class="btn btn-accent">` works correctly
- ✅ **Use design token constants from `@/lib/tokens`** - Not inline Tailwind utilities like `px-2 md:px-4`
- ✅ **Use semantic size classes** - `text-sm`, `text-base`, not `text-[10px]`
- ❌ **Don't use `@apply btn` in custom classes** - Creates CSS cascade issues (source order determines precedence)
- ❌ **Don't create `.btn-contract-base` with `@apply btn`** - Base class appears later in CSS, overrides modifiers like `.btn-accent`
- ❌ **Don't hardcode sizes like `text-[10px]`** - Breaks design system consistency
- ❌ **Don't use inline styles for interactive states** - Use CSS classes instead of `element.style.cursor = 'pointer'`

### Communication & Workflow

- ✅ **Understand all requirements before implementing** - Clarify unclear items upfront
- ✅ **Push back with technical reasoning if reviewer is wrong** - Technical correctness > comfort
- ✅ **Admit when you're wrong quickly** - State the correction and reason, move on
- ❌ **Don't implement partial lists** - Complete all items or clarify first, not "do 1,2,3,6, ask about 4,5 later"
- ❌ **Don't use gratitude expressions** - No "Thanks!", "Great point!", "You're absolutely right!"
- ❌ **Don't apologize excessively** - Just fix and move on
- ❌ **Don't defend why you pushed back** - State technical facts only

### TypeScript Best Practices

- ✅ Use `declare global { namespace App { ... } }` when `env.d.ts` has imports
- ✅ Import custom types from project files (`@/lib/auth/lucia`), not library packages
- ✅ Add `export {}` at the end of module-scoped type files
- ✅ Use TypeScript in separate `.ts` files for client-side code (not inline `<script>`)
- ✅ Define component props with interfaces

### E2E Testing & Playwright

- ✅ Use expect.poll() for condition-based waiting (not manual loops or waitForTimeout)
- ✅ Set Playwright workers=1 for shared database tests (prevents race conditions)
- ✅ Use domcontentloaded instead of networkidle (faster, still reliable)
- ✅ Follow systematic-debugging skill for test failures (find root cause)
- ✅ Remove precomputed hashes when changing algorithms (prevents seed mismatches)
- ✅ Use dynamic dates for current month in seed data (not hardcoded)

### Cross-Runtime & Edge Compatibility

- ✅ Use Web Crypto API (PBKDF2-SHA256) for password hashing - works in all runtimes including Workers
- ✅ Replace native Node modules with platform-agnostic alternatives (no native addons)
- ✅ Serialize Date objects explicitly when returning from services - PostgreSQL Date objects can't JSON-serialize in Workers
- ✅ Set `runtimeEnv` from middleware on first request - Workers secrets aren't available at module load
- ✅ Create fresh DB connections per request in Workers (no singletons in edge runtime)
- ✅ Use tag-based cache invalidation (`user:123`, `budget:123`) with configurable TTLs
- ✅ Create abstraction layers for vendor-agnostic features (cache drivers: Memory, Noop, Upstash)
- ✅ Handle cache errors gracefully - fall back to database queries
- ✅ Add diagnostic logging when debugging production issues
- ✅ Use Hyperdrive for Workers database connections - postgres.js TCP/TLS operations count as subrequests; Hyperdrive provides local proxy with 0 overhead
- ✅ Trace dependency chains when builds fail - e.g., oslo → @node-rs/argon2 → native addon reveals the incompatible layer
- ❌ Use `script-src 'unsafe-inline'` for CSP - inject nonces into Astro-generated scripts instead
- ❌ Change DATABASE_URL to sqlite fallback in prod config (causes "table not found" errors)
- ❌ Assume fetch counter captures all subrequests - TCP sockets via nodejs_compat are subrequests that bypass fetch wrappers
- ❌ Use Supabase transaction pooler with Hyperdrive - Hyperdrive handles pooling; use direct connection (port 5432, not 6543)

### PostgreSQL/Supabase Compatibility

- ✅ Use `getActiveSchema()` and `this.schema.tableName` pattern in services (not direct table imports)
- ✅ Use `import.meta.env` instead of `process.env` - Bun doesn't populate process.env from .env files
- ✅ Add `:prod` script variants with `--env-file=.env.production` for explicit env loading
- ✅ Import SQLite schema for type inference only - both schemas have same structure
- ✅ Handle timestamps correctly: SQLite uses integers, PostgreSQL uses native timestamps
- ❌ Check for double-prefix bugs during mass replace (`this.schema.this.schema` patterns)

### Database Migrations (Dual Dialect)

**CRITICAL:** All schema changes MUST generate migrations for **both** SQLite and PostgreSQL. See `docs/architecture/007-database-migrations.md` for full documentation.

**When modifying any schema file:**

1. Edit both `src/db/schema/sqlite/<table>.ts` and `src/db/schema/postgresql/<table>.ts`
2. Generate migrations for both dialects:
   ```bash
   bun run db:generate          # SQLite
   bun run db:generate:prod     # PostgreSQL
   ```
3. Apply locally: `bun run db:migrate`
4. Commit both `drizzle/sqlite/` and `drizzle/postgresql/` directories
5. Deploy: `bun run db:migrate:prod`

**Rules:**

- ✅ Always generate migrations for both SQLite and PostgreSQL when changing schema
- ✅ Use `db:generate` + `db:migrate` for tracked, incremental changes
- ✅ Commit migration files (`drizzle/sqlite/` and `drizzle/postgresql/`) to git
- ✅ Use `db:push` only for local SQLite rapid iteration (never for production)
- ❌ Never use `db:push` for PostgreSQL/Supabase (known drizzle-kit bug crashes it)
- ❌ Never generate migrations for only one dialect and forget the other
- ❌ Never manually edit migration SQL files

### Pre-Commit Checklist

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

## Tech Stack

- **Runtime:** Bun 1.x
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Motion (client-side animations)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / PostgreSQL/Supabase (prod)
- **Auth:** Lucia Auth

## Routes

```
/                          # Homepage
/dashboard                 # Dashboard
/transactions              # Transaction list (add/edit via TransactionModal)
/budget                    # Budget overview
/budget/history            # Budget history
/budget/categories         # Category management
/assets                    # Asset list
/assets/add                # Add asset
/assets/history            # Asset history
/reports                   # Monthly reports
/reports/yearly            # Yearly reports
/reports/custom            # Custom date range
/forecast                  # Forecast calculator
/forecast/comparison       # Scenario comparison
/calculators               # Compound interest calculator
/settings                  # Profile settings
/settings/payment-methods  # Payment methods
```

**Note:** Transaction creation and editing is handled via TransactionModal (expense-modal, income-modal, edit-transaction-modal) available globally in ProtectedLayout, not via dedicated pages.

## Project Structure

```
src/
├── components/
│   ├── atoms/           # Atomic UI elements (Button, Input, etc.)
│   ├── molecules/        # Compound components (Modal, Toast)
│   ├── layouts/          # Layout components (Header, Footer, Nav)
│   └── organisms/        # Complex compositions
├── layouts/
│   ├── BaseLayout.astro  # HTML shell
│   └── MainLayout.astro  # App layout with sidebar
├── pages/                # File-based routing
│   ├── index.astro       # Dashboard (/)
│   ├── transactions/
│   ├── budget/
│   ├── assets/
│   ├── reports/
│   ├── forecast/
│   ├── calculators/
│   └── settings/
├── lib/
│   ├── stores/           # Nano Stores for client-side state
│   │   └── toastStore.ts # Toast notification state
│   └── tokens.ts         # Design tokens & helpers
└── styles/
    ├── globals.css       # Global styles
    └── tokens.css        # CSS custom properties
```

## Interactive Pages Architecture

For pages that need client-side interactivity (filtering, pagination, dynamic updates), we use **server-rendered HTML fragments** instead of client-side DOM construction.

**Read the full documentation:** `docs/architecture/002-interactive-pages.md`

### Key Principles

1. **Single Source of Truth**: All HTML rendering happens in Astro components
2. **No DOM Construction**: Client-side code only injects pre-rendered HTML
3. **API Dual Response**: Endpoints support both `?_render=json` and `?_render=html`

### File Structure

```
src/components/
├── partials/                    # Server-rendered fragments (no layout)
│   ├── TransactionListPartial.astro
│   └── PaginationPartial.astro
└── organisms/
    ├── MyRenderer.client.ts     # HTML injection + animations
    └── MyPage.client.ts         # Event handling + orchestration
```

### Quick Example

```typescript
// ❌ DON'T: Construct DOM on the client
function createRow(data) {
  const div = document.createElement('div');
  div.innerHTML = `<span>${data.name}</span>`; // Duplicates server logic
  return div;
}

// ✅ DO: Inject server-rendered HTML
async function fetchAndRender() {
  const { html } = await fetch('/api/items?_render=html');
  document.getElementById('list').innerHTML = html;
}
```

## API Documentation

The project uses **OpenAPI 3.1.0** for API documentation with a modular file structure.

### File Structure

```
openapi.yml                    # Main entry point with $ref references
openapi/
├── README.md                  # Documentation for OpenAPI structure
├── paths/                     # API endpoint definitions organized by feature
│   ├── auth.yml               # Authentication endpoints
│   ├── user.yml               # User profile and settings
│   ├── transactions.yml       # Transaction management
│   ├── categories.yml         # Category management
│   ├── payment-methods.yml    # Payment method management
│   ├── assets.yml             # Asset tracking
│   └── budget.yml             # Budget overview and alerts
├── schemas/                   # Reusable data model definitions
│   ├── ApiErrorResponse.yml   # Base API response schema
│   ├── ErrorResponse.yml      # Error response schema
│   ├── SignupRequest.yml      # Registration request schema
│   ├── LoginRequest.yml       # Login request schema
│   └── ... (40+ schema files)
├── responses/                 # Reusable response definitions
│   └── common.yml             # Common HTTP responses (400, 401, 404, 500)
└── parameters/                # Reusable parameter definitions
    └── common.yml             # Common parameters (id)
```

### Updating API Documentation

**IMPORTANT:** Whenever you modify or add API endpoints, you MUST update the appropriate OpenAPI files:

1. **For new endpoints:** Add to the appropriate `openapi/paths/*.yml` file
2. **For new schemas:** Add to `openapi/schemas/*.yml`
3. **For references:** Update main `openapi.yml` with new `$ref` entries

See `openapi/README.md` for detailed documentation on the structure and conventions.

### Validation Commands

```bash
# Install OpenAPI validation tool
npm install -g @redocly/cli

# Validate the OpenAPI specification
npx @redocly/cli lint openapi.yml

# Preview documentation locally
npx @redocly/cli preview-docs openapi.yml
```

## Component Guidelines

**IMPORTANT:** Follow the design system guidelines in `design-system/START.md` for all UI implementation. This includes using design tokens, DaisyUI classes, accessibility requirements, and responsive patterns.

### Use Astro Components For:

- All UI components (atoms, molecules, organisms)
- Pages and layouts
- Server-rendered content

### Astro Files - DO NOT:

- **DO NOT use TypeScript types in client-side `<script>` tags** - Astro's inline scripts run in the browser and don't support TypeScript type annotations. Use plain JavaScript or move typed code to separate `.ts` files.
- **DO NOT access `user.attributes.property`** - The User type has properties directly on the object (`user.name`, `user.email`), not nested in `attributes`.
- **DO NOT declare `Astro.locals` types in multiple files** - Centralize in `src/env.d.ts` only.
- **DO NOT use `vitest` to write test, use `bun:test` instead.**
- **DO NOT mix `define:vars`, `is:inline`, or `type="module"` with npm imports in `<script>` tags** - These attributes make Astro treat scripts as inline, which cannot resolve npm package imports (e.g., `import { animate } from 'motion'`). Instead, pass server values via `data-*` attributes on HTML elements and read them in a regular `<script>` tag:

  ```astro
  <!-- ✅ Correct: Use data attributes -->
  <dialog data-modal data-backdrop-close={backdropClose ? 'true' : 'false'}>
    <script>
      import { animate } from 'motion'; // Works!
      document.querySelectorAll('dialog[data-modal]').forEach((modal) => {
        const backdropClose = modal.dataset.backdropClose === 'true';
      });
    </script>

    <!-- ❌ Wrong: define:vars breaks npm imports -->
    <script define:vars={{ backdropClose }}>
      import { animate } from 'motion'; // Error: Cannot resolve module
    </script>
  </dialog>
  ```

### Storybook Stories:

- All atomic components must have stories
- Use `.stories.ts` files (TypeScript)
- Render functions create DOM elements directly
- Test all variants and states

### Toast Notifications

Use the toast system for user feedback instead of inline alerts:

```typescript
// In client-side <script> tags
import { addToast } from '@lib/stores/toastStore';

// After successful action
addToast('Changes saved!', 'success');

// After error
addToast('Failed to save. Please try again.', 'error');
```

**When to use:**

- Form submission feedback
- API response notifications
- Background task completion
- Error messages that don't block UI

**When NOT to use:**

- Form validation errors (use inline errors)
- Critical blocking errors (use error page/modal)
- Confirmation dialogs (use Modal)

## TypeScript Guidelines

### Extending Astro.locals

When extending `Astro.locals`, use this pattern in `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

import type { User, Session } from '@/lib/auth/lucia';

declare global {
  namespace App {
    interface Locals {
      user?: User | null;
      session?: Session | null;
    }
  }
}

export {};
```

**Key points:**

- Use `declare global { namespace App { ... } }` when the file has imports
- Import custom types from project files (`@/lib/auth/lucia`), not from library packages directly
- The `export {}` at the end ensures the file is treated as a module
