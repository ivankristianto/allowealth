---
name: dependency-maintenance
description: Use when updating dependencies, bumping packages, running the routine dependency sweep, preparing a chore(deps) PR, or answering whether the project is out of date. Covers the in-range minor/patch sweep only — major-version upgrades are out of scope and get their own PR.
---

# Dependency Maintenance (Routine Sweep)

Routine sweep = move every dependency to the newest version **inside its existing semver range**, in one `chore(deps)` PR. Major bumps are deliberately deferred; they get dedicated PRs with their own migration testing.

## The Four Package Trees

This is not a workspace monorepo. There are **four independent trees, each with its own `bun.lock`**. A sweep that only runs at the root is an incomplete sweep.

| Tree        | Contents            | How to verify it                                                          |
| ----------- | ------------------- | ------------------------------------------------------------------------- |
| `.` (root)  | Main SSR app        | full gates, build, tests                                                  |
| `apps/docs` | Starlight docs site | `docs:check`, `docs:build`                                                |
| `apps/site` | Marketing site      | `landing:check`, `landing:build`                                          |
| `apps/mcp`  | MCP server          | **no `scripts` block** — verify with `bun install --frozen-lockfile` only |

Use `--cwd` rather than `cd`, so you never lose track of which tree you are in:

```bash
for d in . apps/docs apps/site apps/mcp; do bun outdated --cwd "$d"; done
```

- ✅ **Run every step in all four trees** — `.`, `apps/docs`, `apps/site`, `apps/mcp`
- ❌ **Say "three trees"** — `apps/mcp` is the one that gets forgotten, and it drifts the furthest because of it
- ❌ **Assume root `bun update` reaches the sub-apps** — it does not; they have separate lockfiles and drift independently

## Never Touch the Pinned Astro Packages

Some packages are pinned to exact versions **on purpose** (commit `15f91caf`). `bun update` correctly skips them. Leave them skipped.

**The pin is not uniform across trees — check before assuming:**

| Package                                  | root        | `apps/docs` / `apps/site`   |
| ---------------------------------------- | ----------- | --------------------------- |
| `astro`                                  | exact pin   | exact pin                   |
| `@astrojs/node`, `@astrojs/cloudflare`   | exact pin   | not present                 |
| `@astrojs/check`, `@astrojs/ts-plugin`   | exact pin   | **caret — sweeps normally** |
| `@astrojs/sitemap`, `@astrojs/starlight` | not present | **caret — sweeps normally** |

- ✅ **Let the caret-ranged `@astrojs/*` packages in the sub-apps bump** — that is an ordinary in-range sweep, not a pin override
- ✅ **Leave every exact-pinned package at its current version** — they move together, in their own PR, never in a routine sweep
- ❌ **Hand-edit `package.json` to bump an exact-pinned package** — "it's only a patch" is how the pin gets defeated
- ❌ **Invent a target version for a pinned package** — if `bun outdated` shows `Update` == `Current`, there is no in-range release at all; a version you "expect" to exist (`astro 6.4.8`, `@astrojs/node 10.1.4`) is fabricated

## Read the Columns, Don't Guess Versions

`bun outdated` is the whole triage tool. Every version number you write must be copied from its output.

| Column    | Meaning             | Action                 |
| --------- | ------------------- | ---------------------- |
| `Current` | Installed now       | —                      |
| `Update`  | Newest **in-range** | This is the sweep      |
| `Latest`  | Newest published    | Deferred if ≠ `Update` |

- ✅ **Copy version numbers from `bun outdated`** — for the before table, the PR body, everything
- ❌ **Write a version number you did not read from tool output** — including "obvious" next patches

## Procedure

Run in all four trees at each step.

