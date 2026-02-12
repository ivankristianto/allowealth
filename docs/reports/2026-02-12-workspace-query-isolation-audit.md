# Workspace Query Isolation Audit Report

- Date: 2026-02-12
- Repository: `/Users/ivan/.config/superpowers/worktrees/expenses/workspace-isolation-hardening-plan`
- Branch: `codex/workspace-isolation-hardening-plan`
- Audit type: Static full-query crawl (`src/`, `mcp-server/`, `scripts/`, `src/db/`)

## Executive Verdict

- No direct, currently exploitable cross-workspace data leak was confirmed in authenticated workspace API paths.
- Workspace-scoped domain services (`transaction`, `budget`, `asset`, `category`, `dashboard`, `report`) consistently anchor queries to `workspace_id` or derive scope from already workspace-validated parents.
- Two latent leak vectors exist at service-contract level and must be hardened to prevent future regressions.

## Scope And Method

- Crawled all DB query callsites across runtime + maintenance codepaths.
- Combined explicit query entrypoints (`db.query.*`, `db.insert/update/delete/select`) and multiline chain operations (e.g. `.(this.db as any).select` chains).
- Final audited callsite inventory size: **246** query operation callsites.
- Generated evidence files:
  - `.audit/query_callsites_final.txt`
  - `.audit/operation_calls.txt`
  - `.audit/full_ops_delta_in_query_files.txt`

## Query Inventory By File

- `src/db/seed.ts`: 50 (`EXCLUSION_MAINTENANCE`)
- `src/services/asset.service.ts`: 25 (`SCOPED_DERIVED`)
- `src/services/budget.service.ts`: 24 (`SCOPED`)
- `src/services/auth.service.ts`: 22 (`EXCLUSION_AUTH_GLOBAL`)
- `src/services/transaction.service.ts`: 13 (`SCOPED`)
- `src/services/report.service.ts`: 12 (`SCOPED`)
- `src/services/asset-category.service.ts`: 11 (`SCOPED`)
- `src/services/workspace-invitation.service.ts`: 10 (`MIXED_SCOPED_PLUS_RISK`)
- `src/services/email-verification.service.ts`: 10 (`EXCLUSION_AUTH_GLOBAL`)
- `src/services/user.service.ts`: 9 (`MIXED_ROUTE_GUARDED_RISK`)
- `src/services/workspace.service.ts`: 7 (`MIXED_WORKSPACE_GLOBAL_AND_SCOPED_MEMBERS`)
- `src/services/workspace-meta.service.ts`: 7 (`SCOPED`)
- `src/services/dashboard.service.ts`: 7 (`SCOPED`)
- `src/lib/auth/lucia.ts`: 7 (`EXCLUSION_AUTH_GLOBAL`)
- `src/services/user-meta.service.ts`: 6 (`EXCLUSION_USER_GLOBAL`)
- `src/services/category.service.ts`: 6 (`SCOPED`)
- `src/services/api-key.service.ts`: 6 (`MIXED_SCOPED_PLUS_AUTH_GLOBAL`)
- `src/services/password-reset.service.ts`: 5 (`EXCLUSION_AUTH_GLOBAL`)
- `scripts/backfill-email-verification.ts`: 4 (`EXCLUSION_MAINTENANCE`)
- `src/pages/api/auth/resend-verification.ts`: 1 (`EXCLUSION_AUTH_GLOBAL`)
- `src/lib/currency/conversion.ts`: 1 (`EXCLUSION_GLOBAL_REFERENCE_DATA`)
- `src/lib/audit-log.ts`: 1 (`SCOPED`)
- `src/db/empty.ts`: 1 (`EXCLUSION_MAINTENANCE`)
- `mcp-server/src/auth.ts`: 1 (`EXCLUSION_AUTH_GLOBAL`)

## Findings

### F-1: Workspace invitation service exposes unscoped mutation methods (latent high-risk)

- Severity: High (latent, currently route-guarded)
- Files:
  - `src/services/workspace-invitation.service.ts:152`
  - `src/services/workspace-invitation.service.ts:258`
  - `src/services/workspace-invitation.service.ts:295`
