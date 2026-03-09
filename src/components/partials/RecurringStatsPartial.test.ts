import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readRecurringStatsPartial(): string {
  return readFileSync('src/components/partials/RecurringStatsPartial.astro', 'utf-8');
}

describe('RecurringStatsPartial', () => {
  it('frames upcoming income as expected while keeping expense counts due-based', () => {
    const source = readRecurringStatsPartial();

    expect(source).toContain('{summary.upcomingIncomeCount} expected');
    expect(source).toContain('{summary.upcomingExpenseCount} items due');
  });
});
