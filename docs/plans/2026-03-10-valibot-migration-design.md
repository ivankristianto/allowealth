# Valibot Migration — Design Document

**Issue:** #307  
**Branch:** `migrate-to-valibot`

---

## Problem

The codebase currently uses Zod for validation across shared schema modules, API routes, service-layer boundaries, and MCP tool definitions. Issue #307 proposes replacing Zod with Valibot to reduce bundle size and validation overhead while preserving validation behavior and TypeScript inference.

This is not a partial migration. The target state is complete removal of Zod from runtime code and dependencies. No compatibility layer and no backward-compatibility phase should remain after implementation.

---

## Scope

**In scope:**
- Replace all runtime `zod` imports with Valibot equivalents in the main application and `mcp-server`
- Rewrite shared validation modules in `src/lib/validation/`
- Rewrite shared enum schemas in `src/lib/enums.ts`
- Rewrite metadata validation in `src/lib/constants/user-meta-keys.ts`
- Rewrite request-body schemas in API routes under `src/pages/api/`
- Rewrite service-layer validation in `src/services/workspace.service.ts`, `src/services/user.service.ts`, and `src/services/workspace-invitation.service.ts`
- Rewrite MCP tool schemas under `mcp-server/src/tools/`
- Replace `z.infer<>` and `z.input<>` patterns with Valibot-native type inference
- Normalize API validation error payloads in one repo-owned format
- Remove `zod` from dependencies once migration is complete
- Verify bundle-size improvement after the cutover

**Out of scope:**
- Changing validation accept/reject behavior
- Preserving Zod-specific API error payload formats
- Introducing new validation features
- Keeping any Zod compatibility wrapper or fallback path

---

## Approaches Considered

### 1. Direct native Valibot rewrite

Replace each schema with native Valibot composition and update typing and parsing code to match Valibot patterns.

**Pros:**
- Reaches the desired end state in one pass
- Avoids preserving Zod-specific design decisions
- Produces cleaner long-term validation code

**Cons:**
- Requires careful review of schema semantics during rewrite
- Touches many files across the repo

### 2. Mechanical port with minimal restructuring

Translate each schema as literally as possible and keep the current Zod-shaped structure even when Valibot prefers a different composition style.

**Pros:**
- Lower short-term design effort
- Easier to compare old and new files line by line

**Cons:**
- Leaves awkward Valibot usage behind
- Fights the new library instead of adopting it cleanly

### 3. Compatibility layer, then cleanup

Add wrappers to imitate Zod APIs, migrate callers, and simplify later.

**Pros:**
- Can reduce migration risk when backward compatibility matters

**Cons:**
- Adds temporary architecture that must later be removed
- Wrong fit for a full cutover with no compatibility requirement

### Recommendation

Use approach 1: direct native Valibot rewrite.

The issue explicitly allows API error payload changes, and you confirmed the target is full Zod removal with no migration layer. That makes a native rewrite the cleanest and most durable design.

---

## Architecture

Validation ownership should stay where it already makes sense.

- Shared domain validation remains in `src/lib/validation/*`
- Shared enum schemas remain in `src/lib/enums.ts`
- Metadata key and value validation remains in `src/lib/constants/user-meta-keys.ts`
- Route-specific request coercion stays close to API handlers
- Service-layer validation remains separate from API-layer coercion
- MCP tool input schemas remain local to each tool module

The main architectural change is at the API boundary.

`src/lib/api-utils.ts` becomes the single place that:
- parses request JSON
- validates request bodies with Valibot
- converts validation failures into a repo-owned issue shape
- preserves existing invalid-JSON and parse-failure handling behavior

No validator-agnostic abstraction layer is needed. The migration is bounded, and adding another abstraction would increase complexity without improving the final state.

---

## Data Flow

### API routes

