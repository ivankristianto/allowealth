# Core Principles

## Code Quality

Clarity over cleverness.

- **SRP**: One function = one responsibility
- **Naming**: Variables describe their purpose explicitly
- **Commits**: Document _what_ and _why_ in commit messages
- **Tech debt**: Track explicitly in backlog, don't hide it

## User-First Development

Build what users see and touch first.

**Implementation Order**:

1. UI with mock data (see it, play with it)
2. Service controller (consumed by API, controller, CLI)
3. API endpoint
4. CLI interface
5. Data seeder

**Why**: Working UI validates assumptions early. Mock data unblocks frontend. Services stay framework-agnostic.

## TypeScript-First

This is a **TypeScript-primary codebase**:

- ✅ Write TypeScript with strict type checking, use `tsc --noEmit` to verify
- ✅ Define explicit types instead of using `any`, use type inference where appropriate
- ✅ Import project types from `@/lib/auth/types` etc., not library packages directly
- ❌ Use `any` type without justification or skip typecheck

## Performance

Performance is a feature, not an afterthought.

- **Targets upfront**: Define before implementation (e.g., <200ms p95)
- **Profile hot paths**: Measure, don't guess
- **Bundle budget**: 250 kB gzipped client JS
- **Justify tradeoffs**: Document if trading perf for convenience

## Continuous Refactoring

Refactor each loop, not at the end.

**Refactor Checklist** (priority order):

1. **Maintainability** — Can another dev understand this?
2. **Security** — Inputs validated? Auth checked?
3. **Performance** — Hot paths profiled?
4. **Consistency** — Follows existing patterns?
5. **Abstraction** — Right level? Not premature?