- Detail:
  - `findById(id)`, `cancel(id)`, and `resend(id)` operate by invitation ID only, without mandatory `workspaceId` predicate in service signatures.
  - Current API route adds pre-check (`src/pages/api/workspace/invitations.ts:137` and `src/pages/api/workspace/invitations.ts:139`), so current behavior is guarded.
  - Risk is future misuse: any new caller skipping the pre-check can mutate invitations across workspaces.
- Required hardening:
  - Change service signatures to require `workspaceId` and enforce `where: and(eq(id), eq(workspace_id,...))` internally.

### F-2: User service methods are ID-only for a workspace-scoped table (latent medium-risk)

- Severity: Medium (latent, currently route-guarded)
- Files:
  - `src/services/user.service.ts:81`
  - `src/services/user.service.ts:126`
  - `src/services/user.service.ts:212`
- Detail:
  - `getById`, `updateProfile`, `updatePassword`, `softDelete` scope only by `users.id`.
  - Current API callers pass authenticated user ID or pre-filter member list (`src/pages/api/workspace/members.ts:76` + `src/pages/api/workspace/members.ts:84`), so active exploit was not confirmed.
  - Risk is future direct usage with untrusted user IDs.
- Required hardening:
  - Add workspace-aware variants (`...InWorkspace(userId, workspaceId)`) and deprecate ID-only mutations for workspace endpoints.

### F-3: Derived-scope tables rely on application discipline instead of DB-enforced tenant keys

- Severity: Medium
- Files:
  - `src/db/schema/sqlite/asset-history.ts:6`
  - `src/db/schema/sqlite/asset-snapshot-items.ts:6`
- Detail:
  - `asset_history` and `asset_snapshot_items` do not carry `workspace_id`; scope is derived via parent asset/snapshot relation.
  - Runtime code validates parent scope before querying these tables, but DB-level tenant enforcement is weaker if future code bypasses parent checks.
- Required hardening:
  - Add composite tenant-safe references (or strict join guards + checker enforcement) where feasible in both SQLite and PostgreSQL schema/migrations.

## Explicit Exclusions (Allowlist)

### E-1: Authentication and account recovery flows

- Reason: Identity/token operations are intentionally global and not workspace-filtered.
- Files:
  - `src/services/auth.service.ts`
  - `src/services/email-verification.service.ts`
  - `src/services/password-reset.service.ts`
  - `src/pages/api/auth/resend-verification.ts`
  - `src/lib/auth/lucia.ts`

### E-2: API key authentication bootstrap/validation

- Reason: API key lookup must resolve workspace context from key material itself.
- Files:
  - `src/services/api-key.service.ts` (`validate` path)
  - `mcp-server/src/auth.ts`

### E-3: Global reference data

- Reason: Exchange rates are intentionally global shared reference data.
- Files:
  - `src/lib/currency/conversion.ts`
  - `src/db/schema/sqlite/exchange-rates.ts`
  - `src/db/schema/postgresql/exchange-rates.ts`

### E-4: Maintenance/bootstrap utilities

- Reason: Seeder/backfill/empty-db scripts intentionally operate across all workspaces.
- Files:
  - `src/db/seed.ts`
  - `src/db/empty.ts`
  - `scripts/backfill-email-verification.ts`

## Future-Proof Preventive Controls

1. Make workspace scoping mandatory in service contracts for all workspace-scoped tables.
2. Add a blocking CI checker that fails any new scoped-table query lacking classification (`SCOPED` or `ALLOWLIST`).
3. Introduce PostgreSQL RLS with per-request tenant context (`SET LOCAL app.workspace_id`) and policy checks on scoped tables.
4. Strengthen schema integrity with composite tenant-safe foreign keys where possible.
5. Add cross-workspace negative tests for every mutation endpoint (`A` token cannot mutate/read `B` workspace records).
6. Maintain a versioned allowlist with owner + justification for each global query path.

## Confidence

