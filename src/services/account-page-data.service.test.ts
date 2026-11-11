import { describe, expect, it, mock } from 'bun:test';
import { formatAccountType, type AccountOutput } from '@/lib/types/account';
import {
  fromCurrentAccount,
  fromSnapshot,
  getAccountsPageData,
  pickAllocationCurrency,
  summarizeAccounts,
  type AccountsPageDataInput,
  type AccountsPageDeps,
} from './account-page-data.service';

const NOW = new Date(2026, 10, 11, 9, 30);

function account(overrides: Partial<AccountOutput> = {}): AccountOutput {
  return {
    id: 'acc-1',
    created_by_user_id: 'user-1',
    name: 'Checking',
    type: 'bank_account',
    account_class: 'liquid',
    category_id: null,
    category_name: null,
    balance: '100',
    initial_balance: null,
    currency: 'IDR',
    status: 'active',
    closed_at: null,
    closed_by_user_id: null,
    last_updated: new Date(2026, 10, 1),
    created_at: new Date(2026, 0, 1),
    updated_at: new Date(2026, 10, 1),
    ...overrides,
  };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    ...account(),
    account_class: undefined,
    snapshot_balance: '80',
    snapshot_date: new Date(2026, 8, 30),
    ...overrides,
  } as any;
}

function input(overrides: Partial<AccountsPageDataInput> = {}): AccountsPageDataInput {
  return {
    workspaceId: 'ws-1',
    filters: { user_id: 'ws-1' },
    ownerUserId: undefined,
    year: 2026,
    month: 11,
    isViewingCurrentMonth: true,
    now: NOW,
    currencies: ['IDR', 'USD'],
    categoryNamesById: new Map([['cat-1', 'Savings']]),
    ...overrides,
  };
}

function deps(rows: { current?: any[]; inactive?: any[]; snapshots?: any[] } = {}) {
  const findAll = mock(async (_ws: string, filters?: { includeInactive?: boolean }) =>
    filters?.includeInactive ? (rows.inactive ?? rows.current ?? []) : (rows.current ?? [])
  );
  const getSnapshotForMonth = mock(async () => rows.snapshots ?? []);
  const getMonthSummary = mock(async (filters: { currency: string }) =>
    filters.currency === 'IDR' ? { income: 50, expenses: 20 } : { income: 0, expenses: 0 }
  );
  return {
    deps: {
      accountService: { findAll, getSnapshotForMonth },
      transactionService: { getMonthSummary },
    } as unknown as AccountsPageDeps,
    findAll,
    getSnapshotForMonth,
    getMonthSummary,
  };
}

function calls(fn: unknown): unknown[][] {
  return (fn as { mock: { calls: unknown[][] } }).mock.calls;
}

describe('account mapping', () => {
  const names = new Map([['cat-1', 'Savings']]);

  it('labels categoryless accounts with their type and unknown categories with null', () => {
    expect(fromCurrentAccount(account() as any, names).category_name).toBe(
      formatAccountType('bank_account')
    );
    expect(fromCurrentAccount(account({ category_id: 'cat-1' }) as any, names).category_name).toBe(
      'Savings'
    );
    expect(
      fromCurrentAccount(account({ category_id: 'gone' }) as any, names).category_name
    ).toBeNull();
  });

  it('reads snapshot balance and date, and derives a missing account class', () => {
    const mapped = fromSnapshot(snapshot({ type: 'credit_card' }), names);

    expect(mapped.balance).toBe('80');
    expect(mapped.last_updated).toEqual(new Date(2026, 8, 30));
    expect(mapped.account_class).toBe('debt');
  });

  it('falls back to last_updated when a snapshot has no date', () => {
    const mapped = fromSnapshot(snapshot({ snapshot_date: null }), names);

    expect(mapped.last_updated).toEqual(new Date(2026, 10, 1));
  });
});

describe('pickAllocationCurrency', () => {
  it('skips debt and empty balances to find a currency with assets', () => {
    const accounts = [
      account({ currency: 'IDR', account_class: 'debt', balance: '500' }),
      account({ currency: 'IDR', balance: '0' }),
      account({ currency: 'USD', balance: '10' }),
    ];

    expect(pickAllocationCurrency(accounts, ['IDR', 'USD'])).toBe('USD');
  });

  it('falls back to the primary currency when nothing holds a positive asset balance', () => {
    expect(pickAllocationCurrency([], ['IDR', 'USD'])).toBe('IDR');
  });
});

