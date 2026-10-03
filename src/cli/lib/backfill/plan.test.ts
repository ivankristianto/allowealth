import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMonth } from './parse';
import { buildPlan } from './plan';
import { DetectionError } from './resolve';
import { thrown } from './test-helpers/throws';
import { fixtureConfig } from './__fixtures__/config';

const dir = join(import.meta.dir, '__fixtures__');
const raw = parseMonth(
  readFileSync(join(dir, 'txn-2099-01.csv'), 'utf8'),
  readFileSync(join(dir, 'balance-2099-01.csv'), 'utf8'),
  { month: 1, year: 2099 }
);
const plan = buildPlan(raw, fixtureConfig);

describe('buildPlan', () => {
  it("pays every expense from its owner's configured account", () => {
    const expenses = plan.transactions.filter((t) => t.kind === 'expense');
    expect(expenses.length).toBeGreaterThan(0);
    for (const expense of expenses) {
      expect(expense.account).toBe(fixtureConfig.expenseAccounts[expense.owner]!);
    }
  });

  it("aborts when an owner's expense account is not in the month's sheet", () => {
    const config = {
      ...fixtureConfig,
      expenseAccounts: { ...fixtureConfig.expenseAccounts, OwnerA: 'Closed OwnerA' },
    };
    const error = thrown(() => buildPlan(raw, config));
    expect(error).toBeInstanceOf(DetectionError);
    expect((error as Error).message).toMatch(/expenseAccounts\.OwnerA.*Closed OwnerA/s);
  });

  it('skips zero-amount rows and records why', () => {
    expect(plan.transactions.some((t) => t.description === 'Item F')).toBe(false);
    expect(plan.skipped).toContainEqual({ reason: 'zero amount', description: 'Item F' });
  });

  it('routes the primary salary to a foreign-currency account in that currency', () => {
    const s = plan.transactions.find((t) => t.description === 'Salary OwnerA');
    expect(s?.currency).toBe('USD');
    expect(s?.amount).toBe('1000');
    expect(s?.account).toBe('Bank2 OwnerA USD');
  });

  it('routes the secondary salary to their local account in local currency', () => {
    const s = plan.transactions.find((t) => t.description === 'Salary OwnerB');
    expect(s?.currency).toBe('IDR');
    expect(s?.account).toBe('Bank1 OwnerB');
    expect(s?.amount).toBe('5000000');
  });

  it('routes non-salary income to the owner passive bucket', () => {
    const c = plan.transactions.find((t) => t.description === 'Payout OwnerB');
    expect(c?.account).toBe('Passive Income (OwnerB)');
  });

  it('dates every income row on the configured day', () => {
    const incomes = plan.transactions.filter((t) => t.kind === 'income');
    expect(new Set(incomes.map((t) => t.date))).toEqual(new Set(['2099-01-10']));
  });

  it('keeps every transaction inside the plan month', () => {
    expect(plan.transactions.every((t) => t.date.startsWith('2099-01'))).toBe(true);
  });

  it('resolves owner by whole word anywhere in the description', () => {
    // "Item E OwnerB" carries the owner mid-string, not as a suffix.
    expect(plan.transactions.find((t) => t.description === 'Item E OwnerB')).toBeDefined();
  });

  it('records the sheet totals and per-account income as checks', () => {
    expect(plan.checks.expenseTotal).toBe(1_000_000);
    expect(plan.checks.incomeTotal).toBe(16_000_000);
    expect(plan.checks.accountIncome['Bank1 OwnerB']).toBe(5_000_000);
  });

  it('records per-account income in local currency, as the sheet prints it', () => {
    expect(plan.checks.accountIncome['Bank2 OwnerA USD']).toBe(10_000_000);
  });

  it('keeps the local-currency figure alongside a foreign-currency amount', () => {
    const s = plan.transactions.find((t) => t.description === 'Salary OwnerA');
    expect(s?.amount).toBe('1000');
    expect(s?.currency).toBe('USD');
    expect(s?.localAmount).toBe('10000000');
  });

  it('does not mark salary rows as exception-routed', () => {
    const s = plan.transactions.find((t) => t.description === 'Salary OwnerA');
    expect(s?.routedByException).toBeUndefined();
  });

  it('emits one snapshot per account at 12:00:00 UTC on the last day', () => {
    expect(plan.snapshots).toHaveLength(6);
    expect(plan.snapshots[0]?.recordedAt).toMatch(/^2099-01-31T12:00:00/);
  });

  it('converts a foreign account balance out of the local column', () => {
    // The account table is written in local currency for every account, so a
    // foreign account's balance is divided by the rate to reach the currency
    // the app will hold it in.
    const usd = plan.snapshots.find((s) => s.account === 'Bank2 OwnerA USD');
    expect(usd).toMatchObject({ opening: '1000', closing: '2000', currency: 'USD' });
  });

  it('keeps the local figure for a foreign account alongside the converted one', () => {
    // Link 1 sums this against the sheet's own printed total, so it must be the
    // untouched column value: converting back would reintroduce the rounding
    // the division introduced.
    const usd = plan.snapshots.find((s) => s.account === 'Bank2 OwnerA USD');
    expect(usd?.localClosing).toBe('20000000');
  });

  it('leaves a local account untouched', () => {
    const idr = plan.snapshots.find((s) => s.account === 'Bank1 OwnerA');
    expect(idr).toMatchObject({ opening: '5000000', closing: '4000000', localClosing: '4000000' });
  });

  it('carries the budget block through', () => {
    expect(plan.budgets).toHaveLength(3);
    expect(plan.budgets[0]).toMatchObject({ category: 'Cat1', amountIdr: 400_000 });
  });
});

