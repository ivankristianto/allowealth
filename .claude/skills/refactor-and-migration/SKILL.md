---
name: refactor-and-migration
description: Use when migrating a library or dependency (e.g. Zod to Valibot), writing the PR description for a refactoring or migration PR, or redesigning/refactoring an Astro component. Covers which docs a library migration must update, how to verify bundle-size and tree-shaking claims empirically before writing them in a PR, and the explore-before-implement pattern for component redesigns.
---

# Refactoring & Migration Conventions

## Library Migration Documentation Checklist

When migrating a library (e.g., Zod → Valibot), update ALL of these — in order:

1. `.claude/rules/backend/api.md` or relevant rule file — update code examples and rules
2. `.claude/CLAUDE.md` ADR quick reference table — add/update the library row
3. `docs/prd.md` — update tech stack and any security/validation sections
4. `.claude/memory/MEMORY.md` — add a note so future sessions know the decision

- ✅ **Leave historical plan files unchanged** — `docs/plans/YYYY-MM-DD-*.md` are artifacts of what was used at the time; rewriting them is misleading
- ❌ **Claim the migration is done without updating all four locations above**

## PR Claims for Refactoring PRs

Before writing migration notes in a PR description, verify claims empirically:

- ✅ **Check if the library appears in the client bundle** — `grep -r "library-name" dist/client/` before claiming client bundle savings
- ✅ **Verify tree-shaking claims** — check `"sideEffects"` in both packages' `package.json`; `"sideEffects": false` is now standard and not a differentiator
- ✅ **Distinguish server vs. client bundle improvements** — validation libraries are server-side only in this app; neither ships to the browser
- ❌ **Copy marketing claims from library websites without measurement** — "50% smaller" requires a pre- and post-migration build to verify
- ❌ **Claim "better tree-shaking" without checking** — both Zod v4 and Valibot declare `"sideEffects": false`

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
- ✅ **Check reference pages (transactions, accounts) for patterns** - consistent UI patterns
- ✅ **Plan with diagrams before implementing** - `BEFORE` / `AFTER` ASCII art clarifies changes
- ✅ **Verify mobile view after changes** - responsive stacking differs from desktop
- ❌ **Refactor components without seeing the current state** - may reintroduce bugs already fixed
