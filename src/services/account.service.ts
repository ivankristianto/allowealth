import { type IDatabase, getActiveSchema, runTransaction, accounts as accountsTable } from '@/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AccountServiceError, ServiceErrorCode } from './service-errors';
import type { AccountType, Currency } from '@/lib/types/account';
import { deriveAccountClass } from '@/lib/types/account';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { decimalAdd, decimalCompare, decimalSubtract } from '@/lib/utils/decimal';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';

/** Inferred row type for an account record */
export type AccountRow = typeof accountsTable.$inferSelect;

export interface CreateAccountInput {
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  type: AccountType;
  category_id?: string | null;
  balance: string;
  currency: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  category_id?: string | null;
  balance?: string;
  currency?: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
}

export interface UpdateAccountBalanceInput {
  balance: string;
  notes?: string;
  recorded_at?: Date;
}

export class AccountService {
  private get schema() {
    return getActiveSchema();
  }

  private chunkIds(ids: string[], size = 500): string[][] {
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += size) {
      chunks.push(ids.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Create a new AccountService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new account
   *
   * Note: Using sequential inserts instead of transaction because
   * SQLite with Drizzle doesn't support async transaction callbacks.
   * Includes compensating transaction on failure to maintain data integrity.
   */
  async create(input: CreateAccountInput) {
    const id = nanoid();
    const now = new Date();

    // Insert the account
    const [account] = await (this.db as any)
      .insert(this.schema.accounts)
      .values({
        id,
        workspace_id: input.workspace_id,
        created_by_user_id: input.created_by_user_id,
        name: input.name,
        type: input.type,
        account_class: deriveAccountClass(input.type),
        category_id: input.category_id ?? null,
        balance: input.balance,
        initial_balance: input.balance,
        currency: input.currency,
        last_updated: now,
        created_at: now,
        updated_at: now,
      })
      .returning();

    // Create initial history entry with compensating transaction on failure
    try {
      await (this.db as any).insert(this.schema.accountHistory).values({
        id: nanoid(),
        account_id: id,
        balance: input.balance,
        recorded_at: now,
      });
    } catch (historyError) {
      // Compensating transaction: delete the orphaned account to maintain data integrity
      await this.db.delete(this.schema.accounts).where(eq(this.schema.accounts.id, id));
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_NOT_FOUND,
        'Failed to create account: could not create history entry',
        500
      );
    }

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(input.workspace_id), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return account;
  }

  /**
   * Find active account by ID
   */
  async findById(id: string, workspaceId: string) {
    const result = await this.db.query.accounts.findFirst({
      where: and(
        eq(this.schema.accounts.id, id),
        eq(this.schema.accounts.workspace_id, workspaceId),
        sql`${this.schema.accounts.deleted_at} IS NULL`,
        eq(this.schema.accounts.status, 'active')
      ),
    });

    return result;
  }

  /**
   * Find all accounts for a workspace
   */
  async findAll(
    workspaceId: string,
    filters?: {
      type?: AccountType;
      category_id?: string;
      currency?: Currency;
      includeInactive?: boolean;
      owner_user_id?: string;
    },
    perf?: PerfCollector
  ) {
    const filtersHashValue = hashFilters(filters || {});
    const cacheKey = CacheKeys.accounts(workspaceId, filtersHashValue);

    const conditions = [
      eq(this.schema.accounts.workspace_id, workspaceId),
      sql`${this.schema.accounts.deleted_at} IS NULL`,
    ];

    // Default behavior: active accounts only.
    if (!filters?.includeInactive) {
      conditions.push(eq(this.schema.accounts.status, 'active'));
    }

    if (filters?.type) {
      conditions.push(eq(this.schema.accounts.type, filters.type));
    }

    if (filters?.category_id) {
      conditions.push(eq(this.schema.accounts.category_id, filters.category_id));
    }

    if (filters?.currency) {
      conditions.push(eq(this.schema.accounts.currency, filters.currency));
    }

    if (filters?.owner_user_id) {
      conditions.push(eq(this.schema.accounts.created_by_user_id, filters.owner_user_id));
    }

    return cacheOrFetch(
      cacheKey,
      { ttl: 3600, tags: [CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS] },
      () =>
        trackQuery('AccountService.findAll', perf, () =>
          this.db.query.accounts.findMany({
            where: and(...conditions),
            orderBy: (_accounts: any, { asc }: any) => [asc(this.schema.accounts.name)],
          })
        ),
      perf
    );
  }

  /**
   * Update account details
   */
  async update(id: string, workspaceId: string, input: UpdateAccountInput) {
    const currentAccount = await this.findByIdIncludingClosed(id, workspaceId);
    if (!currentAccount) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }
    if (currentAccount.status === 'closed') {
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot update account — account is deactivated',
        400
      );
    }

