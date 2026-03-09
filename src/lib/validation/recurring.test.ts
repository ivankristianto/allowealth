import { describe, expect, it } from 'bun:test';
import { createRecurringTemplateAPISchema, createRecurringTemplateSchema } from './recurring';

const basePayload = {
  workspace_id: 'workspace-1',
  created_by_user_id: 'user-1',
  name: 'Salary',
  type: 'income' as const,
  amount: '15000000',
  currency: 'IDR' as const,
  category_id: 'cat-1',
  account_id: 'account-1',
  day_of_month: 25,
  frequency: 'monthly' as const,
  interval_count: 1,
  start_date: '2026-01-25',
  is_installment: false,
  starting_occurrence_number: 1,
  status: 'active' as const,
};

describe('recurring validation', () => {
  it('accepts open-ended recurring templates in the service schema', () => {
    const parsed = createRecurringTemplateSchema.parse(basePayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });

  it('accepts open-ended recurring templates in the API schema', () => {
    const {
      workspace_id: _workspaceId,
      created_by_user_id: _createdByUserId,
      ...apiPayload
    } = basePayload;
    const parsed = createRecurringTemplateAPISchema.parse(apiPayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });
});
