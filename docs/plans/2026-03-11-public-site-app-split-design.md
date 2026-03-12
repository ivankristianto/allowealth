# Public Site and App Split Design

**Date:** March 11, 2026  
**Status:** Approved

## Context

The repository currently serves marketing pages (`/`, `/terms`, `/privacy`) and app routes from one Astro app, with runtime behavior controlled by `APP_MODE` (`full` vs `app_only`).

The target model is:

- `allowealth.io` = static public site only
- `demo.allowealth.io` = app worker (public playground)
- `vv.allowealth.io` = app worker (private use)
- each app deployment uses a separate database (hard rule)
- no backward-compatibility redirects from the public site to app routes

## Goals

- Separate public site and app deployments with clear operational boundaries.
- Keep everything in one repository.
- Preserve current app code at repository root to minimize migration risk.
- Prepare structure for future per-customer isolated deployments.

## Non-Goals

- No domain-level redirect compatibility behavior for old app URLs on `allowealth.io`.
- No automation for provisioning `demo` and `vv` environments; this remains manual.
- No immediate per-customer provisioning service in this phase.

## Architecture

Use a hybrid monorepo with three deployable surfaces:

- `./` (root): existing Astro app, deployed to Cloudflare Workers
- `apps/site`: new static marketing site, deployed to Cloudflare Pages
- `apps/docs`: docs site (migrated from `docs/sites`), deployed to Cloudflare Pages

### Domain Mapping

- `allowealth.io` -> `apps/site` (Pages)
- `docs.allowealth.io` -> `apps/docs` (Pages)
- `demo.allowealth.io` -> root app worker
- `vv.allowealth.io` -> root app worker

### Data Isolation

Each app worker deployment binds to its own D1 database and environment variables. There is no shared database between `demo` and `vv`.

## Deployment and Configuration Model

### Root App (Workers)

- Continue using Worker-oriented config and CI generation flow.
- Keep `wrangler.toml.example` as a generic template and instruction source.
- Do not hardcode `demo`/`vv` production values in committed config.

### Site and Docs (Pages)

- Add committed Pages configuration files:
  - `apps/site/wrangler.toml`
  - `apps/docs/wrangler.toml`
- These contain project name and build output settings only (no secrets).

## Behavioral Contracts

- `allowealth.io` serves only public site routes (`/`, `/terms`, `/privacy`, optional `/blog/*` later).
- Non-site routes on `allowealth.io` return 404.
- App domains serve app routes only.
- Legal links shown in app UX should point to `https://allowealth.io/terms` and `https://allowealth.io/privacy`.

## Migration Strategy

1. Create `apps/site` static site.
2. Move `docs/sites` to `apps/docs`.
3. Keep root app in place and simplify it to app-only behavior.
4. Remove app-side runtime compatibility logic that existed only for mixed marketing+app mode.
5. Update scripts, workflows, and docs to reflect the new split.

## Error Handling and Operational Boundaries

- Public site and docs are static/Page-hosted and should not depend on app runtime bindings.
- App worker failures must not impact public-site/docs availability.
- Deployment pipelines should target each surface independently to reduce blast radius.

## Testing and Verification Strategy

- Build and typecheck all three surfaces:
  - root app
  - `apps/site`
  - `apps/docs`
- Validate route intent:
  - site domain returns 404 for app routes
  - app domains preserve existing auth and protected-route behavior
- Verify docs deploy workflow after path migration to `apps/docs`.

## Future Readiness

This structure keeps operational concerns separated now and aligns with future “one user/customer = isolated instance” hosting without requiring another repository split.
