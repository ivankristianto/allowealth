# Allowealth - Project Overview

## Purpose

Personal and family financial application for expense tracking, budgeting, account management, and financial forecasting.

## Tech Stack

- **Runtime:** Bun 1.x (dev) / Cloudflare Workers (prod)
- **Framework:** Astro 6.x (file-based routing, SSR)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side rendered)
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Motion/mini (client-side)
- **Database:** Drizzle ORM + SQLite (dev) / Cloudflare D1 (prod)
- **Auth:** Better Auth
- **Cache:** CacheManager + Upstash Redis (prod) / Memory (dev)
- **Logging:** Structured consola loggers
- **Validation:** Valibot (`import * as v from 'valibot'`) — NOT Zod
- **Testing:** bun:test (unit), Playwright (E2E)
- **Icons:** @lucide/astro

## Key Architectural Decisions

- Server-rendered Astro components (no client-side DOM construction)
- Interactive updates via `?_render=html` fetch from API (not JS-built HTML strings)
- Client scripts in `.client.ts` files with `data-*` attributes (not `define:vars` with npm imports)
- DaisyUI classes for styling (not raw Tailwind colors like `bg-slate-100`)
- Design tokens imported from `@/lib/tokens` (not hardcoded hex values)
- `getActiveSchema()` in services for DB schema selection
- `getEnv()` for runtime secrets (not `import.meta.env`)
- Specific imports only (not barrel exports) for bundle size
- Structured consola loggers (not `console.log`)
