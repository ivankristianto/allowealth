# Allowealth

Personal and family financial application for expense tracking, budgeting, account management, and financial forecasting.

## Astro 6 Note

The main SSR app enables `security: { csp: true }`, but `src/middleware/security-headers.ts` still writes the runtime CSP header until the nonce path is removed.

## ADR Quick Reference

| Category                | Use This ✅                                                            | Not This ❌                                    | Reference                                                       |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **HTML Rendering**      | Server-rendered Astro components                                       | Client-side DOM construction                   | `002-interactive-pages.md`                                      |
| **Interactive Updates** | Fetch `?_render=html` from API                                         | Build HTML strings in JS                       | `002-interactive-pages.md`                                      |
| **Client Scripts**      | `.client.ts` files + `data-*` attributes                               | `define:vars` with npm imports                 | `002-interactive-pages.md`                                      |
| **Styling**             | DaisyUI classes (`bg-base-200`)                                        | Tailwind colors (`bg-slate-100`)               | `design-system/START.md`                                        |
| **Design Tokens**       | Import from `@/lib/tokens`                                             | Hardcoded values (`#10b981`)                   | `design-system/01-foundations.md`                               |
| **Icons**               | `@lucide/astro`                                                        | Custom SVG or emojis                           | `design-system/START.md`                                        |
| **Animations**          | `motion/mini`                                                          | `motion` (full) or CSS-only                    | `design-system/08-animations.md`                                |
| **State**               | Nano Stores                                                            | Local state scattered                          | N/A                                                             |
| **Feedback**            | Toast notifications                                                    | `alert()`, `confirm()`                         | N/A                                                             |
| **TypeScript**          | Separate `.ts` files                                                   | Types in `<script>` tags                       | N/A                                                             |
| **Database**            | `bun:sqlite` (local dev)                                               | Direct SQLite in middleware                    | `rules/workflow.md`                                             |
| **Database (Workers)**  | Cloudflare D1 via `DB` binding                                         | Worker-specific external databases             | `006-database-connection-architecture.md`                       |
| **Schema Selection**    | `getActiveSchema()` in services                                        | Direct table imports                           | Shared SQLite-compatible schema                                 |
| **Environment Vars**    | `getEnv()` for runtime secrets                                         | `import.meta.env` (build-time only on Workers) | Cross-runtime compat                                            |
| **Testing**             | `bun:test`                                                             | `vitest`                                       | `rules/testing.md`                                              |
| **API Docs**            | Update OpenAPI files                                                   | Comments only                                  | `openapi/README.md`                                             |
| **Bundle Size**         | Specific imports (`@/lib/utils/client`)                                | Barrel exports (`@/lib/utils`)                 | `005-bundle-performance.md`                                     |
| **Chart.js**            | `@/lib/chart-setup` (tree-shaken)                                      | `chart.js/auto`                                | `005-bundle-performance.md`                                     |
| **Server Libraries**    | Type-only imports (`import type`)                                      | Runtime imports in client                      | `005-bundle-performance.md`                                     |
| **Password Hashing**    | Argon2id (Bun.password on Bun) / PBKDF2-SHA256 (Web Crypto on Workers) | hash-wasm, @noble/hashes/argon2, oslo/argon2   | Workers blocks runtime WASM and pure-JS Argon2 exceeds 10ms CPU |
| **Caching**             | CacheManager + Tag-based drivers                                       | Direct Redis or local-only cache               | `008-cache-abstraction.md`                                      |
| **Logging**             | Structured consola loggers                                             | `console.log`                                  | `009-logger-abstraction.md`                                     |
| **MCP Server**          | Hybrid (stdio + HTTP) with shared tools                                | Logic scattered in routes                      | `010-mcp-server-architecture.md`                                |
| **CLI Commands**        | `bun run aw <command>` (citty)                                         | Standalone scripts in `src/cli/`               | `COMMANDS.md`                                                   |
| **Validation**          | Valibot (`import * as v from 'valibot'`)                               | Zod (`import { z } from 'zod'`)                | `rules/backend/api.md`                                          |

## Where Things Live

- Rules: `.claude/rules/` (domain files are path-scoped and load on demand)
- Architecture decisions: `docs/architecture/`
- Design system: `design-system/` (start with `START.md`)
- Scripts and CLI: `COMMANDS.md`

## Quick Start for New Agents

1. Read `.claude/rules/principles.md` - understand core principles
2. Read `.claude/rules/workflow.md` - understand session behavior and quality gates
3. Read `.claude/rules/frontend/design-system.md` - understand design system
4. Read task context (spec, plan, or issue)
5. Create a plan before coding
6. Execute following implementation order: UI → Service → API → CLI → Seeder
7. Run quality gates before committing

**If rules conflict with task instructions, rules win.**
