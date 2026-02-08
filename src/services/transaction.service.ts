import { type IDatabase, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('transaction');
import { eq, and, gte, lte, desc, asc, sql, like, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { CategoryService } from './category.service';
import { AssetService } from './asset.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/lib/validation/transactions';
import { TransactionServiceError, ServiceErrorCode } from './service-errors';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { logAuditEvent } from '@/lib/audit-log';
import type { TransactionHistoryResponse } from '@/lib/types/transaction';

export { type CreateTransactionInput, type UpdateTransactionInput };

export interface CSVImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface CSVRow {
  date: string;
  type: string;
  amount: string;
  currency: string;
  category: string;
  asset: string;
  description: string;
  [key: string]: string; // Allow dynamic column access
}

export interface TransactionFilters {
  workspace_id: string;
  type?: 'expense' | 'income' | 'transfer';
  category_id?: string;
  category_ids?: string[]; // Multiple category filter
  asset_id?: string;
  currency?: 'IDR' | 'USD';
  start_date?: Date;
  end_date?: Date;
  search?: string;
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export class TransactionService {
  private schema = getActiveSchema();
  private categoryService: CategoryService;
  private assetService: AssetService;

  /**
   * Safely convert Date/number/string to ISO string.
   * SQLite may return integers instead of Date objects depending on driver config.
   */
  private toIsoString(value: Date | number | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
  }

  /**
   * Create a new TransactionService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(db: IDatabase) {
    this.categoryService = new CategoryService(db);
    this.assetService = new AssetService(db);
    // Store db for direct use in this service
    (this as any).db = db;
  }

  /**
   * Create a new transaction
   */
  async create(input: CreateTransactionInput) {
    // Validate input using Zod schema
    const validated = createTransactionSchema.parse(input);

    // For non-transfer transactions, verify category exists and belongs to workspace
    if (validated.type !== 'transfer' && validated.category_id) {
      const category = await this.categoryService.findById(
        validated.category_id,
        validated.workspace_id
      );
      if (!category) {
        throw new TransactionServiceError(
          ServiceErrorCode.CATEGORY_NOT_FOUND,
          'Category not found',
          404
        );
      }
      if (!category.is_active) {
        throw new TransactionServiceError(
          ServiceErrorCode.CATEGORY_INACTIVE,
          'Category is inactive',
          400
        );
      }
    }

    // Verify source asset exists and belongs to workspace
    const asset = await this.assetService.findById(validated.asset_id, validated.workspace_id);
    if (!asset) {
      throw new TransactionServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    // For transfers, verify destination asset exists
    if (validated.type === 'transfer' && validated.to_asset_id) {
      const toAsset = await this.assetService.findById(
        validated.to_asset_id,
        validated.workspace_id
      );
      if (!toAsset) {
        throw new TransactionServiceError(
          ServiceErrorCode.ASSET_NOT_FOUND,
          'Destination asset not found',
          404
        );
      }
    }

    const id = nanoid();

    await (this as any).db
      .insert(this.schema.transactions)
      .values({
        id,
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id || null,
        asset_id: validated.asset_id,
        to_asset_id: validated.to_asset_id || null,
        transaction_date: validated.transaction_date,
        description: validated.description,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Log audit event for transaction creation (fire-and-forget)
    void logAuditEvent({
      workspaceId: validated.workspace_id,
      userId: validated.created_by_user_id,
      action: 'create',
      entityType: 'transaction',
      entityId: id,
      newValue: {
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id || null,
        asset_id: validated.asset_id,
        to_asset_id: validated.to_asset_id || null,
        description: validated.description || null,
        transaction_date: validated.transaction_date.toISOString(),
      },
    });

    // Invalidate caches affected by transaction changes
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(validated.workspace_id),
      CacheTags.TRANSACTIONS,
      CacheTags.DASHBOARD,
      CacheTags.BUDGET,
    ]);

    return this.findById(id, validated.workspace_id);
  }

  /**
   * Find transaction by ID (with relations)
   * Excludes soft-deleted transactions
   */
  async findById(id: string, workspaceId: string, perf?: PerfCollector) {
    return trackQuery('TransactionService.findById', perf, async () => {
      const result = await (this as any).db.query.transactions.findFirst({
        where: and(
          eq(this.schema.transactions.id, id),
          eq(this.schema.transactions.workspace_id, workspaceId),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        ),
        with: {
          category: true,
          asset: true,
          toAsset: true,
        },
      });

      return result;
    });
  }

  /**
   * Find all transactions with filters
   * Results are cached for 30 minutes (shorter TTL due to many filter combinations)
   */
  async findAll(filters: TransactionFilters, perf?: PerfCollector) {
    // Build cache key from filters
    const cache = getCacheManager();
    const filtersHash = hashFilters(filters as unknown as Record<string, unknown>);
    const cacheKey = CacheKeys.transactions(filters.workspace_id, filtersHash);

    // Try cache first (fail-silent)
    type FindAllResult = Awaited<ReturnType<typeof this.fetchTransactionsFromDb>>;
    try {
      const cached = await cache.get<FindAllResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache read failed - treat as cache miss and proceed to DB
      log.warn('cache read failed, falling back to DB:', error);
    }

    // Cache miss - fetch from DB
    const result = await trackQuery('TransactionService.findAll', perf, () =>
      this.fetchTransactionsFromDb(filters)
    );

    // Cache the result (fail-silent)
    try {
      await cache.set(cacheKey, result, {
        ttl: 1800, // 30 minutes
        tags: [CacheTags.workspace(filters.workspace_id), CacheTags.TRANSACTIONS],
      });
    } catch (error) {
      // Cache write failed - log and continue (DB result is still valid)
      log.warn('cache write failed:', error);
    }

    return result;
  }

  /**
   * Fetch transactions from database (no caching)
   * Excludes soft-deleted transactions by default; pass include_deleted: true to include them
   */
  private async fetchTransactionsFromDb(filters: TransactionFilters) {
    const conditions = [eq(this.schema.transactions.workspace_id, filters.workspace_id)];
    const includeDeleted = filters.include_deleted ?? false;

    if (!includeDeleted) {
      conditions.push(sql`${this.schema.transactions.deleted_at} IS NULL`);
    }

    if (filters.type) {
      conditions.push(eq(this.schema.transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(this.schema.transactions.category_id, filters.category_id));
    }

    // Handle multiple category IDs (OR filter)
    if (filters.category_ids && filters.category_ids.length > 0) {
      conditions.push(inArray(this.schema.transactions.category_id, filters.category_ids));
    }

    if (filters.asset_id) {
      conditions.push(eq(this.schema.transactions.asset_id, filters.asset_id));
    }

    if (filters.currency) {
      conditions.push(eq(this.schema.transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(this.schema.transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(this.schema.transactions.transaction_date, filters.end_date));
    }

    if (filters.search) {
      const searchCondition = like(this.schema.transactions.description, `%${filters.search}%`);
      // The or() function needs at least one condition, so we use it directly
      conditions.push(searchCondition);
    }

    const result = await (this as any).db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        asset: true,
        toAsset: true,
        createdBy: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        desc(this.schema.transactions.transaction_date),
        desc(this.schema.transactions.created_at),
      ],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return result;
  }

  /**
   * Update transaction
   */
  async update(
    id: string,
    workspaceId: string,
    input: UpdateTransactionInput,
    userId?: string
  ): ReturnType<typeof this.findById> {
    // Validate input using Zod schema
    const validated = updateTransactionSchema.parse(input);

    // Fetch current transaction for diff computation
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new TransactionServiceError(
        ServiceErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        404
      );
    }

    // Verify category if being updated
    if (validated.category_id !== undefined) {
      const category = await this.categoryService.findById(validated.category_id, workspaceId);
      if (!category) {
        throw new TransactionServiceError(
          ServiceErrorCode.CATEGORY_NOT_FOUND,
          'Category not found',
          404
        );
      }
      if (!category.is_active) {
        throw new TransactionServiceError(
          ServiceErrorCode.CATEGORY_INACTIVE,
          'Category is inactive',
          400
        );
      }
    }

    // Verify asset if being updated
    if (validated.asset_id !== undefined) {
      const asset = await this.assetService.findById(validated.asset_id, workspaceId);
      if (!asset) {
        throw new TransactionServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
      }
    }

    // Verify destination asset if being updated
    if (validated.to_asset_id !== undefined && validated.to_asset_id !== null) {
      const toAsset = await this.assetService.findById(validated.to_asset_id, workspaceId);
      if (!toAsset) {
        throw new TransactionServiceError(
          ServiceErrorCode.ASSET_NOT_FOUND,
          'Destination asset not found',
          404
        );
      }
    }

    // Compute field-level diff
    const diffFields = [
      'type',
      'amount',
      'currency',
      'category_id',
      'asset_id',
      'to_asset_id',
      'description',
      'transaction_date',
    ] as const;

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const field of diffFields) {
      if (validated[field] !== undefined) {
        const existingVal =
          field === 'transaction_date'
            ? this.toIsoString((existing as any)[field])
            : (existing as any)[field];
        const newVal =
          field === 'transaction_date'
            ? this.toIsoString(validated[field] as Date | string | number)
            : validated[field];

        if (String(existingVal ?? '') !== String(newVal ?? '')) {
          oldValues[field] = existingVal ?? null;
          newValues[field] = newVal ?? null;
        }
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (userId) {
      updateData.updated_by_user_id = userId;
    }

    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.amount !== undefined) updateData.amount = validated.amount;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.category_id !== undefined) updateData.category_id = validated.category_id;
    if (validated.asset_id !== undefined) updateData.asset_id = validated.asset_id;
    if (validated.to_asset_id !== undefined) updateData.to_asset_id = validated.to_asset_id;
    if (validated.transaction_date !== undefined)
      updateData.transaction_date = validated.transaction_date;
    if (validated.description !== undefined) updateData.description = validated.description;

    await (this as any).db
      .update(this.schema.transactions)
      .set(updateData)
      .where(
        and(
          eq(this.schema.transactions.id, id),
          eq(this.schema.transactions.workspace_id, workspaceId)
        )
      );

    // Log audit event only if something actually changed (fire-and-forget)
    if (userId && Object.keys(oldValues).length > 0) {
      void logAuditEvent({
        workspaceId,
        userId,
        action: 'update',
        entityType: 'transaction',
        entityId: id,
        oldValue: oldValues,
        newValue: newValues,
      });
    }

    // Invalidate caches affected by transaction changes
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(workspaceId),
      CacheTags.TRANSACTIONS,
      CacheTags.DASHBOARD,
      CacheTags.BUDGET,
    ]);

    return this.findById(id, workspaceId);
  }

  /**
   * Soft delete transaction
   */
  async delete(id: string, workspaceId: string, userId?: string): Promise<{ success: true }> {
    // Check if transaction exists
    const transaction = await this.findById(id, workspaceId);
    if (!transaction) {
      throw new TransactionServiceError(
        ServiceErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        404
      );
    }

    const deleteData: Record<string, any> = {
      deleted_at: new Date(),
      updated_at: new Date(),
    };

    if (userId) {
      deleteData.deleted_by_user_id = userId;
    }

    await (this as any).db
      .update(this.schema.transactions)
      .set(deleteData)
      .where(
        and(
          eq(this.schema.transactions.id, id),
          eq(this.schema.transactions.workspace_id, workspaceId)
        )
      );

    // Log audit event for deletion with full snapshot (fire-and-forget)
    if (userId) {
      void logAuditEvent({
        workspaceId,
        userId,
        action: 'delete',
        entityType: 'transaction',
        entityId: id,
        oldValue: {
          type: (transaction as any).type,
          amount: (transaction as any).amount,
          currency: (transaction as any).currency,
          category_id: (transaction as any).category_id,
          asset_id: (transaction as any).asset_id,
          to_asset_id: (transaction as any).to_asset_id,
          description: (transaction as any).description,
          transaction_date: this.toIsoString((transaction as any).transaction_date),
        },
      });
    }

    // Invalidate caches affected by transaction changes
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(workspaceId),
      CacheTags.TRANSACTIONS,
      CacheTags.DASHBOARD,
      CacheTags.BUDGET,
    ]);

    return { success: true };
  }

  /**
   * Get transaction count
   */
  async count(filters: Omit<TransactionFilters, 'limit' | 'offset'>, perf?: PerfCollector) {
    const conditions = [eq(this.schema.transactions.workspace_id, filters.workspace_id)];
    const includeDeleted = filters.include_deleted ?? false;

    if (!includeDeleted) {
      conditions.push(sql`${this.schema.transactions.deleted_at} IS NULL`);
    }

    if (filters.type) {
      conditions.push(eq(this.schema.transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(this.schema.transactions.category_id, filters.category_id));
    }

    // Handle multiple category IDs (OR filter)
    if (filters.category_ids && filters.category_ids.length > 0) {
      conditions.push(inArray(this.schema.transactions.category_id, filters.category_ids));
    }

    if (filters.asset_id) {
      conditions.push(eq(this.schema.transactions.asset_id, filters.asset_id));
    }

    if (filters.currency) {
      conditions.push(eq(this.schema.transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(this.schema.transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(this.schema.transactions.transaction_date, filters.end_date));
    }

    if (filters.search) {
      const searchCondition = like(this.schema.transactions.description, `%${filters.search}%`);
      // The or() function needs at least one condition, so we use it directly
      conditions.push(searchCondition);
    }

    return trackQuery('TransactionService.count', perf, async () => {
      const result = await ((this as any).db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.transactions)
        .where(and(...conditions));

      return result[0]?.count || 0;
    });
  }

  private parseAuditValue(value: string | null): Record<string, unknown> | null {
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private resolveAuditReferences(
    payload: Record<string, unknown> | null,
    categoryNames: Map<string, string>,
    assetNames: Map<string, string>
  ): Record<string, unknown> | null {
    if (!payload) return null;

    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== 'string') {
        resolved[key] = value;
        continue;
      }

      if (key === 'category_id') {
        resolved[key] = categoryNames.get(value) ?? value;
        continue;
      }

      if (key === 'asset_id' || key === 'to_asset_id') {
        resolved[key] = assetNames.get(value) ?? value;
        continue;
      }

      resolved[key] = value;
    }

    return resolved;
  }

  /**
   * Import transactions from CSV data
   */
  async importFromCSV(
    workspaceId: string,
    createdByUserId: string,
    rows: CSVRow[],
    columnMapping: Record<string, string>
  ): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Get workspace's categories and assets for lookup
    const workspaceCategories = await this.categoryService.findAll(workspaceId);
    const workspaceAssets = await this.assetService.findAll(workspaceId);

    const categoryMap = new Map(workspaceCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const assetMap = new Map(workspaceAssets.map((a) => [a.name.toLowerCase(), a.id]));

    // Get existing transactions for duplicate detection
    const existingTransactions = await this.findAll({ workspace_id: workspaceId, limit: 10000 });
    const existingKeys = new Set(
      existingTransactions.map(
        (t: any) =>
          `${t.transaction_date.toISOString().split('T')[0]}-${t.type}-${t.amount}-${t.category_id}-${t.asset_id}`
      )
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) {
        result.errors.push({ row: i + 1, message: 'Empty row' });
        continue;
      }

      try {
        // Map columns based on user's mapping
        const mappedDate = columnMapping.date;
        const mappedType = columnMapping.type;
        const mappedAmount = columnMapping.amount;
        const mappedCurrency = columnMapping.currency;
        const mappedCategory = columnMapping.category;
        const mappedAsset = columnMapping.asset;
        const mappedDescription = columnMapping.description;

        const dateStr = mappedDate ? row[mappedDate] : row.date;
        const typeStr = mappedType ? row[mappedType] : row.type;
        const amountStr = mappedAmount ? row[mappedAmount] : row.amount;
        const currencyStr = mappedCurrency ? row[mappedCurrency] : row.currency;
        const categoryStr = mappedCategory ? row[mappedCategory] : row.category;
        const assetStr = mappedAsset ? row[mappedAsset] : row.asset;
        const descriptionStr = mappedDescription ? row[mappedDescription] : row.description;

        // Validate and parse data
        const transactionDate = new Date(dateStr ?? '');
        if (isNaN(transactionDate.getTime())) {
          result.errors.push({ row: i + 1, message: 'Invalid date format' });
          continue;
        }

        if (typeStr !== 'expense' && typeStr !== 'income' && typeStr !== 'transfer') {
          result.errors.push({
            row: i + 1,
            message: 'Invalid type (must be expense, income, or transfer)',
          });
          continue;
        }

        const amount = parseFloat(amountStr ?? '0');
        if (isNaN(amount) || amount <= 0) {
          result.errors.push({ row: i + 1, message: 'Invalid amount (must be > 0)' });
          continue;
        }

        if (currencyStr !== 'IDR' && currencyStr !== 'USD') {
          result.errors.push({ row: i + 1, message: 'Invalid currency (must be IDR or USD)' });
          continue;
        }

        // Look up category (optional for transfers)
        let categoryId: string | undefined;
        if (typeStr !== 'transfer') {
          categoryId = categoryMap.get((categoryStr ?? '').toLowerCase().trim());
          if (!categoryId) {
            result.errors.push({ row: i + 1, message: `Category not found: ${categoryStr}` });
            continue;
          }
        }

        // Look up asset
        const assetId = assetMap.get((assetStr ?? '').toLowerCase().trim());
        if (!assetId) {
          result.errors.push({
            row: i + 1,
            message: `Asset not found: ${assetStr}`,
          });
          continue;
        }

        // Check for duplicates
        const duplicateKey = `${dateStr ?? ''}-${typeStr}-${amountStr ?? ''}-${categoryId ?? ''}-${assetId}`;
        if (existingKeys.has(duplicateKey)) {
          result.skipped++;
          continue;
        }

        // Create transaction
        await this.create({
          workspace_id: workspaceId,
          created_by_user_id: createdByUserId,
          type: typeStr as 'expense' | 'income' | 'transfer',
          amount: amountStr ?? '0',
          currency: currencyStr as 'IDR' | 'USD',
          category_id: categoryId,
          asset_id: assetId,
          transaction_date: transactionDate,
          description: descriptionStr ?? '',
        });

        result.imported++;
        existingKeys.add(duplicateKey); // Add to set to avoid duplicates within same import
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }

  /**
   * Export transactions to CSV format
   */
  async exportToCSV(filters: TransactionFilters): Promise<string> {
    // Fetch all matching transactions (no limit for export)
    const allTransactions = await this.findAll({
      ...filters,
      limit: undefined,
      offset: undefined,
    });

    // CSV header
    const headers = ['date', 'type', 'amount', 'currency', 'category', 'asset', 'description'];

    // Build CSV rows
    const csvRows = allTransactions.map((t: any) => [
      t.transaction_date.toISOString().split('T')[0], // YYYY-MM-DD
      t.type,
      t.amount,
      t.currency,
      t.category?.name || '',
      t.asset.name,
      t.description || '',
    ]);

    // Combine header and rows
    const allRows = [headers, ...csvRows];

    // Convert to CSV string
    return allRows
      .map((row: any[]) =>
        row
          .map((cell: any) => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      )
      .join('\n');
  }

  /**
   * Get audit history for a transaction
   * Returns create + last N edits + delete event (if exists)
   */
  async getHistory(
    transactionId: string,
    workspaceId: string,
    showAll = false
  ): Promise<TransactionHistoryResponse> {
    const [results, categories, assets] = await Promise.all([
      (this as any).db.query.auditLogs.findMany({
        where: and(
          eq(this.schema.auditLogs.entity_type, 'transaction'),
          eq(this.schema.auditLogs.entity_id, transactionId),
          eq(this.schema.auditLogs.workspace_id, workspaceId)
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [asc(this.schema.auditLogs.created_at)],
      }),
      (this as any).db.query.categories.findMany({
        where: eq(this.schema.categories.workspace_id, workspaceId),
        columns: {
          id: true,
          name: true,
        },
      }),
      (this as any).db.query.assets.findMany({
        where: eq(this.schema.assets.workspace_id, workspaceId),
        columns: {
          id: true,
          name: true,
        },
      }),
    ]);

    const categoryNames = new Map<string, string>(
      categories.map((category: { id: string; name: string }) => [category.id, category.name])
    );
    const assetNames = new Map<string, string>(
      assets.map((asset: { id: string; name: string }) => [asset.id, asset.name])
    );

    // Separate into create, updates, and delete
    const createEvent = results.find((r: any) => r.action === 'create');
    const deleteEvent = results.find((r: any) => r.action === 'delete');
    const updateEvents = results.filter((r: any) => r.action === 'update');

    const totalEdits = updateEvents.length;

    // Cap edits to last 5 unless showAll
    const displayedEdits = showAll ? updateEvents : updateEvents.slice(-5);

    // Combine in chronological order
    const history = [
      ...(createEvent ? [createEvent] : []),
      ...displayedEdits,
      ...(deleteEvent ? [deleteEvent] : []),
    ].map((entry: any) => ({
      id: entry.id,
      action: entry.action as 'create' | 'update' | 'delete',
      userName: entry.user?.name || 'Unknown',
      userId: entry.user_id,
      createdAt: entry.created_at,
      oldValue: this.resolveAuditReferences(
        this.parseAuditValue(entry.old_value),
        categoryNames,
        assetNames
      ),
      newValue: this.resolveAuditReferences(
        this.parseAuditValue(entry.new_value),
        categoryNames,
        assetNames
      ),
    }));

    return {
      history,
      totalEdits,
      showingEdits: displayedEdits.length,
    };
  }

  /**
   * Get set of transaction IDs that have audit log entries beyond initial creation.
   * Only matches 'update' and 'delete' actions — the initial 'create' entry
   * is not meaningful history worth surfacing to the user.
   */
  async getTransactionIdsWithHistory(
    workspaceId: string,
    transactionIds: string[]
  ): Promise<Set<string>> {
    if (transactionIds.length === 0) return new Set();

    const results = await (this as any).db
      .selectDistinct({ entity_id: this.schema.auditLogs.entity_id })
      .from(this.schema.auditLogs)
      .where(
        and(
          eq(this.schema.auditLogs.entity_type, 'transaction'),
          eq(this.schema.auditLogs.workspace_id, workspaceId),
          inArray(this.schema.auditLogs.entity_id, transactionIds),
          inArray(this.schema.auditLogs.action, ['update', 'delete'])
        )
      );

    return new Set(results.map((r: { entity_id: string }) => r.entity_id));
  }
}
