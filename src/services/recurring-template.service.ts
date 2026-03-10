import { and, desc, eq, gt, gte, inArray, like, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { logAuditEvent } from '@/lib/audit-log';
import { getCacheManager, CacheKeys, CacheTags, hashFilters, invalidateTags } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { parse } from 'valibot';
import type { RecurringTemplate, RecurringTemplateOutput } from '@/lib/types/recurring';
import {
  createRecurringTemplateSchema,
  updateRecurringTemplateSchema,
  type CreateRecurringTemplateInput,
  type UpdateRecurringTemplateInput,
} from '@/lib/validation/recurring';
import { calculateDueDate, shouldGenerateOccurrence } from '@/lib/utils/recurring-dates';
import { RecurringServiceError, ServiceErrorCode } from './service-errors';
import {
  mapRecurringTemplateOutput,
  type RecurringOccurrenceStats,
  type RecurringTemplateWithRelations,
} from './recurring-template-output';

const log = createLogger('recurring-template');

export interface RecurringTemplateFilters {
  status?: 'active' | 'paused' | 'completed' | 'cancelled' | 'all';
  type?: 'expense' | 'income';
  search?: string;
  page?: number;
  limit?: number;
}

interface FindAllRecurringTemplatesResult {
  templates: RecurringTemplateOutput[];
  total: number;
  page: number;
  limit: number;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class RecurringTemplateService {
  private schema = getActiveSchema();
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  private async invalidateWorkspaceCache(workspaceId: string): Promise<void> {
    await invalidateTags(
      [
        CacheTags.workspace(workspaceId),
        CacheTags.RECURRING,
        CacheTags.RECURRING_OCCURRENCES,
        CacheTags.RECURRING_CALENDAR,
        CacheTags.RECURRING_FORECAST,
        CacheTags.TRANSACTIONS,
        CacheTags.DASHBOARD,
      ],
      'strict'
    );
  }

  private mapTemplateOutput(
    template: RecurringTemplateWithRelations,
    occurrenceStats: RecurringOccurrenceStats
  ): RecurringTemplateOutput {
    return mapRecurringTemplateOutput(template, occurrenceStats);
  }

  private async validateTemplateReferences(
    workspaceId: string,
    references: {
      categoryId?: string;
      accountId?: string;
    }
  ): Promise<void> {
    const { categoryId, accountId } = references;

    if (categoryId !== undefined) {
      const category = await this.db.query.categories.findFirst({
        where: and(
          eq(this.schema.categories.id, categoryId),
          eq(this.schema.categories.workspace_id, workspaceId),
          eq(this.schema.categories.is_active, true)
        ),
      });

      if (!category) {
        throw new RecurringServiceError(
          ServiceErrorCode.CATEGORY_NOT_FOUND,
          'Category not found',
          404
        );
      }
    }

    if (accountId !== undefined) {
      const account = await this.db.query.accounts.findFirst({
        where: and(
          eq(this.schema.accounts.id, accountId),
          eq(this.schema.accounts.workspace_id, workspaceId),
          sql`${this.schema.accounts.deleted_at} IS NULL`
        ),
      });

      if (!account) {
        throw new RecurringServiceError(
          ServiceErrorCode.ACCOUNT_NOT_FOUND,
          'Account not found',
          404
        );
      }

      if (account.status === 'closed') {
        throw new RecurringServiceError(
          ServiceErrorCode.ACCOUNT_CLOSED,
          'Cannot use a deactivated account',
          400
        );
      }
    }
  }

  private getEmptyOccurrenceStats() {
    return {
      pendingCount: 0,
      confirmedCount: 0,
      skippedCount: 0,
      nextDueDate: null,
    };
  }

  private async getOccurrenceStatsByTemplateIds(workspaceId: string, templateIds: string[]) {
    if (templateIds.length === 0) {
      return new Map<string, ReturnType<typeof this.getEmptyOccurrenceStats>>();
    }

    const rows = await (this.db as any)
      .select({
        template_id: this.schema.recurringOccurrences.template_id,
        pending_count: sql<number>`COALESCE(SUM(CASE WHEN ${this.schema.recurringOccurrences.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
        confirmed_count: sql<number>`COALESCE(SUM(CASE WHEN ${this.schema.recurringOccurrences.status} = 'confirmed' THEN 1 ELSE 0 END), 0)`,
        skipped_count: sql<number>`COALESCE(SUM(CASE WHEN ${this.schema.recurringOccurrences.status} = 'skipped' THEN 1 ELSE 0 END), 0)`,
        next_due_date: sql<
          string | null
        >`MIN(CASE WHEN ${this.schema.recurringOccurrences.status} = 'pending' THEN ${this.schema.recurringOccurrences.due_date} ELSE NULL END)`,
      })
      .from(this.schema.recurringOccurrences)
      .where(
        and(
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          inArray(this.schema.recurringOccurrences.template_id, templateIds)
        )
      )
      .groupBy(this.schema.recurringOccurrences.template_id);

    const map = new Map<string, ReturnType<typeof this.getEmptyOccurrenceStats>>();
    for (const row of rows as Array<{
      template_id: string;
      pending_count: number;
      confirmed_count: number;
      skipped_count: number;
      next_due_date: string | null;
    }>) {
      map.set(row.template_id, {
        pendingCount: Number(row.pending_count || 0),
        confirmedCount: Number(row.confirmed_count || 0),
        skippedCount: Number(row.skipped_count || 0),
        nextDueDate: row.next_due_date || null,
      });
    }

    return map;
  }

  async create(input: CreateRecurringTemplateInput): Promise<RecurringTemplateOutput> {
    const validated = parse(createRecurringTemplateSchema, input);
    await this.validateTemplateReferences(validated.workspace_id, {
      categoryId: validated.category_id,
      accountId: validated.account_id,
    });

    const templateId = nanoid();

    const createdTemplate = await runTransaction(this.db, async (tx) => {
      await tx.insert(this.schema.recurringTemplates).values({
        id: templateId,
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        name: validated.name,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id,
        account_id: validated.account_id,
        day_of_month: validated.day_of_month ?? 0,
        frequency: validated.frequency,
        interval_count: validated.interval_count,
        start_date: validated.start_date,
        end_date: validated.end_date ?? null,
        total_occurrences: validated.total_occurrences ?? null,
        is_installment: validated.is_installment,
        installment_label: validated.installment_label ?? null,
        starting_occurrence_number: validated.starting_occurrence_number,
        description: validated.description ?? null,
        status: validated.status,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const template = await tx.query.recurringTemplates.findFirst({
        where: and(
          eq(this.schema.recurringTemplates.id, templateId),
          eq(this.schema.recurringTemplates.workspace_id, validated.workspace_id)
        ),
      });

      if (!template) {
        throw new RecurringServiceError(
          ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
          'Recurring template not found after creation',
          404
        );
      }

      await this._generateForTemplate(template as RecurringTemplate, tx);

      return template as RecurringTemplate;
    });

    void logAuditEvent({
      workspaceId: validated.workspace_id,
      userId: validated.created_by_user_id,
      action: 'recurring_template.create',
      entityType: 'recurring_template',
      entityId: templateId,
      newValue: {
        name: validated.name,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        day_of_month: validated.day_of_month,
        start_date: validated.start_date,
      },
    });

    await this.invalidateWorkspaceCache(validated.workspace_id);

    const result = await this.findById(createdTemplate.id, validated.workspace_id);
    if (!result) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    return result;
  }

  async findAll(
    workspaceId: string,
    filters: RecurringTemplateFilters = {},
    perf?: PerfCollector
  ): Promise<FindAllRecurringTemplatesResult> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    const normalizedFilters = {
      status: filters.status ?? 'all',
      type: filters.type,
      search: filters.search,
      page,
      limit,
    };

    const cache = getCacheManager();
    const cacheKey = CacheKeys.recurring(workspaceId, hashFilters(normalizedFilters));

    try {
      const cached = await cache.get<FindAllRecurringTemplatesResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      log.warn('cache read failed for recurring template list:', error);
    }

    const result = await trackQuery('RecurringTemplateService.findAll', perf, async () => {
      const conditions = [eq(this.schema.recurringTemplates.workspace_id, workspaceId)];
      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(this.schema.recurringTemplates.status, filters.status));
      }
      if (filters.type) {
        conditions.push(eq(this.schema.recurringTemplates.type, filters.type));
      }
      if (filters.search) {
        conditions.push(like(this.schema.recurringTemplates.name, `%${filters.search}%`));
      }

      const templates = await this.db.query.recurringTemplates.findMany({
        where: and(...conditions),
        with: {
          category: true,
          account: true,
        },
        orderBy: [desc(this.schema.recurringTemplates.created_at)],
        limit,
        offset,
      });

      const countResult = await (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.recurringTemplates)
        .where(and(...conditions));

      const templateIds = templates.map((template) => template.id);
      const statsMap = await this.getOccurrenceStatsByTemplateIds(workspaceId, templateIds);

      return {
        templates: templates.map((template) =>
          this.mapTemplateOutput(
            template,
            statsMap.get(template.id) ?? this.getEmptyOccurrenceStats()
          )
        ),
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    });

    try {
      await cache.set(cacheKey, result, {
        ttl: 1800,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING],
      });
    } catch (error) {
      log.warn('cache write failed for recurring template list:', error);
    }

    return result;
  }

  async findById(id: string, workspaceId: string): Promise<RecurringTemplateOutput | null> {
    const template = await this.db.query.recurringTemplates.findFirst({
      where: and(
        eq(this.schema.recurringTemplates.id, id),
        eq(this.schema.recurringTemplates.workspace_id, workspaceId)
      ),
      with: {
        category: true,
        account: true,
      },
    });

    if (!template) {
      return null;
    }

    const statsMap = await this.getOccurrenceStatsByTemplateIds(workspaceId, [id]);
    return this.mapTemplateOutput(template, statsMap.get(id) ?? this.getEmptyOccurrenceStats());
  }

  async hasTemplates(workspaceId: string): Promise<boolean> {
    const template = await this.db.query.recurringTemplates.findFirst({
      where: eq(this.schema.recurringTemplates.workspace_id, workspaceId),
      columns: {
        id: true,
      },
    });

    return !!template;
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateRecurringTemplateInput,
    performedByUserId?: string
  ): Promise<RecurringTemplateOutput> {
    const validated = parse(updateRecurringTemplateSchema, data);

    if (validated.workspace_id !== workspaceId) {
      throw new RecurringServiceError(
        ServiceErrorCode.FORBIDDEN,
        'Workspace mismatch for recurring template update',
        403
      );
    }

    const existing = await this.db.query.recurringTemplates.findFirst({
      where: and(
        eq(this.schema.recurringTemplates.id, id),
        eq(this.schema.recurringTemplates.workspace_id, workspaceId)
      ),
    });

    if (!existing) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.category_id !== undefined || validated.account_id !== undefined) {
      await this.validateTemplateReferences(workspaceId, {
        categoryId: validated.category_id,
        accountId: validated.account_id,
      });
    }

    for (const key of [
      'name',
      'type',
      'amount',
      'currency',
      'category_id',
      'account_id',
      'day_of_month',
      'frequency',
      'interval_count',
      'start_date',
      'end_date',
      'total_occurrences',
      'is_installment',
      'installment_label',
      'starting_occurrence_number',
      'description',
    ] as const) {
      const value = validated[key];
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    }

    const mergedEndDate =
      updatePayload.end_date !== undefined ? updatePayload.end_date : existing.end_date;
    const mergedTotalOccurrences =
      updatePayload.total_occurrences !== undefined
        ? updatePayload.total_occurrences
        : existing.total_occurrences;
    const mergedInstallmentLabel =
      updatePayload.installment_label !== undefined
        ? updatePayload.installment_label
        : existing.installment_label;
    const mergedDescription =
      updatePayload.description !== undefined ? updatePayload.description : existing.description;

    // Validate final state after merge so partial updates (including explicit null clears)
    // cannot violate recurring template invariants.
    parse(createRecurringTemplateSchema, {
      workspace_id: existing.workspace_id,
      created_by_user_id: existing.created_by_user_id,
      name: updatePayload.name ?? existing.name,
      type: updatePayload.type ?? existing.type,
      amount: updatePayload.amount ?? existing.amount,
      currency: updatePayload.currency ?? existing.currency,
      category_id: updatePayload.category_id ?? existing.category_id,
      account_id: updatePayload.account_id ?? existing.account_id,
      day_of_month: updatePayload.day_of_month ?? existing.day_of_month,
      frequency: updatePayload.frequency ?? existing.frequency,
      interval_count: updatePayload.interval_count ?? existing.interval_count,
      start_date: updatePayload.start_date ?? existing.start_date,
      end_date: mergedEndDate ?? undefined,
      total_occurrences: mergedTotalOccurrences ?? undefined,
      is_installment: updatePayload.is_installment ?? existing.is_installment,
      installment_label: mergedInstallmentLabel ?? undefined,
      starting_occurrence_number:
        updatePayload.starting_occurrence_number ?? existing.starting_occurrence_number,
      description: mergedDescription ?? undefined,
      status: existing.status,
    });

    await this.db
      .update(this.schema.recurringTemplates)
      .set(updatePayload)
      .where(
        and(
          eq(this.schema.recurringTemplates.id, id),
          eq(this.schema.recurringTemplates.workspace_id, workspaceId)
        )
      );

    const updated = await this.db.query.recurringTemplates.findFirst({
      where: and(
        eq(this.schema.recurringTemplates.id, id),
        eq(this.schema.recurringTemplates.workspace_id, workspaceId)
      ),
    });

    const hasScheduleChanges =
      validated.day_of_month !== undefined ||
      validated.frequency !== undefined ||
      validated.interval_count !== undefined ||
      validated.start_date !== undefined ||
      validated.end_date !== undefined ||
      validated.total_occurrences !== undefined ||
      validated.starting_occurrence_number !== undefined;

    if (updated && updated.status === 'active') {
      if (hasScheduleChanges) {
        const today = toIsoDate(new Date());
        await this.db
          .delete(this.schema.recurringOccurrences)
          .where(
            and(
              eq(this.schema.recurringOccurrences.template_id, id),
              eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
              eq(this.schema.recurringOccurrences.status, 'pending'),
              gte(this.schema.recurringOccurrences.due_date, today)
            )
          );
      }
      await this._generateForTemplate(updated as RecurringTemplate);
    }

    if (Object.keys(updatePayload).length > 1) {
      void logAuditEvent({
        workspaceId,
        userId: performedByUserId ?? existing.created_by_user_id,
        action: 'recurring_template.update',
        entityType: 'recurring_template',
        entityId: id,
        oldValue: existing as unknown as Record<string, unknown>,
        newValue: updatePayload,
      });
    }

    await this.invalidateWorkspaceCache(workspaceId);

    const result = await this.findById(id, workspaceId);
    if (!result) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    return result;
  }

  async pause(
    id: string,
    workspaceId: string,
    performedByUserId?: string
  ): Promise<RecurringTemplateOutput> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    if (template.status !== 'active') {
      throw new RecurringServiceError(
        ServiceErrorCode.CONFLICT,
        'Only active templates can be paused',
        409
      );
    }

    await this.db
      .update(this.schema.recurringTemplates)
      .set({ status: 'paused', updated_at: new Date() })
      .where(
        and(
          eq(this.schema.recurringTemplates.id, id),
          eq(this.schema.recurringTemplates.workspace_id, workspaceId)
        )
      );

    void logAuditEvent({
      workspaceId,
      userId: performedByUserId ?? template.created_by_user_id,
      action: 'recurring_template.pause',
      entityType: 'recurring_template',
      entityId: id,
    });

    await this.invalidateWorkspaceCache(workspaceId);

    const result = await this.findById(id, workspaceId);
    if (!result) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    return result;
  }

  async resume(
    id: string,
    workspaceId: string,
    performedByUserId?: string
  ): Promise<RecurringTemplateOutput> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    if (template.status !== 'paused') {
      throw new RecurringServiceError(
        ServiceErrorCode.CONFLICT,
        'Only paused templates can be resumed',
        409
      );
    }

    await this.db
      .update(this.schema.recurringTemplates)
      .set({ status: 'active', updated_at: new Date() })
      .where(
        and(
          eq(this.schema.recurringTemplates.id, id),
          eq(this.schema.recurringTemplates.workspace_id, workspaceId)
        )
      );

    const rawTemplate = await this.db.query.recurringTemplates.findFirst({
      where: and(
        eq(this.schema.recurringTemplates.id, id),
        eq(this.schema.recurringTemplates.workspace_id, workspaceId)
      ),
    });

    if (rawTemplate) {
      await this._generateForTemplate(rawTemplate as RecurringTemplate);
    }

    void logAuditEvent({
      workspaceId,
      userId: performedByUserId ?? template.created_by_user_id,
      action: 'recurring_template.resume',
      entityType: 'recurring_template',
      entityId: id,
    });

    await this.invalidateWorkspaceCache(workspaceId);

    const result = await this.findById(id, workspaceId);
    if (!result) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    return result;
  }

  async cancel(
    id: string,
    workspaceId: string,
    performedByUserId?: string
  ): Promise<RecurringTemplateOutput> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    if (template.status === 'cancelled') {
      throw new RecurringServiceError(
        ServiceErrorCode.TEMPLATE_ALREADY_CANCELLED,
        'Template is already cancelled',
        409
      );
    }

    await this.db
      .update(this.schema.recurringTemplates)
      .set({ status: 'cancelled', updated_at: new Date() })
      .where(
        and(
          eq(this.schema.recurringTemplates.id, id),
          eq(this.schema.recurringTemplates.workspace_id, workspaceId)
        )
      );

    const today = toIsoDate(new Date());
    await this.db
      .delete(this.schema.recurringOccurrences)
      .where(
        and(
          eq(this.schema.recurringOccurrences.template_id, id),
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          eq(this.schema.recurringOccurrences.status, 'pending'),
          gt(this.schema.recurringOccurrences.due_date, today)
        )
      );

    void logAuditEvent({
      workspaceId,
      userId: performedByUserId ?? template.created_by_user_id,
      action: 'recurring_template.cancel',
      entityType: 'recurring_template',
      entityId: id,
    });

    await this.invalidateWorkspaceCache(workspaceId);

    const result = await this.findById(id, workspaceId);
    if (!result) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    return result;
  }

  async delete(
    id: string,
    workspaceId: string,
    performedByUserId?: string
  ): Promise<{ success: true }> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
      );
    }

    await this.db
      .delete(this.schema.recurringTemplates)
      .where(
        and(
          eq(this.schema.recurringTemplates.id, id),
          eq(this.schema.recurringTemplates.workspace_id, workspaceId)
        )
      );

    void logAuditEvent({
      workspaceId,
      userId: performedByUserId ?? template.created_by_user_id,
      action: 'recurring_template.delete',
      entityType: 'recurring_template',
      entityId: id,
      oldValue: template as unknown as Record<string, unknown>,
    });

    await this.invalidateWorkspaceCache(workspaceId);

    return { success: true };
  }

  async generateOccurrences(
    workspaceId: string,
    perf?: PerfCollector
  ): Promise<{ created: number }> {
    const templates = await trackQuery('RecurringTemplateService.generateOccurrences', perf, () =>
      this.db.query.recurringTemplates.findMany({
        where: and(
          eq(this.schema.recurringTemplates.workspace_id, workspaceId),
          eq(this.schema.recurringTemplates.status, 'active')
        ),
      })
    );

    let created = 0;
    let completedTransitions = 0;
    for (const template of templates) {
      const result = await this._generateForTemplate(template as RecurringTemplate);
      created += result.created;
      if (result.completedTransition) {
        completedTransitions += 1;
      }
    }

    if (created > 0 || completedTransitions > 0) {
      await this.invalidateWorkspaceCache(workspaceId);
    }

    return { created };
  }

  private async _generateForTemplate(template: RecurringTemplate, dbHandle: IDatabase = this.db) {
    if (template.status !== 'active') {
      return { created: 0, completedTransition: false };
    }

    const latestOccurrence = await dbHandle.query.recurringOccurrences.findFirst({
      where: and(
        eq(this.schema.recurringOccurrences.template_id, template.id),
        eq(this.schema.recurringOccurrences.workspace_id, template.workspace_id)
      ),
      orderBy: [desc(this.schema.recurringOccurrences.occurrence_number)],
    });

    const startOccurrence = template.starting_occurrence_number || 1;
    let occurrenceNumber = latestOccurrence
      ? latestOccurrence.occurrence_number + 1
      : startOccurrence;

    const today = new Date();
    const lookaheadEndDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0));
    const lookaheadEnd = toIsoDate(lookaheadEndDate);

    const rows: Array<Record<string, unknown>> = [];
    let exhausted = false;

    for (let i = 0; i < 240; i++) {
      const dueDate = calculateDueDate(
        template.start_date,
        template.day_of_month,
        occurrenceNumber - startOccurrence,
        template.frequency ?? 'monthly',
        template.interval_count ?? 1
      );

      if (dueDate > lookaheadEnd) {
        break;
      }

      if (!shouldGenerateOccurrence(template, occurrenceNumber, dueDate)) {
        exhausted = true;
        break;
      }

      rows.push({
        id: nanoid(),
        template_id: template.id,
        workspace_id: template.workspace_id,
        due_date: dueDate,
        occurrence_number: occurrenceNumber,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });

      occurrenceNumber += 1;
    }

    if (rows.length > 0) {
      await dbHandle.insert(this.schema.recurringOccurrences).values(rows).onConflictDoNothing();
    }

    let completedTransition = false;
    if (exhausted) {
      await dbHandle
        .update(this.schema.recurringTemplates)
        .set({ status: 'completed', updated_at: new Date() })
        .where(eq(this.schema.recurringTemplates.id, template.id));
      completedTransition = true;
    }

    return { created: rows.length, completedTransition };
  }
}