1. A route defines a Valibot schema.
2. The route calls `validateBody(request, schema)` from `src/lib/api-utils.ts`.
3. `validateBody` parses JSON and validates it with Valibot.
4. On success, the route receives typed output data.
5. On failure, `validateBody` returns a normalized repo-owned validation issue array.
6. The route returns `errorResponse('Validation failed', 400, 'VALIDATION_ERROR', issues)`.

### Service layer

Service methods continue validating their own inputs at service boundaries before mutating data or performing sensitive operations. The migration does not collapse API and service validation into one schema layer because those boundaries currently serve different purposes.

### MCP server

Each MCP tool module continues owning its own input schema, but the schema implementation moves from Zod to Valibot so the tool definitions no longer depend on Zod.

---

## Types And Inference

Type inference must remain semantically equivalent after migration.

- Replace `z.infer<typeof schema>` with the Valibot output type helper
- Replace `z.input<typeof schema>` with the Valibot input type helper only where input and output differ
- Keep the current distinction between API schemas and service schemas when coercion or transformation changes the output type

This matters most in modules like:
- `src/lib/validation/recurring.ts`
- `src/lib/validation/transactions.ts`
- API route schemas that coerce strings into numbers, booleans, or dates

The rule is simple: preserve the caller-facing TypeScript types even if the schema implementation must be restructured to fit Valibot best practices.

---

## Schema Rewrite Guidelines

This migration should not try to mimic Zod line for line.

Where Valibot encourages a clearer or more idiomatic structure, the schema should be rewritten accordingly as long as validation semantics and inferred types stay the same. That applies in particular to:
- reusable field validators
- coercion and preprocessing
- object strictness
- cross-field validation
- schema composition for shared enums and helper validators

Examples in the current codebase that likely need careful rewriting rather than literal translation:
- transfer/category cross-field checks in `src/lib/validation/transactions.ts`
- recurring-template cross-field validation in `src/lib/validation/recurring.ts`
- enum-based metadata validation in `src/lib/constants/user-meta-keys.ts`
- route-local schemas that mix coercion with defaults in `src/pages/api/`

---

## Error Handling

API validation payloads should stop exposing library-native issue objects.

Instead, `src/lib/api-utils.ts` should normalize all validation failures into a stable repo-owned issue shape:

```ts
type ApiValidationIssue = {
  path: string[];
  message: string;
  code: string;
};
```

This normalized shape becomes the API contract for request validation failures.

Benefits:
- decouples API responses from Valibot internals
- keeps route handlers simple
- makes future validator changes cheaper
- allows the migration to rewrite payload format once, centrally

Non-validation failures should keep their current behavior. Invalid JSON and request-body parse failures should still produce deterministic validation-like errors from `validateBody`.

---

## Testing And Verification

This is a semantics-preserving refactor, so verification should focus on boundary parity.

### Primary assertions

- inputs that previously passed still pass
- inputs that previously failed still fail
- TypeScript input and output types remain equivalent at call sites
- API routes return the normalized validation issue shape
- invalid JSON handling remains deterministic
- MCP tool schemas still validate the same inputs

### Coverage priorities

- `src/lib/validation/*.ts`
- `src/lib/api-utils.ts` and `src/lib/api-utils.test.ts`
- API route tests that assert validation behavior
- service tests that rely on input validation
- `mcp-server/src/tools/*.test.ts`

### Build verification

After migration, run a production build and record bundle-size results to confirm that removing Zod produces a measurable reduction.

---

## Cutover Plan

The migration should land as a full cutover, not a staged hybrid.

1. Add Valibot to the relevant package(s).
2. Rewrite shared schema modules and shared enums.
3. Rewrite service-layer validation.
4. Rewrite API route schemas and `src/lib/api-utils.ts`.
5. Rewrite MCP tool schemas.
6. Update tests and route assertions for the normalized API issue shape.
7. Remove all remaining `zod` imports and dependency declarations.
8. Run quality gates, relevant tests, and build verification.
9. Confirm bundle-size improvement and no remaining Zod usage.

At the end of implementation, the repo should have zero runtime Zod usage.
