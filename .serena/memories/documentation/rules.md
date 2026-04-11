# Project Rules & Memory Locations

## Claude Rules (`.claude/rules/`)

Domain-specific coding rules — read the relevant file before working in that domain.

| File                        | Domain                                                                |
| --------------------------- | --------------------------------------------------------------------- |
| `principles.md`             | Core principles: SRP, naming, TypeScript-first, perf                  |
| `workflow.md`               | Session behavior, quality gates, debugging process, subagent patterns |
| `performance.md`            | DB query optimization, cache strategy, Core Web Vitals, bundle budget |
| `testing.md`                | E2E (Playwright), unit tests (bun:test), test data patterns           |
| `learned-patterns.md`       | Index of where learned patterns live (distributed to domain files)    |
| `frontend/design-system.md` | Design tokens, DaisyUI, accessibility rules                           |
| `frontend/astro.md`         | Astro SSR patterns, client scripts, view transitions                  |
| `frontend/bundle.md`        | Bundle size rules, import patterns, tree-shaking                      |
| `backend/database.md`       | Drizzle ORM patterns, migrations, query patterns, input validation    |
| `backend/deployment.md`     | Cloudflare Workers, Wrangler, D1, env vars, Workers compatibility     |
| `backend/api.md`            | API patterns, Valibot validation, OpenAPI                             |

## Claude Auto-Memory (`.claude/memory/`)

Managed by Claude Code's auto-memory system. Contains:

- `MEMORY.md` — index of all memory entries (loaded into every conversation)
- Individual `.md` files per memory entry (feedback, project, user, reference types)

**Do not manually edit** — Claude Code manages this directory.

## Key Behavioral Rules (from `workflow.md`)

- **GitHub issues only** — use `gh issue create` or `github-issue-creation` skill; never create Linear tickets
- **Implementation order** — UI → Service → API → CLI → Seeder
- **Never revert files outside task scope** — ask before reverting any unrecognized changes
- **Quality gates before every commit** — lint:fix, stylelint:fix, format:fix, typecheck (all blocking)
- **No silent catch blocks returning `[]`** — surface or log actual errors
- **Validation library: Valibot** (`import * as v from 'valibot'`) — not Zod
