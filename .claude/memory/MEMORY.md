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

- Local: SQLite via `better-sqlite3`
- Production: PostgreSQL via Hyperdrive
- Migrations: Always generate for **both** dialects (`db:generate` + `db:generate:prod`)

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

---

_Note: Detailed patterns and rules are in `.claude/rules/`. This file contains quick reference only._
