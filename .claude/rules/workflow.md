# Workflow & Quality Gates

## Session Behavior

- ✅ Follow implementation order: UI → Service → API → CLI → Seeder
- ✅ Run quality gates before committing (lint, stylelint, format, typecheck)
- ✅ Update OpenAPI docs when modifying API endpoints
- ✅ Update `COMMANDS.md` when adding or modifying `package.json` scripts or CLI tools
- ✅ Create a plan before coding
- ✅ Deliver a written plan in the first response (not after extensive exploration)
- ✅ Run `bun run build` after bug fixes to verify no new errors
- ✅ Run relevant tests related to the fix, check all usages of changed code
- ✅ Understand all requirements before implementing — clarify unclear items upfront
- ✅ Push back with technical reasoning if reviewer is wrong — technical correctness > comfort
- ✅ Admit when you're wrong quickly — state the correction and reason, move on
- ❌ Suggest fixes without verification or claim bugs are fixed without running tests
- ❌ Spend entire session reading without producing a plan
- ❌ Implement partial lists — complete all items or clarify first
- ❌ Use gratitude expressions — no "Thanks!", "Great point!", "You're absolutely right!"
- ❌ Apologize excessively — just fix and move on
- ❌ Defend why you pushed back — state technical facts only
- ❌ **Revert or `git checkout` files outside the scope of the current task** — other files may have been intentionally changed by the user or other processes; NEVER assume unrecognized changes are "unrelated" or accidental; always ask before reverting any file you didn't modify yourself

## Quality Gates

**Before every commit:**

```bash
# 1. Check for Bun-specific imports in shared code
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"

# 2. Run quality gates (all must pass)
bun run lint:fix          # ESLint (blocking)
bun run stylelint:fix     # Stylelint (blocking)
bun run format:fix        # Prettier (blocking)
bun run typecheck         # TypeScript (blocking)
```

**CRITICAL:** If `bun:` imports are found in middleware-imported files, REFACTOR before committing.

### Runtime Compatibility

The project deploys to **Cloudflare Workers** (primary) and **Bun** (local dev). Any code imported by middleware MUST be Workers-compatible.

**Forbidden in middleware-imported code:**

- `bun:sqlite` → Only use in non-middleware code paths (API routes, CLI, services)
- `bun:` protocol imports → Only use in API routes, CLI, or non-middleware contexts

**Correct pattern:**

- Middleware: Workers-compatible imports only (no native addons, no `bun:` APIs)
- API routes: Can use Bun-specific APIs (local dev context)
- CLI scripts: Can use Bun-specific APIs
- Database: Use abstraction layer with environment-specific drivers
- Environment variables: Use `getEnv()` helper, not `import.meta.env` (build-time only on Workers)
- Dev/preview scripts: Must use `bun --bun` flag to ensure Bun runtime (Astro CLI defaults to Node.js)

## Code Quality Standards

- ✅ Write clear, explicit code (clarity over cleverness)
- ✅ Follow Single Responsibility Principle (one function = one responsibility)
- ✅ Use descriptive variable names that explain purpose (not `data`, `temp`, `x`)
- ✅ Document _what_ and _why_ in commit messages
- ✅ Write unit tests first (fail first, then implement)
- ✅ Validate inputs at system boundaries (user input, external APIs)
- ✅ Define performance targets upfront (e.g., <200ms p95)
- ✅ Follow refactor checklist: Maintainability → Security → Performance → Consistency → Abstraction
- ❌ Add unnecessary error handling for impossible scenarios
- ❌ Use backwards-compatibility hacks (delete unused code completely)

## Debugging Process

- ✅ Fix root cause of typecheck errors (update API usage, fix imports)
- ✅ Trace bugs through full flow: DB → Service → API → Session → UI
- ✅ Test after every code change
- ✅ Check all usages after changing types or imports (`grep` the codebase)
- ✅ Verify root cause is fixed, not just symptoms
- ✅ Stop and ask when blocked or unclear - don't guess, don't force through
- ✅ Report actual state, not agent claims - check VCS diff to verify changes
- ❌ Suppress warnings with `@ts-expect-error` or `eslint-disable`
- ❌ Remove `await` just because TypeScript says "no effect" (runtime differs)
- ❌ Attempt fix #4 without questioning architecture - 3+ failures = wrong approach
- ❌ Fix multiple things at once - changes must be isolated
- ❌ **Wrap service code in silent catch blocks returning `[]`** - masks real errors, makes debugging impossible; surface or log actual errors

## Feature Completeness Checklist

