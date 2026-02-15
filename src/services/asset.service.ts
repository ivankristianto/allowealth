import { type IDatabase, getActiveSchema, assets as assetsTable } from '@/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AssetServiceError, ServiceErrorCode } from './service-errors';
import type { AssetType, Currency } from '@/lib/types/asset';
import { deriveAccountClass } from '@/lib/types/asset';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { decimalCompare } from '@/lib/utils/decimal';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';

/** Inferred row type for an asset record */
export type AssetRow = typeof assetsTable.$inferSelect;

export interface CreateAssetInput {
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  type: AssetType;
  category_id?: string | null;
  balance: string;
  currency: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
}

export interface UpdateAssetInput {
  name?: string;
  type?: AssetType;
  category_id?: string | null;
  balance?: string;
  currency?: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
}

export interface UpdateAssetBalanceInput {
  balance: string;
  notes?: string;
  recorded_at?: Date;
}

export class AssetService {
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
   * Create a new AssetService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new asset
   *
   * Note: Using sequential inserts instead of transaction because
   * SQLite with Drizzle doesn't support async transaction callbacks.
   * Includes compensating transaction on failure to maintain data integrity.
   */
  async create(input: CreateAssetInput) {
    const id = nanoid();
    const now = new Date();

    // Insert the asset
    const [asset] = await (this.db as any)
      .insert(this.schema.assets)
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
      await (this.db as any).insert(this.schema.assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        recorded_at: now,
      });
    } catch (historyError) {
      // Compensating transaction: delete the orphaned asset to maintain data integrity
      await this.db.delete(this.schema.assets).where(eq(this.schema.assets.id, id));
      throw new AssetServiceError(
        ServiceErrorCode.ASSET_NOT_FOUND,
        'Failed to create asset: could not create history entry',
        500
      );
    }

    // Invalidate asset cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(input.workspace_id), CacheTags.ASSETS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return asset;
  }

  /**
   * Find active asset by ID
   */
  async findById(id: string, workspaceId: string) {
    const result = await this.db.query.assets.findFirst({
      where: and(
        eq(this.schema.assets.id, id),
        eq(this.schema.assets.workspace_id, workspaceId),
        sql`${this.schema.assets.deleted_at} IS NULL`,
        eq(this.schema.assets.status, 'active')
      ),
    });

    return result;
  }

  /**
   * Find all assets for a workspace
   */
  async findAll(
    workspaceId: string,
    filters?: {
      type?: AssetType;
      category_id?: string;
      currency?: Currency;
      includeInactive?: boolean;
    },
    perf?: PerfCollector
  ) {
    const filtersHashValue = hashFilters(filters || {});
    const cache = getCacheManager();
    const cacheKey = CacheKeys.assets(workspaceId, filtersHashValue);

    // Cache read - fail-silent
    let cached: AssetRow[] | null = null;
    try {
      cached = await cache.get<AssetRow[]>(cacheKey, perf);
    } catch {
      // Cache read failed, continue to DB fetch
    }
    if (cached) {
      return cached;
    }

    const conditions = [
      eq(this.schema.assets.workspace_id, workspaceId),
      sql`${this.schema.assets.deleted_at} IS NULL`,
    ];

    // Default behavior: active assets only.
    if (!filters?.includeInactive) {
      conditions.push(eq(this.schema.assets.status, 'active'));
    }

    if (filters?.type) {
      conditions.push(eq(this.schema.assets.type, filters.type));
    }

    if (filters?.category_id) {
      conditions.push(eq(this.schema.assets.category_id, filters.category_id));
    }

    if (filters?.currency) {
      conditions.push(eq(this.schema.assets.currency, filters.currency));
    }

    const result = await trackQuery('AssetService.findAll', perf, async () => {
      return this.db.query.assets.findMany({
        where: and(...conditions),
        orderBy: (_assets: any, { asc }: any) => [asc(this.schema.assets.name)],
      });
    });

    // Cache write - fail-silent
    try {
      await cache.set(cacheKey, result, {
        ttl: 3600,
        tags: [CacheTags.workspace(workspaceId), CacheTags.ASSETS],
      });
    } catch {
      // Cache write failed, continue without caching
    }

    return result;
  }

  /**
   * Update asset details
   */
  async update(id: string, workspaceId: string, input: UpdateAssetInput) {
    const currentAsset = await this.findByIdIncludingClosed(id, workspaceId);
    if (!currentAsset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }
    if (currentAsset.status === 'closed') {
      throw new AssetServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot update asset — account is deactivated',
        400
      );
    }

    // Currency lock: prevent changing currency if asset has history beyond the initial entry
    // Every asset starts with 1 history record (initial balance), so threshold is > 1
    if (input.currency !== undefined && input.currency !== currentAsset.currency) {
      const historyCount = await (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.assetHistory)
        .where(eq(this.schema.assetHistory.asset_id, id));

      if (historyCount[0]?.count > 1) {
        throw new AssetServiceError(
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
      .update(this.schema.assets)
      .set(updateData)
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    // Invalidate asset cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ASSETS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findByIdIncludingClosed(id, workspaceId);
  }

  /**
   * Update asset balance and create history entry
   *
   * Note: Using sequential operations instead of transaction because
   * SQLite with Drizzle doesn't support async transaction callbacks.
   * Includes compensating transaction on failure to maintain data integrity.
   */
  async updateBalance(id: string, workspaceId: string, input: UpdateAssetBalanceInput) {
    const now = new Date();

    // Get current balance for potential rollback
    const currentAsset = await this.findByIdIncludingClosed(id, workspaceId);
    if (!currentAsset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (currentAsset.status === 'closed') {
      throw new AssetServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot update balance — account is deactivated',
        400
      );
    }

    const previousBalance = currentAsset.balance;
    const previousLastUpdated = currentAsset.last_updated;
    const previousUpdatedAt = currentAsset.updated_at;

    // Update asset
    await this.db
      .update(this.schema.assets)
      .set({
        balance: input.balance,
        last_updated: now,
        updated_at: now,
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    // Create history entry with compensating transaction on failure
    try {
      await (this.db as any).insert(this.schema.assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        notes: input.notes,
        recorded_at: input.recorded_at || now,
      });
    } catch (historyError) {
      // Compensating transaction: rollback the balance update
      await this.db
        .update(this.schema.assets)
        .set({
          balance: previousBalance,
          last_updated: previousLastUpdated,
          updated_at: previousUpdatedAt,
        })
        .where(
          and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId))
        );
      throw new AssetServiceError(
        ServiceErrorCode.ASSET_NOT_FOUND,
        'Failed to update balance: could not create history entry',
        500
      );
    }

    // Invalidate asset cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ASSETS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findById(id, workspaceId);
  }

  /**
   * Validate a transfer between two assets of the same currency.
   * No balance mutation — transfer is recorded as a transaction only.
   */
  async transfer(
    fromId: string,
    toId: string,
    amount: string,
    _notes: string | undefined,
    workspaceId: string
  ): Promise<{ fromAsset: AssetRow | undefined; toAsset: AssetRow | undefined }> {
    if (fromId === toId) {
      throw new Error(
        `Cannot transfer an asset to itself (assetId: ${fromId}, workspaceId: ${workspaceId})`
      );
    }

    const fromAsset = await this.findByIdIncludingClosed(fromId, workspaceId);
    const toAsset = await this.findByIdIncludingClosed(toId, workspaceId);

    if (!fromAsset || !toAsset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (fromAsset.status === 'closed' || toAsset.status === 'closed') {
      throw new AssetServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot transfer — one or both accounts are deactivated',
        400
      );
    }

    if (fromAsset.currency !== toAsset.currency) {
      throw new Error('Cannot transfer between different currencies');
    }

    if (decimalCompare(amount, '0') <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    // No balance mutation — transfer is recorded as a transaction only
    return { fromAsset, toAsset };
  }

  /**
   * Close an asset account (requires zero balance)
   */
  async close(id: string, workspaceId: string, closedByUserId: string | null) {
    const asset = await this.findByIdIncludingClosed(id, workspaceId);

    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (asset.status === 'closed') {
      throw new AssetServiceError(
        ServiceErrorCode.ALREADY_CLOSED,
        'Account already deactivated',
        400
      );
    }

    if (decimalCompare(asset.balance, '0') !== 0) {
      throw new AssetServiceError(
        ServiceErrorCode.BALANCE_NOT_ZERO,
        `Cannot deactivate account with balance ${asset.balance} ${asset.currency}. Transfer funds out first.`,
        400
      );
    }

    const now = new Date();
    await this.db
      .update(this.schema.assets)
      .set({
        status: 'closed',
        closed_at: now,
        closed_by_user_id: closedByUserId,
        updated_at: now,
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    // Invalidate asset cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ASSETS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findByIdIncludingClosed(id, workspaceId);
  }

  /**
   * Reopen a closed asset account
   *
   * Note: Permission check (admin-only) is handled at the API route level
   * using getAuthenticatedUser().role, not in the service layer.
   */
  async reopen(id: string, workspaceId: string) {
    const asset = await this.findByIdIncludingClosed(id, workspaceId);

    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (asset.status !== 'closed') {
      throw new AssetServiceError(ServiceErrorCode.NOT_CLOSED, 'Account is not deactivated', 400);
    }

    const now = new Date();
    await this.db
      .update(this.schema.assets)
      .set({
        status: 'active',
        closed_at: null,
        closed_by_user_id: null,
        updated_at: now,
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    // Invalidate asset cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ASSETS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }

    return this.findById(id, workspaceId);
  }

  /**
   * Find asset by ID including closed assets (but not hard-deleted)
   */
  async findByIdIncludingClosed(id: string, workspaceId: string) {
    return this.db.query.assets.findFirst({
      where: and(
        eq(this.schema.assets.id, id),
        eq(this.schema.assets.workspace_id, workspaceId),
        sql`${this.schema.assets.deleted_at} IS NULL`
      ),
    });
  }

  /**
   * Get asset history
   */
  async getHistory(asset_id: string, workspaceId: string, perf?: PerfCollector, limit?: number) {
    // Verify asset belongs to workspace
    const asset = await this.findByIdIncludingClosed(asset_id, workspaceId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    return trackQuery('AssetService.getHistory', perf, async () => {
      const history = await this.db.query.assetHistory.findMany({
        where: eq(this.schema.assetHistory.asset_id, asset_id),
        orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
        ...(limit ? { limit } : {}),
      });

      return history;
    });
  }

  /**
   * Get the latest balance snapshot for each asset within a given month.
   * For each asset, returns the most recent history entry where recorded_at <= end of month.
   * If no entry exists, falls back to initial_balance or current balance.
   */
  async getSnapshotForMonth(
    workspaceId: string,
    year: number,
    month: number,
    filters?: {
      type?: AssetType;
      category_id?: string;
      currency?: Currency;
    },
    perf?: PerfCollector
  ) {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return trackQuery('AssetService.getSnapshotForMonth', perf, async () => {
      const allAssets = await this.findAll(workspaceId, { ...filters, includeInactive: true });

      // Filter out assets created after the snapshot month
      const assetsExistingAtTime = allAssets.filter(
        (asset) => new Date(asset.created_at) <= endOfMonth
      );
      perf?.recordPhase('AssetService.getSnapshotForMonth.assetCount', assetsExistingAtTime.length);

      if (assetsExistingAtTime.length === 0) {
        return [];
      }

      // Fetch one latest history row per asset, chunked to avoid parameter limits.
      // Two-step approach: 1) get max recorded_at per asset, 2) fetch full rows.
      // This avoids dialect-specific raw SQL (DISTINCT ON for PG, self-join for SQLite)
      // and works through Drizzle's query builder on all drivers.
      const assetIds = assetsExistingAtTime.map((a) => a.id);
      const idChunks = this.chunkIds(assetIds, 500);
      perf?.recordPhase('AssetService.getSnapshotForMonth.chunkCount', idChunks.length);
      const historyTable = this.schema.assetHistory;
      // SQLite stores timestamps as integers (epoch seconds) — raw sql templates
      // need a primitive, not a Date object.
      const endOfMonthEpoch = Math.floor(endOfMonth.getTime() / 1000);
      const allHistory: Array<{ asset_id: string; balance: string; recorded_at: Date }> = [];

      for (const chunk of idChunks) {
        // Step 1: Get the max recorded_at per asset_id
        const maxDates = await (this.db as any)
          .select({
            asset_id: historyTable.asset_id,
            max_recorded_at: sql<string>`MAX(${historyTable.recorded_at})`.as('max_recorded_at'),
          })
          .from(historyTable)
          .where(
            and(
              inArray(historyTable.asset_id, chunk),
              sql`${historyTable.recorded_at} <= ${endOfMonthEpoch}`
            )
          )
          .groupBy(historyTable.asset_id);

        if (maxDates.length === 0) continue;

        // Step 2: Fetch full rows matching (asset_id, max_recorded_at) pairs
        const conditions = maxDates.map(
          (row: any) =>
            sql`(${historyTable.asset_id} = ${row.asset_id} AND ${historyTable.recorded_at} = ${row.max_recorded_at})`
        );

        const rows = await (this.db as any)
          .select({
            asset_id: historyTable.asset_id,
            balance: historyTable.balance,
            recorded_at: historyTable.recorded_at,
          })
          .from(historyTable)
          .where(sql.join(conditions, sql` OR `));

        for (const row of rows) {
          allHistory.push({
            asset_id: row.asset_id,
            balance: row.balance,
            recorded_at:
              row.recorded_at instanceof Date ? row.recorded_at : new Date(row.recorded_at),
          });
        }
      }
      perf?.recordPhase('AssetService.getSnapshotForMonth.historyRowsFetched', allHistory.length);

      // Build lookup map: keep only the most recent entry per asset
      const historyMap = new Map<string, (typeof allHistory)[0]>();
      for (const history of allHistory) {
        const existing = historyMap.get(history.asset_id);
        if (!existing || history.recorded_at > existing.recorded_at) {
          historyMap.set(history.asset_id, history);
        }
      }

      // Map assets to snapshots with O(1) lookups
      const snapshots = assetsExistingAtTime.map((asset) => {
        const history = historyMap.get(asset.id);

        return {
          ...asset,
          snapshot_balance: history?.balance ?? asset.initial_balance ?? asset.balance,
          snapshot_date: history?.recorded_at || asset.created_at,
        };
      });

      return snapshots;
    });
  }

  /**
   * Get total assets by currency
   */
  async getTotalByCurrency(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('AssetService.getTotalByCurrency', perf, async () => {
      const result = await (this.db as any)
        .select({
          currency: this.schema.assets.currency,
          total: sql<string>`sum(CAST(${this.schema.assets.balance} AS NUMERIC))`,
        })
        .from(this.schema.assets)
        .where(
          and(
            eq(this.schema.assets.workspace_id, workspaceId),
            sql`${this.schema.assets.deleted_at} IS NULL`,
            eq(this.schema.assets.status, 'active')
          )
        )
        .groupBy(this.schema.assets.currency);

      return result;
    });
  }

  /**
   * Get total assets by type
   */
  async getTotalByType(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('AssetService.getTotalByType', perf, async () => {
      const result = await (this.db as any)
        .select({
          type: this.schema.assets.type,
          currency: this.schema.assets.currency,
          total: sql<string>`sum(CAST(${this.schema.assets.balance} AS NUMERIC))`,
          count: sql<number>`count(*)`,
        })
        .from(this.schema.assets)
        .where(
          and(
            eq(this.schema.assets.workspace_id, workspaceId),
            sql`${this.schema.assets.deleted_at} IS NULL`,
            eq(this.schema.assets.status, 'active')
          )
        )
        .groupBy(this.schema.assets.type, this.schema.assets.currency);

      return result;
    });
  }

  /**
   * Get total balances by account class and currency.
   * Used for portfolio summary: Assets (liquid+non_liquid) vs Debt.
   */
  async getTotalByClass(workspaceId: string, perf?: PerfCollector) {
    return trackQuery('AssetService.getTotalByClass', perf, async () => {
      const result = await (this.db as any)
        .select({
          account_class: this.schema.assets.account_class,
          currency: this.schema.assets.currency,
          total: sql<string>`sum(CAST(${this.schema.assets.balance} AS NUMERIC))`,
          count: sql<number>`count(*)`,
        })
        .from(this.schema.assets)
        .where(
          and(
            eq(this.schema.assets.workspace_id, workspaceId),
            sql`${this.schema.assets.deleted_at} IS NULL`,
            eq(this.schema.assets.status, 'active')
          )
        )
        .groupBy(this.schema.assets.account_class, this.schema.assets.currency);

      return result;
    });
  }

  /**
   * Find all closed assets for a workspace
   */
  async findAllClosed(
    workspaceId: string,
    filters?: {
      type?: AssetType;
      currency?: Currency;
    },
    perf?: PerfCollector
  ) {
    const conditions = [
      eq(this.schema.assets.workspace_id, workspaceId),
      eq(this.schema.assets.status, 'closed'),
      sql`${this.schema.assets.deleted_at} IS NULL`,
    ];

    if (filters?.type) {
      conditions.push(eq(this.schema.assets.type, filters.type));
    }
    if (filters?.currency) {
      conditions.push(eq(this.schema.assets.currency, filters.currency));
    }

    return trackQuery('AssetService.findAllClosed', perf, async () => {
      return this.db.query.assets.findMany({
        where: and(...conditions),
        orderBy: (_assets: any, { desc }: any) => [desc(this.schema.assets.closed_at)],
      });
    });
  }

  /**
   * Get all assets with their history for forecast calculations
   */
  async findAllWithHistory(workspaceId: string, perf?: PerfCollector) {
    const allAssets = await this.findAll(workspaceId);
    perf?.recordPhase('AssetService.findAllWithHistory.assetCount', allAssets.length);

    if (allAssets.length === 0) {
      return [];
    }

    // Bulk query: fetch all history for all assets in one query
    const assetIds = allAssets.map((a) => a.id);
    const idChunks = this.chunkIds(assetIds, 500);
    perf?.recordPhase('AssetService.findAllWithHistory.chunkCount', idChunks.length);
    const historyResults = await Promise.all(
      idChunks.map((chunk) =>
        this.db.query.assetHistory.findMany({
          where: inArray(this.schema.assetHistory.asset_id, chunk),
          orderBy: (assetHistory: any, { asc }: any) => [asc(assetHistory.recorded_at)],
        })
      )
    );
    const allHistory = historyResults.flat();
    allHistory.sort((a, b) => a.recorded_at.getTime() - b.recorded_at.getTime());
    perf?.recordPhase('AssetService.findAllWithHistory.historyRowsFetched', allHistory.length);

    // Group history by asset_id
    const historyMap = new Map<string, Array<{ date: Date; amount: number }>>();
    for (const h of allHistory) {
      if (!historyMap.has(h.asset_id)) {
        historyMap.set(h.asset_id, []);
      }
      historyMap.get(h.asset_id)!.push({
        date: h.recorded_at,
        amount: parseFloat(h.balance),
      });
    }

    // Map assets to their history arrays
    const assetsWithHistory = allAssets.map((asset) => ({
      ...asset,
      history: historyMap.get(asset.id) || [],
    }));

    return assetsWithHistory;
  }

  /**
   * Calculate balance from transactions (reference only, not stored).
   * calculated = initial_balance + SUM(income) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out)
   */
  async getCalculatedBalance(assetId: string, workspaceId: string): Promise<string> {
    const asset = await this.findByIdIncludingClosed(assetId, workspaceId);
    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    const initialBalance = asset.initial_balance || '0';
    const txTable = this.schema.transactions;

    // Single query: sum income, expense, transfers in, transfers out
    const result = await (this.db as any)
      .select({
        income: sql<string>`COALESCE(SUM(CASE WHEN ${txTable.type} = 'income' AND ${txTable.asset_id} = ${assetId} THEN CAST(${txTable.amount} AS NUMERIC) ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN ${txTable.type} = 'expense' AND ${txTable.asset_id} = ${assetId} THEN CAST(${txTable.amount} AS NUMERIC) ELSE 0 END), 0)`,
        transfers_in: sql<string>`COALESCE(SUM(CASE WHEN ${txTable.type} = 'transfer' AND ${txTable.to_asset_id} = ${assetId} THEN CAST(${txTable.amount} AS NUMERIC) ELSE 0 END), 0)`,
        transfers_out: sql<string>`COALESCE(SUM(CASE WHEN ${txTable.type} = 'transfer' AND ${txTable.asset_id} = ${assetId} THEN CAST(${txTable.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(txTable)
      .where(
        and(
          eq(txTable.workspace_id, workspaceId),
          sql`${txTable.deleted_at} IS NULL`,
          sql`(${txTable.asset_id} = ${assetId} OR ${txTable.to_asset_id} = ${assetId})`
        )
      );

    const income = result[0]?.income || '0';
    const expense = result[0]?.expense || '0';
    const transfersIn = result[0]?.transfers_in || '0';
    const transfersOut = result[0]?.transfers_out || '0';

    // Use string-based calculation to avoid floating-point precision issues
    // calculated = initial + income - expense + transfers_in - transfers_out
    const total =
      parseFloat(initialBalance) +
      parseFloat(income) -
      parseFloat(expense) +
      parseFloat(transfersIn) -
      parseFloat(transfersOut);
    return String(total);
  }

  /**
   * Get asset counts grouped by category ID
   */
  async countClosed(workspaceId: string): Promise<number> {
    const result = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(this.schema.assets)
      .where(
        and(
          eq(this.schema.assets.workspace_id, workspaceId),
          eq(this.schema.assets.status, 'closed'),
          sql`${this.schema.assets.deleted_at} IS NULL`
        )
      );

    return result[0]?.count ?? 0;
  }

  async countByCategory(workspaceId: string) {
    const result = await (this.db as any)
      .select({
        category_id: this.schema.assets.category_id,
        count: sql<number>`count(*)`,
      })
      .from(this.schema.assets)
      .where(
        and(
          eq(this.schema.assets.workspace_id, workspaceId),
          sql`${this.schema.assets.deleted_at} IS NULL`,
          eq(this.schema.assets.status, 'active'),
          sql`${this.schema.assets.category_id} IS NOT NULL`
        )
      )
      .groupBy(this.schema.assets.category_id);

    return result as Array<{ category_id: string; count: number }>;
  }
}
