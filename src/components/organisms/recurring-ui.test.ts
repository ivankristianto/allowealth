import { describe, expect, it } from 'bun:test';

import {
  getActionInboxTitle,
  getOccurrenceActionWarning,
  getOccurrenceDateLabel,
  normalizeInstallmentState,
} from './recurring-ui';

describe('recurring UI helpers', () => {
  it('uses expected wording for income occurrences', () => {
    expect(getOccurrenceDateLabel('expense', 'April 10, 2026')).toBe('Due on April 10, 2026');
    expect(getOccurrenceDateLabel('income', 'April 10, 2026')).toBe('Expected on April 10, 2026');
    expect(getOccurrenceActionWarning('confirm', 'expense')).toBe(
      'You can only confirm occurrences on or after the due date'
    );
    expect(getOccurrenceActionWarning('skip', 'income')).toBe(
      'You can only skip occurrences on or after the expected date'
    );
  });

  it('derives the queue heading from the selected month label', () => {
    expect(getActionInboxTitle('March 2026', 'March 2026')).toBe('Due This Month');
    expect(getActionInboxTitle('April 2026', 'March 2026')).toBe('Due in APRIL');
  });

  it('clears installment-only state when count mode is no longer available', () => {
    expect(
      normalizeInstallmentState({
        selectedEndMode: 'count',
        totalOccurrencesValue: '5',
        isInstallmentChecked: true,
        startingOccurrenceNumber: '3',
        installmentLabel: 'Payment',
      })
    ).toEqual({
      enabled: true,
      checked: true,
      showFields: true,
      startingOccurrenceNumber: '3',
      installmentLabel: 'Payment',
    });

    expect(
      normalizeInstallmentState({
        selectedEndMode: 'none',
        totalOccurrencesValue: '',
        isInstallmentChecked: true,
        startingOccurrenceNumber: '3',
        installmentLabel: 'Payment',
      })
    ).toEqual({
      enabled: false,
      checked: false,
      showFields: false,
      startingOccurrenceNumber: '1',
      installmentLabel: 'Installment',
    });
  });
});
