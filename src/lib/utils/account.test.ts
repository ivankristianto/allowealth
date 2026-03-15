/**
 * Account Utilities Unit Tests
 * ===========================
 * Tests for account calculation and visualization utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  getAccountTypeColor,
  calculateAccountAllocation,
  formatTypeForDisplay,
  groupAccountsByType,
  calculateGroupTotals,
  calculatePortfolioTotals,
  sortAccountTypes,
  convertToIdr,
  convertIdrToUsd,
  calculateDebtTotals,
  groupAccountsByClass,
  calculateAccountTotalsByCurrency,
  calculateDebtTotalsByCurrency,
  calculateGroupTotalsByCurrency,
  calculateReconciliation,
} from './account';
import type {
  AccountOutput,
  AccountClass,
  Currency,
  ReconciliationCurrencyRow,
} from '@/lib/types/account';

// Helper to create mock account
const createMockAccount = (overrides: Partial<AccountOutput> = {}): AccountOutput => ({
  id: 'test-id',
  name: 'Test Account',
  type: 'bank_account',
  account_class: 'liquid',
  balance: '1000000',
  currency: 'IDR',
  status: 'active',
  closed_at: null,
  closed_by_user_id: null,
  last_updated: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('Account Utils - getAccountTypeColor', () => {
  it('should return predefined color for known account types', () => {
    expect(getAccountTypeColor('stock')).toBe('#15803d'); // forest-600 (accent)
    expect(getAccountTypeColor('bank_account')).toBe('#0ea5e9'); // sky-500 (info)
    expect(getAccountTypeColor('mutual_fund')).toBe('#f59e0b');
    expect(getAccountTypeColor('bond')).toBe('#3b82f6');
    expect(getAccountTypeColor('crypto')).toBe('#8b5cf6');
    expect(getAccountTypeColor('other')).toBe('#9ca3af');
  });

  it('should return fallback color for unknown types with index', () => {
    const color = getAccountTypeColor('custom_type', 0);
    expect(color).toBe('#ec4899'); // First fallback color
  });

  it('should cycle through fallback colors based on index', () => {
    const color1 = getAccountTypeColor('unknown1', 0);
    const color2 = getAccountTypeColor('unknown2', 1);
    expect(color1).not.toBe(color2);
  });

  it('should return default gray for unknown types without index', () => {
    const color = getAccountTypeColor('completely_unknown');
    expect(color).toBe('#6b7280');
  });
});

describe('Account Utils - convertToIdr', () => {
  it('should return same amount for IDR currency', () => {
    expect(convertToIdr(1000000, 'IDR')).toBe(1000000);
  });

  it('should convert USD to IDR using rate', () => {
    // Default rate is 15000
    expect(convertToIdr(100, 'USD')).toBe(1500000);
  });
});

describe('Account Utils - convertIdrToUsd', () => {
  it('should convert IDR to USD using rate', () => {
    // Default rate is 15000
    expect(convertIdrToUsd(1500000)).toBe(100);
  });

  it('should handle zero amount', () => {
    expect(convertIdrToUsd(0)).toBe(0);
  });
});

describe('Account Utils - calculateAccountAllocation', () => {
  it('should calculate allocation percentages correctly', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '7500000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: '2500000', currency: 'IDR' }),
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation).toHaveLength(2);
    expect(allocation[0].type).toBe('Stock'); // Formatted
    expect(allocation[0].percentage).toBe(75);
    expect(allocation[1].type).toBe('Bank Account');
    expect(allocation[1].percentage).toBe(25);
  });

  it('should sort allocation by percentage descending', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'other', balance: '1000000', currency: 'IDR' }),
      createMockAccount({ type: 'stock', balance: '5000000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: '3000000', currency: 'IDR' }),
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation[0].type).toBe('Stock');
    expect(allocation[1].type).toBe('Bank Account');
    expect(allocation[2].type).toBe('Other');
  });

  it('should convert USD to IDR for percentage calculation', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '15000000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: '1000', currency: 'USD' }), // 15M IDR
    ];

    const allocation = calculateAccountAllocation(accounts);

    // Both should be 50% each
    expect(allocation).toHaveLength(2);
    expect(allocation[0].percentage).toBe(50);
    expect(allocation[1].percentage).toBe(50);
  });

  it('should scope allocation to a single currency when filter is provided', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '3000000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: '1000000', currency: 'IDR' }),
      createMockAccount({ type: 'other', balance: '500', currency: 'USD' }),
    ];

    const allocation = calculateAccountAllocation(accounts, 'IDR');

    expect(allocation).toHaveLength(2);
    expect(allocation[0].type).toBe('Stock');
    expect(allocation[0].percentage).toBe(75);
    expect(allocation[1].type).toBe('Bank Account');
    expect(allocation[1].percentage).toBe(25);
  });

  it('should return empty array for empty input', () => {
    const allocation = calculateAccountAllocation([]);
    expect(allocation).toHaveLength(0);
  });

  it('should filter out accounts with zero or negative balance', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '1000000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: '0', currency: 'IDR' }),
      createMockAccount({ type: 'other', balance: '-500', currency: 'IDR' }),
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].type).toBe('Stock');
    expect(allocation[0].percentage).toBe(100);
  });

  it('should handle invalid balance strings', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '1000000', currency: 'IDR' }),
      createMockAccount({ type: 'bank_account', balance: 'invalid', currency: 'IDR' }),
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].type).toBe('Stock');
  });

  it('should assign colors to allocation items', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ type: 'stock', balance: '1000000', currency: 'IDR' }),
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation[0].color).toBe('#15803d'); // Stock color (forest-600 accent)
  });
});

describe('Account Utils - formatTypeForDisplay', () => {
  it('should format known account types', () => {
    expect(formatTypeForDisplay('bank_account')).toBe('Bank Account');
    expect(formatTypeForDisplay('mutual_fund')).toBe('Mutual Fund');
    expect(formatTypeForDisplay('stock')).toBe('Stock');
    expect(formatTypeForDisplay('crypto')).toBe('Cryptocurrency');
  });

  it('should format unknown types with title case', () => {
    expect(formatTypeForDisplay('custom_type')).toBe('Custom Type');
    expect(formatTypeForDisplay('some_new_category')).toBe('Some New Category');
  });
});

describe('Account Utils - groupAccountsByType', () => {
  it('should group accounts by their type', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ id: '1', type: 'stock', name: 'Stock 1' }),
      createMockAccount({ id: '2', type: 'stock', name: 'Stock 2' }),
      createMockAccount({ id: '3', type: 'bank_account', name: 'Bank 1' }),
    ];

    const grouped = groupAccountsByType(accounts);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['stock']).toHaveLength(2);
    expect(grouped['bank_account']).toHaveLength(1);
  });

  it('should return empty object for empty input', () => {
    const grouped = groupAccountsByType([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe('Account Utils - calculateGroupTotals', () => {
  it('should calculate totals by currency for a group', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000000', currency: 'IDR' }),
      createMockAccount({ balance: '500000', currency: 'IDR' }),
      createMockAccount({ balance: '100', currency: 'USD' }),
    ];

    const totals = calculateGroupTotals(accounts);

    expect(totals.idr).toBe(1500000);
    expect(totals.usd).toBe(100);
  });

  it('should handle empty array', () => {
    const totals = calculateGroupTotals([]);

    expect(totals.idr).toBe(0);
    expect(totals.usd).toBe(0);
  });

  it('should handle invalid balance strings', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: 'invalid', currency: 'IDR' }),
      createMockAccount({ balance: '1000', currency: 'IDR' }),
    ];

    const totals = calculateGroupTotals(accounts);

    expect(totals.idr).toBe(1000);
  });
});

describe('Account Utils - calculateAccountTotalsByCurrency', () => {
  it('should calculate non-debt totals by currency with preferred ordering', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000000', currency: 'IDR', account_class: 'liquid' }),
      createMockAccount({ balance: '200', currency: 'USD', account_class: 'liquid' }),
      createMockAccount({ balance: '-500', currency: 'USD', account_class: 'debt' }),
      createMockAccount({ balance: '300', currency: 'SGD', account_class: 'non_liquid' }),
    ];

    const totals = calculateAccountTotalsByCurrency(accounts, ['USD', 'IDR', 'SGD']);

    expect(totals).toEqual([
      { currency: 'USD', amount: 200 },
      { currency: 'IDR', amount: 1000000 },
      { currency: 'SGD', amount: 300 },
    ]);
  });
});

describe('Account Utils - calculateDebtTotalsByCurrency', () => {
  it('should calculate absolute debt totals by currency', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '-1000000', currency: 'IDR', account_class: 'debt' }),
      createMockAccount({ balance: '-200', currency: 'USD', account_class: 'debt' }),
      createMockAccount({ balance: '300', currency: 'USD', account_class: 'liquid' }),
    ];

    const totals = calculateDebtTotalsByCurrency(accounts, ['IDR', 'USD']);

    expect(totals).toEqual([
      { currency: 'IDR', amount: 1000000 },
      { currency: 'USD', amount: 200 },
    ]);
  });
});

describe('Account Utils - calculateGroupTotalsByCurrency', () => {
  it('should calculate group totals by currency and normalize debt values', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000000', currency: 'IDR', account_class: 'liquid' }),
      createMockAccount({ balance: '-200', currency: 'USD', account_class: 'debt' }),
      createMockAccount({ balance: '50', currency: 'USD', account_class: 'liquid' }),
    ];

    const totals = calculateGroupTotalsByCurrency(accounts, ['IDR', 'USD']);

    expect(totals).toEqual([
      { currency: 'IDR', amount: 1000000 },
      { currency: 'USD', amount: 250 },
    ]);
  });
});

describe('Account Utils - calculatePortfolioTotals', () => {
  it('should calculate total portfolio value in both currencies', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '15000000', currency: 'IDR' }),
      createMockAccount({ balance: '1000', currency: 'USD' }), // 15M IDR equivalent
    ];

    const totals = calculatePortfolioTotals(accounts);

    expect(totals.totalIdr).toBe(15000000); // Only IDR accounts
    expect(totals.totalUsd).toBe(1000); // Only USD accounts
  });

  it('should return zero for empty portfolio', () => {
    const totals = calculatePortfolioTotals([]);

    expect(totals.totalIdr).toBe(0);
    expect(totals.totalUsd).toBe(0);
  });

  it('should exclude invalid balances', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000000', currency: 'IDR' }),
      createMockAccount({ balance: '-500', currency: 'IDR' }),
      createMockAccount({ balance: 'abc', currency: 'IDR' }),
    ];

    const totals = calculatePortfolioTotals(accounts);

    expect(totals.totalIdr).toBe(1000000);
  });

  it('should exclude debt accounts from totals', () => {
    const accounts = [
      createMockAccount({ balance: '1000000', currency: 'IDR', account_class: 'liquid' }),
      createMockAccount({ balance: '500000', currency: 'IDR', account_class: 'debt' }),
    ];
    const result = calculatePortfolioTotals(accounts);
    expect(result.totalIdr).toBe(1000000);
  });
});

describe('Account Utils - sortAccountTypes', () => {
  it('should sort types by predefined order', () => {
    const types = ['other', 'bank_account', 'stock', 'mutual_fund'];
    const sorted = sortAccountTypes(types);

    expect(sorted).toEqual(['stock', 'bank_account', 'mutual_fund', 'other']);
  });

  it('should put unknown types at the end', () => {
    const types = ['stock', 'custom_type', 'bank_account'];
    const sorted = sortAccountTypes(types);

    expect(sorted[0]).toBe('stock');
    expect(sorted[1]).toBe('bank_account');
    expect(sorted[2]).toBe('custom_type');
  });

  it('should handle empty array', () => {
    const sorted = sortAccountTypes([]);
    expect(sorted).toHaveLength(0);
  });
});

describe('Account Utils - Edge Cases', () => {
  it('should handle accounts with decimal balances', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000.50', currency: 'IDR' }),
      createMockAccount({ balance: '500.25', currency: 'IDR' }),
    ];

    const totals = calculateGroupTotals(accounts);

    expect(totals.idr).toBe(1500.75);
  });

  it('should handle very large balances', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000000000000', currency: 'IDR' }), // 1 trillion
    ];

    const allocation = calculateAccountAllocation(accounts);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].percentage).toBe(100);
    expect(allocation[0].totalIdr).toBe(1000000000000);
  });

  it('should handle portfolio with only USD accounts', () => {
    const accounts: AccountOutput[] = [
      createMockAccount({ balance: '1000', currency: 'USD' }),
      createMockAccount({ balance: '500', currency: 'USD' }),
    ];

    const totals = calculatePortfolioTotals(accounts);

    expect(totals.totalIdr).toBe(0); // No IDR accounts
    expect(totals.totalUsd).toBe(1500); // Sum of USD accounts
  });
});

describe('Account Utils - calculateDebtTotals', () => {
  it('should calculate debt totals by currency', () => {
    const accounts = [
      createMockAccount({ account_class: 'debt', balance: '500000', currency: 'IDR' }),
      createMockAccount({ account_class: 'debt', balance: '1000', currency: 'USD' }),
      createMockAccount({ account_class: 'liquid', balance: '2000000', currency: 'IDR' }),
    ];
    const result = calculateDebtTotals(accounts);
    expect(result.debtIdr).toBe(500000);
    expect(result.debtUsd).toBe(1000);
  });

  it('should return zeros when no debt accounts exist', () => {
    const accounts = [
      createMockAccount({ account_class: 'liquid', balance: '1000000', currency: 'IDR' }),
    ];
    const result = calculateDebtTotals(accounts);
    expect(result.debtIdr).toBe(0);
    expect(result.debtUsd).toBe(0);
  });

  it('should use absolute values for debt', () => {
    const accounts = [
      createMockAccount({ account_class: 'debt', balance: '-500000', currency: 'IDR' }),
    ];
    const result = calculateDebtTotals(accounts);
    expect(result.debtIdr).toBe(500000);
  });
});

describe('Account Utils - groupAccountsByClass', () => {
  it('should group accounts by account class', () => {
    const accounts = [
      createMockAccount({ id: '1', account_class: 'liquid', type: 'bank_account' }),
      createMockAccount({ id: '2', account_class: 'liquid', type: 'e_wallet' }),
      createMockAccount({ id: '3', account_class: 'non_liquid', type: 'stock' }),
      createMockAccount({ id: '4', account_class: 'debt', type: 'credit_card' }),
    ];
    const result = groupAccountsByClass(accounts);
    expect(result.liquid).toHaveLength(2);
    expect(result.non_liquid).toHaveLength(1);
    expect(result.debt).toHaveLength(1);
  });

  it('should return empty arrays for missing classes', () => {
    const accounts = [createMockAccount({ account_class: 'liquid' })];
    const result = groupAccountsByClass(accounts);
    expect(result.non_liquid).toHaveLength(0);
    expect(result.debt).toHaveLength(0);
  });
});

describe('calculateReconciliation', () => {
  const makeSnapshot = (
    currency: Currency,
    balance: string,
    account_class: AccountClass = 'liquid'
  ) => ({ currency, balance, account_class });

  it('returns balanced row when net flow equals balance change', () => {
    const result: ReconciliationCurrencyRow[] = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '7000000')],
      endAccounts: [makeSnapshot('IDR', '10000000')],
      transactionSummaries: [{ currency: 'IDR', income: 5000000, expenses: 2000000 }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].income).toBe(5000000);
    expect(result[0].expenses).toBe(2000000);
    expect(result[0].netFlow).toBe(3000000);
    expect(result[0].startBalance).toBe(7000000);
    expect(result[0].endBalance).toBe(10000000);
    expect(result[0].balanceChange).toBe(3000000);
    expect(result[0].variance).toBe(0);
    expect(result[0].isBalanced).toBe(true);
  });

  it('returns gap row when balance changed more than transactions explain', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '7000000')],
      endAccounts: [makeSnapshot('IDR', '11500000')],
      transactionSummaries: [{ currency: 'IDR', income: 5000000, expenses: 2000000 }],
    });

    expect(result[0].variance).toBe(1500000);
    expect(result[0].isBalanced).toBe(false);
  });

  it('excludes debt accounts from balance change calculation', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [
        makeSnapshot('IDR', '7000000', 'liquid'),
        makeSnapshot('IDR', '2000000', 'debt'),
      ],
      endAccounts: [
        makeSnapshot('IDR', '10000000', 'liquid'),
        makeSnapshot('IDR', '1500000', 'debt'),
      ],
      transactionSummaries: [{ currency: 'IDR', income: 5000000, expenses: 2000000 }],
    });

    expect(result[0].balanceChange).toBe(3000000);
    expect(result[0].isBalanced).toBe(true);
  });

  it('returns all-zero row for a period with no transactions and no balance change', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '5000000')],
      endAccounts: [makeSnapshot('IDR', '5000000')],
      transactionSummaries: [{ currency: 'IDR', income: 0, expenses: 0 }],
    });

    expect(result[0].income).toBe(0);
    expect(result[0].expenses).toBe(0);
    expect(result[0].netFlow).toBe(0);
    expect(result[0].balanceChange).toBe(0);
    expect(result[0].variance).toBe(0);
    expect(result[0].isBalanced).toBe(true);
  });

  it('shows gap when balance changed but no transactions recorded', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '5000000')],
      endAccounts: [makeSnapshot('IDR', '6000000')],
      transactionSummaries: [{ currency: 'IDR', income: 0, expenses: 0 }],
    });

    expect(result[0].balanceChange).toBe(1000000);
    expect(result[0].variance).toBe(1000000);
    expect(result[0].isBalanced).toBe(false);
  });

  it('treats missing currency in transaction summaries as zero income and expenses', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '5000000')],
      endAccounts: [makeSnapshot('IDR', '6000000')],
      transactionSummaries: [],
    });

    expect(result[0].income).toBe(0);
    expect(result[0].expenses).toBe(0);
    expect(result[0].balanceChange).toBe(1000000);
    expect(result[0].variance).toBe(1000000);
    expect(result[0].isBalanced).toBe(false);
  });

  it('handles multiple currencies independently', () => {
    const result = calculateReconciliation({
      currencies: ['IDR', 'USD'],
      startSnapshots: [makeSnapshot('IDR', '7000000'), makeSnapshot('USD', '100')],
      endAccounts: [makeSnapshot('IDR', '10000000'), makeSnapshot('USD', '150')],
      transactionSummaries: [
        { currency: 'IDR', income: 5000000, expenses: 2000000 },
        { currency: 'USD', income: 100, expenses: 50 },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0].currency).toBe('IDR');
    expect(result[0].isBalanced).toBe(true);
    expect(result[1].currency).toBe('USD');
    expect(result[1].isBalanced).toBe(true);
  });

  it('uses 0.01 epsilon for isBalanced to handle floating point', () => {
    const result = calculateReconciliation({
      currencies: ['USD'],
      startSnapshots: [makeSnapshot('USD', '100.00')],
      endAccounts: [makeSnapshot('USD', '150.005')],
      transactionSummaries: [{ currency: 'USD', income: 100, expenses: 50 }],
    });

    expect(result[0].isBalanced).toBe(true);
  });

  it('treats empty or invalid balance strings as 0 without producing NaN', () => {
    const result = calculateReconciliation({
      currencies: ['IDR'],
      startSnapshots: [makeSnapshot('IDR', '')],
      endAccounts: [makeSnapshot('IDR', 'invalid')],
      transactionSummaries: [{ currency: 'IDR', income: 0, expenses: 0 }],
    });

    expect(result[0].startBalance).toBe(0);
    expect(result[0].endBalance).toBe(0);
    expect(result[0].balanceChange).toBe(0);
    expect(result[0].variance).toBe(0);
    expect(Number.isNaN(result[0].variance)).toBe(false);
    expect(result[0].isBalanced).toBe(true);
  });
});
