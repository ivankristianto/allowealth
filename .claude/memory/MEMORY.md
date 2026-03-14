# Project Memory

This file is managed by Claude Code's auto-memory system.

## Quick Index

- **Project patterns**: Build commands, test conventions, code style
- **Architecture notes**: Key files, module relationships, abstractions
- **Debugging insights**: Solutions to tricky problems, common error causes
- **Preferences**: Communication style, workflow habits, tool choices

---

## Build & Test Commands

- Build: `bun run build`
- Dev: `bun run dev`
- Test: `bun run test`
- Quality gates: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`

## Database

- Local: SQLite via `bun:sqlite`
- Production: Cloudflare D1
- Migrations: Single SQLite flow; generate `drizzle/sqlite/*.sql` once and use for both local SQLite and Cloudflare D1

## Key Architecture Patterns

- **Implementation order**: UI → Service → API → CLI → Seeder
- **Interactive pages**: Server-rendered HTML fragments via `?_render=html`
- **Client scripts**: Use `.client.ts` files with `data-*` attributes (never `define:vars` with npm imports)

## Performance Targets (Critical)

- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1, FCP < 1.5s
- **Page load**: < 500ms (p95) for all pages
- **Bundle**: < 250 kB gzipped client JS
- **Cache hit rate**: > 80%
- **Query performance**: < 200ms per query

**Key patterns:**

- Bulk operations over loops (CSV: 3000 queries → 5 queries)
- Cache at service layer with tag-based invalidation
- N+1 prevention (subqueries/JOINs, not loops)
- Lazy load charts with Intersection Observer
- Prerender public pages

## Validation

- **Valibot only** — Zod was fully removed in PR #310. Never import from `zod`.
- Import: `import * as v from 'valibot'`
- API routes: use `validateBody(request, schema)` + `isValidationError()` from `@/lib/api-utils`
- Error shape returned by `validateBody`: `{ path: string[], message: string, code: string }`
- Validation runs server-side only — neither library ships to the client bundle

## Auth

- **Better Auth is the canonical auth layer** — use `src/lib/auth/server.ts`, `src/lib/auth/client.ts`, `src/lib/auth/types.ts`, and `src/db/schema/sqlite/better-auth.ts`
- **Do not document or add Lucia-era routes** — `/api/auth/login`, `/api/auth/signup`, `/api/auth/google/*`, and `/api/auth/mfa/*` are deprecated
- **Current auth surface** — Better Auth is mounted at `src/pages/api/auth/[...all].ts`; app-owned email verification remains at `/api/auth/verify-email`
- **Passkeys** — Use `@better-auth/passkey` plugin. Local testing works on `localhost` without HTTPS; other domains require HTTPS or a tunnel
- **Auth methods** — Email/password, Google OAuth, 2FA/TOTP, and Passkeys (WebAuthn) all via Better Auth plugins

---

## User Preferences (Critical)

- **ALWAYS follow user instructions exactly.** When the user says to spawn an agent with a specific model (e.g., "spawn new agent with sonnet"), use the Task tool with that exact model. NEVER execute the work directly in the main conversation when the user explicitly requested delegation to a subagent.
- Never substitute your own approach for what the user explicitly asked for. Instructions on HOW to do something are just as important as WHAT to do.

---

## Library Migration Checklist (Learned from Zod → Valibot)

When migrating any library, update ALL four locations or the migration is incomplete:

1. `.claude/rules/` relevant file (code examples + rules)
2. `.claude/CLAUDE.md` ADR table (library row)
3. `docs/prd.md` (tech stack + security sections)
4. `.claude/memory/MEMORY.md` (this file)

Historical plan files (`docs/plans/YYYY-MM-DD-*.md`) are immutable — leave as-is.

## PR Claims — What to Verify Before Writing

- Validation libraries (Valibot, Zod) are **server-side only** — neither ships to the client bundle
- `"sideEffects": false` is standard in modern libraries — not a tree-shaking differentiator
- Bundle size claims require pre- and post-migration builds to quantify — don't estimate

_Note: Detailed patterns and rules are in `.claude/rules/`. This file contains quick reference only._
