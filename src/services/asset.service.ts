import { assets, assetHistory, type IDatabase } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AssetServiceError, ServiceErrorCode } from './service-errors';
import type { AssetType, Currency } from '@/lib/types/asset';

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
}

export class AssetService {
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
      .insert(assets)
      .values({
        id,
        workspace_id: input.workspace_id,
        created_by_user_id: input.created_by_user_id,
        name: input.name,
        type: input.type,
        category_id: input.category_id ?? null,
        balance: input.balance,
        currency: input.currency,
        last_updated: now,
        created_at: now,
        updated_at: now,
      })
      .returning();

    // Create initial history entry with compensating transaction on failure
    try {
      await (this.db as any).insert(assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        recorded_at: now,
      });
    } catch (historyError) {
      // Compensating transaction: delete the orphaned asset to maintain data integrity
      await this.db.delete(assets).where(eq(assets.id, id));
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
        eq(assets.id, id),
        eq(assets.workspace_id, workspaceId),
        sql`${assets.deleted_at} IS NULL`
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
    }
  ) {
    const conditions = [eq(assets.workspace_id, workspaceId), sql`${assets.deleted_at} IS NULL`];

    if (filters?.type) {
      conditions.push(eq(assets.type, filters.type));
    }

    if (filters?.category_id) {
      conditions.push(eq(assets.category_id, filters.category_id));
    }

    if (filters?.currency) {
      conditions.push(eq(assets.currency, filters.currency));
    }

    const result = await this.db.query.assets.findMany({
      where: and(...conditions),
      orderBy: (assets: any, { asc }: any) => [asc(assets.name)],
    });

    return result;
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
      .update(assets)
      .set(updateData)
      .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId)));

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
      .update(assets)
      .set({
        balance: input.balance,
        last_updated: now,
        updated_at: now,
      })
      .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId)));

    // Create history entry with compensating transaction on failure
    try {
      await (this.db as any).insert(assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        notes: input.notes,
        recorded_at: now,
      });
    } catch (historyError) {
      // Compensating transaction: rollback the balance update
      await this.db
        .update(assets)
        .set({
          balance: previousBalance,
          last_updated: previousLastUpdated,
          updated_at: previousUpdatedAt,
        })
        .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId)));
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
      .update(assets)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId)));

    return { success: true };
  }

  /**
   * Get asset history
   */
  async getHistory(asset_id: string, workspaceId: string) {
    // Verify asset belongs to workspace
    const asset = await this.findById(asset_id, workspaceId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const history = await this.db.query.assetHistory.findMany({
      where: eq(assetHistory.asset_id, asset_id),
      orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
    });

    return history;
  }

  /**
   * Get total assets by currency
   */
  async getTotalByCurrency(workspaceId: string) {
    const result = await (this.db as any)
      .select({
        currency: assets.currency,
        total: sql<string>`sum(CAST(${assets.balance} AS REAL))`,
      })
      .from(assets)
      .where(and(eq(assets.workspace_id, workspaceId), sql`${assets.deleted_at} IS NULL`))
      .groupBy(assets.currency);

    return result;
  }

  /**
   * Get total assets by type
   */
  async getTotalByType(workspaceId: string) {
    const result = await (this.db as any)
      .select({
        type: assets.type,
        currency: assets.currency,
        total: sql<string>`sum(CAST(${assets.balance} AS REAL))`,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(and(eq(assets.workspace_id, workspaceId), sql`${assets.deleted_at} IS NULL`))
      .groupBy(assets.type, assets.currency);

    return result;
  }

  /**
   * Get all assets with their history for forecast calculations
   */
  async findAllWithHistory(workspaceId: string) {
    const allAssets = await this.findAll(workspaceId);

    const assetsWithHistory = await Promise.all(
      allAssets.map(async (asset) => {
        const history = await this.db.query.assetHistory.findMany({
          where: eq(assetHistory.asset_id, asset.id),
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
        category_id: assets.category_id,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(
        and(
          eq(assets.workspace_id, workspaceId),
          sql`${assets.deleted_at} IS NULL`,
          sql`${assets.category_id} IS NOT NULL`
        )
      )
      .groupBy(assets.category_id);

    return result as Array<{ category_id: string; count: number }>;
  }
}
