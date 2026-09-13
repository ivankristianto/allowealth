import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMonth } from './parse';
import { buildPlan } from './plan';
import { verifyPlan } from './verify';
import type { Plan } from './types';
import { fixtureConfig } from './__fixtures__/config';

const dir = join(import.meta.dir, '__fixtures__');
const plan = buildPlan(
  parseMonth(
    readFileSync(join(dir, 'txn-2099-01.csv'), 'utf8'),
    readFileSync(join(dir, 'balance-2099-01.csv'), 'utf8'),
    { month: 1, year: 2099 }
  ),
  fixtureConfig
);

describe('verifyPlan', () => {
  it('passes on the fixture month', () => {
    expect(verifyPlan(plan)).toEqual({ ok: true, failures: [] });
  });

  it('fails Link 1 when an expense goes missing', () => {
    const broken = structuredClone(plan);
    broken.transactions = broken.transactions.filter((t) => t.description !== 'Item A');
    const r = verifyPlan(broken);
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.link === 1)).toBe(true);
  });

  it('fails Link 4 when income is routed to the wrong account', () => {
    const broken = structuredClone(plan);
    const s = broken.transactions.find((t) => t.description === 'Salary OwnerB')!;
    s.account = 'Bank2 OwnerB';
    const r = verifyPlan(broken);
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.link === 4)).toBe(true);
  });

  it('fails Link 1 when a closing balance drifts', () => {
    const broken = structuredClone(plan);
    broken.snapshots[0]!.closing = '1';
    const r = verifyPlan(broken);
    expect(r.failures.some((f) => f.link === 1 && /closing/i.test(f.label))).toBe(true);
  });

  it('fails when a transaction escapes the plan month', () => {
    const broken = structuredClone(plan);
    broken.transactions[0]!.date = '2099-02-01';
    expect(verifyPlan(broken).ok).toBe(false);
  });
});

describe('verifyPlan currency handling', () => {
  /**
   * The fixture's USD salary clears at exactly the reference rate, so it cannot
   * distinguish summing the local column from converting the foreign one. A
   * real month never does: the rate is a month-end figure and receipts cleared
   * at other rates.
   */
  function withClearedRateSpread(): Plan {
    const broken = structuredClone(plan);
    const salary = broken.transactions.find((t) => t.description === 'Salary OwnerA')!;
    // Same local figure the sheet totals, but cleared at 9,800 rather than 10,000.
    salary.amount = '1020.41';
    salary.localAmount = '10000000';
    return broken;
  }

  it('passes Link 1 when a foreign row cleared at a rate other than the reference', () => {
    const result = verifyPlan(withClearedRateSpread());
    expect(result.failures.filter((f) => f.label === 'income total')).toEqual([]);
  });

  it('passes Link 4 for the same row', () => {
    const result = verifyPlan(withClearedRateSpread());
    expect(result.failures.filter((f) => f.link === 4)).toEqual([]);
  });

  it('still fails Link 1 when the local figure itself is wrong', () => {
    const broken = structuredClone(plan);
    broken.transactions.find((t) => t.description === 'Salary OwnerA')!.localAmount = '1';
    expect(verifyPlan(broken).failures.some((f) => f.label === 'income total')).toBe(true);
  });
});
