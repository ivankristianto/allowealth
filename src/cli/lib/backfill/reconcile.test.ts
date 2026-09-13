import { describe, expect, it } from 'bun:test';
import { expectedVariance } from './reconcile';
import type { Plan } from './types';

const plan = {
  rate: 10000,
  transactions: [
    { kind: 'expense', amount: '100', currency: 'IDR' },
    { kind: 'income', amount: '300', currency: 'IDR' },
    { kind: 'income', amount: '5', currency: 'USD' },
  ],
  snapshots: [
    { account: 'A', closing: '1200', currency: 'IDR' },
    { account: 'B', closing: '25', currency: 'USD' },
  ],
} as unknown as Plan;

describe('expectedVariance', () => {
  it('computes variance per currency without mixing them', () => {
    const v = expectedVariance(plan, { A: 1000, B: 20 });
    // IDR: (1200-1000) - (300-100) = 0
    expect(v.IDR).toBeCloseTo(0, 2);
    // USD: (25-20) - 5 = 0
    expect(v.USD).toBeCloseTo(0, 2);
  });

  it('does not convert foreign amounts into the local row', () => {
    const v = expectedVariance(plan, { A: 1000, B: 0 });
    expect(v.IDR).toBeCloseTo(0, 2);
    expect(v.USD).toBeCloseTo(20, 2);
  });

  it('treats an account with no opening balance as starting at zero', () => {
    const v = expectedVariance(plan, {});
    expect(v.IDR).toBeCloseTo(1000, 2);
  });
});
