# Astro 6 Upgrade Design

**Ticket:** ALL-62
**Date:** 2026-03-21
**Status:** Approved

## Summary

Upgrade all three Astro projects in the monorepo from Astro 5.16.15 to Astro 6.0.8 in a single wave. Enable Astro 6's built-in CSP hashing. Remove the existing Astro 5 patch and re-apply only if the same Workers bug surfaces.

## Scope

### In scope

- Bump `astro` and all Astro-ecosystem packages to Astro 6-compatible versions
- Remove the `patches/astro@5.16.15.patch` patch (re-patch if Cloudflare Workers build requires it)
- Enable `security: { csp: true }` in `astro.config.ts`
- Add TODO comments at existing custom nonce code to clean up later
- Fix any typecheck, build, or lint errors that surface after the bump
- Upgrade applies to: main SSR app (root), `apps/docs` (Starlight), `apps/site` (landing)

### Out of scope

- Live Content Collections (`defineLiveCollection`) — no applicable content in the app today
- Removing existing custom nonce middleware (deferred, TODO-marked)
- Changing deployment infrastructure
- E2E tests (unless a runtime regression surfaces)

## Package Versions

| Package | Location | From | To |
|---|---|---|---|
| `astro` | root + apps/docs + apps/site | `5.16.15` | `6.0.8` |
| `@astrojs/cloudflare` | root devDependencies | `^12.6.12` | `^13.1.3` |
| `@astrojs/node` | root dependencies | `9.5.2` | `^10.0.3` |
| `@astrojs/check` | root + apps devDependencies | `^0.9.6` | `^0.9.8` |
| `@astrojs/ts-plugin` | root + apps devDependencies | `^1.10.6` | `^1.10.7` |
| `eslint-plugin-astro` | root devDependencies | `^1.5.0` | `^1.6.0` |
| `@astrojs/starlight` | apps/docs | `^0.32.0` | `^0.38.2` |
| `prettier-plugin-astro` | root devDependencies | `^0.14.1` | unchanged |

## Astro 6 Breaking Changes

Astro 6 requires:
- **Node.js 22+** — not a concern; dev runs on Bun and prod runs on Cloudflare Workers
- **Vite 7** — bundled with Astro, automatically satisfied by the version bump
- **Zod 4** — import path changes from `astro:content`; not applicable (main app uses Valibot, no content collections)
- **Shiki 4** — code highlighting library update; not used in main app

## Existing Patch

`patches/astro@5.16.15.patch` patches `dist/container/index.js` to guard against `import.meta.url` throwing in the Cloudflare Workers runtime. This patch is removed as part of the upgrade.

If the Cloudflare Workers build (`bun run build:cloudflare`) fails with the same error, a new patch targeting `astro@6.0.8` is created.

## CSP Integration

Astro 6 introduces `security: { csp: true }` which automatically hashes all page scripts and styles and generates appropriate headers — no per-request nonce injection required.

**Plan:**
1. Add `security: { csp: true }` to `astro.config.ts`
2. Leave existing custom nonce middleware and `public/_headers` CSP entries in place
3. Add `// TODO(ALL-62): evaluate removing custom nonce middleware once Astro 6 CSP is validated` at relevant locations

**Why not remove custom code now:** The existing nonce implementation is tested and working. Astro 6's CSP hashing is a different model (hash-based vs. nonce-based). Both can coexist; validation and cleanup is a follow-up task.

## Execution Order

1. **Bump deps** — update versions in `package.json` (root), `apps/docs/package.json`, `apps/site/package.json`; remove `patchedDependencies` entry; delete `patches/astro@5.16.15.patch`; run `bun install`
2. **Add CSP config** — add `security: { csp: true }` to `astro.config.ts`; add TODO comments in middleware/headers files
3. **Fix typecheck** — `bun run typecheck`, `bun run docs:check`, `bun run landing:check`
4. **Fix build** — `bun run build` (node), then `bun run build:cloudflare`; re-patch if Workers build fails
5. **Fix lint** — `bun run lint:fix`, `bun run format:fix`, `bun run stylelint:fix`
6. **Run unit tests** — `bun run test`
7. **Commit** — single commit with all changes

## What Live Content Collections Are (for reference)

Astro 6 introduces `defineLiveCollection()` / `getLiveEntry()` for fetching content at request time without a rebuild. Not applicable to this app today — the main app is fully SSR with database-backed data, and the docs app uses Starlight which manages its own collections. Revisit if CMS-backed content is added to docs or landing.
