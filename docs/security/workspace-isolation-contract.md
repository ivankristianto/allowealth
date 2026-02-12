# Workspace Isolation Contract

## Purpose

Prevent cross-workspace data leakage by making tenant boundaries explicit, testable, and enforceable at multiple layers.

## Invariants (MUST)

1. Every tenant-table query MUST be scoped by `workspace_id`.
2. If a query does not include `workspace_id`, it MUST derive from an already workspace-validated parent record and include an explicit comment documenting that invariant.
3. Global/auth/system queries MUST be explicitly allowlisted with reason and owner.
4. New DB query paths MUST fail CI unless they are either:

- workspace-scoped, or
- allowlisted with a stable allowlist ID.

5. Service methods exposed to API routes MUST accept tenant context (`workspaceId`, `userId`, `role`) or enforce equivalent scope internally.
6. Cross-workspace mutations MUST be impossible by schema constraints (where feasible) and denied by runtime checks.

## Enforcement Layers

1. Service layer: tenant context required, scope assertions at method boundaries.
2. API layer: authenticated workspace identity passed through to service calls.
3. Database layer (PostgreSQL): row-level security policies keyed by per-request tenant session variable.
4. Schema layer (both dialects): composite workspace-aware foreign keys for tenant tables where practical.
5. CI layer: static scope audit script blocks unsafe query additions.
6. Test layer: dual-workspace regression tests for reads, writes, and destructive actions.

## Allowlisted Global Query Domains

These are intentional non-tenant query domains and are allowed only with explicit query IDs in code:

1. `AUTH_TOKEN_LOOKUP`: session/token/email verification/password reset lookups.
   Reason: identity/security workflows are global by token or email.
   Owner: Auth subsystem maintainers.

2. `AUTH_API_KEY_VALIDATE_PREFIX`: API key prefix/hash candidate lookup for key validation.
   Reason: secure key verification path before tenant context is known.
   Owner: API key/auth subsystem maintainers.

3. `GLOBAL_EXCHANGE_RATES_READ`: exchange rate reference data.
   Reason: shared reference dataset, not tenant-owned user data.
   Owner: Currency subsystem maintainers.

4. `ADMIN_CLI_LIST_WORKSPACES`: administrative workspace enumeration.
   Reason: operational tooling intentionally spans all workspaces.
   Owner: CLI/operations maintainers.

5. `ADMIN_CLI_DELETE_WORKSPACE`: administrative workspace deletion flow.
   Reason: operational tooling intentionally targets specified workspace IDs directly.
   Owner: CLI/operations maintainers.

6. `SYSTEM_SEED_BACKFILL`: seed/backfill/migration scripts.
   Reason: controlled maintenance tasks that intentionally operate across datasets.
   Owner: Platform/data maintainers.

## Review Checklist

1. Does each query on tenant tables include `workspace_id` predicate?
2. If not, is it allowlisted with stable ID and clear reason?
3. Does API route pass authenticated workspace to service method?
4. Are tests covering cross-workspace denial paths?
5. Are schema/migration changes applied to both SQLite and PostgreSQL?

## Violation Response

1. Block merge.
2. Add regression test reproducing the scope violation.
3. Refactor to tenant-scoped query or explicit allowlist entry with owner approval.
4. Re-run scope audit and verification suite.
