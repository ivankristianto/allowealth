import { transactions, type IDatabase } from '@/db';
import { eq, and, gte, lte, desc, sql, like, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { CategoryService } from './category.service';
import { PaymentMethodService } from './payment-method.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/lib/validation/transactions';
import { TransactionServiceError, ServiceErrorCode } from './service-errors';

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
  payment_method: string;
  description: string;
  [key: string]: string; // Allow dynamic column access
}

export interface TransactionFilters {
  user_id: string;
  type?: 'expense' | 'income';
  category_id?: string;
  category_ids?: string[]; // Multiple category filter
  payment_method_id?: string;
  currency?: 'IDR' | 'USD';
  start_date?: Date;
  end_date?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export class TransactionService {
  private categoryService: CategoryService;
  private paymentMethodService: PaymentMethodService;

  /**
   * Create a new TransactionService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(db: IDatabase) {
    this.categoryService = new CategoryService(db);
    this.paymentMethodService = new PaymentMethodService(db);
    // Store db for direct use in this service
    (this as any).db = db;
  }

  /**
   * Create a new transaction
   */
  async create(input: CreateTransactionInput) {
    // Validate input using Zod schema
    const validated = createTransactionSchema.parse(input);

    // Verify category exists and belongs to user
    const category = await this.categoryService.findById(validated.category_id, validated.user_id);
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

    // Verify payment method exists and belongs to user
    const paymentMethod = await this.paymentMethodService.findById(
      validated.payment_method_id,
      validated.user_id
    );
    if (!paymentMethod) {
      throw new TransactionServiceError(
        ServiceErrorCode.PAYMENT_METHOD_NOT_FOUND,
        'Payment method not found',
        404
      );
    }
    if (!paymentMethod.is_active) {
      throw new TransactionServiceError(
        ServiceErrorCode.PAYMENT_METHOD_INACTIVE,
        'Payment method is inactive',
        400
      );
    }

    const id = nanoid();

    await (this as any).db
      .insert(transactions)
      .values({
        id,
        user_id: validated.user_id,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id,
        payment_method_id: validated.payment_method_id,
        transaction_date: validated.transaction_date,
        description: validated.description,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return this.findById(id, validated.user_id);
  }

  /**
   * Find transaction by ID (with relations)
   * Excludes soft-deleted transactions
   */
  async findById(id: string, user_id: string) {
    const result = await (this as any).db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, id),
        eq(transactions.user_id, user_id),
        sql`${transactions.deleted_at} IS NULL`
      ),
      with: {
        category: true,
        paymentMethod: true,
      },
    });

