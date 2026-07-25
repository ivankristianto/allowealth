# Astro 7 Maintenance Upgrade — Design

**Date:** 2026-07-25
**Branch:** `chore/maintenance-astro-7-upgrade`
**Status:** Approved

## Goal

Upgrade Astro from 6.4.4 to 7.1.3 and bring every other dependency to its
latest compatible version, across all four manifests: root, `apps/docs`,
`apps/site`, `apps/mcp`.

## Delivery Decisions

Three choices were made explicitly and constrain everything below.

**Single pull request.** All upgrades land on one branch. Commits stay
granular so `git bisect` remains usable if the build breaks. This is the
higher-variance option: a whitespace regression and a Rolldown chunking
failure will surface in the same diff.

**TypeScript stays on `^5.9.3`.** TypeScript 7.0.2 is unusable.
`@astrojs/check@0.9.9` declares `typescript: ^5.0.0 || ^6.0.0` and
`@typescript-eslint/eslint-plugin@8.65.0` declares
`typescript: >=4.8.4 <6.1.0`. Because `bun run typecheck` runs `astro check`,
adopting TypeScript 7 would break a blocking quality gate. TypeScript 6.0.3
would satisfy both peers but was declined to keep the diff focused.

**`compressHTML` adopts the new `'jsx'` default.** Astro 7 changes the
default from `true` to `'jsx'`, stripping whitespace between inline elements
by JSX rules rather than HTML-aware rules. No `compressHTML` key is added to
`astro.config.ts`. This requires a whitespace audit across 276 `.astro`
files, specified below.

## What Astro 7 Changes

Astro 7 replaces three foundational pieces:

- **Vite 8**, which is Rolldown-based (`rolldown ~1.1.5`)
- **`@astrojs/compiler-rs`**, the Rust compiler, now the only compiler
- **`@astrojs/markdown-satteri`**, the native Markdown pipeline, replacing
  remark/rehype as the default

The codebase is already clean on most of the v7 migration checklist. There is
no `src/fetch.ts` to rename, no removed `astro:transitions` internals
(`TRANSITION_*`, `createAnimationScope`, `isTransitionBefore*`), no
`getContainerRenderer` import, no remark/rehype plugin configuration, no
`@astrojs/db`, and no experimental flags in `astro.config.ts`.

### Risks Requiring Work

1. **Rust compiler strictness.** Unclosed non-void tags are now hard errors,
   and semantically invalid markup is no longer auto-corrected. 276 `.astro`
   files are in scope. Surfaced by running the build.
2. **`compressHTML: 'jsx'`.** Changes rendered output wherever inline
   elements are separated only by a newline. See the audit plan.
3. **Rolldown chunking.** The `manualChunks` function in `astro.config.ts`
   splitting `chart.js` and `motion` into separate chunks is a Rollup API.
   Rolldown expects `advancedChunks`.
4. **`rollup-plugin-visualizer` must reach 7.0.1.** Version 6 peers `rollup`
   only; version 7 adds a `rolldown` peer.
5. **Starlight.** `@astrojs/starlight@0.41.4` peers `astro ^7.0.2` and
   `@astrojs/markdown-remark ^7.2.0`, which must become an explicit
   dependency of `apps/docs`.
6. **CSP.** `security: { csp: true }` interacts with the nonce-based header
   written by `src/middleware/security-headers.ts`. No v7 CSP break is
   documented, but the header must be verified after upgrading.

## Version Targets

### Major Upgrades

| Package | From | To |
| --- | --- | --- |
| `astro` (root, docs, site) | 6.4.4 / 6.0.8 | 7.1.3 |
| `@astrojs/cloudflare` | 13.6.1 | 14.1.4 |
| `@astrojs/node` | 10.1.3 | 11.0.2 |
| `@astrojs/starlight` | 0.38.2 | 0.41.4 |
| `@lucide/astro` | 0.562.0 | 1.26.0 |
| `eslint` | 9.39.5 | 10.8.0 |
| `eslint-plugin-astro` | 1.7.0 | 3.0.1 |
| `stylelint` | 16.26.1 | 17.14.1 |
| `stylelint-config-standard` | 39.0.1 | 40.0.0 |
| `husky` | 8.0.3 | 9.1.7 |
| `lint-staged` | 16.4.0 | 17.2.0 |
| `nanoid` | 5.1.16 | 6.0.0 |
| `rollup-plugin-visualizer` | 6.0.11 | 7.0.1 |

### New Dependencies

| Package | Version | Reason |
| --- | --- | --- |
| `@astrojs/markdown-remark` | `^7.2.1` | Required peer of Starlight 0.41 (`apps/docs`) |
| `eslint-plugin-jsx-a11y` | `^6.10.2` | Required peer of `eslint-plugin-astro@3` |
| `jiti` | `^2.7.0` | Peer of `eslint@10`; versions below 2.2.0 are unsupported |
| `globals` | latest | Imported by `eslint.config.js` but currently only present transitively through eslint 9 |

### Removals

| Package | Reason |
| --- | --- |
| `@types/decimal.js` | Stub package. `decimal.js` ships its own type definitions. |
| `lucide` | Zero source imports. Verified by grep across all source file types with `node_modules` excluded. |

### In-Range Minors

