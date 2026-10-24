# Development Constitution v3.0.0

> **Updated — 2026-10-24.** Cloudflare Workers and D1 support was removed
> from the project. Bun with the `@astrojs/node` adapter is now the only
> deployment target, and the database runs on `bun:sqlite` in every
> environment. The Runtime Compatibility, Database and Deployment sections
> were rewritten to match. Cloudflare **Pages** hosting for `apps/docs` and
> `apps/site` and Cloudflare **Turnstile** are unaffected.

## I. Code Quality

Clarity over cleverness.

- **SRP**: One function = one responsibility
- **Naming**: Variables describe their purpose explicitly
- **Commits**: Document _what_ and _why_ in commit messages
- **Tech debt**: Track explicitly in backlog, don't hide it

## II. User-First Development

Build what users see and touch first.

**Implementation Order**:

1. UI with mock data (see it, play with it)
2. Service controller (consumed by API, controller, CLI)
3. API endpoint
4. CLI interface
5. Data seeder

**Why**: Working UI validates assumptions early. Mock data unblocks frontend. Services stay framework-agnostic.

## III. Fences (Quality Gates)

Automated checks run on every change. No exceptions.

| Gate      | Check Command       | Fix Command             | Blocking |
| --------- | ------------------- | ----------------------- | -------- |
| Types     | `bun run typecheck` | —                       | Yes      |
| Lint      | `bun run lint`      | `bun run lint:fix`      | Yes      |
| Stylelint | `bun run stylelint` | `bun run stylelint:fix` | Yes      |
| Format    | `bun run format`    | `bun run format:fix`    | Yes      |
| Test      | `bun run test`      | —                       | No\*     |

\*Failed tests → create ticket, fix in separate PR. Don't block current work.

### Runtime Compatibility

The project deploys via **Bun** with the `@astrojs/node` adapter — there is no separate edge runtime. Any code imported by middleware MUST be compatible with that runtime.

**Forbidden in middleware-imported code:**

- `bun:sqlite` → Only use in API routes, CLI, or non-middleware contexts
- `bun:` protocol imports → Only use in API routes, CLI, or non-middleware contexts

**Detection:**

```bash
grep -r "bun:" src/ --exclude-dir=node_modules
# If results appear in files imported by middleware, REFACTOR.
```

**Correct pattern:**

- Middleware: no `bun:` imports; reach the database through `@/db`
- API routes: Can use Bun-specific APIs
- CLI scripts: Can use Bun-specific APIs
- Database: Use `getDb()` and `runTransaction()` from `@/db`
- Environment variables: Use `getEnv()` helper, not `import.meta.env` (build-time only)

### Testing Strategy

- **Unit tests**: Write first, fail first. Use `bun:test`.
- **Integration tests**: Required for user-facing features. >80% coverage on critical paths.
- **E2E tests**: Required for critical user flows. Tag `@critical` tests for CI smoke runs. Use Playwright with `workers=1` for shared database tests.

## IV. Design System

Users build mental models. Don't break them.

- **Tokens**: Import from `@/lib/tokens` — no hardcoded colors, spacing, or font sizes
- **Components**: DaisyUI classes first, then Tailwind utilities
- **Accessibility**: WCAG AA — contrast ≥4.5:1 (text), ≥3:1 (UI), touch targets ≥44px
- **Responsive**: Mobile-first (base styles for mobile, `md:` for desktop)
- **Patterns**: Similar actions behave the same way across pages
- **Error messages**: User-friendly, actionable, no jargon
- **Icons**: Lucide with text labels

Full specification: `design-system/START.md`

## V. Architecture

### Database

The project uses SQLite (`bun:sqlite`) in every environment, with Drizzle ORM.

- Maintain the shared schema in `src/db/schema/sqlite/`
- Generate SQLite migrations (drizzle/sqlite) and apply them on every schema change
- Use `getActiveSchema()` in services — never import tables directly
- See `docs/architecture/007-database-migrations.md`

### Deployment (Bun)

- **Runtime**: Bun with the `@astrojs/node` adapter
- **Database**: SQLite (`bun:sqlite`) in every environment
- **Cache**: CacheManager with tag-based invalidation (Upstash prod, Memory dev)
- **Logging**: Structured consola loggers (JSON in production, pretty in dev)
- **Secrets**: `getEnv()` helper for environment variable access across runtimes

### Interactive Pages

Server-rendered HTML fragments, not client-side DOM construction. Client code fetches `?_render=html` from API and injects pre-rendered markup.

See `docs/architecture/002-interactive-pages.md`

### API Documentation

OpenAPI 3.1.0 with modular file structure. Update `openapi/` files when modifying API endpoints.

See `openapi/README.md`

## VI. Performance

Performance is a feature, not an afterthought.

- **Targets upfront**: Define before implementation (e.g., <200ms p95)
- **Profile hot paths**: Measure, don't guess
- **Bundle budget**: 250 kB gzipped client JS
- **Justify tradeoffs**: Document if trading perf for convenience

## VII. Continuous Refactoring

Refactor each loop, not at the end.

**Refactor Checklist** (priority order):

1. **Maintainability** — Can another dev understand this?
2. **Security** — Inputs validated? Auth checked?
3. **Performance** — Hot paths profiled?
4. **Consistency** — Follows existing patterns?
5. **Abstraction** — Right level? Not premature?

## Governance

**Amendments**: Propose → Document impact → Version bump → Update templates

**Template Propagation**: On amendment, audit and update: spec-template.md, plan-template.md, tasks-template.md

**Version Scheme**:

- MAJOR: Breaking changes to principles
- MINOR: New principles/guidance
- PATCH: Clarifications

**Conflicts**: Constitution wins. Justify exceptions in PR.

---

v3.0.0 | Ratified: 2026-02-12
