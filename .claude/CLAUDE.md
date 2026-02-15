# Allowealth

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

## Tech Stack

- **Runtime:** Bun 1.x (dev) / Cloudflare Workers (prod)
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Motion/mini (client-side animations)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / PostgreSQL+Hyperdrive or Cloudflare D1 (prod)
- **Auth:** Lucia Auth
- **Cache:** CacheManager + Upstash Redis (prod) / Memory (dev)
- **Logging:** Structured consola loggers

## ADR Quick Reference

| Category                | Use This ✅                              | Not This ❌                                    | Reference                                 |
| ----------------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| **HTML Rendering**      | Server-rendered Astro components         | Client-side DOM construction                   | `002-interactive-pages.md`                |
| **Interactive Updates** | Fetch `?_render=html` from API           | Build HTML strings in JS                       | `002-interactive-pages.md`                |
| **Client Scripts**      | `.client.ts` files + `data-*` attributes | `define:vars` with npm imports                 | `002-interactive-pages.md`                |
| **Styling**             | DaisyUI classes (`bg-base-200`)          | Tailwind colors (`bg-slate-100`)               | `design-system/START.md`                  |
| **Design Tokens**       | Import from `@/lib/tokens`               | Hardcoded values (`#10b981`)                   | `design-system/01-foundations.md`         |
| **Icons**               | `@lucide/astro`                          | Custom SVG or emojis                           | `design-system/START.md`                  |
| **Animations**          | `motion/mini`                            | `motion` (full) or CSS-only                    | `design-system/08-animations.md`          |
| **State**               | Nano Stores                              | Local state scattered                          | N/A                                       |
| **Feedback**            | Toast notifications                      | `alert()`, `confirm()`                         | N/A                                       |
| **TypeScript**          | Separate `.ts` files                     | Types in `<script>` tags                       | N/A                                       |
| **Database**            | `bun:sqlite` (local dev)                 | Direct SQLite in middleware                    | `rules/workflow.md`                       |
| **Database (Workers)**  | D1 or Hyperdrive (deploy-time choice)    | Both via wrangler.toml                         | `006-database-connection-architecture.md` |
| **Schema Selection**    | `getActiveSchema()` in services          | Direct table imports                           | Dual SQLite/PostgreSQL support            |
| **Environment Vars**    | `getEnv()` for runtime secrets           | `import.meta.env` (build-time only on Workers) | Cross-runtime compat                      |
| **Testing**             | `bun:test`                               | `vitest`                                       | `rules/testing.md`                        |
| **API Docs**            | Update OpenAPI files                     | Comments only                                  | `openapi/README.md`                       |
| **Bundle Size**         | Specific imports (`@/lib/utils/client`)  | Barrel exports (`@/lib/utils`)                 | `005-bundle-performance.md`               |
| **Chart.js**            | `@/lib/chart-setup` (tree-shaken)        | `chart.js/auto`                                | `005-bundle-performance.md`               |
| **Server Libraries**    | Type-only imports (`import type`)        | Runtime imports in client                      | `005-bundle-performance.md`               |
| **Password Hashing**    | PBKDF2-SHA256 (Web Crypto API)           | oslo/argon2 (native addon)                     | Cross-runtime compatibility               |
| **Caching**             | CacheManager + Tag-based drivers         | Direct Redis or local-only cache               | `008-cache-abstraction.md`                |
| **Logging**             | Structured consola loggers               | `console.log`                                  | `009-logger-abstraction.md`               |
| **MCP Server**          | Hybrid (stdio + HTTP) with shared tools  | Logic scattered in routes                      | `010-mcp-server-architecture.md`          |

## Key Commands

```bash
# Development
bun run dev                  # Start dev server
bun run build                # Build for production

# Quality Gates (run before every commit)
bun run lint:fix             # ESLint (blocking)
bun run stylelint:fix        # Stylelint (blocking)
bun run format:fix           # Prettier (blocking)
bun run typecheck            # TypeScript (blocking)

# Testing
bun run test                 # Unit tests
bun run test:e2e             # E2E tests

# Database (Dual-Dialect)
bun run db:generate          # Generate SQLite migration
bun run db:generate:prod     # Generate PostgreSQL migration
bun run db:migrate           # Apply SQLite migrations
bun run db:migrate:prod      # Apply PostgreSQL migrations
bun run db:push              # Push schema (SQLite dev only)

# Storybook
bun run storybook            # Start Storybook
```

See `COMMANDS.md` for complete list of available scripts and CLI tools.

## Project Structure

```
src/
├── components/              # Astro components (atoms/molecules/organisms/partials)
├── pages/                   # File-based routing (Astro)
├── services/                # Business logic (framework-agnostic)
├── db/                      # Database schemas and connection
│   ├── schema/
│   │   ├── sqlite/          # SQLite schemas
│   │   └── postgresql/      # PostgreSQL schemas
│   └── connection.ts        # getActiveSchema()
├── lib/                     # Utilities, tokens, auth, cache, logging
├── middleware/              # Request middleware (Workers-compatible only)
└── styles/                  # Global styles, tokens
```

## Rules & Documentation

All project rules are in `.claude/rules/`:

- **`principles.md`** - Core principles (code quality, user-first, performance)
- **`workflow.md`** - Session behavior, quality gates, debugging
- **`performance.md`** - Performance rules (database, cache, Core Web Vitals)
- **`frontend/design-system.md`** - Design tokens, DaisyUI, accessibility
- **`frontend/astro.md`** - Astro patterns, client scripts
- **`frontend/bundle.md`** - Bundle performance rules
- **`backend/database.md`** - DB patterns, migrations, dual-dialect
- **`backend/deployment.md`** - Workers deployment patterns
- **`backend/api.md`** - API patterns, OpenAPI
- **`testing.md`** - Testing patterns (E2E, Playwright, unit)
- **`learned-patterns.md`** - Learned patterns from experience

Architecture decisions in `docs/architecture/`:

- `002-interactive-pages.md` - Server-rendered HTML fragments
- `003-api-authentication.md` - Auth patterns
- `004-database-schema.md` - Schema design
- `005-bundle-performance.md` - Bundle optimization
- `006-database-connection-architecture.md` - Connection handling
- `007-database-migrations.md` - Migration strategy
- `008-cache-abstraction.md` - Cache layer
- `009-logger-abstraction.md` - Logging
- `010-mcp-server-architecture.md` - MCP server
- `011-oauth-sso-architecture.md` - OAuth/SSO

Design system in `design-system/`:

- `START.md` - Quick start guide (read first)
- `01-foundations.md` - Tokens, colors, typography
- `02-components.md` - Component inventory
- `03-forms.md` - Form patterns
- `04-accessibility.md` - WCAG compliance
- `05-responsive.md` - Responsive patterns
- `06-data-visualization.md` - Charts, currency
- `07-patterns.md` - Page layouts
- `08-animations.md` - Animation patterns

## Quick Start for New Agents

1. Read `.claude/rules/principles.md` - understand core principles
2. Read `.claude/rules/workflow.md` - understand session behavior and quality gates
3. Read `.claude/rules/frontend/design-system.md` - understand design system
4. Read task context (spec, plan, or issue)
5. Create a plan before coding
6. Execute following implementation order: UI → Service → API → CLI → Seeder
7. Run quality gates before committing

**If rules conflict with task instructions, rules win.**