describe('summarizeAccounts', () => {
  it('orders class groups liquid, debt, non-liquid and drops empty ones', () => {
    const { sortedGroups } = summarizeAccounts(
      [
        account({ id: 'a', account_class: 'non_liquid', type: 'stock' }),
        account({ id: 'b', account_class: 'liquid' }),
      ],
      ['IDR']
    );

    expect(sortedGroups.map((group) => [group.groupKey, group.label])).toEqual([
      ['liquid', 'Liquid'],
      ['non_liquid', 'Non-Liquid'],
    ]);
  });

  it('returns the latest update across accounts, or null without accounts', () => {
    const latest = new Date(2026, 10, 9);
    const { latestUpdate } = summarizeAccounts(
      [account({ last_updated: new Date(2026, 9, 1) }), account({ last_updated: latest })],
      ['IDR']
    );

    expect(latestUpdate).toEqual(latest);
    expect(summarizeAccounts([], ['IDR']).latestUpdate).toBeNull();
  });

  it('keeps debt out of asset totals', () => {
    const { accountTotalsByCurrency, debtTotalsByCurrency } = summarizeAccounts(
      [
        account({ balance: '300' }),
        account({ id: 'cc', type: 'credit_card', account_class: 'debt', balance: '120' }),
      ],
      ['IDR']
    );

    expect(accountTotalsByCurrency).toEqual([{ currency: 'IDR', amount: 300 }]);
    expect(debtTotalsByCurrency).toEqual([{ currency: 'IDR', amount: 120 }]);
  });
});

describe('getAccountsPageData', () => {
  it('reconciles the current month against live balances, closed accounts included', async () => {
    const live = account({ balance: '130' });
    const closed = account({ id: 'acc-closed', status: 'closed', balance: '0' });
    const {
      deps: d,
      findAll,
      getSnapshotForMonth,
      getMonthSummary,
    } = deps({
      current: [live],
      inactive: [live, closed],
      snapshots: [snapshot({ snapshot_balance: '100', account_class: 'liquid' })],
    });

    const data = await getAccountsPageData(input(), d);

    expect(data.accounts.map((a) => a.id)).toEqual(['acc-1']);
    expect(calls(findAll)[1][1]).toEqual({ user_id: 'ws-1', includeInactive: true });
    expect(calls(getSnapshotForMonth)[0].slice(1, 3)).toEqual([2026, 10]);

    const summaryFilters = calls(getMonthSummary).map((call) => call[0]) as any[];
    expect(summaryFilters.map((f) => f.currency)).toEqual(['IDR', 'USD']);
    expect(summaryFilters[0].account_ids).toEqual(['acc-1', 'acc-closed']);
    expect(summaryFilters[0].start_date).toEqual(new Date(2026, 10, 1));
    expect(summaryFilters[0].end_date).toBe(NOW);

    expect(data.reconciliation[0]).toMatchObject({
      currency: 'IDR',
      startBalance: 100,
      endBalance: 130,
      netFlow: 30,
      variance: 0,
      isBalanced: true,
    });
  });

  it('reads snapshots for a past month and ends its reconciliation at month end', async () => {
    const {
      deps: d,
      findAll,
      getSnapshotForMonth,
      getMonthSummary,
    } = deps({
      snapshots: [snapshot()],
    });

    const data = await getAccountsPageData(
      input({ isViewingCurrentMonth: false, year: 2026, month: 1 }),
      d
    );

    expect(findAll).not.toHaveBeenCalled();
    expect(calls(getSnapshotForMonth).map((call) => call.slice(1, 3))).toEqual([
      [2026, 1],
      [2026, 0],
    ]);
    expect(data.accounts[0].balance).toBe('80');
    const filters = calls(getMonthSummary)[0][0] as any;
    expect(filters.end_date).toEqual(new Date(2026, 1, 0, 23, 59, 59, 999));
  });

  it('skips reconciliation queries when there are no accounts', async () => {
    const { deps: d, getMonthSummary, getSnapshotForMonth } = deps();

    const data = await getAccountsPageData(input(), d);

    expect(data.reconciliation).toEqual([]);
    expect(getMonthSummary).not.toHaveBeenCalled();
    expect(getSnapshotForMonth).not.toHaveBeenCalled();
  });

  it('passes the owner filter to transaction summaries', async () => {
    const { deps: d, getMonthSummary } = deps({ current: [account()] });

    await getAccountsPageData(input({ ownerUserId: 'user-2' }), d);

    expect((calls(getMonthSummary)[0][0] as any).created_by_user_id).toBe('user-2');
  });
});