describe('buildPlan detection', () => {
  it('aborts when a description names both members', () => {
    const bad = structuredClone(raw);
    bad.incomes[3]!.description = 'Payout OwnerA and OwnerB';
    expect(thrown(() => buildPlan(bad, fixtureConfig))).toBeInstanceOf(DetectionError);
  });

  it('aborts on a populated foreign amount with a blank local amount', () => {
    const bad = structuredClone(raw);
    bad.incomes[1]!.amount = { kind: 'blank' };
    bad.incomes[1]!.usd = { kind: 'value', value: 500 };
    expect(() => buildPlan(bad, fixtureConfig)).toThrow(/placeholder|suppress/i);
  });

  it('marks an incomeRouting row so Link 4 can subtract it', () => {
    // Foreign-currency non-salary income: the only thing incomeRouting is for.
    const foreign = structuredClone(raw);
    foreign.incomes[2]!.usd = { kind: 'value', value: 75 };
    const routed = buildPlan(foreign, {
      ...fixtureConfig,
      incomeRouting: [{ match: 'Coupon OwnerA', account: 'Bank2 OwnerA USD' }],
    });
    const c = routed.transactions.find((t) => t.description === 'Coupon OwnerA');
    expect(c?.routedByException).toBe(true);
    expect(c?.currency).toBe('USD');
    expect(c?.amount).toBe('75');
    expect(c?.localAmount).toBe('750000');
  });

  it('aborts on a foreign amount with no routing entry', () => {
    const bad = structuredClone(raw);
    bad.incomes[3]!.usd = { kind: 'value', value: 25 };
    expect(() => buildPlan(bad, fixtureConfig)).toThrow(/incomeRouting/);
  });

  it('drops a row matched by suppressedRows', () => {
    const config = {
      ...fixtureConfig,
      suppressedRows: [
        {
          month: '2099-01',
          side: 'income' as const,
          match: 'Payout OwnerB',
          reason: 'placeholder',
        },
      ],
    };
    const suppressed = buildPlan(raw, config);
    expect(suppressed.transactions.some((t) => t.description === 'Payout OwnerB')).toBe(false);
  });

  it('reports rows whose owner fell back rather than hiding them', () => {
    expect(Array.isArray(plan.unmarkedOwner)).toBe(true);
  });
});

describe('buildPlan transaction ownership', () => {
  const owned = (expenseOwners: typeof fixtureConfig.expenseOwners) =>
    buildPlan(raw, { ...fixtureConfig, expenseOwners });
  const ownerOf = (p: ReturnType<typeof buildPlan>, description: string) =>
    p.transactions.find((t) => t.description === description)?.owner;

  it('gives every expense to the fallback member when no rule matches', () => {
    const expenses = plan.transactions.filter((t) => t.kind === 'expense');
    expect(new Set(expenses.map((t) => t.owner))).toEqual(new Set(['OwnerA']));
  });

  it('gives an expense to the owner a category rule names', () => {
    const p = owned([{ category: 'Cat2', owner: 'OwnerB' }]);
    expect(ownerOf(p, 'Item C')).toBe('OwnerB');
    expect(ownerOf(p, 'Item D')).toBe('OwnerB');
    expect(ownerOf(p, 'Item A')).toBe('OwnerA');
  });

  it("pays an expense from its owner's account, so a rule moves the account too", () => {
    const p = owned([{ category: 'Cat2', owner: 'OwnerB' }]);
    const accountOf = (description: string) =>
      p.transactions.find((t) => t.description === description)?.account;
    expect(accountOf('Item C')).toBe('Bank1 OwnerB');
    expect(accountOf('Item A')).toBe('Bank1 OwnerA');
  });

  it('gives an expense to the owner a description rule names, by whole word', () => {
    const p = owned([{ match: 'item b', owner: 'OwnerB' }]);
    expect(ownerOf(p, 'Item B')).toBe('OwnerB');
    expect(ownerOf(p, 'Item A')).toBe('OwnerA');
  });

  it('gives income to the member who owns the account it is paid into', () => {
    expect(ownerOf(plan, 'Salary OwnerA')).toBe('OwnerA');
    expect(ownerOf(plan, 'Salary OwnerB')).toBe('OwnerB');
  });

  it('gives passive income to the member whose passive-income account receives it', () => {
    expect(ownerOf(plan, 'Payout OwnerB')).toBe('OwnerB');
    expect(ownerOf(plan, 'Coupon OwnerA')).toBe('OwnerA');
  });

  it('aborts when two rules give one expense to different owners', () => {
    const conflicting = () =>
      owned([
        { category: 'Cat1', owner: 'OwnerB' },
        { match: 'Item A', owner: 'OwnerA' },
      ]);
    expect(thrown(conflicting)).toBeInstanceOf(DetectionError);
    expect(conflicting).toThrow(/Item A/);
  });
});
