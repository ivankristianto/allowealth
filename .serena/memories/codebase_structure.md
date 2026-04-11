# Codebase Structure

## Root

```
/Users/ivan/Works/allowealth/
├── src/
│   ├── __tests__/       # Unit tests
│   ├── assets/          # Static assets
│   ├── cli/             # CLI entry point (citty) + commands/
│   ├── components/      # Astro components (atoms/molecules/organisms/partials)
│   ├── db/              # Drizzle ORM schemas and connection
│   │   ├── schema/
│   │   │   └── sqlite/  # Shared SQLite-compatible schemas
│   │   └── index.ts     # getActiveSchema()
│   ├── layouts/         # Astro layout components
│   ├── lib/             # Utilities, tokens, auth, cache, logging
│   ├── middleware/       # Request middleware (Workers-compatible only)
│   ├── pages/           # File-based routing (Astro)
│   ├── services/        # Business logic (framework-agnostic)
│   ├── styles/          # Global styles, tokens
│   ├── tests/           # E2E / Playwright tests
│   └── types/           # Shared TypeScript types
├── .claude/             # Agent instructions, rules, memory
│   ├── CLAUDE.md        # Main project instructions + ADR quick-reference table
│   ├── rules/           # Domain-specific coding rules (see documentation/rules memory)
│   └── memory/          # Auto-memory for Claude Code (MEMORY.md index)
├── design-system/       # Design system docs (see documentation/design_system memory)
│   ├── START.md         # ← READ FIRST before any UI work
│   ├── styles.json      # Source of truth for all design tokens
│   └── daisyui-llm.md   # DaisyUI v5 component reference for LLMs
├── openapi/             # OpenAPI 3.1.0 spec (see documentation/openapi memory)
│   ├── paths/           # Endpoint definitions per feature
│   └── schemas/         # Reusable data model definitions
├── docs/
│   ├── architecture/    # ADRs (002–013)
│   └── plans/           # Historical implementation plans (do not rewrite)
└── COMMANDS.md          # All available CLI commands
```

## Key Files

- `src/cli/index.ts` — CLI entry point, register subcommands here
- `src/db/index.ts` — `getActiveSchema()` for environment-aware DB access
- `src/lib/tokens` — Design tokens (import here, not hardcode values)
- `src/middleware/` — Workers-compatible only (no bun: imports)
