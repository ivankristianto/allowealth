# DB Index Rollout Runbook (Wave A)

Date: 2026-03-01
Scope: PostgreSQL production-safe index rollout for DB performance hardening

## Purpose

Apply Wave A indexes with minimal locking risk, validate query-plan usage, and keep a clear rollback path.

Wave A indexes (create-first):

- `transactions_ws_date_idx` on `transactions(workspace_id, transaction_date)`
- `transactions_ws_account_date_idx` on `transactions(workspace_id, account_id, transaction_date)`
- `transactions_ws_to_account_date_idx` on `transactions(workspace_id, to_account_id, transaction_date)`
- `workspace_invitations_ws_accept_expire_created_idx` on `workspace_invitations(workspace_id, accepted_at, expires_at, created_at)`
- `api_keys_prefix_deleted_idx` on `api_keys(key_prefix, deleted_at)`
- `api_keys_ws_user_deleted_idx` on `api_keys(workspace_id, user_id, deleted_at)`
- `recurring_occurrences_ws_status_due_date_idx` on `recurring_occurrences(workspace_id, status, due_date)`

## Preconditions

- Run first on staging, then production.
- Execute during a low-traffic window.
- Do not wrap `CREATE INDEX CONCURRENTLY` statements in a transaction.
- Ensure app deploy containing query-path optimizations is already live.

## Staging Rollout

Use psql against staging:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_ws_date_idx
  ON transactions (workspace_id, transaction_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_ws_account_date_idx
  ON transactions (workspace_id, account_id, transaction_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_ws_to_account_date_idx
  ON transactions (workspace_id, to_account_id, transaction_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS workspace_invitations_ws_accept_expire_created_idx
  ON workspace_invitations (workspace_id, accepted_at, expires_at, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS api_keys_prefix_deleted_idx
  ON api_keys (key_prefix, deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS api_keys_ws_user_deleted_idx
  ON api_keys (workspace_id, user_id, deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS recurring_occurrences_ws_status_due_date_idx
  ON recurring_occurrences (workspace_id, status, due_date);
```

## Validation

1. Verify indexes exist:

```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname IN (
  'transactions_ws_date_idx',
  'transactions_ws_account_date_idx',
  'transactions_ws_to_account_date_idx',
  'workspace_invitations_ws_accept_expire_created_idx',
  'api_keys_prefix_deleted_idx',
  'api_keys_ws_user_deleted_idx',
  'recurring_occurrences_ws_status_due_date_idx'
)
ORDER BY indexname;
```

2. Verify top queries in staging use indexes:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, amount, currency
FROM transactions
WHERE workspace_id = 'ws_example'
  AND transaction_date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY transaction_date DESC
LIMIT 100;
```

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, status, due_date
FROM recurring_occurrences
WHERE workspace_id = 'ws_example'
  AND status = 'pending'
ORDER BY due_date ASC
LIMIT 100;
```

Acceptance:

- Planner selects index/bitmap index scans for the target filters.
- No lock timeout incidents.
- No p95 latency regression on affected endpoints.

## Production Rollout

- Repeat exact `CREATE INDEX CONCURRENTLY IF NOT EXISTS` statements in production.
- Monitor DB locks and endpoint latency during rollout.
- Keep each statement independent; if one fails, continue only after root-cause check.

## Rollback

If any index causes regression or unexpected contention:

```sql
DROP INDEX CONCURRENTLY IF EXISTS transactions_ws_date_idx;
DROP INDEX CONCURRENTLY IF EXISTS transactions_ws_account_date_idx;
DROP INDEX CONCURRENTLY IF EXISTS transactions_ws_to_account_date_idx;
DROP INDEX CONCURRENTLY IF EXISTS workspace_invitations_ws_accept_expire_created_idx;
DROP INDEX CONCURRENTLY IF EXISTS api_keys_prefix_deleted_idx;
DROP INDEX CONCURRENTLY IF EXISTS api_keys_ws_user_deleted_idx;
DROP INDEX CONCURRENTLY IF EXISTS recurring_occurrences_ws_status_due_date_idx;
```

## Wave B (Post-Observation Cleanup)

Do not execute on the same day as Wave A rollout. After observation window confirms stable performance:

```sql
DROP INDEX CONCURRENTLY IF EXISTS password_reset_tokens_token_idx;
DROP INDEX CONCURRENTLY IF EXISTS user_mfa_user_id_idx;
DROP INDEX CONCURRENTLY IF EXISTS recurring_occurrences_transaction_id_idx;
```

## Notes

- `drizzle-kit migrate` is acceptable for local/dev validation.
- For production lock-safety, prefer explicit concurrent statements above.
