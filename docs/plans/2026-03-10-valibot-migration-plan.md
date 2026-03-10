# Valibot Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Zod with Valibot across the application and MCP server, preserve validation accept/reject rules and inferred types, normalize API validation payloads, and remove Zod completely from runtime dependencies.

**Architecture:** Shared schema modules, service-layer validators, API route request schemas, and MCP tool schemas all move to native Valibot definitions. `src/lib/api-utils.ts` becomes the single API-validation boundary that parses request JSON with Valibot and returns a repo-owned normalized issue shape. The migration lands as a full cutover with no compatibility layer and no mixed-validator end state.

**Tech Stack:** Astro, TypeScript, Bun, Valibot, Drizzle ORM, MCP SDK, Bun test

---

### Task 1: Replace API-body parsing with Valibot and normalize validation errors

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/lib/api-utils.ts`
- Modify: `src/lib/api-utils.test.ts`

**Step 1: Write the failing test**

In `src/lib/api-utils.test.ts`, add coverage for `validateBody()` that asserts:
- invalid JSON returns a normalized issue with `path: []`
- schema validation failure returns `details` in the repo-owned shape `{ path: string[]; message: string; code: string }`
- valid input still returns parsed typed data

Use a representative Valibot schema in the test, for example:

```ts
const schema = object({
  name: string([minLength(1, 'Name is required')]),
});
```

**Step 2: Run the test to verify it fails**

Run:
```bash
bun test src/lib/api-utils.test.ts
```

Expected: FAIL because `validateBody()` still uses Zod and returns Zod-shaped issues.

**Step 3: Implement the minimal code**

- Add `valibot` to root dependencies in `package.json`, then refresh `bun.lock` with `bun install`
- Rewrite `src/lib/api-utils.ts` to:
  - import the Valibot parser and schema types
  - define a repo-owned `ApiValidationIssue` type
  - parse request bodies with Valibot
  - map Valibot issues into `{ path, message, code }`
  - preserve invalid-JSON handling and request-body parse failure handling
- Keep `validateBody()` and `isValidationError()` as the route-facing helpers so callers do not need structural rewrites beyond typing changes

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/lib/api-utils.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add package.json bun.lock src/lib/api-utils.ts src/lib/api-utils.test.ts
git commit -m "refactor: normalize api validation with valibot"
```

---

### Task 2: Migrate shared enums and user-meta validation to Valibot

**Files:**
- Modify: `src/lib/enums.ts`
- Modify: `src/lib/constants/user-meta-keys.ts`
- Modify: `src/__tests__/lib/user-meta-keys.test.ts`
- Create: `src/lib/enums.test.ts`

**Step 1: Write the failing tests**

- In `src/lib/enums.test.ts`, add pass/fail coverage for the shared enums now exported from `src/lib/enums.ts`
- In `src/__tests__/lib/user-meta-keys.test.ts`, add assertions that `validateMetaValue()` still accepts the current valid values and rejects invalid values for `THEME`, booleans, and `PENDING_EMAIL`
- Add a typecheck assertion by updating call sites or local aliases to ensure the exported enum-derived types remain unchanged

Example test cases:

```ts
expect(parse(currencyEnum, 'IDR')).toBe('IDR');
expect(() => parse(transactionTypeEnum, 'refund')).toThrow();
expect(validateMetaValue(USER_META_KEYS.THEME, 'monochrome')).toBe('monochrome');
expect(() => validateMetaValue(USER_META_KEYS.PENDING_EMAIL, 'not-an-email')).toThrow();
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
bun test src/lib/enums.test.ts src/__tests__/lib/user-meta-keys.test.ts
```

Expected: FAIL because the new tests refer to Valibot parsing and the modules still use Zod.

**Step 3: Implement the minimal code**