    // Currency lock: prevent changing currency if account has history beyond the initial entry
    // Every account starts with 1 history record (initial balance), so threshold is > 1
    if (input.currency !== undefined && input.currency !== currentAccount.currency) {
      const historyCount = await (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.accountHistory)
        .where(eq(this.schema.accountHistory.account_id, id));

      if (historyCount[0]?.count > 1) {
        throw new AccountServiceError(
          ServiceErrorCode.CURRENCY_LOCKED,
          'Cannot change currency — account has transaction history',
          400
        );
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) {
      updateData.type = input.type;
      updateData.account_class = deriveAccountClass(input.type);
    }
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.currency !== undefined) updateData.currency = input.currency;

    // If balance is updated, also update last_updated timestamp
    if (input.balance !== undefined) {
      updateData.balance = input.balance;
      updateData.last_updated = new Date();
    }

    await this.db
      .update(this.schema.accounts)
      .set(updateData)
      .where(
        and(eq(this.schema.accounts.id, id), eq(this.schema.accounts.workspace_id, workspaceId))
      );

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findByIdIncludingClosed(id, workspaceId);
  }

  /**
   * Update account balance and create history entry
   *
   * Note: Using sequential operations instead of transaction because
   * SQLite with Drizzle doesn't support async transaction callbacks.
   * Includes compensating transaction on failure to maintain data integrity.
   */
  async updateBalance(id: string, workspaceId: string, input: UpdateAccountBalanceInput) {
    const now = new Date();

    // Get current balance for potential rollback
    const currentAccount = await this.findByIdIncludingClosed(id, workspaceId);
    if (!currentAccount) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    if (currentAccount.status === 'closed') {
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot update balance — account is deactivated',
        400
      );
    }

    const previousBalance = currentAccount.balance;
    const previousLastUpdated = currentAccount.last_updated;
    const previousUpdatedAt = currentAccount.updated_at;

    // Update account
    await this.db
      .update(this.schema.accounts)
      .set({
        balance: input.balance,
        last_updated: now,
        updated_at: now,
      })
      .where(
        and(eq(this.schema.accounts.id, id), eq(this.schema.accounts.workspace_id, workspaceId))
      );

    // Create history entry with compensating transaction on failure
    try {
      await (this.db as any).insert(this.schema.accountHistory).values({
        id: nanoid(),
        account_id: id,
        balance: input.balance,
        notes: input.notes,
        recorded_at: input.recorded_at || now,
      });
    } catch (historyError) {
      // Compensating transaction: rollback the balance update
      await this.db
        .update(this.schema.accounts)
        .set({
          balance: previousBalance,
          last_updated: previousLastUpdated,
          updated_at: previousUpdatedAt,
        })
        .where(
          and(eq(this.schema.accounts.id, id), eq(this.schema.accounts.workspace_id, workspaceId))
        );
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_NOT_FOUND,
        'Failed to update balance: could not create history entry',
        500
      );
    }

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findById(id, workspaceId);
  }

  /**
   * Transfer balance between two accounts of the same currency.
   * Validates, mutates both balances, and returns the accounts for transaction creation.
   */
  async transfer(
    fromId: string,
    toId: string,
    amount: string,
    workspaceId: string
  ): Promise<{ fromAccount: AccountRow | undefined; toAccount: AccountRow | undefined }> {
    if (fromId === toId) {
      throw new Error(
        `Cannot transfer an account to itself (accountId: ${fromId}, workspaceId: ${workspaceId})`
      );
    }

    const fromAccount = await this.findByIdIncludingClosed(fromId, workspaceId);
    const toAccount = await this.findByIdIncludingClosed(toId, workspaceId);

    if (!fromAccount || !toAccount) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    if (fromAccount.status === 'closed' || toAccount.status === 'closed') {
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot transfer — one or both accounts are deactivated',
        400
      );
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new Error('Cannot transfer between different currencies');
    }

    if (decimalCompare(amount, '0') <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    const now = new Date();
    const fromIsDebt = fromAccount.account_class === 'debt';
    const toIsDebt = toAccount.account_class === 'debt';

    // Debt balances are stored as positive numbers representing amount owed.
    // Transferring FROM a debt account (e.g. cash advance) increases debt → add amount.
    // Transferring TO a debt account (e.g. paying off credit card) reduces debt → subtract amount.
    const newFromBalance = fromIsDebt
      ? decimalAdd(fromAccount.balance, amount)
      : decimalSubtract(fromAccount.balance, amount);
    const newToBalance = toIsDebt
      ? decimalSubtract(toAccount.balance, amount)
      : decimalAdd(toAccount.balance, amount);

    // Wrap both balance updates in a transaction to ensure atomicity
    await runTransaction(this.db, async (tx) => {
      await tx
        .update(this.schema.accounts)
        .set({ balance: newFromBalance, last_updated: now, updated_at: now })
        .where(
          and(
            eq(this.schema.accounts.id, fromId),
            eq(this.schema.accounts.workspace_id, workspaceId)
          )
        );

      await tx
        .update(this.schema.accounts)
        .set({ balance: newToBalance, last_updated: now, updated_at: now })
        .where(
          and(eq(this.schema.accounts.id, toId), eq(this.schema.accounts.workspace_id, workspaceId))
        );
    });

    // Record balance history for both accounts with compensating rollback on failure
    try {
      await (this.db as any).insert(this.schema.accountHistory).values({
        id: nanoid(),
        account_id: fromId,
        balance: newFromBalance,
        notes: `Transfer to ${toAccount.name}`,
        recorded_at: now,
      });

      await (this.db as any).insert(this.schema.accountHistory).values({
        id: nanoid(),
        account_id: toId,
        balance: newToBalance,
        notes: `Transfer from ${fromAccount.name}`,
        recorded_at: now,
      });
    } catch {
      // Compensating transaction: rollback both balance updates
      await runTransaction(this.db, async (tx) => {
        await tx
          .update(this.schema.accounts)
          .set({
            balance: fromAccount.balance,
            last_updated: fromAccount.last_updated,
            updated_at: fromAccount.updated_at,
          })
          .where(
            and(
              eq(this.schema.accounts.id, fromId),
              eq(this.schema.accounts.workspace_id, workspaceId)
            )
          );

        await tx
          .update(this.schema.accounts)
          .set({
            balance: toAccount.balance,
            last_updated: toAccount.last_updated,
            updated_at: toAccount.updated_at,
          })
          .where(
            and(
              eq(this.schema.accounts.id, toId),
              eq(this.schema.accounts.workspace_id, workspaceId)
            )
          );
      });
      throw new AccountServiceError(
        ServiceErrorCode.ACCOUNT_NOT_FOUND,
        'Failed to transfer: could not create history entries',
        500
      );
    }

    // Invalidate account cache
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return {
      fromAccount: { ...fromAccount, balance: newFromBalance },
      toAccount: { ...toAccount, balance: newToBalance },
    };
  }

  /**
   * Close an account account (requires zero balance)
   */
  async close(id: string, workspaceId: string, closedByUserId: string | null) {
    const account = await this.findByIdIncludingClosed(id, workspaceId);

    if (!account) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    if (account.status === 'closed') {
      throw new AccountServiceError(
        ServiceErrorCode.ALREADY_CLOSED,
        'Account already deactivated',
        400
      );
    }

    if (decimalCompare(account.balance, '0') !== 0) {
      throw new AccountServiceError(
        ServiceErrorCode.BALANCE_NOT_ZERO,
        `Cannot deactivate account with balance ${account.balance} ${account.currency}. Transfer funds out first.`,
        400
      );
    }

    const now = new Date();
    await this.db
      .update(this.schema.accounts)
      .set({
        status: 'closed',
        closed_at: now,
        closed_by_user_id: closedByUserId,
        updated_at: now,
      })
      .where(
        and(eq(this.schema.accounts.id, id), eq(this.schema.accounts.workspace_id, workspaceId))
      );

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findByIdIncludingClosed(id, workspaceId);
  }

  /**
   * Reopen a closed account account
   *
   * Note: Permission check (admin-only) is handled at the API route level
   * using getAuthenticatedUser().role, not in the service layer.
   */
  async reopen(id: string, workspaceId: string) {
    const account = await this.findByIdIncludingClosed(id, workspaceId);

    if (!account) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    if (account.status !== 'closed') {
      throw new AccountServiceError(ServiceErrorCode.NOT_CLOSED, 'Account is not deactivated', 400);
    }

    const now = new Date();
    await this.db
      .update(this.schema.accounts)
      .set({
        status: 'active',
        closed_at: null,
        closed_by_user_id: null,
        updated_at: now,
      })
      .where(
        and(eq(this.schema.accounts.id, id), eq(this.schema.accounts.workspace_id, workspaceId))
      );

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findById(id, workspaceId);
  }

  /**
   * Find account by ID including closed accounts (but not hard-deleted)
   */
  async findByIdIncludingClosed(id: string, workspaceId: string) {
    return this.db.query.accounts.findFirst({
      where: and(
        eq(this.schema.accounts.id, id),
        eq(this.schema.accounts.workspace_id, workspaceId),
        sql`${this.schema.accounts.deleted_at} IS NULL`
      ),
    });
  }

  /**
   * Get account history
   */
  async getHistory(account_id: string, workspaceId: string, perf?: PerfCollector, limit?: number) {
    // Verify account belongs to workspace
    const account = await this.findByIdIncludingClosed(account_id, workspaceId);
    if (!account) {
      throw new Error('Account not found');
    }

    return trackQuery('AccountService.getHistory', perf, async () => {
      const history = await this.db.query.accountHistory.findMany({
        where: eq(this.schema.accountHistory.account_id, account_id),
        orderBy: (accountHistory: any, { desc }: any) => [desc(accountHistory.recorded_at)],
        ...(limit ? { limit } : {}),
      });

      return history;
    });
  }

  /**
   * Get the latest balance snapshot for each account within a given month.
   * For each account, returns the most recent history entry where recorded_at <= end of month.
   * If no entry exists, falls back to initial_balance or current balance.
   */
  async getSnapshotForMonth(
    workspaceId: string,
    year: number,
    month: number,
    filters?: {
      type?: AccountType;
      category_id?: string;
      currency?: Currency;
      owner_user_id?: string;
    },
    perf?: PerfCollector
  ) {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return trackQuery('AccountService.getSnapshotForMonth', perf, async () => {
      const allAccounts = await this.findAll(workspaceId, { ...filters, includeInactive: true });

      // Filter out accounts created after the snapshot month
      const accountsExistingAtTime = allAccounts.filter(
        (account) => new Date(account.created_at) <= endOfMonth
      );
      perf?.recordPhase(
        'AccountService.getSnapshotForMonth.accountCount',
        accountsExistingAtTime.length
      );

      if (accountsExistingAtTime.length === 0) {
        return [];
      }

      // Fetch one latest history row per account, chunked to avoid parameter limits.
      // Two-step approach: 1) get max recorded_at per account, 2) fetch full rows.
      // This avoids dialect-specific raw SQL (DISTINCT ON for PG, self-join for SQLite)
      // and works through Drizzle's query builder on all drivers.
      const accountIds = accountsExistingAtTime.map((a) => a.id);
      const idChunks = this.chunkIds(accountIds, 500);
      perf?.recordPhase('AccountService.getSnapshotForMonth.chunkCount', idChunks.length);
      const historyTable = this.schema.accountHistory;
      // SQLite stores timestamps as integers (epoch milliseconds via sqliteTimestampNow)
      // — raw sql templates need a primitive, not a Date object.
      const endOfMonthEpoch = endOfMonth.getTime();
      const allHistory: Array<{ account_id: string; balance: string; recorded_at: Date }> = [];

      for (const chunk of idChunks) {
        // Step 1: Get the max recorded_at per account_id
        const maxDates = await (this.db as any)
          .select({
            account_id: historyTable.account_id,
            max_recorded_at: sql<string>`MAX(${historyTable.recorded_at})`.as('max_recorded_at'),
          })
          .from(historyTable)
          .where(
            and(
              inArray(historyTable.account_id, chunk),
              sql`${historyTable.recorded_at} <= ${endOfMonthEpoch}`
            )
          )
          .groupBy(historyTable.account_id);

        if (maxDates.length === 0) continue;

        // Step 2: Fetch full rows matching (account_id, max_recorded_at) pairs
        const conditions = maxDates.map(
          (row: any) =>
            sql`(${historyTable.account_id} = ${row.account_id} AND ${historyTable.recorded_at} = ${row.max_recorded_at})`
        );

        const rows = await (this.db as any)
          .select({
            account_id: historyTable.account_id,
            balance: historyTable.balance,
            recorded_at: historyTable.recorded_at,
          })
          .from(historyTable)
          .where(sql.join(conditions, sql` OR `));

        for (const row of rows) {
          allHistory.push({
            account_id: row.account_id,
            balance: row.balance,
            recorded_at:
              row.recorded_at instanceof Date ? row.recorded_at : new Date(row.recorded_at),
          });
        }
      }
      perf?.recordPhase('AccountService.getSnapshotForMonth.historyRowsFetched', allHistory.length);

      // Build lookup map: keep only the most recent entry per account
      const historyMap = new Map<string, (typeof allHistory)[0]>();
      for (const history of allHistory) {
        const existing = historyMap.get(history.account_id);
        if (!existing || history.recorded_at > existing.recorded_at) {
          historyMap.set(history.account_id, history);
        }
      }

      // Map accounts to snapshots with O(1) lookups
      const snapshots = accountsExistingAtTime.map((account) => {
        const history = historyMap.get(account.id);

        return {
          ...account,
          snapshot_balance: history?.balance ?? account.initial_balance ?? account.balance,
          snapshot_date: history?.recorded_at || account.created_at,
        };
      });

      return snapshots;
    });
  }

  /**
   * Get total accounts by currency
   */
  async getTotalByCurrency(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('AccountService.getTotalByCurrency', perf, async () => {
      const result = await (this.db as any)
        .select({
          currency: this.schema.accounts.currency,
          total: sql<string>`sum(CAST(${this.schema.accounts.balance} AS NUMERIC))`,
        })
        .from(this.schema.accounts)
        .where(
          and(
            eq(this.schema.accounts.workspace_id, workspaceId),
            sql`${this.schema.accounts.deleted_at} IS NULL`,
            eq(this.schema.accounts.status, 'active')
          )
        )
        .groupBy(this.schema.accounts.currency);

      return result;
    });
  }

  /**
   * Get total accounts by type
   */
  async getTotalByType(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('AccountService.getTotalByType', perf, async () => {
      const result = await (this.db as any)
        .select({
          type: this.schema.accounts.type,
          currency: this.schema.accounts.currency,
          total: sql<string>`sum(CAST(${this.schema.accounts.balance} AS NUMERIC))`,
          count: sql<number>`count(*)`,
        })
        .from(this.schema.accounts)
        .where(
          and(
            eq(this.schema.accounts.workspace_id, workspaceId),
            sql`${this.schema.accounts.deleted_at} IS NULL`,
            eq(this.schema.accounts.status, 'active')
          )
        )
        .groupBy(this.schema.accounts.type, this.schema.accounts.currency);

      return result;
    });
  }

  /**
   * Get total balances by account class and currency.
   * Used for portfolio summary: Accounts (liquid+non_liquid) vs Debt.
   */
  async getTotalByClass(
    workspaceId: string,
    perf?: PerfCollector
  ): Promise<Array<{ account_class: string; currency: string; total: string; count: number }>> {
    return trackQuery('AccountService.getTotalByClass', perf, async () => {
      const result = await (this.db as any)
        .select({
          account_class: this.schema.accounts.account_class,
          currency: this.schema.accounts.currency,
          total: sql<string>`sum(CAST(${this.schema.accounts.balance} AS NUMERIC))`,
          count: sql<number>`count(*)`,
        })
        .from(this.schema.accounts)
        .where(
          and(
            eq(this.schema.accounts.workspace_id, workspaceId),
            sql`${this.schema.accounts.deleted_at} IS NULL`,
            eq(this.schema.accounts.status, 'active')
          )
        )
        .groupBy(this.schema.accounts.account_class, this.schema.accounts.currency);

      return result;
    });
  }

  /**
   * Find all closed accounts for a workspace
   */
  async findAllClosed(
    workspaceId: string,
    filters?: {
      type?: AccountType;
      currency?: Currency;
    },
    perf?: PerfCollector
  ) {
    const conditions = [
      eq(this.schema.accounts.workspace_id, workspaceId),
      eq(this.schema.accounts.status, 'closed'),
      sql`${this.schema.accounts.deleted_at} IS NULL`,
    ];

    if (filters?.type) {
      conditions.push(eq(this.schema.accounts.type, filters.type));
    }
    if (filters?.currency) {
      conditions.push(eq(this.schema.accounts.currency, filters.currency));
    }

    return trackQuery('AccountService.findAllClosed', perf, async () => {
      return this.db.query.accounts.findMany({
        where: and(...conditions),
        orderBy: (_accounts: any, { desc }: any) => [desc(this.schema.accounts.closed_at)],
      });
    });
  }

  /**
   * Get all accounts with their history for forecast calculations
   */
  async findAllWithHistory(workspaceId: string, perf?: PerfCollector) {
    const allAccounts = await this.findAll(workspaceId);
    perf?.recordPhase('AccountService.findAllWithHistory.accountCount', allAccounts.length);

    if (allAccounts.length === 0) {
      return [];
    }

    // Bulk query: fetch all history for all accounts in one query
    const accountIds = allAccounts.map((a) => a.id);
    const idChunks = this.chunkIds(accountIds, 500);
    perf?.recordPhase('AccountService.findAllWithHistory.chunkCount', idChunks.length);
    const historyResults = await Promise.all(
      idChunks.map((chunk) =>
        this.db.query.accountHistory.findMany({
          where: inArray(this.schema.accountHistory.account_id, chunk),
          orderBy: (accountHistory: any, { asc }: any) => [asc(accountHistory.recorded_at)],
        })
      )
    );
    const allHistory = historyResults.flat();
    allHistory.sort((a, b) => a.recorded_at.getTime() - b.recorded_at.getTime());
    perf?.recordPhase('AccountService.findAllWithHistory.historyRowsFetched', allHistory.length);

    // Group history by account_id
    const historyMap = new Map<string, Array<{ date: Date; amount: number }>>();
    for (const h of allHistory) {
      if (!historyMap.has(h.account_id)) {
        historyMap.set(h.account_id, []);
      }
      historyMap.get(h.account_id)!.push({
        date: h.recorded_at,
        amount: parseFloat(h.balance),
      });
    }

    // Map accounts to their history arrays
    const accountsWithHistory = allAccounts.map((account) => ({
      ...account,
      history: historyMap.get(account.id) || [],
    }));

    return accountsWithHistory;
  }

  /**
   * Calculate balance from transactions (reference only, not stored).
   * calculated = initial_balance + SUM(income) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out)
   */
  /**
   * Get the last recorded balance before the start of a given month.
   * Returns the balance from the most recent history entry before the month,
   * or falls back to initial_balance if no history exists.
   */
  async getLastBalanceBefore(
    accountId: string,
    workspaceId: string,
    year: number,
    month: number
  ): Promise<string | null> {
    const account = await this.findByIdIncludingClosed(accountId, workspaceId);
    if (!account) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    const startOfMonthMs = new Date(year, month - 1, 1).getTime();

    const lastEntry = await this.db.query.accountHistory.findFirst({
      where: and(
        eq(this.schema.accountHistory.account_id, accountId),
        sql`${this.schema.accountHistory.recorded_at} < ${startOfMonthMs}`
      ),
      orderBy: (h: any, { desc }: any) => [desc(h.recorded_at)],
    });

    return lastEntry?.balance ?? account.initial_balance ?? null;
  }

  /**
   * Transfer account ownership to a different user.
   * Admin-only check is enforced at API layer.
   */
  async transferOwnership(accountId: string, newOwnerId: string, workspaceId: string) {
    const account = await this.findByIdIncludingClosed(accountId, workspaceId);
    if (!account) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    await this.db
      .update(this.schema.accounts)
      .set({
        created_by_user_id: newOwnerId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(this.schema.accounts.id, accountId),
          eq(this.schema.accounts.workspace_id, workspaceId)
        )
      );

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }
  }

  /**
   * Get account counts grouped by category ID
   */
  async countClosed(workspaceId: string, ownerUserId?: string): Promise<number> {
    const conditions = [
      eq(this.schema.accounts.workspace_id, workspaceId),
      eq(this.schema.accounts.status, 'closed'),
      sql`${this.schema.accounts.deleted_at} IS NULL`,
    ];

    if (ownerUserId) {
      conditions.push(eq(this.schema.accounts.created_by_user_id, ownerUserId));
    }

    const result = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(this.schema.accounts)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async countByCategory(workspaceId: string) {
    const result = await (this.db as any)
      .select({
        category_id: this.schema.accounts.category_id,
        count: sql<number>`count(*)`,
      })
      .from(this.schema.accounts)
      .where(
        and(
          eq(this.schema.accounts.workspace_id, workspaceId),
          sql`${this.schema.accounts.deleted_at} IS NULL`,
          eq(this.schema.accounts.status, 'active'),
          sql`${this.schema.accounts.category_id} IS NOT NULL`
        )
      )
      .groupBy(this.schema.accounts.category_id);

    return result as Array<{ category_id: string; count: number }>;
  }
}
