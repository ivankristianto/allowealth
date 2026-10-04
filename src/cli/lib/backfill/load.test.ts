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
      account: 'Bank1 OwnerA',
      owner: 'OwnerA',
      amount: '100',
      currency: 'IDR',
      localAmount: '100',
    },
  ],
  checks: { expenseTotal: 100, incomeTotal: 0, closingTotal: 0, accountIncome: {} },
  skipped: [],
});

const MEMBERS = [
  { id: 'user-a', name: 'OwnerA', email: 'a@example.test' },
  { id: 'user-b', name: 'OwnerB', email: 'b@example.test' },
];

/**
 * A stateful fake of the app: transactions posted during the load are readable
 * afterwards, so the reconciliation Link 2 performs sees what actually landed.
 */
function deps(overrides: Partial<LoadDeps> = {}) {
  const calls: string[] = [];
  const posted: { type: string; transaction_date: string; amount: string; currency: string }[] = [];

  const client = {
    get: async (path: string) => {
      if (path.startsWith('/api/categories')) {
        return [{ id: 'cat-1', name: 'Cat1', type: 'expense' }];
      }
      if (path.startsWith('/api/account-categories')) return [{ id: 'ac-other', name: 'Other' }];
      if (path.startsWith('/api/workspace/members')) return { members: MEMBERS };
      if (path.startsWith('/api/accounts')) {
        return [
          {
            id: 'acct-1',
            name: 'Bank1 OwnerA',
            currency: 'IDR',
            balance: '0',
            category_id: 'ac-other',
          },
        ];
      }
      return [];
    },
    getAll: async () => posted,
    post: async (p: string, body: Record<string, unknown>) => {
      calls.push(`POST ${p}`);
      if (p === '/api/transactions') {
        posted.push(body as (typeof posted)[number]);
      }
      return { id: 'x' };
    },
    patch: async () => ({}),
    del: async () => ({}),
  } as unknown as LoadDeps['client'];

  const d: LoadDeps = {
    client,
    readLedger: () => [],
    claimMonth: () => {
      calls.push('claim');
    },
    commitMonth: () => {
      calls.push('commit');
    },
    savePlan: () => {},
    readSavedPlan: () => null,
    hashPlan: () => 'plan-hash',
    planFor: () => samplePlan(),
    settle: async () => {
      calls.push('settle');
    },
    // Every member posts through whichever client the test settled on.
    clientFor: async () => d.client,
    earliest: { month: 1, year: 2099 },
    config: {
      accounts: [{ name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Other' }],
    } as unknown as LoadDeps['config'],
    ...overrides,
  };
  return { calls, d, posted };
}

describe('loadMonth', () => {
  it('claims the month before any write and commits after', async () => {
    const { calls, d } = deps();
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(calls[0]).toBe('claim');
    expect(calls.at(-1)).toBe('commit');
  });

  it('settles before committing', async () => {
    const { calls, d } = deps();
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(calls.indexOf('settle')).toBeLessThan(calls.indexOf('commit'));
  });

  it('aborts on a ledger gap, naming the missing months', async () => {
    const { d } = deps({ readLedger: () => [] });
    expect(loadMonth(d, { month: 3, year: 2099 }, {})).rejects.toThrow(/2099-01|2099-02/);
  });

  it('writes nothing in dry-run mode', async () => {
    const { calls, d } = deps();
    await loadMonth(d, { month: 1, year: 2099 }, { dryRun: true });
    expect(calls.filter((c) => c.startsWith('POST'))).toEqual([]);
    expect(calls).not.toContain('claim');
  });

  it('aborts before writing when the plan fails verification', async () => {
    const { calls, d } = deps({
      planFor: () => {
        const plan = samplePlan();
        plan.checks.expenseTotal = 999;
        return plan;
      },
    });
    expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(/expense total/);
    expect(calls).not.toContain('claim');
  });

  it('refuses a month already loaded unless forced', async () => {
    const loaded = [
      { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
    ];
    const { d } = deps({ readLedger: () => loaded });
    expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(/--force/);
  });

  it('posts the month transactions', async () => {
    const { calls, d } = deps();
    await loadMonth(d, { month: 1, year: 2099 }, {});
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
    const report = await loadMonth(d, { month: 1, year: 2099 }, { dryRun: true });
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
      planFor: () => {
        built++;
        return samplePlan();
      },
    });
    expect(loadMonth(d, { month: 3, year: 2099 }, { dryRun: true })).rejects.toThrow(/2099-01/);
    expect(built).toBe(0);
  });

  it('previews an already-loaded month rather than refusing a dry run', async () => {
    const loaded = [
      { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
    ];
    const { d } = deps({ readLedger: () => loaded });
    const report = await loadMonth(d, { month: 1, year: 2099 }, { dryRun: true });
    expect(report.dryRun).toBe(true);
  });
});

describe('loadMonth verification gates', () => {
  it('claims the month with the plan hash, not a placeholder', async () => {
    const claims: string[] = [];
    const { d } = deps({ claimMonth: (_ref, hash) => claims.push(hash) });
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(claims).toEqual(['plan-hash']);
  });

  it('aborts without committing when Link 2 finds the app out of balance', async () => {
    const { calls, d } = deps({
      client: {
        get: async (path: string) => {
          if (path.startsWith('/api/categories')) {
            return [{ id: 'cat-1', name: 'Cat1', type: 'expense' }];
          }
          if (path.startsWith('/api/account-categories')) {
            return [{ id: 'ac-other', name: 'Other' }];
          }
          if (path.startsWith('/api/workspace/members')) return { members: MEMBERS };
          if (path.startsWith('/api/accounts')) {
            return [{ id: 'acct-1', name: 'A', currency: 'IDR', balance: '999999' }];
          }
          return [];
        },
        // The app reports a closing balance the plan's transactions cannot explain.
        getAll: async () => [],
        post: async (p: string) => {
          calls.push(`POST ${p}`);
          return { id: 'x' };
        },
        patch: async () => ({}),
        del: async () => ({}),
      } as unknown as LoadDeps['client'],
      planFor: () => {
        const plan = samplePlan();
        plan.snapshots = [
          {
            account: 'A',
            opening: '0',
            localOpening: '0',
            closing: '0',
            localClosing: '0',
            currency: 'IDR',
            recordedAt: '2099-01-31T12:00:00.000Z',
          },
        ];
        plan.checks.closingTotal = 0;
        return plan;
      },
    });
    expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(/Link 2/);
    expect(calls).not.toContain('commit');
  });
});

describe('loadMonth settle target', () => {
  it('settles against a later loaded month, not the one just re-run', async () => {
    const settled: Plan[] = [];
    const later = samplePlan();
    later.month = 6;
    const { d } = deps({
      readLedger: () => [
        { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
        { month: 6, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: '' },
      ],
      planFor: (ref) => (ref.month === 6 ? later : samplePlan()),
      settle: async (plan) => {
        settled.push(plan);
      },
    });
    await loadMonth(d, { month: 1, year: 2099 }, { force: true });
    expect(settled[0]?.month).toBe(6);
  });

  it('settles against this month when it is the newest', async () => {
    const settled: Plan[] = [];
    const { d } = deps({
      settle: async (plan) => {
        settled.push(plan);
      },
    });
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(settled[0]?.month).toBe(1);
  });
});

describe('loadMonth ownership', () => {
  const twoOwners = {
    accounts: [
      { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA' },
      { name: 'B', currency: 'IDR', owner: 'OwnerB' },
    ],
  } as unknown as LoadDeps['config'];

  function ownerClient(patched: string[], members: { id: string; name: string }[]) {
    return {
      get: async (path: string) => {
        if (path.startsWith('/api/categories')) {
          return [{ id: 'cat-1', name: 'Cat1', type: 'expense' }];
        }
        if (path.startsWith('/api/workspace/members')) return { members };
        if (path.startsWith('/api/accounts')) {
          return [
            {
              id: 'acct-1',
              name: 'Bank1 OwnerA',
              currency: 'IDR',
              balance: '0',
              created_by_user_id: 'admin',
            },
          ];
        }
        return [];
      },
      getAll: async () => [],
      post: async () => ({ id: 'x' }),
      patch: async (p: string) => {
        patched.push(p);
        return {};
      },
      del: async () => ({}),
    } as unknown as LoadDeps['client'];
  }

  it('moves an account to the member the roster names', async () => {
    const patched: string[] = [];
    const { d } = deps({
      config: twoOwners,
      client: ownerClient(patched, [{ id: 'user-a', name: 'OwnerA' }]),
      planFor: () => {
        const plan = samplePlan();
        plan.checks.expenseTotal = 0;
        plan.transactions = [];
        return plan;
      },
    });
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(patched).toContain('/api/accounts/acct-1/transfer-owner');
  });

  it('aborts naming the member when the roster owner has no account', async () => {
    const { d } = deps({
      config: twoOwners,
      client: ownerClient([], [{ id: 'user-z', name: 'Somebody Else' }]),
      planFor: () => {
        const plan = samplePlan();
        plan.checks.expenseTotal = 0;
        plan.transactions = [];
        return plan;
      },
    });
    expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(/OwnerA/);
  });

  it('does not call the members endpoint when every account has one owner', async () => {
    const { calls, d } = deps();
    await loadMonth(d, { month: 1, year: 2099 }, {});
    expect(calls.some((c) => c.includes('transfer-owner'))).toBe(false);
  });
});

describe('loadMonth transaction owners', () => {
  /** One expense per member, so each must arrive through its own member's client. */
  const twoOwnerPlan = () => {
    const plan = samplePlan();
    const [first] = plan.transactions;
    plan.transactions = [
      { ...first!, description: 'mine' },
      { ...first!, description: 'theirs', owner: 'OwnerB' },
    ];
    plan.checks.expenseTotal = 200;
    return plan;
  };

  it('posts each transaction as its owner, so the app records it as theirs', async () => {
    const { calls, d, posted } = deps({ planFor: twoOwnerPlan });
    const secondaryPosts: string[] = [];
    // Shares the fake app's state, so Link 2 reads back both members' rows.
    const secondary = {
      post: async (p: string, body: Record<string, unknown>) => {
        if (p === '/api/transactions') {
          secondaryPosts.push(String(body.description));
          posted.push(body as (typeof posted)[number]);
        }
        return { id: 'y' };
      },
    } as unknown as LoadDeps['client'];
    const signedInAs: string[] = [];
    d.clientFor = async (member) => {
      signedInAs.push(member.email);
      return member.name === 'OwnerB' ? secondary : d.client;
    };

    await loadMonth(d, { month: 1, year: 2099 }, {});

    expect(signedInAs.sort()).toEqual(['a@example.test', 'b@example.test']);
    expect(calls.filter((c) => c === 'POST /api/transactions')).toHaveLength(1);
    expect(secondaryPosts).toEqual(['theirs']);
  });

  it('aborts before any write when a transaction owner is not a workspace member', async () => {
    const { calls, d } = deps({
      planFor: () => {
        const plan = samplePlan();
        plan.transactions[0]!.owner = 'Stranger';
        return plan;
      },
    });

    expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(/Stranger/);
    expect(calls).not.toContain('claim');
  });
});

describe('loadMonth account creation', () => {
  const roster = {
    accounts: [
      { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bank Account' },
    ],
  } as unknown as LoadDeps['config'];

  const accountCategories = [
    { id: 'ac-bank', name: 'Bank Account' },
    { id: 'ac-other', name: 'Other' },
  ];

  /** A plan whose only account is `Bank1 OwnerA`, opening at 500. */
  const bankPlan = () => {
    const plan = samplePlan();
    plan.checks.expenseTotal = 0;
    plan.checks.closingTotal = 500;
    plan.transactions = [];
    plan.snapshots = [
      {
        account: 'Bank1 OwnerA',
        opening: '500',
        localOpening: '500',
        closing: '500',
        localClosing: '500',
        currency: 'IDR',
        recordedAt: '2099-01-31T12:00:00.000Z',
      },
    ];
    return plan;
  };

  function accountClient(
    existing: Record<string, unknown>[],
    writes: { method: string; path: string; body: Record<string, unknown> }[],
    categories = accountCategories
  ) {
    return {
      get: async (path: string) => {
        if (path.startsWith('/api/categories')) {
          return [{ id: 'cat-1', name: 'Cat1', type: 'expense' }];
        }
        if (path.startsWith('/api/account-categories')) return categories;
        if (path.startsWith('/api/workspace/members')) return { members: MEMBERS };
        if (path.startsWith('/api/accounts')) return existing;
        return [];
      },
      // Stateful, so Link 2 reads back what the load wrote.
      getAll: async () => writes.filter((w) => w.path === '/api/transactions').map((w) => w.body),
      post: async (path: string, body: Record<string, unknown>) => {
        writes.push({ method: 'POST', path, body });
        if (path !== '/api/accounts') return { id: 'x' };
        const account = { id: `new-${existing.length}`, ...body };
        existing.push(account);
        return account;
      },
      put: async (path: string, body: Record<string, unknown>) => {
        writes.push({ method: 'PUT', path, body });
        return {};
      },
      patch: async () => ({}),
      del: async () => ({}),
    } as unknown as LoadDeps['client'];
  }

  it("creates an account under its roster category, opened on the month's first day", async () => {
    const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
    const { d } = deps({
      config: roster,
      client: accountClient([], writes),
      planFor: bankPlan,
    });

    await loadMonth(d, { month: 1, year: 2099 }, {});

    const created = writes.find((w) => w.method === 'POST' && w.path === '/api/accounts');
    expect(created?.body).toEqual({
      name: 'Bank1 OwnerA',
      categoryId: 'ac-bank',
      balance: '500',
      currency: 'IDR',
      opened_at: '2099-01-01T00:00:00.000Z',
    });
  });

  it('moves an existing account to the category the config now names', async () => {
    const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
    const existing = [
      {
        id: 'acct-1',
        name: 'Bank1 OwnerA',
        currency: 'IDR',
        balance: '500',
        initial_balance: '500',
        category_id: 'ac-other',
      },
    ];
    const { d } = deps({
      config: roster,
      client: accountClient(existing, writes),
      planFor: bankPlan,
    });

    await loadMonth(d, { month: 1, year: 2099 }, {});

    expect(writes).toContainEqual({
      method: 'PUT',
      path: '/api/accounts/acct-1',
      body: { categoryId: 'ac-bank' },
    });
  });

  it('leaves an existing account already in its category untouched', async () => {
    const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
    const existing = [
      {
        id: 'acct-1',
        name: 'Bank1 OwnerA',
        currency: 'IDR',
        balance: '500',
        initial_balance: '500',
        category_id: 'ac-bank',
      },
    ];
    const { d } = deps({
      config: roster,
      client: accountClient(existing, writes),
      planFor: bankPlan,
    });

    await loadMonth(d, { month: 1, year: 2099 }, {});

    expect(writes.some((w) => w.method === 'PUT')).toBe(false);
  });

  describe('opening balance of an account that already exists', () => {
    const february = { month: 2, year: 2099 };
    const januaryLoaded = () => [
      { month: 1, year: 2099, status: 'loaded' as const, planHash: 'h', loadedAt: 'x' },
    ];

    /** A February plan for one account, opening at `localOpening` in rupiah. */
    const februaryPlan = (snapshot: Partial<Plan['snapshots'][number]>) => () => {
      const plan = bankPlan();
      plan.month = 2;
      plan.snapshots = [
        {
          account: 'Bank1 OwnerA',
          opening: '800',
          localOpening: '800',
          closing: '500',
          localClosing: '500',
          currency: 'IDR',
          recordedAt: '2099-02-28T12:00:00.000Z',
          ...snapshot,
        },
      ];
      plan.checks.closingTotal = Number(plan.snapshots[0]!.localClosing);
      return plan;
    };

    /** January's saved plan, closing the account at `localClosing` in rupiah. */
    const januarySaved = (localClosing: string | null) => (ref: { month: number }) => {
      if (ref.month !== 1) return null;
      const plan = bankPlan();
      plan.snapshots = localClosing === null ? [] : [{ ...plan.snapshots[0]!, localClosing }];
      return plan;
    };

    const existing = (initial: string, currency = 'IDR') => [
      {
        id: 'acct-1',
        name: 'Bank1 OwnerA',
        currency,
        balance: initial,
        initial_balance: initial,
        category_id: 'ac-bank',
      },
    ];

    function februaryDeps(overrides: Partial<LoadDeps>) {
      const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
      const { d } = deps({
        config: roster,
        client: accountClient(existing('500'), writes),
        readLedger: januaryLoaded,
        ...overrides,
      });
      return d;
    }

    it("loads when this month's rupiah opening continues last month's closing", async () => {
      // The origin balance (500) is January's opening; February opens at
      // January's closing (800). That is the normal case, not an ordering error.
      const d = februaryDeps({ planFor: februaryPlan({}), readSavedPlan: januarySaved('800') });

      await expect(loadMonth(d, february, {})).resolves.toBeDefined();
    });

    it('compares a foreign account in rupiah, where the rate cannot move it', async () => {
      const d = februaryDeps({
        // The fake app never moves a balance, so it already holds the closing.
        client: accountClient(existing('75', 'USD'), []),
        planFor: februaryPlan({
          // At the plan's rate of 10,000: January's 800,000 closing was a
          // different USD figure at January's rate, but the same rupiah.
          currency: 'USD',
          opening: '80',
          localOpening: '800000',
          closing: '75',
          localClosing: '750000',
        }),
        readSavedPlan: januarySaved('800000'),
      });

      await expect(loadMonth(d, february, {})).resolves.toBeDefined();
    });

    it("aborts when this month's rupiah opening breaks from last month's closing", async () => {
      const d = februaryDeps({ planFor: februaryPlan({}), readSavedPlan: januarySaved('750') });

      await expect(loadMonth(d, february, {})).rejects.toThrow(
        /Bank1 OwnerA.*2099-01.*750.*2099-02.*800/s
      );
    });

    it("aborts when a stated opening breaks from last month's closing in its own currency", async () => {
      // The rupiah carries over; the stated dollars do not, because an entry
      // changed after January was loaded.
      const stated = { currency: 'USD' as const, localOpening: '800000', localClosing: '800000' };
      const d = februaryDeps({
        client: accountClient(existing('70', 'USD'), []),
        planFor: februaryPlan({ ...stated, opening: '80', closing: '80', stated: true }),
        readSavedPlan: (ref: { month: number }) => {
          if (ref.month !== 1) return null;
          const plan = bankPlan();
          plan.snapshots = [{ ...plan.snapshots[0]!, ...stated, closing: '70', stated: true }];
          return plan;
        },
      });

      await expect(loadMonth(d, february, { dryRun: true })).rejects.toThrow(
        /closed 2099-01 at 70 USD.*foreignBalances.*2099-02 at 80/s
      );
    });

    it('catches a break in a dry run', async () => {
      const d = februaryDeps({ planFor: februaryPlan({}), readSavedPlan: januarySaved('750') });

      await expect(loadMonth(d, february, { dryRun: true })).rejects.toThrow(
        /closed 2099-01 at 750/
      );
    });

    it('aborts on a break before claiming the month', async () => {
      const claimed: string[] = [];
      const d = februaryDeps({
        planFor: februaryPlan({}),
        readSavedPlan: januarySaved('750'),
        claimMonth: () => {
          claimed.push('claim');
        },
      });

      await expect(loadMonth(d, february, {})).rejects.toThrow(/closed 2099-01 at 750/);
      expect(claimed).toEqual([]);
    });

    it('aborts naming last month when its saved plan is missing', async () => {
      // Without it there is nothing to check the carry-over against; falling
      // back to the origin check would blame the load order instead.
      const d = februaryDeps({ planFor: februaryPlan({}), readSavedPlan: () => null });

      await expect(loadMonth(d, february, { dryRun: true })).rejects.toThrow(
        /no plan is saved for 2099-01/
      );
    });

    it('checks the origin balance when last month did not have the account', async () => {
      // First appearance in this month: the existing account must have been
      // opened at this month's opening, or something else created it.
      const d = februaryDeps({ planFor: februaryPlan({}), readSavedPlan: januarySaved(null) });

      await expect(loadMonth(d, february, {})).rejects.toThrow(
        /origin balance of 500.*800.*out of order.*left the sheet/s
      );
    });
  });

  it('aborts naming setup when the workspace lacks the account category', async () => {
    const { d } = deps({
      config: roster,
      client: accountClient([], [], [{ id: 'ac-other', name: 'Other' }]),
      planFor: bankPlan,
    });

    await expect(loadMonth(d, { month: 1, year: 2099 }, {})).rejects.toThrow(
      /"Bank Account".*\n.*aw backfill setup/s
    );
  });
});