- Rewrite `src/lib/enums.ts` with Valibot enum/picklist schemas and Valibot output type helpers
- Rewrite `src/lib/constants/user-meta-keys.ts` so `META_VALUE_SCHEMAS`, `metaKeySchema`, and `validateMetaValue()` use Valibot
- Preserve exported names and runtime behavior where practical
- Keep comments accurate by replacing Zod-specific wording with validator-neutral or Valibot-specific wording

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/lib/enums.test.ts src/__tests__/lib/user-meta-keys.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/enums.ts src/lib/enums.test.ts src/lib/constants/user-meta-keys.ts src/__tests__/lib/user-meta-keys.test.ts
git commit -m "refactor: migrate shared enums and user meta validation to valibot"
```

---

### Task 3: Migrate account, category, and budget validation modules

**Files:**
- Modify: `src/lib/validation/account-categories.ts`
- Modify: `src/lib/validation/categories.ts`
- Modify: `src/lib/validation/budgets.ts`
- Modify: `src/lib/validation/index.ts`
- Create: `src/lib/validation/account-categories.test.ts`
- Create: `src/lib/validation/categories.test.ts`
- Create: `src/lib/validation/budgets.test.ts`

**Step 1: Write the failing tests**

Create focused tests for each module that cover:
- required string fields
- enum constraints
- optional and nullable behavior
- API coercion behavior where applicable
- defaults that must still be applied

Representative cases:

```ts
expect(parse(createAccountCategorySchema, { name: 'Cash' }).name).toBe('Cash');
expect(() => parse(createCategorySchema, { name: '', type: 'expense' })).toThrow();
expect(parse(copyBudgetsAPISchema, { sourceMonth: '1', targetMonth: '2', year: '2026' })).toEqual({
  sourceMonth: 1,
  targetMonth: 2,
  year: 2026,
});
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
bun test src/lib/validation/account-categories.test.ts src/lib/validation/categories.test.ts src/lib/validation/budgets.test.ts
```

Expected: FAIL because these modules still use Zod and the new tests are written against Valibot behavior and helpers.

**Step 3: Implement the minimal code**

- Rewrite the three validation modules with native Valibot schemas
- Replace `z.infer` and `z.input` usages with Valibot input/output helpers
- Preserve API-schema coercion and default behavior in the budget flows
- Update `src/lib/validation/index.ts` exports if type helper names or imports change

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/lib/validation/account-categories.test.ts src/lib/validation/categories.test.ts src/lib/validation/budgets.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/validation/account-categories.ts src/lib/validation/categories.ts src/lib/validation/budgets.ts src/lib/validation/index.ts src/lib/validation/account-categories.test.ts src/lib/validation/categories.test.ts src/lib/validation/budgets.test.ts
git commit -m "refactor: migrate account category and budget schemas to valibot"
```

---

### Task 4: Migrate transaction and recurring validation modules using Valibot-native patterns

**Files:**
- Modify: `src/lib/validation/transactions.ts`
- Modify: `src/lib/validation/recurring.ts`
- Modify: `src/lib/validation/recurring.test.ts`
- Create: `src/lib/validation/transactions.test.ts`

**Step 1: Write the failing tests**

- In `src/lib/validation/transactions.test.ts`, add tests for:
  - transfer requiring `to_account_id`
  - non-transfer records requiring `category_id`
  - date validation rules
  - filter coercion for `limit`, `offset`, and dates
- In `src/lib/validation/recurring.test.ts`, extend coverage for:
  - monthly frequency requiring `day_of_month`
  - installment validation requiring `total_occurrences`
  - `starting_occurrence_number <= total_occurrences`
  - API coercion and defaults

Representative transaction test:

```ts
expect(() => parse(createTransactionAPISchema, {
  type: 'transfer',
  amount: '100',
  currency: 'IDR',
  account_id: 'a1',
  transaction_date: '2026-03-10',
})).toThrow();
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
bun test src/lib/validation/transactions.test.ts src/lib/validation/recurring.test.ts
```

Expected: FAIL because the new Valibot-focused regression coverage is not satisfied yet.

