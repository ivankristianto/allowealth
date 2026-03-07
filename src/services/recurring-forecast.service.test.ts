import { describe, expect, it } from 'bun:test';
import { computeForecast } from './recurring-forecast.service';
import type { RecurringTemplateOutput } from '@/lib/types/recurring';
import { formatRecurringFrequencyLabel } from '@/lib/utils/recurring-frequency';

function makeTemplate(
  overrides: Partial<RecurringTemplateOutput> & {
    frequency?: 'weekly' | 'monthly';
    interval_count?: number;
  } = {}
): RecurringTemplateOutput {
  return {
    id: overrides.id ?? 'tpl-1',
    workspace_id: 'ws-1',
    created_by_user_id: 'user-1',
    name: overrides.name ?? 'Test Template',
    type: overrides.type ?? 'expense',
    amount: overrides.amount ?? '100.00',
    currency: overrides.currency ?? 'USD',
    category_id: 'cat-1',
    account_id: 'acc-1',
    day_of_month: overrides.day_of_month ?? 15,
    frequency: overrides.frequency ?? 'monthly',
    interval_count: overrides.interval_count ?? 1,
    start_date: overrides.start_date ?? '2024-01-01',
    end_date: overrides.end_date ?? null,
    total_occurrences: overrides.total_occurrences ?? null,
    is_installment: overrides.is_installment ?? false,
    installment_label: overrides.installment_label ?? null,
    starting_occurrence_number: overrides.starting_occurrence_number ?? 1,
    description: overrides.description ?? null,
    status: overrides.status ?? 'active',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    category: overrides.category ?? {
      id: 'cat-1',
      name: 'Groceries',
      type: 'expense',
      icon: '🛒',
      color: '#ff0000',
    },
    account: overrides.account ?? { id: 'acc-1', name: 'Checking', type: 'checking' },
    nextDueDate: overrides.nextDueDate ?? '2024-01-15',
    pendingCount: overrides.pendingCount ?? 0,
    confirmedCount: overrides.confirmedCount ?? 0,
    skippedCount: overrides.skippedCount ?? 0,
  } as RecurringTemplateOutput;
}

describe('formatRecurringFrequencyLabel', () => {
  it('returns "Weekly" for weekly with interval 1', () => {
    expect(formatRecurringFrequencyLabel('weekly', 1)).toBe('Weekly');
  });

  it('returns "Biweekly" for weekly with interval 2', () => {
    expect(formatRecurringFrequencyLabel('weekly', 2)).toBe('Biweekly');
  });

  it('returns "Monthly" for monthly with interval 1', () => {
    expect(formatRecurringFrequencyLabel('monthly', 1)).toBe('Monthly');
  });

  it('returns "Quarterly" for monthly with interval 3', () => {
    expect(formatRecurringFrequencyLabel('monthly', 3)).toBe('Quarterly');
  });

  it('returns "Semi-annual" for monthly with interval 6', () => {
    expect(formatRecurringFrequencyLabel('monthly', 6)).toBe('Semi-annual');
  });

  it('returns "Annual" for monthly with interval 12', () => {
    expect(formatRecurringFrequencyLabel('monthly', 12)).toBe('Annual');
  });

  it('returns custom label for non-standard intervals', () => {
    expect(formatRecurringFrequencyLabel('weekly', 3)).toBe('Every 3 weeks');
    expect(formatRecurringFrequencyLabel('monthly', 5)).toBe('Every 5 months');
  });

  it('returns schedule label for monthly interval 1 when requested', () => {
    expect(
      formatRecurringFrequencyLabel('monthly', 1, { dayOfMonth: 15, variant: 'schedule' })
    ).toBe('Every 15th');
  });
});

