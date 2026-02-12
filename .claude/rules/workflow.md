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

- `bun:sqlite` → Use `better-sqlite3` or database abstraction layer
- `bun:` protocol imports → Only use in API routes, CLI, or non-middleware contexts

**Correct pattern:**

- Middleware: Workers-compatible imports only (no native addons, no `bun:` APIs)
- API routes: Can use Bun-specific APIs (local dev context)
- CLI scripts: Can use Bun-specific APIs
- Database: Use abstraction layer with environment-specific drivers
- Environment variables: Use `getEnv()` helper, not `import.meta.env` (build-time only on Workers)

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