**Step 3: Implement the minimal code**

- Rewrite `src/lib/validation/transactions.ts` with Valibot-native field composition, coercion, and object-level checks
- Rewrite `src/lib/validation/recurring.ts` the same way, keeping service-layer input types distinct from API-layer coercion output types
- Prefer clear object-level validation helpers instead of trying to mimic Zod chaining exactly
- Preserve runtime defaults and accept/reject semantics

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/lib/validation/transactions.test.ts src/lib/validation/recurring.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/validation/transactions.ts src/lib/validation/transactions.test.ts src/lib/validation/recurring.ts src/lib/validation/recurring.test.ts
git commit -m "refactor: migrate transaction and recurring schemas to valibot"
```

---

### Task 5: Migrate service-layer validation to Valibot

**Files:**
- Modify: `src/services/workspace.service.ts`
- Modify: `src/services/user.service.ts`
- Modify: `src/services/workspace-invitation.service.ts`
- Create: `src/services/workspace.service.validation.test.ts`
- Create: `src/services/user.service.validation.test.ts`
- Create: `src/services/workspace-invitation.service.validation.test.ts`

**Step 1: Write the failing tests**

Add focused service-boundary tests for the current validation semantics:
- workspace name must be present and <= 255 chars
- password update input must still enforce the existing password rules
- invitation creation input must still validate email, role, and required IDs

Representative test:

```ts
await expect(service.create({ name: '' })).rejects.toThrow('Workspace name is required');
await expect(service.updatePassword('user-1', { oldPassword: '', newPassword: 'abc' })).rejects.toThrow();
await expect(service.create({ workspaceId: '', email: 'bad', role: 'owner' as any })).rejects.toThrow();
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
bun test src/services/workspace.service.validation.test.ts src/services/user.service.validation.test.ts src/services/workspace-invitation.service.validation.test.ts
```

Expected: FAIL until the new test files and Valibot rewrites are in place.

**Step 3: Implement the minimal code**

- Rewrite service schemas with Valibot
- Update exported input types to Valibot helpers
- Keep existing service method signatures and error behavior intact where possible
- Update comments that still describe these as Zod schemas

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/services/workspace.service.validation.test.ts src/services/user.service.validation.test.ts src/services/workspace-invitation.service.validation.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/workspace.service.ts src/services/user.service.ts src/services/workspace-invitation.service.ts src/services/workspace.service.validation.test.ts src/services/user.service.validation.test.ts src/services/workspace-invitation.service.validation.test.ts
git commit -m "refactor: migrate service validation to valibot"
```

---

### Task 6: Migrate API route schemas and route validation assertions

**Files:**
- Modify: `src/pages/api/accounts/index.ts`
- Modify: `src/pages/api/accounts/[id].ts`
- Modify: `src/pages/api/accounts/[id]/balance.ts`
- Modify: `src/pages/api/accounts/[id]/transfer-owner.ts`
- Modify: `src/pages/api/accounts/transfer.ts`
- Modify: `src/pages/api/calculators/compound.ts`
- Modify: `src/pages/api/onboarding/budgets.ts`
- Modify: `src/pages/api/transactions/bulk.ts`
- Modify: `src/pages/api/user/api-keys.ts`
- Modify: `src/pages/api/user/profile.ts`
- Modify: `src/pages/api/user/theme.ts`
- Modify: `src/pages/api/workspace/invitations.ts`
- Modify: `src/pages/api/workspace/settings.ts`
- Modify: `src/__tests__/api/onboarding-budgets.test.ts`
- Modify: `src/__tests__/api/user/profile-email-change.test.ts`
- Modify: `src/__tests__/api/user/theme.test.ts`
- Modify: `src/__tests__/api/workspace-settings-forecast.test.ts`
- Create: `src/__tests__/api/accounts.validation.test.ts`
- Create: `src/__tests__/api/transactions-bulk.validation.test.ts`
- Create: `src/__tests__/api/workspace-invitations.validation.test.ts`
- Create: `src/__tests__/api/calculator-compound.validation.test.ts`