- Coverage confidence: High for application query callsites in `src/`, `mcp-server/`, `scripts/`, and `src/db/`.
- Residual risk: Medium until F-1 and F-2 are refactored to enforce workspace constraints inside service layer (not only at route layer).

## Appendix A: Full Query Callsite Inventory

```text
mcp-server/src/auth.ts:47:  const key = await db.query.apiKeys.findFirst({
scripts/backfill-email-verification.ts:33:  const unverifiedUsers = await db.query.users.findMany({
scripts/backfill-email-verification.ts:48:      .update(schema.users)
scripts/backfill-email-verification.ts:69:  const inactiveWorkspaces = await db.query.workspaces.findMany({
scripts/backfill-email-verification.ts:84:      .update(schema.workspaces)
src/db/empty.ts:93:          await db.delete(table);
src/db/seed.ts:1065:      await db.insert(transactions).values({
src/db/seed.ts:1108:        await db.insert(transactions).values({
src/db/seed.ts:1149:    await db.insert(assets).values({
src/db/seed.ts:1172:    await db.insert(assets).values({
src/db/seed.ts:1194:  await db.insert(assets).values({
src/db/seed.ts:1262:          await db.insert(assetHistory).values({
src/db/seed.ts:1287:        await db.insert(assetHistory).values({
src/db/seed.ts:1335:    await db.insert(assetUpdateReminders).values({
src/db/seed.ts:1368:    await db.insert(assetSnapshots).values({
src/db/seed.ts:1390:      await db.insert(assetSnapshotItems).values({
src/db/seed.ts:1419:    await db.insert(exchangeRates).values({
src/db/seed.ts:1445:    .select()
src/db/seed.ts:1457:    const firstHistory = await db.query.assetHistory.findFirst({
src/db/seed.ts:1464:    await db.update(assets).set({ initial_balance: initialBalance }).where(eq(assets.id, asset.id));
src/db/seed.ts:1487:  const recentTransactions = await db.query.transactions.findMany({
src/db/seed.ts:1505:    await db.insert(auditLogs).values({
src/db/seed.ts:1541:    await db.insert(auditLogs).values({
src/db/seed.ts:1555:      .update(transactions)
src/db/seed.ts:1567:      await db.insert(auditLogs).values({
src/db/seed.ts:1581:        .update(transactions)
src/db/seed.ts:1597:    await db.insert(auditLogs).values({
src/db/seed.ts:1618:      .update(transactions)
src/db/seed.ts:602:    await db.delete(passwordResetTokens);
src/db/seed.ts:603:    await db.delete(sessions);
src/db/seed.ts:604:    await db.delete(assetSnapshotItems);
src/db/seed.ts:605:    await db.delete(assetSnapshots);
src/db/seed.ts:606:    await db.delete(assetUpdateReminders);
src/db/seed.ts:607:    await db.delete(assetHistory);
src/db/seed.ts:608:    await db.delete(transactions);
src/db/seed.ts:609:    await db.delete(budgets);
src/db/seed.ts:610:    await db.delete(assets);
src/db/seed.ts:611:    await db.delete(assetCategories);
src/db/seed.ts:612:    await db.delete(categories);
src/db/seed.ts:613:    await db.delete(userMeta);
src/db/seed.ts:614:    await db.delete(users);
src/db/seed.ts:615:    await db.delete(workspaceMeta);
src/db/seed.ts:616:    await db.delete(workspaces);
src/db/seed.ts:617:    await db.delete(exchangeRates);
src/db/seed.ts:646:  await db.insert(workspaces).values({
src/db/seed.ts:655:  await db.insert(workspaceMeta).values([
src/db/seed.ts:701:  await db.insert(users).values({
src/db/seed.ts:714:  await db.insert(userMeta).values([
src/db/seed.ts:737:  await db.insert(users).values({
src/db/seed.ts:750:  await db.insert(userMeta).values([
src/db/seed.ts:787:    await db.insert(categories).values({
src/db/seed.ts:807:    await db.insert(categories).values({
src/db/seed.ts:841:    await db.insert(assetCategories).values({
src/db/seed.ts:915:    await db.insert(budgets).values(budgetRecords);
src/db/seed.ts:953:        await db.insert(categories).values({
src/db/seed.ts:986:      await db.insert(transactions).values({
src/lib/audit-log.ts:59:    await db.insert(auditLogs).values({
src/lib/auth/lucia.ts:108:      .update(this.sessionTable)
src/lib/auth/lucia.ts:116:      .delete(this.sessionTable)
src/lib/auth/lucia.ts:43:    await this.db.delete(this.sessionTable).where(eq(this.sessionTable.id, sessionId));
src/lib/auth/lucia.ts:47:    await this.db.delete(this.sessionTable).where(eq(this.sessionTable.userId, userId));
src/lib/auth/lucia.ts:54:      .select({
src/lib/auth/lucia.ts:83:      .select()
src/lib/auth/lucia.ts:97:    await this.db.insert(this.sessionTable).values({
src/lib/currency/conversion.ts:127:      .select({
src/pages/api/auth/resend-verification.ts:92:  const user = await db.query.users.findFirst({
src/services/api-key.service.ts:140:      .insert(this.schema.apiKeys)
src/services/api-key.service.ts:171:    const candidates = await this.db.query.apiKeys.findMany({
src/services/api-key.service.ts:188:          .update(this.schema.apiKeys)
src/services/api-key.service.ts:204:    const existing = await this.db.query.apiKeys.findFirst({
src/services/api-key.service.ts:214:      .update(this.schema.apiKeys)
src/services/api-key.service.ts:240:    const rows = await this.db.query.apiKeys.findMany({
src/services/asset-category.service.ts:111:    const result = await this.db.query.assetCategories.findMany({
src/services/asset-category.service.ts:124:    const result = await this.db.query.assetCategories.findFirst({
src/services/asset-category.service.ts:175:      .update(this.schema.assetCategories)
src/services/asset-category.service.ts:206:      .select({
src/services/asset-category.service.ts:227:      .delete(this.schema.assetCategories)
src/services/asset-category.service.ts:248:    const result = await this.db.query.assetCategories.findFirst({
src/services/asset-category.service.ts:257:      .select({
src/services/asset-category.service.ts:277:    const existing = await this.db.query.assetCategories.findFirst({
src/services/asset-category.service.ts:290:        this.db.insert(this.schema.assetCategories).values({
src/services/asset-category.service.ts:54:        .insert(this.schema.assetCategories)
src/services/asset-category.service.ts:84:    const result = await this.db.query.assetCategories.findFirst({
src/services/asset.service.ts:106:    const result = await this.db.query.assets.findFirst({
src/services/asset.service.ts:154:      const result = await this.db.query.assets.findMany({
src/services/asset.service.ts:183:        .select({ count: sql<number>`count(*)` })
src/services/asset.service.ts:212:      .update(this.schema.assets)
src/services/asset.service.ts:249:      .update(this.schema.assets)
src/services/asset.service.ts:259:      await (this.db as any).insert(this.schema.assetHistory).values({
src/services/asset.service.ts:269:        .update(this.schema.assets)
src/services/asset.service.ts:340:        .update(this.schema.assets)
src/services/asset.service.ts:359:      await (tx as any).insert(this.schema.assetHistory).values({
src/services/asset.service.ts:369:        .update(this.schema.assets)
src/services/asset.service.ts:384:      await (tx as any).insert(this.schema.assetHistory).values({
src/services/asset.service.ts:428:      .update(this.schema.assets)
src/services/asset.service.ts:459:      .update(this.schema.assets)
src/services/asset.service.ts:475:    return this.db.query.assets.findFirst({
src/services/asset.service.ts:495:      const history = await this.db.query.assetHistory.findMany({
src/services/asset.service.ts:533:          const history = await this.db.query.assetHistory.findFirst({
src/services/asset.service.ts:561:        .select({
src/services/asset.service.ts:585:        .select({
src/services/asset.service.ts:630:      return this.db.query.assets.findMany({
src/services/asset.service.ts:645:        const history = await this.db.query.assetHistory.findMany({
src/services/asset.service.ts:64:      .insert(this.schema.assets)
src/services/asset.service.ts:668:      .select({
src/services/asset.service.ts:685:      .select({
src/services/asset.service.ts:83:      await (this.db as any).insert(this.schema.assetHistory).values({
src/services/asset.service.ts:91:      await this.db.delete(this.schema.assets).where(eq(this.schema.assets.id, id));
src/services/auth.service.ts:173:  await tx.insert(schema.workspaces).values({
src/services/auth.service.ts:202:    const existingUser = await db.query.users.findFirst({
src/services/auth.service.ts:221:        .insert(schema.users)
src/services/auth.service.ts:295:    const existingUser = await db.query.users.findFirst({
src/services/auth.service.ts:311:      .insert(schema.users)
src/services/auth.service.ts:372:    const user = await db.query.users.findFirst({
src/services/auth.service.ts:406:    const workspace = await db.query.workspaces.findFirst({
src/services/auth.service.ts:537:    const existingOAuth = await db.query.oauthAccounts.findFirst({
src/services/auth.service.ts:545:      const user = await db.query.users.findFirst({
src/services/auth.service.ts:554:      const workspace = await db.query.workspaces.findFirst({
src/services/auth.service.ts:577:    const existingUser = await db.query.users.findFirst({
src/services/auth.service.ts:607:        .insert(schema.users)
src/services/auth.service.ts:620:      await tx.insert(schema.oauthAccounts).values({
src/services/auth.service.ts:680:    const existingUser = await db.query.users.findFirst({
src/services/auth.service.ts:689:    const workspace = await db.query.workspaces.findFirst({
src/services/auth.service.ts:703:      await tx.insert(schema.oauthAccounts).values({
src/services/auth.service.ts:720:        await tx.update(schema.users).set(updates).where(eq(schema.users.id, userId));
src/services/auth.service.ts:724:    const updatedUser = await db.query.users.findFirst({
src/services/auth.service.ts:757:    const user = await db.query.users.findFirst({
src/services/auth.service.ts:774:        .delete(schema.oauthAccounts)
src/services/auth.service.ts:781:        await tx.update(schema.users).set({ avatar_url: null }).where(eq(schema.users.id, userId));
src/services/auth.service.ts:799:  return db.query.oauthAccounts.findMany({
src/services/budget.service.ts:1025:      await Promise.resolve(this.db.insert(this.schema.budgets).values(newBudgets));
src/services/budget.service.ts:149:    const monthBudgets = await this.db.query.budgets.findMany({
src/services/budget.service.ts:168:      .select({
src/services/budget.service.ts:345:    const category = await this.db.query.categories.findFirst({
src/services/budget.service.ts:363:    const budget = await this.db.query.budgets.findFirst({
src/services/budget.service.ts:377:      .select({
src/services/budget.service.ts:419:    const monthBudgets = await this.db.query.budgets.findMany({
src/services/budget.service.ts:490:    const existingBudgets = await this.db.query.budgets.findMany({
src/services/budget.service.ts:573:            .update(this.schema.budgets)
src/services/budget.service.ts:605:    const category = await this.db.query.categories.findFirst({
src/services/budget.service.ts:622:    const existingBudget = await this.db.query.budgets.findFirst({
src/services/budget.service.ts:642:      .insert(this.schema.budgets)
src/services/budget.service.ts:713:      .update(this.schema.budgets)
src/services/budget.service.ts:747:      .delete(this.schema.budgets)
src/services/budget.service.ts:763:    const budget = await this.db.query.budgets.findFirst({
src/services/budget.service.ts:779:    const budget = await this.db.query.budgets.findFirst({
src/services/budget.service.ts:810:    const result = await this.db.query.budgets.findMany({
src/services/budget.service.ts:848:    const result = await this.db.query.budgets.findFirst({
src/services/budget.service.ts:865:      const allCategoriesRaw = await tx.query.categories.findMany({
src/services/budget.service.ts:884:      const existingBudgets = await tx.query.budgets.findMany({
src/services/budget.service.ts:919:      await tx.insert(this.schema.budgets).values(newBudgets).onConflictDoNothing();
src/services/budget.service.ts:923:      const persistedBudgets = await tx.query.budgets.findMany({
src/services/budget.service.ts:968:    const sourceBudgets = await this.db.query.budgets.findMany({
src/services/budget.service.ts:985:    const existingTargetBudgets = await this.db.query.budgets.findMany({
src/services/category.service.ts:104:      return this.db.query.categories.findMany({
src/services/category.service.ts:139:        .update(this.schema.categories)
src/services/category.service.ts:172:        .update(this.schema.categories)
src/services/category.service.ts:208:      return this.db.query.categories.findFirst({
src/services/category.service.ts:41:        .insert(this.schema.categories)
src/services/category.service.ts:70:      return this.db.query.categories.findFirst({
src/services/dashboard.service.ts:266:        this.db.query.assets.findMany({
src/services/dashboard.service.ts:365:            .select({
src/services/dashboard.service.ts:388:            .select({
src/services/dashboard.service.ts:407:            .select({
src/services/dashboard.service.ts:502:        this.db.query.budgets.findMany({
src/services/dashboard.service.ts:526:            .select({
src/services/dashboard.service.ts:612:          this.db.query.transactions.findMany({
src/services/email-verification.service.ts:109:    const tokenRecord = await this.db.query.emailVerificationTokens.findFirst({
src/services/email-verification.service.ts:126:        .delete(this.schema.emailVerificationTokens)
src/services/email-verification.service.ts:130:      const userRecord = await this.db.query.users.findFirst({
src/services/email-verification.service.ts:142:    const user = await this.db.query.users.findFirst({
src/services/email-verification.service.ts:161:        .delete(this.schema.emailVerificationTokens)
src/services/email-verification.service.ts:169:      .update(this.schema.users)
src/services/email-verification.service.ts:175:      .delete(this.schema.emailVerificationTokens)
src/services/email-verification.service.ts:42:      .delete(this.schema.emailVerificationTokens)
src/services/email-verification.service.ts:49:      this.db.insert(this.schema.emailVerificationTokens).values({
src/services/email-verification.service.ts:67:    const user = await this.db.query.users.findFirst({
src/services/password-reset.service.ts:120:    const user = await db.query.users.findFirst({
src/services/password-reset.service.ts:138:      .delete(schema.passwordResetTokens)
src/services/password-reset.service.ts:142:    await db.insert(schema.passwordResetTokens).values({
src/services/password-reset.service.ts:186:    const resetToken = await db.query.passwordResetTokens.findFirst({
src/services/password-reset.service.ts:218:    await db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.token, token));
src/services/report.service.ts:305:    const category = await this.db.query.categories.findFirst({
src/services/report.service.ts:338:      const categoryTransactions = await this.db.query.transactions.findMany({
src/services/report.service.ts:412:      .select({
src/services/report.service.ts:442:      .select({
src/services/report.service.ts:473:      .select({
src/services/report.service.ts:521:      .select({
src/services/report.service.ts:568:      .select({
src/services/report.service.ts:614:    const monthBudgets = await this.db.query.budgets.findMany({
src/services/report.service.ts:633:      .select({
src/services/report.service.ts:683:      .select({
src/services/report.service.ts:710:    const categoriesData = await this.db.query.categories.findMany({
src/services/report.service.ts:722:      .select({
src/services/transaction.service.ts:1070:      this.db.query.auditLogs.findMany({
src/services/transaction.service.ts:1086:      this.db.query.categories.findMany({
src/services/transaction.service.ts:1093:      this.db.query.assets.findMany({
src/services/transaction.service.ts:1179:      .select({
src/services/transaction.service.ts:1212:      .selectDistinct({ entity_id: this.schema.auditLogs.entity_id })
src/services/transaction.service.ts:172:      .insert(this.schema.transactions)
src/services/transaction.service.ts:227:      const result = await this.db.query.transactions.findFirst({
src/services/transaction.service.ts:368:    const result = await this.db.query.transactions.findMany(queryOptions);
src/services/transaction.service.ts:509:      .update(this.schema.transactions)
src/services/transaction.service.ts:567:      .update(this.schema.transactions)
src/services/transaction.service.ts:660:        .select({ count: sql<number>`count(*)` })
src/services/transaction.service.ts:731:          await tx.insert(this.schema.transactions).values(chunk);
src/services/transaction.service.ts:791:          .select({
src/services/user-meta.service.ts:153:      .insert(this.schema.userMeta)
src/services/user-meta.service.ts:196:    const existing = await this.db.query.userMeta.findFirst({
src/services/user-meta.service.ts:210:      .delete(this.schema.userMeta)
src/services/user-meta.service.ts:317:    const user = await this.db.query.users.findFirst({
src/services/user-meta.service.ts:75:    const meta = await this.db.query.userMeta.findFirst({
src/services/user-meta.service.ts:94:    const metas = await this.db.query.userMeta.findMany({
src/services/user.service.ts:101:    const user = await this.db.query.users.findFirst({
src/services/user.service.ts:111:      const existingUser = await this.db.query.users.findFirst({
src/services/user.service.ts:126:      .update(this.schema.users)
src/services/user.service.ts:135:    const updatedUser = await this.db.query.users.findFirst({
src/services/user.service.ts:155:    const user = await this.db.query.users.findFirst({
src/services/user.service.ts:179:      .update(this.schema.users)
src/services/user.service.ts:197:    const user = await this.db.query.users.findFirst({
src/services/user.service.ts:212:      .update(this.schema.users)
src/services/user.service.ts:81:    const user = await this.db.query.users.findFirst({
src/services/workspace-invitation.service.ts:111:      .insert(this.schema.workspaceInvitations)
src/services/workspace-invitation.service.ts:138:    const invitation = await this.db.query.workspaceInvitations.findFirst({
src/services/workspace-invitation.service.ts:152:    const invitation = await this.db.query.workspaceInvitations.findFirst({
src/services/workspace-invitation.service.ts:176:    const invitations = await this.db.query.workspaceInvitations.findMany({
src/services/workspace-invitation.service.ts:231:      .update(this.schema.workspaceInvitations)
src/services/workspace-invitation.service.ts:258:      .delete(this.schema.workspaceInvitations)
src/services/workspace-invitation.service.ts:295:      .update(this.schema.workspaceInvitations)
src/services/workspace-invitation.service.ts:360:    const workspace = await this.db.query.workspaces.findFirst({
src/services/workspace-invitation.service.ts:379:      const workspace = await this.db.query.workspaces.findFirst({
src/services/workspace-invitation.service.ts:386:        ? await this.db.query.users.findFirst({
src/services/workspace-meta.service.ts:133:    const meta = await this.db.query.workspaceMeta.findFirst({
src/services/workspace-meta.service.ts:185:      .insert(this.schema.workspaceMeta)
src/services/workspace-meta.service.ts:216:    const metas = await this.db.query.workspaceMeta.findMany({
src/services/workspace-meta.service.ts:244:    const metas = await this.db.query.workspaceMeta.findMany({
src/services/workspace-meta.service.ts:282:    const existing = await this.db.query.workspaceMeta.findFirst({
src/services/workspace-meta.service.ts:299:      .delete(this.schema.workspaceMeta)
src/services/workspace-meta.service.ts:411:    const workspace = await this.db.query.workspaces.findFirst({
src/services/workspace.service.ts:107:      .update(this.schema.workspaces)
src/services/workspace.service.ts:117:    const workspace = await this.db.query.workspaces.findFirst({
src/services/workspace.service.ts:131:    const workspace = await this.db.query.workspaces.findFirst({
src/services/workspace.service.ts:159:    await this.db.delete(this.schema.workspaces).where(eq(this.schema.workspaces.id, id));
src/services/workspace.service.ts:183:    const members = await this.db.query.users.findMany({
src/services/workspace.service.ts:218:      .update(this.schema.workspaces)
src/services/workspace.service.ts:80:      .insert(this.schema.workspaces)
```
