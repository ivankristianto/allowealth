import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { decimalAdd } from '@/lib/utils/decimal';
import { createLogger } from '@/lib/logger';

const log = createLogger('transaction');
import { eq, and, gte, lte, desc, asc, sql, like, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { CategoryService } from './category.service';
import { AccountService } from './account.service';
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
import type { Transaction, TransactionHistoryResponse } from '@/lib/types/transaction';

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
  account: string;
  description: string;
  [key: string]: string; // Allow dynamic column access
}

interface TransactionInsertRow {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: string;
  currency: 'IDR' | 'USD';
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  transaction_date: Date;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionFilters {
  workspace_id: string;
  type?: 'expense' | 'income' | 'transfer';
  category_id?: string;
  category_ids?: string[]; // Multiple category filter
  account_id?: string;
  currency?: 'IDR' | 'USD';
  start_date?: Date;
  end_date?: Date;
  search?: string;
  include_deleted?: boolean;
  include_history_flag?: boolean;
  limit?: number;
  offset?: number;
}

export class TransactionService {
  private get schema() {
    return getActiveSchema();
  }
  private db: IDatabase;
  private categoryService: CategoryService;
  private accountService: AccountService;

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
    this.db = db;
    this.categoryService = new CategoryService(db);
    this.accountService = new AccountService(db);
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

    // Verify source account exists, belongs to workspace, and is active
    const account = await this.accountService.findByIdIncludingClosed(
      validated.account_id,
      validated.workspace_id
    );
    if (!account) {
      throw new TransactionServiceError(
        ServiceErrorCode.ACCOUNT_NOT_FOUND,
        'Account not found',
        404
      );
    }
    if (account.status === 'closed') {
      throw new TransactionServiceError(
        ServiceErrorCode.ACCOUNT_CLOSED,
        'Cannot create transaction — source account is deactivated',
        400
      );
    }