**Step 1: Write the failing tests**

Add or update API tests to assert:
- the route still rejects the same invalid inputs
- successful requests still accept the same valid inputs
- validation failures now return the normalized issue shape in `error.details`

Representative assertion:

```ts
expect(json.error.code).toBe('VALIDATION_ERROR');
expect(json.error.details).toEqual([
  expect.objectContaining({
    path: ['theme'],
    message: expect.any(String),
    code: expect.any(String),
  }),
]);
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
bun test src/__tests__/api/onboarding-budgets.test.ts src/__tests__/api/user/theme.test.ts src/__tests__/api/workspace-settings-forecast.test.ts src/__tests__/api/accounts.validation.test.ts src/__tests__/api/transactions-bulk.validation.test.ts src/__tests__/api/workspace-invitations.validation.test.ts src/__tests__/api/calculator-compound.validation.test.ts
```

Expected: FAIL because these routes still import Zod and still expose Zod-shaped validation payloads.

**Step 3: Implement the minimal code**

- Rewrite all route-local schemas with Valibot
- Keep route behavior and service interactions unchanged
- Remove direct `zod` imports from all route files
- Update tests to assert the normalized API issue contract instead of validator-native issues

**Step 4: Run tests and typecheck**

Run:
```bash
bun test src/__tests__/api/onboarding-budgets.test.ts src/__tests__/api/user/profile-email-change.test.ts src/__tests__/api/user/theme.test.ts src/__tests__/api/workspace-settings-forecast.test.ts src/__tests__/api/accounts.validation.test.ts src/__tests__/api/transactions-bulk.validation.test.ts src/__tests__/api/workspace-invitations.validation.test.ts src/__tests__/api/calculator-compound.validation.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/api/accounts/index.ts src/pages/api/accounts/[id].ts src/pages/api/accounts/[id]/balance.ts src/pages/api/accounts/[id]/transfer-owner.ts src/pages/api/accounts/transfer.ts src/pages/api/calculators/compound.ts src/pages/api/onboarding/budgets.ts src/pages/api/transactions/bulk.ts src/pages/api/user/api-keys.ts src/pages/api/user/profile.ts src/pages/api/user/theme.ts src/pages/api/workspace/invitations.ts src/pages/api/workspace/settings.ts src/__tests__/api/onboarding-budgets.test.ts src/__tests__/api/user/profile-email-change.test.ts src/__tests__/api/user/theme.test.ts src/__tests__/api/workspace-settings-forecast.test.ts src/__tests__/api/accounts.validation.test.ts src/__tests__/api/transactions-bulk.validation.test.ts src/__tests__/api/workspace-invitations.validation.test.ts src/__tests__/api/calculator-compound.validation.test.ts
git commit -m "refactor: migrate api route validation to valibot"
```

---

### Task 7: Migrate MCP tool schemas and make dependencies explicit in `mcp-server`

**Files:**
- Modify: `mcp-server/package.json`
- Modify: `mcp-server/bun.lock`
- Modify: `mcp-server/src/tools/accounts.ts`
- Modify: `mcp-server/src/tools/budget.ts`
- Modify: `mcp-server/src/tools/dashboard.ts`
- Modify: `mcp-server/src/tools/transactions.ts`
- Modify: `mcp-server/src/tools/accounts.test.ts`
- Modify: `mcp-server/src/tools/transactions.test.ts`

**Step 1: Write the failing tests**

Update MCP tool tests to assert the same valid/invalid arguments still behave correctly after migration.

Representative assertions:

```ts
expect(() => parse(listCategoriesSchema, { type: 'expense' })).not.toThrow();
expect(() => parse(addTransactionSchema, { amount: -1 })).toThrow();
expect(() => parse(listTransactionsSchema, { start_date: '2026-03-10', end_date: '2026-03-01' })).toThrow();
```

