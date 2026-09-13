import { describe, expect, it } from 'bun:test';
import { assertOwnership, OwnershipError } from './purge';
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
