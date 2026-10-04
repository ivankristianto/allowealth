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

  it('routes non-salary income by the first incomeRouting rule that matches', () => {
    const accountOf = (description: string) =>
      plan.transactions.find((t) => t.description === description)?.account;
    // Both are IncInterest; only the payout names OwnerB, so the coupon falls
    // through to the category-only rule after it.
    expect(accountOf('Payout OwnerB')).toBe('Bond1 OwnerB');
    expect(accountOf('Coupon OwnerA')).toBe('Bond1 OwnerA');
  });

  it('dates every income row on the configured day', () => {
    const incomes = plan.transactions.filter((t) => t.kind === 'income');
    expect(new Set(incomes.map((t) => t.date))).toEqual(new Set(['2099-01-10']));
  });

  it('keeps every transaction inside the plan month', () => {
    expect(plan.transactions.every((t) => t.date.startsWith('2099-01'))).toBe(true);
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
    expect(s?.routedByRule).toBeUndefined();
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
  it('aborts on a populated foreign amount with a blank local amount', () => {
    const bad = structuredClone(raw);
    bad.incomes[1]!.amount = { kind: 'blank' };
    bad.incomes[1]!.usd = { kind: 'value', value: 500 };
    expect(() => buildPlan(bad, fixtureConfig)).toThrow(/placeholder|suppress/i);
  });

  it('marks an incomeRouting row so Link 4 can subtract it', () => {
    const foreign = structuredClone(raw);
    foreign.incomes[2]!.usd = { kind: 'value', value: 75 };
    const routed = buildPlan(foreign, {
      ...fixtureConfig,
      incomeRouting: [
        { match: ['Coupon', 'OwnerA'], account: 'Bank2 OwnerA USD' },
        ...fixtureConfig.incomeRouting,
      ],
    });
    const c = routed.transactions.find((t) => t.description === 'Coupon OwnerA');
    expect(c?.routedByRule).toBe(true);
    expect(c?.currency).toBe('USD');
    expect(c?.amount).toBe('75');
    expect(c?.localAmount).toBe('750000');
  });

  it('aborts on a non-salary income row that no rule matches', () => {
    const error = thrown(() => buildPlan(raw, { ...fixtureConfig, incomeRouting: [] }));
    expect(error).toBeInstanceOf(DetectionError);
    expect((error as Error).message).toMatch(/Coupon OwnerA.*incomeRouting/s);
  });

  it('matches a rule term where it starts a word, case-insensitively', () => {
    const renamed = structuredClone(raw);
    renamed.incomes[2]!.description = 'COUPON2099 OwnerA';
    const routed = buildPlan(renamed, {
      ...fixtureConfig,
      incomeRouting: [
        { match: ['coupon'], account: 'Bank1 OwnerA' },
        ...fixtureConfig.incomeRouting,
      ],
    });
    const c = routed.transactions.find((t) => t.description === 'COUPON2099 OwnerA');
    expect(c?.account).toBe('Bank1 OwnerA');
  });

  it('converts a local-only row into a foreign account when its rule says convert', () => {
    const routed = buildPlan(raw, {
      ...fixtureConfig,
      incomeRouting: [
        { match: ['Coupon'], account: 'Bank2 OwnerA USD', convert: true },
        ...fixtureConfig.incomeRouting,
      ],
    });
    const c = routed.transactions.find((t) => t.description === 'Coupon OwnerA');
    expect(c).toMatchObject({ currency: 'USD', amount: '75', localAmount: '750000' });
  });

  it('aborts on a local-only row routed to a foreign account without convert', () => {
    const config = {
      ...fixtureConfig,
      incomeRouting: [
        { match: ['Coupon'], account: 'Bank2 OwnerA USD' },
        ...fixtureConfig.incomeRouting,
      ],
    };
    expect(() => buildPlan(raw, config)).toThrow(/no foreign amount.*convert/s);
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

  it('gives routed income to the owner of the account it is routed to', () => {
    expect(ownerOf(plan, 'Payout OwnerB')).toBe('OwnerB');
    const routed = buildPlan(raw, {
      ...fixtureConfig,
      incomeRouting: [{ category: 'IncInterest', account: 'Bond1 OwnerB' }],
    });
    // The description names OwnerA; the account decides.
    expect(ownerOf(routed, 'Coupon OwnerA')).toBe('OwnerB');
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

describe('buildPlan foreign balances', () => {
  const withBalances = (foreignBalances: typeof fixtureConfig.foreignBalances, month = raw) =>
    buildPlan(month, { ...fixtureConfig, foreignBalances });
  const usdOf = (p: ReturnType<typeof buildPlan>) =>
    p.snapshots.find((s) => s.account === 'Bank2 OwnerA USD');

  it('closes at the entry in effect and opens at the one in effect last month', () => {
    const p = withBalances([
      { account: 'Bank2 OwnerA USD', from: '2098-12', balance: 900 },
      { account: 'Bank2 OwnerA USD', from: '2099-01', balance: 2500 },
    ]);
    expect(usdOf(p)).toMatchObject({
      opening: '900',
      closing: '2500',
      localOpening: '10000000',
      localClosing: '20000000',
      stated: true,
    });
  });

  it('opens at the closing balance when no entry covers last month and the sheet stays put', () => {
    const still = structuredClone(raw);
    const row = still.accounts.find((a) => a.name === 'Bank2 OwnerA USD')!;
    row.akhir = row.awal;
    const p = withBalances(
      [{ account: 'Bank2 OwnerA USD', from: '2099-01', balance: 2500 }],
      still
    );
    expect(usdOf(p)).toMatchObject({ opening: '2500', closing: '2500' });
  });

  it('aborts when the sheet figure moves and no entry covers last month', () => {
    const error = thrown(() =>
      withBalances([{ account: 'Bank2 OwnerA USD', from: '2099-01', balance: 2500 }])
    );
    expect(error).toBeInstanceOf(DetectionError);
    expect((error as Error).message).toMatch(/no balance to open it at.*entry from 2098-12/s);
  });

  it('carries an earlier entry over while the sheet figure stays put', () => {
    const still = structuredClone(raw);
    const row = still.accounts.find((a) => a.name === 'Bank2 OwnerA USD')!;
    row.akhir = row.awal;
    const p = withBalances(
      [{ account: 'Bank2 OwnerA USD', from: '2098-11', balance: 1200 }],
      still
    );
    expect(usdOf(p)).toMatchObject({ opening: '1200', closing: '1200' });
  });

  it('leaves a foreign account with no entry converted at the month rate', () => {
    expect(usdOf(plan)).toMatchObject({ opening: '1000', closing: '2000' });
    expect(usdOf(plan)?.stated).toBeUndefined();
  });

  it('leaves the other accounts alone when one has entries', () => {
    const p = withBalances([
      { account: 'Bank2 OwnerA USD', from: '2098-12', balance: 900 },
      { account: 'Bank2 OwnerA USD', from: '2099-01', balance: 2500 },
    ]);
    const idr = p.snapshots.find((s) => s.account === 'Bank1 OwnerA');
    expect(idr).toMatchObject({ opening: '5000000', closing: '4000000' });
    expect(idr?.stated).toBeUndefined();
  });

  it('aborts when the sheet figure moves but the entry is from an earlier month', () => {
    const error = thrown(() =>
      withBalances([{ account: 'Bank2 OwnerA USD', from: '2098-12', balance: 900 }])
    );
    expect(error).toBeInstanceOf(DetectionError);
    expect((error as Error).message).toMatch(/moves from.*over from 2098-12.*entry from 2099-01/s);
  });

  it('aborts when no entry covers the month', () => {
    const error = thrown(() =>
      withBalances([{ account: 'Bank2 OwnerA USD', from: '2099-02', balance: 900 }])
    );
    expect(error).toBeInstanceOf(DetectionError);
    expect((error as Error).message).toMatch(/no balance from 2099-01 or earlier/);
  });
});