Applied across all four manifests: `better-auth` and `@better-auth/passkey`
1.6.25, `daisyui` 5.7.0, `tailwindcss` and `@tailwindcss/vite` 4.3.3,
`@tailwindcss/typography` 0.5.20, `motion` 12.42.2, `wrangler` 4.114.0,
`prettier` 3.9.6, `@playwright/test` 1.62.0, `happy-dom` 20.11.1,
`nanostores` 1.4.1, `simple-icons` 16.27.0, `@typescript-eslint/*` 8.65.0,
`@astrojs/sitemap` 3.7.3, `@astrojs/check` 0.9.9, `@astrojs/ts-plugin`
1.10.10, `@modelcontextprotocol/sdk` 1.29.0, `valibot` 1.4.2.

Note that `apps/site` has `astro 5.16.15` installed against a `6.0.8`
manifest, so its `node_modules` is stale and needs a clean install.

## Config Migrations

**`astro.config.ts`.** Replace
`vite.build.rollupOptions.output.manualChunks` with Rolldown's
`advancedChunks`, preserving the `chartjs` and `motion` chunk split. Keep
`assetsInlineLimit: 0`, which exists so processed Astro scripts stay external
and CSP does not need per-request nonce injection. Add no `compressHTML` key.

**`eslint.config.js`.** Add `eslint-plugin-jsx-a11y` and declare `globals`
explicitly. Migrate to `eslint-plugin-astro@3`'s config export shape. Triage
the three rules newly enabled in `eslint:recommended`:
`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`.
ESLint 10 also reports `eslint-env` comments as errors.

**`stylelint.config.js`.** Drop `stylelint-config-recommended`, which is
redundant because `stylelint-config-standard` already extends it. Adjust for
the vendor-prefix handling change in the `*-list` and `*-no-vendor-prefix`
rules, which now match properties as written. Confirm that `--fix`
defaulting to `strict` rather than `lax` does not over-rewrite CSS.

**`.husky/pre-commit`.** Remove the `. "$(dirname "$0")/_/husky.sh"`
preamble, which husky 9 no longer uses. Change the `prepare` script from
`husky install` to `husky`.

**CI workflows.** Bump `node-version` from `'22.12.0'` to `'24.18.0'` in
four files across five occurrences: `quality-gates.yml` (two), plus
`deploy-cloudflare.yml`, `deploy-site.yml`, and `deploy-docs-site.yml`. The
current pin sits below the floor required by
`eslint-plugin-astro@3` (`^22.22.3 || ^24.16.0 || >=26.3.0`),
`lint-staged@17` (`>=22.22.1`), `nanoid@6` (`^22 || ^24 || >=26`), and
`rollup-plugin-visualizer@7` (`>=22`).

## Lucide 1.0

Lucide 1.0 removes all brand icons for trademark reasons. This project draws
brand marks from `simple-icons`, and all roughly 120 distinct icons imported
from `@lucide/astro` across 168 import sites are non-brand, so no icon
replacement is expected. Renames are still possible and will surface as build
errors.

Icons now default to `aria-hidden="true"`. This warrants an audit of
icon-only buttons to confirm each still exposes an accessible name through a
label or tooltip.

## Whitespace Audit

Reading 276 files is not a reliable way to catch lost spaces, so the audit is
evidence-driven.

1. **Before changing any dependency**, build and preview on Astro 6 and
   snapshot the rendered HTML for a fixed route list, written to a
   version-controlled scratch location. The list is every route reachable
   from the authenticated navigation plus every public route: at minimum
   `/`, the auth pages, `/dashboard`, `/transactions`, `/budget`,
   `/accounts`, `/reports`, `/forecast`, `/calculators`, and `/settings`.
   Authenticate through the existing E2E session helper. Enumerate the final
   list from `src/pages/` so nothing is missed.
2. **After the upgrade**, capture the same snapshots.
3. **Diff them.** Review every whitespace delta individually. Where a space
   was intentional, insert `{' '}`.
4. **Narrow the reading** with a static scan for the high-risk shape: a
   closing inline tag, a newline, then an opening inline tag.

The before and after snapshots go into the pull request as evidence.

## Verification Gates

Run in order. Each must pass before the next.

1. `bun install` in all four manifest directories
2. `bun run build` — resolve Rust compiler HTML errors here
3. `bun run build:cloudflare`
4. `bun run typecheck`
5. `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`
6. `bun run test`
7. `bun run docs:build` and `bun run landing:build`
8. `bun run test:e2e`
9. HTML whitespace diff review
10. Chrome verification of dashboard, transactions, budget, accounts, and
    reports on desktop and mobile
11. `bun run bundle:report` against the 250 kB gzipped client JS budget
12. CSP header verification against the nonce middleware

Per project rules, confirm no `bun:` imports reached middleware-imported
code: `grep -r "bun:" src/ --exclude-dir=node_modules`.

## Documentation Updates

- `.claude/CLAUDE.md` — the `Current baseline: Astro 6` line and the
  `Astro 6 Note` section
- `AGENTS.md` — the baseline line
- `docs/prd.md` — tech stack versions
- `README.md` — wherever versions are named

## Out of Scope

- TypeScript 6 or 7. Revisit once `@astrojs/check` supports TypeScript 7.
- Adopting the Sätteri Markdown pipeline deliberately. Starlight brings
  `@astrojs/markdown-remark` and keeps the remark/rehype path for docs
  content; no migration away from it is attempted here.
- Any refactoring not required by a dependency upgrade.