    return result;
  }

  /**
   * Find all transactions with filters
   */
  async findAll(filters: TransactionFilters) {
    const conditions = [
      eq(transactions.user_id, filters.user_id),
      sql`${transactions.deleted_at} IS NULL`,
    ];

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(transactions.category_id, filters.category_id));
    }

    // Handle multiple category IDs (OR filter)
    if (filters.category_ids && filters.category_ids.length > 0) {
      conditions.push(inArray(transactions.category_id, filters.category_ids));
    }

    if (filters.payment_method_id) {
      conditions.push(eq(transactions.payment_method_id, filters.payment_method_id));
    }

    if (filters.currency) {
      conditions.push(eq(transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(transactions.transaction_date, filters.end_date));
    }

    if (filters.search) {
      const searchCondition = like(transactions.description, `%${filters.search}%`);
      // The or() function needs at least one condition, so we use it directly
      conditions.push(searchCondition);
    }

    const result = await (this as any).db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        paymentMethod: true,
      },
      orderBy: [desc(transactions.transaction_date), desc(transactions.created_at)],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return result;
  }

  /**
   * Update transaction
   */
  async update(id: string, user_id: string, input: UpdateTransactionInput) {
    // Validate input using Zod schema
    const validated = updateTransactionSchema.parse(input);

    // Verify category if being updated
    if (validated.category_id !== undefined) {
      const category = await this.categoryService.findById(validated.category_id, user_id);
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

    // Verify payment method if being updated
    if (validated.payment_method_id !== undefined) {
      const paymentMethod = await this.paymentMethodService.findById(
        validated.payment_method_id,
        user_id
      );
      if (!paymentMethod) {
        throw new TransactionServiceError(
          ServiceErrorCode.PAYMENT_METHOD_NOT_FOUND,
          'Payment method not found',
          404
        );
      }
      if (!paymentMethod.is_active) {
        throw new TransactionServiceError(
          ServiceErrorCode.PAYMENT_METHOD_INACTIVE,
          'Payment method is inactive',
          400
        );
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.amount !== undefined) updateData.amount = validated.amount;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.category_id !== undefined) updateData.category_id = validated.category_id;
    if (validated.payment_method_id !== undefined)
      updateData.payment_method_id = validated.payment_method_id;
    if (validated.transaction_date !== undefined)
      updateData.transaction_date = validated.transaction_date;
    if (validated.description !== undefined) updateData.description = validated.description;

    await (this as any).db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Soft delete transaction
   */
  async delete(id: string, user_id: string) {
    // Check if transaction exists
    const transaction = await this.findById(id, user_id);
    if (!transaction) {
      throw new TransactionServiceError(
        ServiceErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        404
      );
    }

    await (this as any).db
      .update(transactions)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user_id)));

    return { success: true };
  }

  /**
   * Get transaction count
   */
  async count(filters: Omit<TransactionFilters, 'limit' | 'offset'>) {
    const conditions = [
      eq(transactions.user_id, filters.user_id),
      sql`${transactions.deleted_at} IS NULL`,
    ];

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(transactions.category_id, filters.category_id));
    }

    // Handle multiple category IDs (OR filter)
    if (filters.category_ids && filters.category_ids.length > 0) {
      conditions.push(inArray(transactions.category_id, filters.category_ids));
    }

    if (filters.payment_method_id) {
      conditions.push(eq(transactions.payment_method_id, filters.payment_method_id));
    }

    if (filters.currency) {
      conditions.push(eq(transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(transactions.transaction_date, filters.end_date));
    }

    if (filters.search) {
      const searchCondition = like(transactions.description, `%${filters.search}%`);
      // The or() function needs at least one condition, so we use it directly
      conditions.push(searchCondition);
    }

    const result = await ((this as any).db as any)
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Import transactions from CSV data
   */
  async importFromCSV(
    user_id: string,
    rows: CSVRow[],
    columnMapping: Record<string, string>
  ): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Get user's categories and payment methods for lookup
    const userCategories = await this.categoryService.findAll(user_id);
    const userPaymentMethods = await this.paymentMethodService.findAll(user_id);

    const categoryMap = new Map(userCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const paymentMethodMap = new Map(userPaymentMethods.map((p) => [p.name.toLowerCase(), p.id]));

    // Get existing transactions for duplicate detection
    const existingTransactions = await this.findAll({ user_id, limit: 10000 });
    const existingKeys = new Set(
      existingTransactions.map(
        (t: any) =>
          `${t.transaction_date.toISOString().split('T')[0]}-${t.type}-${
            t.amount
          }-${t.category_id}-${t.payment_method_id}`
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
        const mappedPaymentMethod = columnMapping.payment_method;
        const mappedDescription = columnMapping.description;

        const dateStr = mappedDate ? row[mappedDate] : row.date;
        const typeStr = mappedType ? row[mappedType] : row.type;
        const amountStr = mappedAmount ? row[mappedAmount] : row.amount;
        const currencyStr = mappedCurrency ? row[mappedCurrency] : row.currency;
        const categoryStr = mappedCategory ? row[mappedCategory] : row.category;
        const paymentMethodStr = mappedPaymentMethod
          ? row[mappedPaymentMethod]
          : row.payment_method;
        const descriptionStr = mappedDescription ? row[mappedDescription] : row.description;

        // Validate and parse data
        const transactionDate = new Date(dateStr ?? '');
        if (isNaN(transactionDate.getTime())) {
          result.errors.push({ row: i + 1, message: 'Invalid date format' });
          continue;
        }

        if (typeStr !== 'expense' && typeStr !== 'income') {
          result.errors.push({ row: i + 1, message: 'Invalid type (must be expense or income)' });
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

        // Look up category and payment method
        const categoryId = categoryMap.get((categoryStr ?? '').toLowerCase().trim());
        if (!categoryId) {
          result.errors.push({ row: i + 1, message: `Category not found: ${categoryStr}` });
          continue;
        }

        const paymentMethodId = paymentMethodMap.get((paymentMethodStr ?? '').toLowerCase().trim());
        if (!paymentMethodId) {
          result.errors.push({
            row: i + 1,
            message: `Payment method not found: ${paymentMethodStr}`,
          });
          continue;
        }

        // Check for duplicates
        const duplicateKey = `${dateStr ?? ''}-${typeStr}-${amountStr ?? ''}-${categoryId}-${paymentMethodId}`;
        if (existingKeys.has(duplicateKey)) {
          result.skipped++;
          continue;
        }

        // Create transaction
        await this.create({
          user_id,
          type: typeStr as 'expense' | 'income',
          amount: amountStr ?? '0',
          currency: currencyStr as 'IDR' | 'USD',
          category_id: categoryId,
          payment_method_id: paymentMethodId,
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
    const headers = [
      'date',
      'type',
      'amount',
      'currency',
      'category',
      'payment_method',
      'description',
    ];

    // Build CSV rows
    const csvRows = allTransactions.map((t: any) => [
      t.transaction_date.toISOString().split('T')[0], // YYYY-MM-DD
      t.type,
      t.amount,
      t.currency,
      t.category.name,
      t.paymentMethod.name,
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
}