describe('computeForecast', () => {
  it('projects a monthly template across 3 months', () => {
    const tpl = makeTemplate({
      start_date: '2024-01-01',
      day_of_month: 15,
      amount: '200.00',
      frequency: 'monthly',
      interval_count: 1,
    });

    const result = computeForecast([tpl], 2024, 1, 3);

    expect(result.monthKeys).toEqual(['2024-01', '2024-02', '2024-03']);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.months['2024-01']).toBe('200.00');
    expect(row.months['2024-02']).toBe('200.00');
    expect(row.months['2024-03']).toBe('200.00');
  });

  it('quarterly template shows amount only in matching months', () => {
    const tpl = makeTemplate({
      start_date: '2024-01-01',
      day_of_month: 1,
      amount: '300.00',
      frequency: 'monthly',
      interval_count: 3,
    });

    const result = computeForecast([tpl], 2024, 1, 6);

    expect(result.monthKeys).toHaveLength(6);
    expect(result.rows[0].months['2024-01']).toBe('300.00');
    expect(result.rows[0].months['2024-02']).toBeNull();
    expect(result.rows[0].months['2024-03']).toBeNull();
    expect(result.rows[0].months['2024-04']).toBe('300.00');
    expect(result.rows[0].months['2024-05']).toBeNull();
    expect(result.rows[0].months['2024-06']).toBeNull();
  });

  it('weekly template counts occurrences per month', () => {
    const tpl = makeTemplate({
      start_date: '2024-01-01',
      day_of_month: 1,
      amount: '50.00',
      frequency: 'weekly',
      interval_count: 1,
    });

    const result = computeForecast([tpl], 2024, 1, 1);

    // January 2024 starting from Jan 1 weekly: Jan 1, Jan 8, Jan 15, Jan 22, Jan 29 → 5 occurrences
    // Amount should be sum of weekly occurrences in that month
    const janAmount = parseFloat(result.rows[0].months['2024-01']!);
    expect(janAmount).toBeGreaterThan(50);
    // 5 weeks in Jan starting from Jan 1 = 250
    expect(janAmount).toBe(250);
  });

  it('totals only count active templates', () => {
    const active = makeTemplate({
      id: 'tpl-active',
      status: 'active',
      amount: '100.00',
      frequency: 'monthly',
      interval_count: 1,
      start_date: '2024-01-01',
    });

    const paused = makeTemplate({
      id: 'tpl-paused',
      status: 'paused',
      amount: '200.00',
      frequency: 'monthly',
      interval_count: 1,
      start_date: '2024-01-01',
    });

    const result = computeForecast([active, paused], 2024, 1, 1);

    expect(result.rows).toHaveLength(2);
    // Totals should only include active template amounts
    const usdTotals = result.totals.find((t) => t.currency === 'USD');
    expect(usdTotals).toBeDefined();
    expect(usdTotals!.months['2024-01'].expense).toBe('100.00');
  });

  it('excludes templates that ended before forecast window', () => {
    const tpl = makeTemplate({
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      amount: '100.00',
      frequency: 'monthly',
      interval_count: 1,
    });

    const result = computeForecast([tpl], 2024, 1, 3);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].months['2024-01']).toBeNull();
    expect(result.rows[0].months['2024-02']).toBeNull();
    expect(result.rows[0].months['2024-03']).toBeNull();
  });

  it('handles total_occurrences limit', () => {
    const tpl = makeTemplate({
      start_date: '2024-01-01',
      day_of_month: 15,
      amount: '100.00',
      total_occurrences: 2,
      frequency: 'monthly',
      interval_count: 1,
    });

    const result = computeForecast([tpl], 2024, 1, 4);

    expect(result.rows[0].months['2024-01']).toBe('100.00');
    expect(result.rows[0].months['2024-02']).toBe('100.00');
    expect(result.rows[0].months['2024-03']).toBeNull();
    expect(result.rows[0].months['2024-04']).toBeNull();
  });

  it('projects active template started years before forecast window', () => {
    const tpl = makeTemplate({
      start_date: '2020-01-01',
      day_of_month: 15,
      amount: '100.00',
      frequency: 'monthly',
      interval_count: 1,
    });
    const result = computeForecast([tpl], 2026, 6, 3);
    expect(result.rows[0].months['2026-06']).toBe('100.00');
    expect(result.rows[0].months['2026-07']).toBe('100.00');
    expect(result.rows[0].months['2026-08']).toBe('100.00');
  });

  it('projects weekly template started years before forecast window', () => {
    const tpl = makeTemplate({
      start_date: '2020-01-06',
      day_of_month: 0,
      amount: '50.00',
      frequency: 'weekly',
      interval_count: 1,
    });
    const result = computeForecast([tpl], 2026, 3, 1);
    const marchAmount = parseFloat(result.rows[0].months['2026-03']!);
    // March 2026 should have 4-5 weekly occurrences
    expect(marchAmount).toBeGreaterThanOrEqual(200);
  });

  it('projects quarterly template started years before forecast window', () => {
    const tpl = makeTemplate({
      start_date: '2020-01-15',
      day_of_month: 15,
      amount: '500.00',
      frequency: 'monthly',
      interval_count: 3,
    });
    // Quarterly starting Jan 2020: Jan, Apr, Jul, Oct, Jan, Apr...
    // 2026-01, 2026-04, 2026-07, 2026-10 should have amounts
    const result = computeForecast([tpl], 2026, 1, 6);
    expect(result.rows[0].months['2026-01']).toBe('500.00');
    expect(result.rows[0].months['2026-02']).toBeNull();
    expect(result.rows[0].months['2026-03']).toBeNull();
    expect(result.rows[0].months['2026-04']).toBe('500.00');
  });
});