**Step 2: Run the tests to verify they fail**

Run:
```bash
cd mcp-server && bun test src/tools/accounts.test.ts src/tools/transactions.test.ts
```

Expected: FAIL because the tests now assume Valibot parsing and the MCP package does not yet declare Valibot.

**Step 3: Implement the minimal code**

- Add `valibot` to `mcp-server/package.json`, then refresh `mcp-server/bun.lock` with `cd mcp-server && bun install`
- Rewrite the four MCP tool schema modules with Valibot
- Keep the MCP tool JSON schemas and tool handler behavior unchanged
- Remove all remaining Zod imports from `mcp-server/src/tools/`

**Step 4: Run tests and typecheck**

Run:
```bash
cd mcp-server && bun test src/tools/accounts.test.ts src/tools/transactions.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add mcp-server/package.json mcp-server/bun.lock mcp-server/src/tools/accounts.ts mcp-server/src/tools/budget.ts mcp-server/src/tools/dashboard.ts mcp-server/src/tools/transactions.ts mcp-server/src/tools/accounts.test.ts mcp-server/src/tools/transactions.test.ts
git commit -m "refactor: migrate mcp tool validation to valibot"
```

---

### Task 8: Remove Zod completely and verify the cutover

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `mcp-server/package.json`
- Modify: `mcp-server/bun.lock`
- Modify: `src/lib/constants/currency.ts`
- Modify: `design-system/03-forms.md`
- Modify: any remaining runtime files or active docs/comments that mention Zod inaccurately

**Step 1: Write the failing check**

Run the repo-wide search and record the current failures:

```bash
rg -n "from 'zod'|from \"zod\"|\bz\.infer\b|\bz\.input\b|\bZod\b|\bzod\b" src mcp-server package.json mcp-server/package.json design-system
```

Expected: MATCHES remain until cleanup is complete.

**Step 2: Implement the cleanup**

- Remove `zod` from `package.json`
- Remove any stale `zod` declarations or comments from `mcp-server/package.json`, active code comments, and active docs
- Keep historical design docs untouched unless they break linting or mislead current implementation work

**Step 3: Run full verification**

Run:
```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
bun test src/lib/api-utils.test.ts src/lib/enums.test.ts src/lib/validation/account-categories.test.ts src/lib/validation/categories.test.ts src/lib/validation/budgets.test.ts src/lib/validation/transactions.test.ts src/lib/validation/recurring.test.ts src/services/workspace.service.validation.test.ts src/services/user.service.validation.test.ts src/services/workspace-invitation.service.validation.test.ts src/__tests__/api/onboarding-budgets.test.ts src/__tests__/api/user/profile-email-change.test.ts src/__tests__/api/user/theme.test.ts src/__tests__/api/workspace-settings-forecast.test.ts src/__tests__/api/accounts.validation.test.ts src/__tests__/api/transactions-bulk.validation.test.ts src/__tests__/api/workspace-invitations.validation.test.ts src/__tests__/api/calculator-compound.validation.test.ts
cd mcp-server && bun test src/tools/accounts.test.ts src/tools/transactions.test.ts && cd ..
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
bun run bundle:report
rg -n "from 'zod'|from \"zod\"|\bz\.infer\b|\bz\.input\b|\bZod\b|\bzod\b" src mcp-server package.json mcp-server/package.json design-system
```

Expected:
- all tests pass
- lint/stylelint/format/typecheck/build pass
- bundle report shows a measurable reduction versus the pre-migration baseline
- final `rg` returns no remaining active Zod usage in the targeted paths

**Step 4: Commit**

```bash
git add package.json bun.lock mcp-server/package.json mcp-server/bun.lock src/lib/constants/currency.ts design-system/03-forms.md
git add src mcp-server
git commit -m "refactor: remove zod after valibot migration"
```
