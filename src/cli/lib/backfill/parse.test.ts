import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMonth } from './parse';

const dir = join(import.meta.dir, '__fixtures__');
const txn = readFileSync(join(dir, 'txn-2099-01.csv'), 'utf8');
const bal = readFileSync(join(dir, 'balance-2099-01.csv'), 'utf8');
const m = parseMonth(txn, bal, { month: 1, year: 2099 });

describe('parseMonth', () => {
  it('reads expense rows despite the drifted header', () => {
    expect(m.expenses).toHaveLength(6);
    expect(m.expenses[0]?.description).toBe('Item A');
  });

  it('reads income rows including a currency-prefixed amount', () => {
    expect(m.incomes).toHaveLength(4);
    const coupon = m.incomes.find((r) => r.description === 'Coupon OwnerA');
    expect(coupon?.amount).toEqual({ kind: 'value', value: 750000 });
  });

  it('reads account rows past the numbered block', () => {
    const names = m.accounts.map((a) => a.name);
    expect(names).toContain('Bond1 OwnerA');
    expect(names).toContain('Bond1 OwnerB');
    expect(m.accounts).toHaveLength(6);
  });

  it('stops the account table at the footnote markers', () => {
    expect(m.accounts.map((a) => a.name).some((n) => n.startsWith('*'))).toBe(false);
  });

  it('extracts the reference rate by label, not position', () => {
    expect(m.rate).toBe(10000);
  });

  it("lifts the sheet's own printed totals", () => {
    expect(m.totals.expense).toBe(1_000_000);
    expect(m.totals.income).toBe(16_000_000);
    expect(m.totals.closing).toBe(50_750_000);
  });

  it('reads the budget block', () => {
    expect(m.budgets).toHaveLength(3);
    expect(m.budgets[0]).toMatchObject({ category: 'Cat1', budget: 400000 });
  });

  it('numbers repeated account labels by occurrence', () => {
    expect(m.accounts.every((a) => a.occurrence === 1)).toBe(true);
  });

  it('reads the per-account income column', () => {
    const byName = Object.fromEntries(m.accounts.map((a) => [a.name, a.income]));
    expect(byName['Bank1 OwnerB']).toEqual({ kind: 'value', value: 5_000_000 });
    // The Income column is local currency even for a foreign account.
    expect(byName['Bank2 OwnerA USD']).toEqual({ kind: 'value', value: 10_000_000 });
    expect(byName['Bank1 OwnerA']).toEqual({ kind: 'value', value: 0 });
  });

  it('aborts on an unparseable amount, naming the raw cell', () => {
    const broken = txn.replace('"100,000.00"', 'n/a');
    expect(() => parseMonth(broken, bal, { month: 1, year: 2099 })).toThrow(/n\/a/);
  });
});
