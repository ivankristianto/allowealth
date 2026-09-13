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

describe('offlineClient', () => {
  it('refuses every request, so a dry run cannot reach the network', async () => {
    const { offlineClient } = await import('./load');
    const client = offlineClient();
    expect(() => client.get('/api/accounts')).toThrow(/dry run/i);
    expect(() => client.post('/api/transactions', {})).toThrow(/dry run/i);
  });

  it('carries a plan through a dry run without touching the client', async () => {
    const { calls, d } = deps({ client: offlineClientFor() });
    const report = await loadMonth(d, 1, 2099, { dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.plan.transactions).toHaveLength(1);
    expect(calls).toEqual([]);
  });
});

function offlineClientFor(): LoadDeps['client'] {
  const refuse = (): never => {
    throw new Error('network touched during a dry run');
  };
  return {
    signIn: refuse,
    get: refuse,
    post: refuse,
    patch: refuse,
    del: refuse,
    getAll: refuse,
  } as unknown as LoadDeps['client'];
}

describe('loadMonth ordering', () => {
  it('aborts a dry run that is out of order, before building the plan', async () => {
    let built = 0;
    const { d } = deps({
      buildPlanForMonth: () => {
        built++;
        return samplePlan();
      },
    });
    expect(loadMonth(d, 3, 2099, { dryRun: true })).rejects.toThrow(/2099-01/);
    expect(built).toBe(0);
  });

  it('previews an already-loaded month rather than refusing a dry run', async () => {
    const loaded = [
      { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
    ];
    const { d } = deps({ readLedger: () => loaded });
    const report = await loadMonth(d, 1, 2099, { dryRun: true });
    expect(report.dryRun).toBe(true);
  });
});
