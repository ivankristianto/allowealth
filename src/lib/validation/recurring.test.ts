import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
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
    const parsed = parse(createRecurringTemplateSchema, basePayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });

  it('accepts open-ended recurring templates in the API schema', () => {
    const {
      workspace_id: _workspaceId,
      created_by_user_id: _createdByUserId,
      ...apiPayload
    } = basePayload;
    const parsed = parse(createRecurringTemplateAPISchema, apiPayload);
    expect(parsed.total_occurrences).toBeUndefined();
    expect(parsed.end_date).toBeUndefined();
  });

  it('requires day_of_month for monthly templates', () => {
    const { day_of_month: _dayOfMonth, ...payload } = basePayload;

    expect(() => parse(createRecurringTemplateSchema, payload)).toThrow();
  });

  it('requires total_occurrences for installments', () => {
    expect(() =>
      parse(createRecurringTemplateSchema, {
        ...basePayload,
        is_installment: true,
      })
    ).toThrow();
  });

  it('requires starting_occurrence_number to be <= total_occurrences', () => {
    expect(() =>
      parse(createRecurringTemplateSchema, {
        ...basePayload,
        is_installment: true,
        total_occurrences: 3,
        starting_occurrence_number: 4,
      })
    ).toThrow();
  });

  it('coerces API defaults and numeric fields', () => {
    const {
      workspace_id: _workspaceId,
      created_by_user_id: _createdByUserId,
      ...apiPayload
    } = basePayload;
    const parsed = parse(createRecurringTemplateAPISchema, {
      ...apiPayload,
      interval_count: '2',
      is_installment: 'true',
      total_occurrences: '6',
      starting_occurrence_number: '2',
      status: undefined,
    });

    expect(parsed.interval_count).toBe(2);
    expect(parsed.is_installment).toBe(true);
    expect(parsed.total_occurrences).toBe(6);
    expect(parsed.starting_occurrence_number).toBe(2);
    expect(parsed.status).toBe('active');
  });
});
