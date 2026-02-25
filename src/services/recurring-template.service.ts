import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { logAuditEvent } from '@/lib/audit-log';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import type { RecurringTemplate, RecurringTemplateOutput } from '@/lib/types/recurring';
import {
  createRecurringTemplateSchema,
  updateRecurringTemplateSchema,
  type CreateRecurringTemplateInput,
  type UpdateRecurringTemplateInput,
} from '@/lib/validation/recurring';
import { calculateDueDate, shouldGenerateOccurrence } from '@/lib/utils/recurring-dates';
import { RecurringServiceError, ServiceErrorCode } from './service-errors';

const log = createLogger('recurring-template');

export interface RecurringTemplateFilters {
  status?: 'active' | 'paused' | 'completed' | 'cancelled' | 'all';
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
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(workspaceId),
      CacheTags.RECURRING,
      CacheTags.RECURRING_OCCURRENCES,
      CacheTags.RECURRING_CALENDAR,
      CacheTags.TRANSACTIONS,
      CacheTags.DASHBOARD,
    ]);
  }

  private mapTemplateOutput(
    template: any,
    occurrenceStats: {
      pendingCount: number;
      confirmedCount: number;
      skippedCount: number;
      nextDueDate: string | null;
    }
  ): RecurringTemplateOutput {
    return {
      ...template,
      category: {
        id: template.category.id,
        name: template.category.name,
        type: template.category.type,
        icon: template.category.icon,
        color: template.category.color,
      },
      account: {
        id: template.account.id,
        name: template.account.name,
        type: template.account.type,
      },
      pendingCount: occurrenceStats.pendingCount,
      confirmedCount: occurrenceStats.confirmedCount,
      skippedCount: occurrenceStats.skippedCount,
      nextDueDate: occurrenceStats.nextDueDate,
    };
  }

  private getOccurrenceStats(occurrences: any[]) {
    const pendingOccurrences = occurrences.filter((occ) => occ.status === 'pending');
    const pendingCount = pendingOccurrences.length;
    const confirmedCount = occurrences.filter((occ) => occ.status === 'confirmed').length;
    const skippedCount = occurrences.filter((occ) => occ.status === 'skipped').length;
    const sortedPending = [...pendingOccurrences].sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    );

    return {
      pendingCount,
      confirmedCount,
      skippedCount,
      nextDueDate: sortedPending[0]?.due_date ?? null,
    };
  }

  async create(input: CreateRecurringTemplateInput): Promise<RecurringTemplateOutput> {
    const validated = createRecurringTemplateSchema.parse(input);

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
        day_of_month: validated.day_of_month,
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
      const occurrences =
        templateIds.length > 0
          ? await this.db.query.recurringOccurrences.findMany({
              where: and(
                eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
                inArray(this.schema.recurringOccurrences.template_id, templateIds)
              ),
            })
          : [];

      const statsMap = new Map<string, ReturnType<typeof this.getOccurrenceStats>>();
      for (const template of templates) {
        const templateOccurrences = occurrences.filter((occ) => occ.template_id === template.id);
        statsMap.set(template.id, this.getOccurrenceStats(templateOccurrences));
      }

      return {
        templates: templates.map((template) =>
          this.mapTemplateOutput(template, statsMap.get(template.id) ?? this.getOccurrenceStats([]))
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

    const occurrences = await this.db.query.recurringOccurrences.findMany({
      where: and(
        eq(this.schema.recurringOccurrences.template_id, id),
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId)
      ),
      orderBy: [asc(this.schema.recurringOccurrences.due_date)],
    });

    return this.mapTemplateOutput(template, this.getOccurrenceStats(occurrences));
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateRecurringTemplateInput
  ): Promise<RecurringTemplateOutput> {
    const validated = updateRecurringTemplateSchema.parse(data);

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

    for (const key of [
      'name',
      'type',
      'amount',
      'currency',
      'category_id',
      'account_id',
      'day_of_month',
      'start_date',
      'end_date',
      'total_occurrences',
      'is_installment',
      'installment_label',
      'starting_occurrence_number',
      'description',
      'status',
    ] as const) {
      const value = validated[key];
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    }

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

    if (updated && updated.status === 'active') {
      await this._generateForTemplate(updated as RecurringTemplate);
    }

    if (Object.keys(updatePayload).length > 1) {
      void logAuditEvent({
        workspaceId,
        userId: existing.created_by_user_id,
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

  async pause(id: string, workspaceId: string): Promise<RecurringTemplateOutput> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
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
      userId: template.created_by_user_id,
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

  async resume(id: string, workspaceId: string): Promise<RecurringTemplateOutput> {
    const template = await this.findById(id, workspaceId);
    if (!template) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_TEMPLATE_NOT_FOUND,
        'Recurring template not found',
        404
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
      userId: template.created_by_user_id,
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

  async cancel(id: string, workspaceId: string): Promise<RecurringTemplateOutput> {
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
    const futurePending = await this.db.query.recurringOccurrences.findMany({
      where: and(
        eq(this.schema.recurringOccurrences.template_id, id),
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
        eq(this.schema.recurringOccurrences.status, 'pending')
      ),
    });

    const toDelete = futurePending.filter((occ) => occ.due_date > today);
    for (const occurrence of toDelete) {
      await this.db
        .delete(this.schema.recurringOccurrences)
        .where(eq(this.schema.recurringOccurrences.id, occurrence.id));
    }

    void logAuditEvent({
      workspaceId,
      userId: template.created_by_user_id,
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

  async delete(id: string, workspaceId: string): Promise<{ success: true }> {
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
      userId: template.created_by_user_id,
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
    for (const template of templates) {
      created += await this._generateForTemplate(template as RecurringTemplate);
    }

    if (created > 0) {
      await this.invalidateWorkspaceCache(workspaceId);
    }

    return { created };
  }

  private async _generateForTemplate(template: RecurringTemplate, dbHandle: IDatabase = this.db) {
    if (template.status !== 'active') {
      return 0;
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
        occurrenceNumber - startOccurrence
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

    if (exhausted) {
      await dbHandle
        .update(this.schema.recurringTemplates)
        .set({ status: 'completed', updated_at: new Date() })
        .where(eq(this.schema.recurringTemplates.id, template.id));
    }

    return rows.length;
  }
}
