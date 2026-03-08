# Test Organization Design

**Problem**

The repository mixes several test placement strategies:

- colocated `*.test.ts`
- centralized `src/**/__tests__`
- flattened names like `budgets-initialize.test.ts`
- nested names like `api/budgets/initialize.test.ts`
- non-test helpers stored inside test directories

This makes the suite harder to navigate, encourages duplicate coverage, and hides the difference between unit, integration, regression, performance, and architecture checks.

**Goals**

- Make test location predictable.
- Keep unit tests close to the code they protect.
- Move cross-cutting tests into explicit top-level scope folders.
- Remove duplicates and obviously low-value tests.
- Document the standard where contributors and agents will find it.

**Non-Goals**

- Rewrite every legacy test in one pass.
- Replace Bun test or Playwright.
- Build a complete CI enforcement system before the suite is migrated enough to support it.

**Approved Direction**

Use scope-based organization instead of one universal folder rule.

Default to colocated `*.test.ts` for code that maps to one module or component. Keep Playwright in `e2e/tests/**/*.spec.ts`. Move cross-cutting Bun tests out of `src/**/__tests__` and into a top-level `tests/` tree that states the purpose of the test.

**Target Structure**

- `src/**/foo.test.ts`
  - Unit tests for a single module, utility, component, store, or command.
- `tests/integration/**`
  - Multi-module and route-level Bun tests.
- `tests/architecture/**`
  - Structural guard tests that inspect source layout, markup contracts, or design-system rules.
- `tests/regression/**`
  - Tests created to lock in a bug fix or review finding that spans files.
- `tests/perf/**`
  - Benchmark and performance-regression suites.
- `tests/helpers/**`
  - Shared helpers for Bun tests only.
- `e2e/tests/**/*.spec.ts`
  - Playwright end-to-end coverage.

**Naming Rules**

- Use `*.test.ts` for Bun tests.
- Use `*.spec.ts` for Playwright tests.
- Mirror the runtime path when possible.
- Avoid flattened names when a nested path is clearer.
- Do not store non-test files in `__tests__` or `tests/` unless they are inside an explicit `helpers` directory.

**Migration Rules**

- Remove exact duplicates immediately.
- Rewrite or delete low-value tests that only assert local constants, copied logic, or hand-written HTML unrelated to the source file.
- Move legacy `__tests__` files gradually by scope, not in one large rename.
- Update any relative imports when moving files. Prefer alias imports in centralized tests to reduce future churn.

**First Wave**

The first wave should prove the convention without destabilizing the suite:

- document the new structure in `.claude/rules/testing.md`
- create design and implementation docs for the migration
- move a representative set of integration, regression, architecture, performance, and colocated tests
- remove the duplicate budgets initialize API test
- rewrite a few fake component tests so they assert real source or exported logic

**Expected Outcome**

After the first wave, contributors will have one documented default and a clear exception model. The suite will become easier to browse, duplicate tests will shrink, and future cleanup can happen incrementally instead of as another one-off audit.
