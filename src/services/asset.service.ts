import { type IDatabase, getActiveSchema } from '@/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AssetServiceError, ServiceErrorCode } from './service-errors';
import type { AssetType, Currency } from '@/lib/types/asset';
import { type PerfCollector, trackQuery } from '@/lib/perf';

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
  private schema = getActiveSchema();

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
   * Find asset by ID
   */
  async findById(id: string, workspaceId: string) {
    const result = await this.db.query.assets.findFirst({
      where: and(
        eq(this.schema.assets.id, id),
        eq(this.schema.assets.workspace_id, workspaceId),
        sql`${this.schema.assets.deleted_at} IS NULL`
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
    },
    perf?: PerfCollector
  ) {
    const conditions = [
      eq(this.schema.assets.workspace_id, workspaceId),
      sql`${this.schema.assets.deleted_at} IS NULL`,
    ];

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

    return this.findById(id, workspaceId);
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
    const currentAsset = await this.findById(id, workspaceId);
    if (!currentAsset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
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
   * Delete asset (soft delete)
   */
  async delete(id: string, workspaceId: string) {
    // Check if asset exists
    const asset = await this.findById(id, workspaceId);
    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    await this.db
      .update(this.schema.assets)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    return { success: true };
  }

  /**
   * Get asset history
   */
  async getHistory(asset_id: string, workspaceId: string, perf?: PerfCollector) {
    // Verify asset belongs to workspace
    const asset = await this.findById(asset_id, workspaceId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    return trackQuery('AssetService.getHistory', perf, async () => {
      const history = await this.db.query.assetHistory.findMany({
        where: eq(this.schema.assetHistory.asset_id, asset_id),
        orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
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
      const allAssets = await this.findAll(workspaceId, filters);

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
            sql`${this.schema.assets.deleted_at} IS NULL`
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
            sql`${this.schema.assets.deleted_at} IS NULL`
          )
        )
        .groupBy(this.schema.assets.type, this.schema.assets.currency);

      return result;
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
          sql`${this.schema.assets.category_id} IS NOT NULL`
        )
      )
      .groupBy(this.schema.assets.category_id);

    return result as Array<{ category_id: string; count: number }>;
  }
}
