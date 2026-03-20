import { describe, expect, it } from 'bun:test';

import type { AccountOutput } from '@/lib/types/account';

import { calculateClassAllocation } from '../account';

function makeAccount(overrides: Partial<AccountOutput>): AccountOutput {
  return {
    id: overrides.id ?? 'account-1',
    name: overrides.name ?? 'Test Account',
    type: overrides.type ?? 'bank_account',
    account_class: overrides.account_class ?? 'liquid',
    balance: overrides.balance ?? '0',
    currency: overrides.currency ?? 'USD',
    status: overrides.status ?? 'active',
    closed_at: overrides.closed_at ?? null,
    closed_by_user_id: overrides.closed_by_user_id ?? null,
    last_updated: overrides.last_updated ?? new Date('2026-01-01T00:00:00.000Z'),
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00.000Z'),
    updated_at: overrides.updated_at ?? new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('calculateClassAllocation', () => {
  it('calculates single-currency percentages', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '100', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '200',
        currency: 'USD',
        type: 'stock',
      }),
      makeAccount({
        id: '3',
        account_class: 'debt',
        balance: '-33',
        currency: 'USD',
        type: 'loan',
      }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.liquid.percentage).toBe(33);
    expect(result.non_liquid.percentage).toBe(67);
    expect(result.debt.percentage).toBe(11);
  });

  it('counts only the selected currency', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '100', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '100',
        currency: 'USD',
        type: 'stock',
      }),
      makeAccount({ id: '3', account_class: 'liquid', balance: '999', currency: 'IDR' }),
      makeAccount({
        id: '4',
        account_class: 'debt',
        balance: '-25',
        currency: 'IDR',
        type: 'loan',
      }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.liquid.percentage).toBe(50);
    expect(result.non_liquid.percentage).toBe(50);
    expect(result.debt.percentage).toBe(0);
  });

  it('marks in-target classes correctly', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '60', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '140',
        currency: 'USD',
        type: 'stock',
      }),
      makeAccount({
        id: '3',
        account_class: 'debt',
        balance: '-20',
        currency: 'USD',
        type: 'loan',
      }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.liquid.onTarget).toBe(true);
    expect(result.debt.onTarget).toBe(true);
    expect(result.non_liquid.onTarget).toBe(true);
  });

  it('marks liquid below 30 percent as off target', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '29', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '71',
        currency: 'USD',
        type: 'stock',
      }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.liquid.percentage).toBe(29);
    expect(result.liquid.onTarget).toBe(false);
  });

  it('marks debt above 10 percent as off target', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '50', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '50',
        currency: 'USD',
        type: 'stock',
      }),
      makeAccount({
        id: '3',
        account_class: 'debt',
        balance: '-11',
        currency: 'USD',
        type: 'loan',
      }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.debt.percentage).toBe(11);
    expect(result.debt.onTarget).toBe(false);
  });

  it('returns zero percentages for empty accounts', () => {
    const result = calculateClassAllocation([], 'USD');

    expect(result.liquid.percentage).toBe(0);
    expect(result.non_liquid.percentage).toBe(0);
    expect(result.debt.percentage).toBe(0);
  });

  it('returns zero percentage for zero-balance accounts', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '0', currency: 'USD' }),
      makeAccount({
        id: '2',
        account_class: 'non_liquid',
        balance: '0',
        currency: 'USD',
        type: 'stock',
      }),
      makeAccount({ id: '3', account_class: 'debt', balance: '0', currency: 'USD', type: 'loan' }),
    ];

    const result = calculateClassAllocation(accounts, 'USD');

    expect(result.liquid.percentage).toBe(0);
  });
});
