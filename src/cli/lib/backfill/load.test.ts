import { describe, expect, it } from 'bun:test';
import { loadMonth } from './load';
import type { LoadDeps } from './load';
import type { Plan } from './types';

const samplePlan = (): Plan => ({
  month: 1,
  year: 2099,
  rate: 10000,
  budgets: [],
  snapshots: [],
  transactions: [
    {
      kind: 'expense',
      date: '2099-01-02',
      description: 'a',
      category: 'Cat1',
      account: 'Household (historical)',
      amount: '100',
      currency: 'IDR',
    },
  ],
  checks: { expenseTotal: 100, incomeTotal: 0, closingTotal: 0, accountIncome: {} },
  skipped: [],
  unmarkedOwner: [],
});

function deps(overrides: Partial<LoadDeps> = {}) {
  const calls: string[] = [];
  const d: LoadDeps = {
    client: {
      get: async (path: string) => {
        if (path.startsWith('/api/categories')) {
          return [{ id: 'cat-1', name: 'Cat1', type: 'expense' }];
        }
        if (path.startsWith('/api/accounts')) {
          return [{ id: 'acct-1', name: 'Household (historical)', currency: 'IDR', balance: '0' }];
        }
        return [];
      },
      getAll: async () => [],
      post: async (p: string) => {
        calls.push(`POST ${p}`);
        return { id: 'x' };
      },
      patch: async () => ({}),
      del: async () => ({}),
    } as unknown as LoadDeps['client'],
    readLedger: () => [],
    claimMonth: () => {
      calls.push('claim');
    },
    commitMonth: () => {
      calls.push('commit');
    },
    savePlan: () => {},
    readSavedPlan: () => null,
    buildPlanForMonth: () => samplePlan(),
    settle: async () => {
      calls.push('settle');
    },
    earliest: { month: 1, year: 2099 },
    ...overrides,
  };
  return { calls, d };
}

describe('loadMonth', () => {
  it('claims the month before any write and commits after', async () => {
    const { calls, d } = deps();
    await loadMonth(d, 1, 2099, {});
    expect(calls[0]).toBe('claim');
    expect(calls.at(-1)).toBe('commit');
  });

  it('settles before committing', async () => {
    const { calls, d } = deps();
    await loadMonth(d, 1, 2099, {});
    expect(calls.indexOf('settle')).toBeLessThan(calls.indexOf('commit'));
  });

  it('aborts on a ledger gap, naming the missing months', async () => {
    const { d } = deps({ readLedger: () => [] });
    expect(loadMonth(d, 3, 2099, {})).rejects.toThrow(/2099-01|2099-02/);
  });

  it('writes nothing in dry-run mode', async () => {
    const { calls, d } = deps();
    await loadMonth(d, 1, 2099, { dryRun: true });
    expect(calls.filter((c) => c.startsWith('POST'))).toEqual([]);
    expect(calls).not.toContain('claim');
  });

  it('aborts before writing when the plan fails verification', async () => {
    const { calls, d } = deps({
      buildPlanForMonth: () => {
        const plan = samplePlan();
        plan.checks.expenseTotal = 999;
        return plan;
      },
    });
    expect(loadMonth(d, 1, 2099, {})).rejects.toThrow(/expense total/);
    expect(calls).not.toContain('claim');
  });

  it('refuses a month already loaded unless forced', async () => {
    const loaded = [
      { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
    ];
    const { d } = deps({ readLedger: () => loaded });
    expect(loadMonth(d, 1, 2099, {})).rejects.toThrow(/--force/);
  });

  it('posts the month transactions', async () => {
    const { calls, d } = deps();
    await loadMonth(d, 1, 2099, {});
    expect(calls.filter((c) => c === 'POST /api/transactions')).toHaveLength(1);
  });
});