1. **Check for in-flight work first** — `git branch -a | grep -iE 'dep|maint|upgrade'`. Long-lived branches (e.g. `chore/maintenance-astro-7-upgrade`) may already carry the majors. Report what you find; do not build the sweep on top of one.
2. **Branch** — `chore/deps-YYYY-MM-DD` off current `origin/main`.
3. **Green baseline first** — run the gates _and_ `bun run bundle:report` **before** changing anything, saving the bundle numbers to the scratchpad. A later failure is then attributable to the sweep rather than pre-existing, and you have something to diff the bundle against.
4. **Record `bun outdated`** per tree into the scratchpad. This table becomes the PR body.
5. **Sweep** — `bun update` in each tree. Never `bun update --latest`.
6. **Verify the lockfile ranges actually synced** — `bun install --frozen-lockfile` must exit 0 in each tree. #386 bumped `package.json` but left stale range strings in `bun.lock`, needing the follow-up `5cdbc9e3`. This check is what catches it.
7. **Read release notes for multi-minor jumps** — an in-range minor can still break. Prioritise `better-auth` (auth is the highest-risk surface; 1.6.23 → 1.7.4 is 1 minor but many releases), `drizzle-orm`, `daisyui`/`tailwindcss` (visual), `wrangler` (deploy config).
8. **Verify** — `bun run lint:fix`, `stylelint:fix`, `format:fix`, `typecheck`; `grep -r "bun:" src/ --exclude-dir=node_modules`; `bun run build`, `docs:build`, `landing:build`; `bun test`.
9. **Check the bundle budget** — `bun run bundle:report`, compare against the pre-sweep baseline. Budget is 250 kB gzipped client JS (`rules/principles.md`); `rules/workflow.md` requires this after _every_ dependency change. A client-side bump (`chart.js`, `motion`, `daisyui`, `nanostores`) can blow it silently.
10. **Classify every source diff** — see below.
11. **Open the PR.**

E2E runs in CI (`e2e-tests.yml`); do not run it locally for a sweep.

## Every `src/` Diff Must Be Explained

A `chore(deps)` PR that silently edits application code is unreviewable. #386 touched 8 source files — all of it Prettier 3.9 reformatting.

- ✅ **Classify each changed source file as formatter-reformat or real code change** — say which in the PR body
- ✅ **Re-run `bun run format` on `main` to prove a diff is just reformatting** — don't assert it
- ❌ **Let an unexplained code change ride along in a deps PR** — split it into its own PR

## Deferred Majors

**Every row where `Latest` ≠ `Update` is deferred.** Derive the list from the `bun outdated` you just ran — do not copy a list from this file or from a previous PR, because it goes stale between windows.

As of writing this covered `astro` 7, `typescript` 7, `stylelint` (+ its two configs), `eslint` 10, `lucide`/`@lucide/astro` 1, `nanoid` 6, `motion` 13, `husky` 9, `lint-staged` 17, `prettier-plugin-astro` 1, `rollup-plugin-visualizer` 7, `@astrojs/node` 11, `@astrojs/cloudflare` 14, `@astrojs/starlight` 0.42 — treat that as illustrative, not as the current answer.

Note: the local `chore/maintenance-astro-7-upgrade` branch already prototypes many of these. Point the tracking issue at it rather than opening a duplicate.

- ✅ **List deferred majors with a reason in the PR body**
- ✅ **Track them in a GitHub issue** — `gh issue create`, never Linear (see `rules/workflow.md`)
- ❌ **Pull "just one easy major" into the sweep** — that is a different PR with different testing

## PR Format

Title: `chore(deps): update dependencies within semver range`

Body uses `.github/pull_request_template.md` with `chore` ticked, plus:

- **Bumped** — per tree, `name old → new`, copied from `bun outdated`
- **Deferred** — majors held back, with reasons
- **Source diffs** — each one classified
- **Verification** — which gates ran and their results, plus bundle before/after; note E2E runs in CI

## Rationalizations

Every excuse below was produced by an agent doing this task without this skill.

| Excuse                                          | Reality                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| "It's only a patch, the pin won't mind"         | The pin is the decision. A patch that defeats it is still defeating it.                                                |
| "Majors, but dev-tooling only, so it's safe"    | `husky` 9 rewrites hook invocation; `stylelint` 17 changes autofix output. Dev-tooling majors edit your source. Defer. |
| "I'll bump one major per commit inside this PR" | Then it is no longer a routine sweep and can't be reviewed as one. Separate PR.                                        |
| "There's surely a 6.4.8 patch out"              | `Update` == `Current` means no in-range release exists. Read the column.                                               |
| "Root `bun update` covers the repo"             | Four lockfiles. `apps/mcp` is 5 minors behind because of this exact assumption.                                        |
| "It's in-range, so it can't break"              | `better-auth` moved 1.6.23 → 1.7.4 inside one caret. Auth is the highest-risk surface here.                            |
| "The maintainer is in a hurry"                  | `bun update` is the fast part. The frozen-lockfile check and the builds are what make the PR trustworthy.              |

## Red Flags — Stop

- About to write a version number not in tool output
- About to hand-edit a pinned `astro`/`@astrojs/*` version
- Listed only three package trees
- `bun install --frozen-lockfile` fails after the sweep
- A `src/` diff you cannot classify
- Reaching for `bun update --latest`
- Pulling "one easy major" in because it looked harmless
- Client JS over 250 kB gzipped after the sweep
