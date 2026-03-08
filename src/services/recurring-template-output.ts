import type { RecurringTemplate, RecurringTemplateOutput } from '@/lib/types/recurring';

export interface RecurringOccurrenceStats {
  pendingCount: number;
  confirmedCount: number;
  skippedCount: number;
  nextDueDate: string | null;
}

export interface RecurringTemplateWithRelations extends RecurringTemplate {
  category: RecurringTemplateOutput['category'];
  account: RecurringTemplateOutput['account'];
}

export function mapRecurringTemplateOutput(
  template: RecurringTemplateWithRelations,
  occurrenceStats: RecurringOccurrenceStats
): RecurringTemplateOutput {
  const isTemplateActive = template.status === 'active';

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
    pendingCount: isTemplateActive ? occurrenceStats.pendingCount : 0,
    confirmedCount: occurrenceStats.confirmedCount,
    skippedCount: occurrenceStats.skippedCount,
    nextDueDate: isTemplateActive ? occurrenceStats.nextDueDate : null,
  };
}
