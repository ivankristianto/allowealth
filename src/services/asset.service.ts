import { type IDatabase, getActiveSchema, runTransaction, assets as assetsTable } from '@/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AssetServiceError, ServiceErrorCode } from './service-errors';
import type { AssetType, Currency } from '@/lib/types/asset';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { decimalCompare } from '@/lib/utils/decimal';

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

  /**
   * Create a new AssetService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new asset
   *
   * Note: Using sequential inserts instead of transaction because
   * better-sqlite3 with Drizzle doesn't support async transaction callbacks.
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

    return trackQuery('AssetService.findAll', perf, async () => {
      const result = await this.db.query.assets.findMany({
        where: and(...conditions),
        orderBy: (_assets: any, { asc }: any) => [asc(this.schema.assets.name)],
      });

      return result;
    });
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
    if (input.type !== undefined) updateData.type = input.type;
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

    return this.findByIdIncludingClosed(id, workspaceId);
  }

  /**
   * Update asset balance and create history entry
   *
   * Note: Using sequential operations instead of transaction because
   * better-sqlite3 with Drizzle doesn't support async transaction callbacks.
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

    return this.findById(id, workspaceId);
  }

  /**
   * Transfer balance between two assets of the same currency.
   * Uses a database transaction for atomicity.
   */
  async transfer(
    fromId: string,
    toId: string,
    amount: string,
    notes: string | undefined,
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

    if (decimalCompare(fromAsset.balance, amount) < 0) {
      throw new Error('Insufficient balance');
    }

    const now = new Date();
    const fromNote = notes ? `Transfer out: ${notes}` : `Transfer to ${toAsset.name}`;
    const toNote = notes ? `Transfer in: ${notes}` : `Transfer from ${fromAsset.name}`;

    await runTransaction(this.db, async (tx) => {
      // Deduct from source using relative update to prevent lost-update race condition.
      // The WHERE guard ensures balance cannot go negative even under concurrent access.
      const deductResult: { balance: string }[] = await (tx as any)
        .update(this.schema.assets)
        .set({
          balance: sql`CAST(CAST(${this.schema.assets.balance} AS REAL) - CAST(${amount} AS REAL) AS TEXT)`,
          last_updated: now,
          updated_at: now,
        })
        .where(
          and(
            eq(this.schema.assets.id, fromId),
            eq(this.schema.assets.workspace_id, workspaceId),
            sql`CAST(${this.schema.assets.balance} AS REAL) >= CAST(${amount} AS REAL)`
          )
        )
        .returning({ balance: this.schema.assets.balance });

      if (!deductResult.length) {
        throw new Error('Insufficient balance');
      }

      await (tx as any).insert(this.schema.assetHistory).values({
        id: nanoid(),
        asset_id: fromId,
        balance: deductResult[0].balance,
        notes: fromNote,
        recorded_at: now,
      });

      // Add to target using relative update
      const addResult: { balance: string }[] = await (tx as any)
        .update(this.schema.assets)
        .set({
          balance: sql`CAST(CAST(${this.schema.assets.balance} AS REAL) + CAST(${amount} AS REAL) AS TEXT)`,
          last_updated: now,
          updated_at: now,
        })
        .where(
          and(eq(this.schema.assets.id, toId), eq(this.schema.assets.workspace_id, workspaceId))
        )
        .returning({ balance: this.schema.assets.balance });

      if (!addResult.length) {
        throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
      }

      await (tx as any).insert(this.schema.assetHistory).values({
        id: nanoid(),
        asset_id: toId,
        balance: addResult[0].balance,
        notes: toNote,
        recorded_at: now,
      });
    });

    // Return updated assets after the transaction
    const updatedFrom = await this.findById(fromId, workspaceId);
    const updatedTo = await this.findById(toId, workspaceId);

    return { fromAsset: updatedFrom, toAsset: updatedTo };
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

      const snapshots = await Promise.all(
        assetsExistingAtTime.map(async (asset) => {
          const history = await this.db.query.assetHistory.findFirst({
            where: and(
              eq(this.schema.assetHistory.asset_id, asset.id),
              // Use Drizzle's lte() for cross-database compatibility
              // (SQLite stores as integer epoch, PostgreSQL as native timestamp)
              lte(this.schema.assetHistory.recorded_at, endOfMonth)
            ),
            orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
          });

          return {
            ...asset,
            snapshot_balance: history?.balance ?? asset.initial_balance ?? asset.balance,
            snapshot_date: history?.recorded_at || asset.created_at,
          };
        })
      );

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
          total: sql<string>`sum(CAST(${this.schema.assets.balance} AS REAL))`,
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
          total: sql<string>`sum(CAST(${this.schema.assets.balance} AS REAL))`,
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
  async findAllWithHistory(workspaceId: string) {
    const allAssets = await this.findAll(workspaceId);

    const assetsWithHistory = await Promise.all(
      allAssets.map(async (asset) => {
        const history = await this.db.query.assetHistory.findMany({
          where: eq(this.schema.assetHistory.asset_id, asset.id),
          orderBy: (assetHistory: any, { asc }: any) => [asc(assetHistory.recorded_at)],
        });

        return {
          ...asset,
          history: history.map((h) => ({
            date: h.recorded_at,
            amount: parseFloat(h.balance),
          })),
        };
      })
    );

    return assetsWithHistory;
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