- ✅ **Trace ALL consumers of a shared component before declaring done** - check every render path (SSR, API, Dashboard, etc.)
- ✅ **Fix tests before committing, never push with known failures**
- ✅ **Verify return types don't silently strip new fields** - explicit inline return types discard unlisted properties
- ✅ **Use systematic debugging from the start** - diagnose root cause with evidence before changing code
- ✅ **Confirm user intent before implementing UI changes** - ask clarifying questions first
- ✅ **Think through mobile vs desktop UX separately** - mobile uses dropdowns, desktop uses inline icons
- ✅ **Add tooltips/labels to icon-only buttons proactively**
- ✅ **Update tests to match user intent, not broken implementation**
- ✅ **Verify feature requests against existing codebase before creating issues**
- ✅ **Confirm with user before deleting "dead" code** - endpoints may be used externally
- ✅ **Check bundle budget after every dependency change**
- ❌ **Claim "done" without verifying all render paths**
- ❌ **Guess at fixes** - use systematic debugging immediately
- ❌ **Thrash method signatures** - if you edit 3x and end at the original, you didn't think first
- ❌ **Forget cross-session context** - if user asked to remove something prior, don't leave it
- ❌ **Delete tests without replacing coverage**
- ❌ **Assume endpoints are "dead" because grep finds no client references**
- ✅ **Clean up dead error handling after simplifying methods** - when removing functionality (e.g., balance mutation), also remove corresponding error handlers in API routes
- ✅ **Update OpenAPI schemas when adding new DB columns** - if a column is returned in API responses, the schema must include it
- ✅ **Exclude debt from asset allocation charts** - when adding account classification, ensure allocation/distribution calculations exclude debt consistently (same as portfolio totals)

## CLI Conventions

- ✅ **Add new CLI scripts as `aw` subcommands** — register in `src/cli/index.ts` subCommands, create command file in `src/cli/commands/`
- ✅ **Use `src/cli/lib/exec.ts` for shell-out commands** — wraps `execFileSync` with clean error handling
- ✅ **Use lazy `await import()` inside `run()` for logic commands** — avoids loading DB/services at CLI startup
- ❌ **Create standalone scripts in `src/cli/` or `scripts/`** — use `aw` subcommands instead; the `aw` CLI (`bun run aw`) is the single entry point

## Subprocess Patterns

- ✅ **Use `execFileSync` with argv array for subprocess calls** - avoids shell injection and special character issues in parameters
- ❌ **Use `execSync` with string interpolation** - `execSync(\`bun run ${script} ${param}\`)` breaks on shell metacharacters and is a command injection vector
- ✅ **Use Bun subprocess for E2E helpers needing bun:sqlite** - Playwright runs in Node.js, shell out to Bun for SQLite access
- ❌ **Over-engineer E2E test helpers with production-grade error handling** - YAGNI for test code; keep subprocess helpers simple

## Subagent Patterns

- ✅ **Verify file state after subagent completes** - subagents may make partial changes; always read files and run typecheck before trusting their report
- ✅ **Run typecheck immediately after subagent work** - stale diagnostics from mid-edit can appear; fresh typecheck reveals actual state
- ✅ **Verify subagent commits with `git log` after dispatch** - subagents may report success but fail to commit
- ✅ **Commit files manually if subagent skipped the commit step** - check `git status` after every subagent returns
- ❌ **Trust subagent "all checks passed" reports without independent verification** - subagents may report success while leaving partial changes
- ✅ **Group parallel subagents by file dependency** - Wave 1 (services + utils + seeders), then Wave 2 (components + pages that consume them); prevents merge conflicts
- ✅ **Run full quality gates after ALL parallel agents complete** - individual agents pass in isolation but combined state may conflict (e.g., both agents editing same file)
- ✅ **Use parallel code review agents for thorough coverage** - two independent reviewers catch different issues; triage findings together before fixing
- ✅ **Parallel subagents on independent files are safe** - if each agent modifies different files (e.g., separate command modules), they can run in parallel without git conflicts
- ✅ **Subagents may create stubs beyond spec to pass typecheck** - this is correct behavior when the plan acknowledges a module won't exist yet; later tasks replace the stub
- ❌ **Trust IDE diagnostics over actual `astro check`** - citty's lazy-loaded subcommands (`() => import(...)`) trigger false "Cannot find module" diagnostics in the editor; run `bun run typecheck` to verify
- ✅ **Always strip quotes in custom .env parsers** - `.env` files use `KEY="value"` syntax; a naive parser that doesn't strip quotes produces values with literal quote characters, breaking connection strings and tokens

## Dependency Changes

- ✅ **Grep ALL file types when removing a dependency** - comments, docs, rules, and config files reference dependencies too
- ✅ **Verify E2E failures are pre-existing before investigating** - `git stash` and test on prior code to isolate regressions
- ❌ **Trust `reuseExistingServer: true` E2E results as proof of correctness** - a running dev server masks startup failures

## Component Refactoring Pattern

When redesigning or refactoring components, follow systematic exploration before implementation.

**Pattern:**

1. Visit page in Chrome to see actual issue
2. Check reference implementations for similar patterns
3. Plan redesign with visual diagrams (ASCII art works)
4. Implement structural changes
5. Verify on both desktop and mobile

**Rules:**

- ✅ **See component in Chrome before refactoring** - visual issues aren't obvious from code
- ✅ **Check reference pages (transactions, assets) for patterns** - consistent UI patterns
- ✅ **Plan with diagrams before implementing** - `BEFORE` / `AFTER` ASCII art clarifies changes
- ✅ **Verify mobile view after changes** - responsive stacking differs from desktop
- ❌ **Refactor components without seeing the current state** - may reintroduce bugs already fixed
