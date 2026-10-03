import { describe, expect, it } from 'bun:test';
import { assertOwnership, fetchMonthTransactions, OwnershipError } from './purge';
import type { ExistingTransaction } from './purge';
import { thrown } from './test-helpers/throws';
import type { Plan } from './types';

const tx = (d: string, a: string): ExistingTransaction => ({
  transaction_date: d,
  amount: a,
});

const planWith = (amount: string): Plan =>
  ({ transactions: [{ date: '2099-01-02', amount }] }) as unknown as Plan;

describe('assertOwnership', () => {
  it('allows purge when the month is empty', () => {
    expect(() => assertOwnership([], null, undefined, false)).not.toThrow();
  });

  it('allows purge when existing rows match the saved plan', () => {
    expect(() =>
      assertOwnership([tx('2099-01-02', '100')], planWith('100'), 'loaded', false)
    ).not.toThrow();
  });

  it('allows purge of a partial load claimed as loading, whatever the rows', () => {
    expect(() =>
      assertOwnership([tx('2099-01-02', '999')], planWith('100'), 'loading', false)
    ).not.toThrow();
  });

  it('refuses a loaded month whose rows diverge', () => {
    expect(
      thrown(() => assertOwnership([tx('2099-01-02', '999')], planWith('100'), 'loaded', false))
    ).toBeInstanceOf(OwnershipError);
  });

  it('allows a diverged month only under force', () => {
    expect(() =>
      assertOwnership([tx('2099-01-02', '999')], planWith('100'), 'loaded', true)
    ).not.toThrow();
  });

  it('refuses rows present with no saved plan at all', () => {
    expect(
      thrown(() => assertOwnership([tx('2099-01-02', '100')], null, undefined, false))
    ).toBeInstanceOf(OwnershipError);
  });

  it('states that --force is required and that --yes will not do', () => {
    const error = thrown(() =>
      assertOwnership([tx('2099-01-02', '999')], planWith('100'), 'loaded', false)
    );
    expect((error as Error).message).toMatch(/--force/);
    expect((error as Error).message).toMatch(/--yes/);
  });

  it('refuses when the app holds a row the plan does not', () => {
    expect(
      thrown(() =>
        assertOwnership(
          [tx('2099-01-02', '100'), tx('2099-01-03', '50')],
          planWith('100'),
          'loaded',
          false
        )
      )
    ).toBeInstanceOf(OwnershipError);
  });
});

describe('fetchMonthTransactions', () => {
  it('flattens the nested category and account objects the API returns into names', async () => {
    const client = {
      getAll: async () => [
        {
          id: 't1',
          type: 'income',
          transaction_date: '2099-01-10',
          amount: '10',
          currency: 'USD',
          category: { id: 'c1', name: 'Inc1' },
          account: { id: 'a1', name: 'Bank1 OwnerA USD' },
        },
      ],
    } as unknown as Parameters<typeof fetchMonthTransactions>[0];

    const [row] = await fetchMonthTransactions(client, { month: 1, year: 2099 });

    expect(row).toEqual({
      id: 't1',
      type: 'income',
      transaction_date: '2099-01-10',
      amount: '10',
      currency: 'USD',
      category: 'Inc1',
      account: 'Bank1 OwnerA USD',
    });
  });

  it('lets the ownership check match rows the API returned against the saved plan', async () => {
    const client = {
      getAll: async () => [
        {
          transaction_date: '2099-01-02',
          amount: '100',
          category: { name: 'Cat1' },
          account: { name: 'A' },
        },
      ],
    } as unknown as Parameters<typeof fetchMonthTransactions>[0];
    const saved = {
      transactions: [{ date: '2099-01-02', amount: '100', category: 'Cat1', account: 'A' }],
    } as unknown as Plan;

    const existing = await fetchMonthTransactions(client, { month: 1, year: 2099 });

    expect(() => assertOwnership(existing, saved, 'loaded', false)).not.toThrow();
  });

  it('reads the owner from the name of the member who created the row', async () => {
    const client = {
      getAll: async () => [
        {
          id: 't1',
          type: 'expense',
          transaction_date: '2099-01-02',
          amount: '10',
          category: { name: 'Cat1' },
          account: { name: 'Bank1 OwnerA' },
          created_by_user_name: 'OwnerB',
        },
      ],
    } as unknown as Parameters<typeof fetchMonthTransactions>[0];
    const [row] = await fetchMonthTransactions(client, { month: 1, year: 2099 });
    expect(row?.owner).toBe('OwnerB');
  });
});