    // For transfers, verify destination account exists and is active
    if (validated.type === 'transfer' && validated.to_account_id) {
      const toAccount = await this.accountService.findByIdIncludingClosed(
        validated.to_account_id,
        validated.workspace_id
      );
      if (!toAccount) {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_NOT_FOUND,
          'Destination account not found',
          404
        );
      }
      if (toAccount.status === 'closed') {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_CLOSED,
          'Cannot create transfer — destination account is deactivated',
          400
        );
      }
    }

    const id = nanoid();

    await this.db
      .insert(this.schema.transactions)
      .values({
        id,
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id || null,
        account_id: validated.account_id,
        to_account_id: validated.to_account_id || null,
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
        account_id: validated.account_id,
        to_account_id: validated.to_account_id || null,
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
      const result = await this.db.query.transactions.findFirst({
        where: and(
          eq(this.schema.transactions.id, id),
          eq(this.schema.transactions.workspace_id, workspaceId),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        ),
        with: {
          category: true,
          account: true,
          toAccount: true,
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

    if (filters.account_id) {
      conditions.push(eq(this.schema.transactions.account_id, filters.account_id));
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

    // Drizzle relational query `extras` not typeable with dynamic composition
    const queryOptions: Record<string, any> = {
      where: and(...conditions),
      with: {
        category: true,
        account: true,
        toAccount: true,
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
    };

    if (filters.include_history_flag) {
      // NOTE: Raw SQL names required — Drizzle schema refs resolve incorrectly in relational query extras
      queryOptions.extras = {
        has_history: sql<number>`EXISTS (
          SELECT 1 FROM audit_logs
          WHERE audit_logs.entity_type = 'transaction'
          AND audit_logs.entity_id = transactions.id
          AND audit_logs.workspace_id = transactions.workspace_id
          AND audit_logs.action IN ('update', 'delete')
          LIMIT 1
        )`.as('has_history'),
      };
    }

    const result = await this.db.query.transactions.findMany(queryOptions);

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

    // Verify account if being updated
    if (validated.account_id !== undefined) {
      const account = await this.accountService.findByIdIncludingClosed(
        validated.account_id,
        workspaceId
      );
      if (!account) {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_NOT_FOUND,
          'Account not found',
          404
        );
      }
      if (account.status === 'closed') {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_CLOSED,
          'Cannot update transaction — source account is deactivated',
          400
        );
      }
    }

    // Verify destination account if being updated
    if (validated.to_account_id !== undefined && validated.to_account_id !== null) {
      const toAccount = await this.accountService.findByIdIncludingClosed(
        validated.to_account_id,
        workspaceId
      );
      if (!toAccount) {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_NOT_FOUND,
          'Destination account not found',
          404
        );
      }
      if (toAccount.status === 'closed') {
        throw new TransactionServiceError(
          ServiceErrorCode.ACCOUNT_CLOSED,
          'Cannot update transfer — destination account is deactivated',
          400
        );
      }
    }

    // Compute field-level diff
    const diffFields = [
      'type',
      'amount',
      'currency',
      'category_id',
      'account_id',
      'to_account_id',
      'description',
      'transaction_date',
    ] as const;

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    // Cast to indexable record for bracket-access on known diff fields
    const existingRecord = existing as unknown as Record<string, unknown>;

    for (const field of diffFields) {
      if (validated[field] !== undefined) {
        const existingVal =
          field === 'transaction_date'
            ? this.toIsoString(existingRecord[field] as Date | number | string | null)
            : existingRecord[field];
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (userId) {
      updateData.updated_by_user_id = userId;
    }

    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.amount !== undefined) updateData.amount = validated.amount;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.category_id !== undefined) updateData.category_id = validated.category_id;
    if (validated.account_id !== undefined) updateData.account_id = validated.account_id;
    if (validated.to_account_id !== undefined) updateData.to_account_id = validated.to_account_id;
    if (validated.transaction_date !== undefined)
      updateData.transaction_date = validated.transaction_date;
    if (validated.description !== undefined) updateData.description = validated.description;

    await this.db
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

    const deleteData: { deleted_at: Date; updated_at: Date; deleted_by_user_id?: string } = {
      deleted_at: new Date(),
      updated_at: new Date(),
    };

    if (userId) {
      deleteData.deleted_by_user_id = userId;
    }

    await this.db
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
      const txRecord = transaction as unknown as Record<string, unknown>;
      void logAuditEvent({
        workspaceId,
        userId,
        action: 'delete',
        entityType: 'transaction',
        entityId: id,
        oldValue: {
          type: txRecord.type,
          amount: txRecord.amount,
          currency: txRecord.currency,
          category_id: txRecord.category_id,
          account_id: txRecord.account_id,
          to_account_id: txRecord.to_account_id,
          description: txRecord.description,
          transaction_date: this.toIsoString(
            txRecord.transaction_date as Date | number | string | null
          ),
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

    if (filters.account_id) {
      conditions.push(eq(this.schema.transactions.account_id, filters.account_id));
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
      const result = await (this.db as any)
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
    accountNames: Map<string, string>
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

      if (key === 'account_id' || key === 'to_account_id') {
        resolved[key] = accountNames.get(value) ?? value;
        continue;
      }

      resolved[key] = value;
    }

    return resolved;
  }

  /** Max rows per INSERT statement to stay within D1's 100 bound-parameter limit (7 × 13 cols = 91 params) */
  private static readonly BULK_INSERT_CHUNK_SIZE = 7;

  /**
   * Bulk insert pre-validated transaction rows in chunked INSERT statements
   * wrapped in a single transaction for atomicity.
   * No validation, audit logging, or cache invalidation — caller handles those.
   */
  private async bulkInsert(
    validRows: TransactionInsertRow[]
  ): Promise<{ inserted: number } | { error: string }> {
    if (validRows.length === 0) return { inserted: 0 };

    try {
      await runTransaction(this.db, async (tx) => {
        for (
          let offset = 0;
          offset < validRows.length;
          offset += TransactionService.BULK_INSERT_CHUNK_SIZE
        ) {
          const chunk = validRows.slice(offset, offset + TransactionService.BULK_INSERT_CHUNK_SIZE);
          await tx.insert(this.schema.transactions).values(chunk);
        }
      });
      return { inserted: validRows.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk insert failed';
      log.error('bulkInsert failed:', error);
      return { error: message };
    }
  }

  /**
   * Import transactions from CSV data.
   * Two-phase approach: validate all rows first, then bulk insert in chunked statements.
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

    // --- Pre-load workspace data (2 queries) ---
    const [workspaceCategories, workspaceAccounts] = await Promise.all([
      this.categoryService.findAll(workspaceId),
      this.accountService.findAll(workspaceId, { includeInactive: true }),
    ]);

    const categoryMap = new Map<string, { id: string; is_active: boolean }>(
      workspaceCategories.map((c) => [c.name.toLowerCase(), { id: c.id, is_active: c.is_active }])
    );
    // Store full account object for status checks
    const accountMap = new Map(workspaceAccounts.map((a) => [a.name.toLowerCase(), a]));

    // --- Date-scoped duplicate detection (1 lightweight query) ---
    const csvDates = new Set<string>();
    for (const row of rows) {
      const mappedDate = columnMapping.date;
      const dateStr = mappedDate ? row[mappedDate] : row.date;
      if (dateStr) csvDates.add(dateStr);
    }

    const existingKeys = new Set<string>();
    if (csvDates.size > 0) {
      const parsedDates = [...csvDates].map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()));

      if (parsedDates.length > 0) {
        const minDate = new Date(Math.min(...parsedDates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...parsedDates.map((d) => d.getTime())));
        // Extend maxDate to end of day (UTC to avoid timezone boundary issues)
        maxDate.setUTCHours(23, 59, 59, 999);

        // Select only the fields needed for duplicate keys (no relations, no limit)
        const txTable = this.schema.transactions;
        const existing = await (this.db as any)
          .select({
            transaction_date: txTable.transaction_date,
            type: txTable.type,
            amount: txTable.amount,
            category_id: txTable.category_id,
            account_id: txTable.account_id,
          })
          .from(txTable)
          .where(
            and(
              eq(txTable.workspace_id, workspaceId),
              gte(txTable.transaction_date, minDate),
              lte(txTable.transaction_date, maxDate),
              sql`${txTable.deleted_at} IS NULL`
            )
          );

        for (const t of existing as Array<{
          transaction_date: Date | number | string;
          type: string;
          amount: string;
          category_id: string | null;
          account_id: string;
        }>) {
          const txDate = this.toIsoString(t.transaction_date);
          const dateKey = txDate ? txDate.split('T')[0] : '';
          existingKeys.add(
            `${dateKey}-${t.type}-${t.amount}-${t.category_id ?? ''}-${t.account_id}`
          );
        }
      }
    }

    // --- Phase 1: Validate all rows (no DB writes) ---
    const now = new Date();
    const validRows: TransactionInsertRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) {
        result.errors.push({ row: i + 1, message: 'Empty row' });
        continue;
      }

      // Map columns based on user's mapping
      const dateStr = columnMapping.date ? row[columnMapping.date] : row.date;
      const typeStr = columnMapping.type ? row[columnMapping.type] : row.type;
      const amountStr = columnMapping.amount ? row[columnMapping.amount] : row.amount;
      const currencyStr = columnMapping.currency ? row[columnMapping.currency] : row.currency;
      const categoryStr = columnMapping.category ? row[columnMapping.category] : row.category;
      const accountStr = columnMapping.account ? row[columnMapping.account] : row.account;
      const descriptionStr = columnMapping.description
        ? row[columnMapping.description]
        : row.description;
      const toAccountStr = columnMapping.to_account ? row[columnMapping.to_account] : undefined;

      // Validate date
      const transactionDate = new Date(dateStr ?? '');
      if (isNaN(transactionDate.getTime())) {
        result.errors.push({ row: i + 1, message: 'Invalid date format' });
        continue;
      }
      if (transactionDate > now) {
        result.errors.push({
          row: i + 1,
          message: 'Transaction date cannot be in the future',
        });
        continue;
      }

      // Validate type
      if (typeStr !== 'expense' && typeStr !== 'income' && typeStr !== 'transfer') {
        result.errors.push({
          row: i + 1,
          message: 'Invalid type (must be expense, income, or transfer)',
        });
        continue;
      }

      // Validate amount
      const amount = Number(amountStr ?? '0');
      if (isNaN(amount) || amount <= 0) {
        result.errors.push({ row: i + 1, message: 'Invalid amount (must be > 0)' });
        continue;
      }

      // Validate currency
      if (currencyStr !== 'IDR' && currencyStr !== 'USD') {
        result.errors.push({ row: i + 1, message: 'Invalid currency (must be IDR or USD)' });
        continue;
      }

      // Validate description length
      const description = descriptionStr ?? '';
      if (description.length > 500) {
        result.errors.push({
          row: i + 1,
          message: 'Description must not exceed 500 characters',
        });
        continue;
      }

      // Look up category (required for non-transfer)
      let categoryId: string | null = null;
      if (typeStr !== 'transfer') {
        const category = categoryMap.get((categoryStr ?? '').toLowerCase().trim());
        if (!category) {
          result.errors.push({ row: i + 1, message: `Category not found: ${categoryStr}` });
          continue;
        }
        if (!category.is_active) {
          result.errors.push({ row: i + 1, message: `Category is inactive: ${categoryStr}` });
          continue;
        }
        categoryId = category.id;
      }

      // Look up source account
      const account = accountMap.get((accountStr ?? '').toLowerCase().trim());
      if (!account) {
        result.errors.push({ row: i + 1, message: `Account not found: ${accountStr}` });
        continue;
      }
      if (account.status === 'closed') {
        result.errors.push({
          row: i + 1,
          message: `Account is deactivated: ${accountStr}`,
        });
        continue;
      }

      // Validate destination account for transfers
      let toAccountId: string | null = null;
      if (typeStr === 'transfer') {
        if (!toAccountStr) {
          result.errors.push({
            row: i + 1,
            message: 'Destination account is required for transfers',
          });
          continue;
        }
        const toAccount = accountMap.get(toAccountStr.toLowerCase().trim());
        if (!toAccount) {
          result.errors.push({
            row: i + 1,
            message: `Destination account not found: ${toAccountStr}`,
          });
          continue;
        }
        if (toAccount.status === 'closed') {
          result.errors.push({
            row: i + 1,
            message: `Destination account is deactivated: ${toAccountStr}`,
          });
          continue;
        }
        toAccountId = toAccount.id;
      }

      // Check for duplicates
      const normalizedAmount = amount.toString();
      const duplicateKey = `${transactionDate.toISOString().split('T')[0]}-${typeStr}-${normalizedAmount}-${categoryId ?? ''}-${account.id}`;
      if (existingKeys.has(duplicateKey)) {
        result.skipped++;
        continue;
      }
      // Prevent intra-file duplicates
      existingKeys.add(duplicateKey);

      validRows.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: createdByUserId,
        type: typeStr,
        amount: normalizedAmount,
        currency: currencyStr,
        category_id: categoryId,
        account_id: account.id,
        to_account_id: toAccountId,
        transaction_date: transactionDate,
        description,
        created_at: now,
        updated_at: now,
      });
    }

    // --- Phase 2: Bulk insert valid rows in chunked statements ---
    if (validRows.length > 0) {
      const insertResult = await this.bulkInsert(validRows);

      if ('error' in insertResult) {
        result.errors.push({ row: 0, message: `Bulk insert failed: ${insertResult.error}` });
        return result;
      }

      result.imported = insertResult.inserted;
    }

    // --- Post-insert: Single audit log + single cache invalidation ---
    if (result.imported > 0) {
      void logAuditEvent({
        workspaceId,
        userId: createdByUserId,
        action: 'create',
        entityType: 'transaction',
        newValue: {
          action: 'csv_import',
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors.length,
          total: rows.length,
        },
      });

      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(workspaceId),
        CacheTags.TRANSACTIONS,
        CacheTags.DASHBOARD,
        CacheTags.BUDGET,
      ]);
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
    const headers = ['date', 'type', 'amount', 'currency', 'category', 'account', 'description'];

    // Build CSV rows
    const csvRows = allTransactions.map((t: any) => [
      t.transaction_date.toISOString().split('T')[0], // YYYY-MM-DD
      t.type,
      t.amount,
      t.currency,
      t.category?.name || '',
      t.account.name,
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
   * Get transactions for a specific account, with monthly totals.
   */
  async getTransactionsByAccount(
    accountId: string,
    workspaceId: string,
    year: number,
    month: number
  ): Promise<{
    transactions: Transaction[];
    summary: {
      totalIncome: string;
      totalExpenses: string;
      totalTransfersIn: string;
      totalTransfersOut: string;
    };
  }> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const txTable = this.schema.transactions;

    // Get all transactions where this account is source or destination
    const transactions = await (this.db as any)
      .select()
      .from(txTable)
      .where(
        and(
          eq(txTable.workspace_id, workspaceId),
          sql`${txTable.deleted_at} IS NULL`,
          gte(txTable.transaction_date, startOfMonth),
          lte(txTable.transaction_date, endOfMonth),
          sql`(${txTable.account_id} = ${accountId} OR ${txTable.to_account_id} = ${accountId})`
        )
      )
      .orderBy(desc(txTable.transaction_date));

    // Calculate monthly summaries using decimal arithmetic
    let totalIncome = '0';
    let totalExpenses = '0';
    let totalTransfersIn = '0';
    let totalTransfersOut = '0';

    for (const tx of transactions) {
      const amount = tx.amount || '0';
      if (tx.type === 'income' && tx.account_id === accountId) {
        totalIncome = decimalAdd(totalIncome, amount);
      } else if (tx.type === 'expense' && tx.account_id === accountId) {
        totalExpenses = decimalAdd(totalExpenses, amount);
      } else if (tx.type === 'transfer') {
        if (tx.account_id === accountId) {
          totalTransfersOut = decimalAdd(totalTransfersOut, amount);
        }
        if (tx.to_account_id === accountId) {
          totalTransfersIn = decimalAdd(totalTransfersIn, amount);
        }
      }
    }

    return {
      transactions,
      summary: {
        totalIncome,
        totalExpenses,
        totalTransfersIn,
        totalTransfersOut,
      },
    };
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
    const [results, categories, accounts] = await Promise.all([
      this.db.query.auditLogs.findMany({
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
      this.db.query.categories.findMany({
        where: eq(this.schema.categories.workspace_id, workspaceId),
        columns: {
          id: true,
          name: true,
        },
      }),
      this.db.query.accounts.findMany({
        where: eq(this.schema.accounts.workspace_id, workspaceId),
        columns: {
          id: true,
          name: true,
        },
      }),
    ]);

    const categoryNames = new Map<string, string>(
      categories.map((category: { id: string; name: string }) => [category.id, category.name])
    );
    const accountNames = new Map<string, string>(
      accounts.map((account: { id: string; name: string }) => [account.id, account.name])
    );

    interface AuditLogRow {
      id: string;
      action: string;
      user_id: string;
      old_value: string | null;
      new_value: string | null;
      created_at: Date | number | string;
      user?: { id: string; name: string } | null;
    }

    // Separate into create, updates, and delete
    const createEvent = (results as AuditLogRow[]).find((r) => r.action === 'create');
    const deleteEvent = (results as AuditLogRow[]).find((r) => r.action === 'delete');
    const updateEvents = (results as AuditLogRow[]).filter((r) => r.action === 'update');

    const totalEdits = updateEvents.length;

    // Cap edits to last 5 unless showAll
    const displayedEdits = showAll ? updateEvents : updateEvents.slice(-5);

    // Combine in chronological order
    const history = [
      ...(createEvent ? [createEvent] : []),
      ...displayedEdits,
      ...(deleteEvent ? [deleteEvent] : []),
    ].map((entry: AuditLogRow) => ({
      id: entry.id,
      action: entry.action as 'create' | 'update' | 'delete',
      userName: entry.user?.name || 'Unknown',
      userId: entry.user_id,
      createdAt: this.toIsoString(entry.created_at) || '',
      oldValue: this.resolveAuditReferences(
        this.parseAuditValue(entry.old_value),
        categoryNames,
        accountNames
      ),
      newValue: this.resolveAuditReferences(
        this.parseAuditValue(entry.new_value),
        categoryNames,
        accountNames
      ),
    }));

    return {
      history,
      totalEdits,
      showingEdits: displayedEdits.length,
    };
  }

  /**
   * Get category usage counts for a specific user over a recent time window.
   * Used to sort category chips by frequency in the quick-capture form.
   *
   * @param workspaceId - Workspace to query
   * @param userId - User whose transactions to count
   * @param daysBack - Number of days to look back (default 90)
   * @returns Array of {category_id, count} ordered by count DESC
   */
  async getCategoryUsageCounts(
    workspaceId: string,
    userId: string,
    daysBack = 90
  ): Promise<Array<{ category_id: string; count: number }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // IDatabase interface doesn't cover full Drizzle select().from().where().groupBy().orderBy() chain
    const db = this.db as any;
    const results = await db
      .select({
        category_id: this.schema.transactions.category_id,
        count: sql<number>`count(*)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.created_by_user_id, userId),
          gte(this.schema.transactions.transaction_date, cutoffDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          sql`${this.schema.transactions.category_id} IS NOT NULL`
        )
      )
      .groupBy(this.schema.transactions.category_id)
      .orderBy(sql`count(*) DESC`);

    return results as Array<{ category_id: string; count: number }>;
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

    // IDatabase interface doesn't cover selectDistinct
    const results = await (this.db as any)
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
