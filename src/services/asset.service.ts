import { assets, assetHistory, type IDatabase } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AssetServiceError, ServiceErrorCode } from './service-errors';

export interface CreateAssetInput {
  user_id: string;
  name: string;
  type: 'bank_account' | 'mutual_fund' | 'bond' | 'crypto' | 'stock' | 'other';
  balance: string;
  currency: 'IDR' | 'USD';
}

export interface UpdateAssetInput {
  name?: string;
  type?: 'bank_account' | 'mutual_fund' | 'bond' | 'crypto' | 'stock' | 'other';
  balance?: string;
  currency?: 'IDR' | 'USD';
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
   */
  async create(input: CreateAssetInput) {
    const id = nanoid();
    const now = new Date();

    return await this.db.transaction(async (tx: any) => {
      const [asset] = await tx
        .insert(assets)
        .values({
          id,
          user_id: input.user_id,
          name: input.name,
          type: input.type,
          balance: input.balance,
          currency: input.currency,
          last_updated: now,
          created_at: now,
          updated_at: now,
        })
        .returning();

      // Create initial history entry
      await tx.insert(assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        recorded_at: now,
      });

      return asset;
    });
  }

  /**
   * Find asset by ID
   */
  async findById(id: string, user_id: string) {
    const result = await this.db.query.assets.findFirst({
      where: and(eq(assets.id, id), eq(assets.user_id, user_id), sql`${assets.deleted_at} IS NULL`),
    });

    return result;
  }

  /**
   * Find all assets for a user
   */
  async findAll(
    user_id: string,
    filters?: {
      type?: 'bank_account' | 'mutual_fund' | 'bond' | 'crypto' | 'stock' | 'other';
      currency?: 'IDR' | 'USD';
    }
  ) {
    const conditions = [eq(assets.user_id, user_id), sql`${assets.deleted_at} IS NULL`];

    if (filters?.type) {
      conditions.push(eq(assets.type, filters.type));
    }

    if (filters?.currency) {
      conditions.push(eq(assets.currency, filters.currency));
    }

    const result = await this.db.query.assets.findMany({
      where: and(...conditions),
      orderBy: (assets, { asc }) => [asc(assets.name)],
    });

    return result;
  }

  /**
   * Update asset details
   */
  async update(id: string, user_id: string, input: UpdateAssetInput) {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.currency !== undefined) updateData.currency = input.currency;

    // If balance is updated, also update last_updated timestamp
    if (input.balance !== undefined) {
      updateData.balance = input.balance;
      updateData.last_updated = new Date();
    }

    await this.db
      .update(assets)
      .set(updateData)
      .where(and(eq(assets.id, id), eq(assets.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Update asset balance and create history entry
   */
  async updateBalance(id: string, user_id: string, input: UpdateAssetBalanceInput) {
    const now = new Date();

    await this.db.transaction(async (tx: any) => {
      // Update asset
      await tx
        .update(assets)
        .set({
          balance: input.balance,
          last_updated: now,
          updated_at: now,
        })
        .where(and(eq(assets.id, id), eq(assets.user_id, user_id)));

      // Create history entry
      await tx.insert(assetHistory).values({
        id: nanoid(),
        asset_id: id,
        balance: input.balance,
        notes: input.notes,
        recorded_at: now,
      });
    });

    return this.findById(id, user_id);
  }

  /**
   * Delete asset (soft delete)
   */
  async delete(id: string, user_id: string) {
    // Check if asset exists
    const asset = await this.findById(id, user_id);
    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    await this.db
      .update(assets)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.user_id, user_id)));

    return { success: true };
  }

  /**
   * Get asset history
   */
  async getHistory(asset_id: string, user_id: string) {
    // Verify asset belongs to user
    const asset = await this.findById(asset_id, user_id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const history = await this.db.query.assetHistory.findMany({
      where: eq(assetHistory.asset_id, asset_id),
      orderBy: (assetHistory, { desc }) => [desc(assetHistory.recorded_at)],
    });

    return history;
  }

  /**
   * Get total assets by currency
   */
  async getTotalByCurrency(user_id: string) {
    const result = await (this.db as any)
      .select({
        currency: assets.currency,
        total: sql<string>`sum(CAST(${assets.balance} AS REAL))`,
      })
      .from(assets)
      .where(and(eq(assets.user_id, user_id), sql`${assets.deleted_at} IS NULL`))
      .groupBy(assets.currency);

    return result;
  }

  /**
   * Get total assets by type
   */
  async getTotalByType(user_id: string) {
    const result = await (this.db as any)
      .select({
        type: assets.type,
        currency: assets.currency,
        total: sql<string>`sum(CAST(${assets.balance} AS REAL))`,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(and(eq(assets.user_id, user_id), sql`${assets.deleted_at} IS NULL`))
      .groupBy(assets.type, assets.currency);

    return result;
  }
}
