import { describe, expect, it } from 'bun:test';
import type { BackfillClient } from './client';
import {
  memberClients,
  monthRange,
  parseMonthArg,
  resolveDataDir,
  resolveFilenames,
  UsageError,
} from './runtime';
import { thrown } from './test-helpers/throws';

describe('parseMonthArg', () => {
  it('accepts a three-letter month name', () => {
    expect(parseMonthArg('Jan', 2099)).toEqual({ month: 1, year: 2099 });
    expect(parseMonthArg('dec', 2099)).toEqual({ month: 12, year: 2099 });
  });

  it('accepts a numeric month', () => {
    expect(parseMonthArg('3', 2099)).toEqual({ month: 3, year: 2099 });
  });

  it('accepts an explicit YYYY-MM', () => {
    expect(parseMonthArg('2098-11', 2099)).toEqual({ month: 11, year: 2098 });
  });

  it('rejects anything else rather than guessing', () => {
    expect(thrown(() => parseMonthArg('Smarch', 2099))).toBeInstanceOf(Error);
    expect(thrown(() => parseMonthArg('13', 2099))).toBeInstanceOf(Error);
  });
});

describe('monthRange', () => {
  it('walks inclusive across a year boundary', () => {
    expect(monthRange({ month: 11, year: 2098 }, { month: 1, year: 2099 })).toEqual([
      { month: 11, year: 2098 },
      { month: 12, year: 2098 },
      { month: 1, year: 2099 },
    ]);
  });

  it('rejects a reversed range', () => {
    expect(
      thrown(() => monthRange({ month: 3, year: 2099 }, { month: 1, year: 2099 }))
    ).toBeInstanceOf(Error);
  });
});

describe('resolveFilenames', () => {
  it('substitutes the month and year tokens', () => {
    expect(
      resolveFilenames(
        { transactions: '[{year}] Sheet - {mon}-{year}.csv', balance: 'B {mon}-{year}.csv' },
        { month: 1, year: 2099 }
      )
    ).toEqual({ transactions: '[2099] Sheet - Jan-2099.csv', balance: 'B Jan-2099.csv' });
  });
});

describe('resolveDataDir', () => {
  it('prefers the explicit flag over the environment', () => {
    expect(resolveDataDir('/a', '/b')).toBe('/a');
  });

  it('falls back to the environment variable', () => {
    expect(resolveDataDir(undefined, '/b')).toBe('/b');
  });

  it('aborts when neither is set, naming the variable', () => {
    expect((thrown(() => resolveDataDir(undefined, undefined)) as Error).message).toMatch(
      /AW_BACKFILL_DIR/
    );
  });
});

describe('memberClients', () => {
  const primary = { label: 'primary' } as unknown as BackfillClient;
  const secondary = { label: 'secondary' } as unknown as BackfillClient;
  const env = {
    AW_BACKFILL_EMAIL: 'a@example.test',
    AW_BACKFILL_SECONDARY_EMAIL: 'b@example.test',
  };

  function connector() {
    const connected: string[] = [];
    const connect = async (emailVar: string, passwordVar: string) => {
      connected.push(`${emailVar}/${passwordVar}`);
      return secondary;
    };
    return { connected, connect };
  }

  it('reuses the primary login for the member it signed in as', async () => {
    const { connected, connect } = connector();
    const clientFor = memberClients(primary, env, connect);
    expect(await clientFor({ name: 'OwnerA', email: 'A@Example.test' })).toBe(primary);
    expect(connected).toEqual([]);
  });

  it('signs in once with the secondary credentials for the other member', async () => {
    const { connected, connect } = connector();
    const clientFor = memberClients(primary, env, connect);
    expect(await clientFor({ name: 'OwnerB', email: 'b@example.test' })).toBe(secondary);
    expect(await clientFor({ name: 'OwnerB', email: 'b@example.test' })).toBe(secondary);
    expect(connected).toEqual(['AW_BACKFILL_SECONDARY_EMAIL/AW_BACKFILL_SECONDARY_PASSWORD']);
  });

  it('aborts naming the variables when no login matches the member', async () => {
    const { connect } = connector();
    const clientFor = memberClients(primary, env, connect);
    const error = await clientFor({ name: 'OwnerC', email: 'c@example.test' }).catch((e) => e);
    expect(error).toBeInstanceOf(UsageError);
    expect((error as Error).message).toMatch(/AW_BACKFILL_SECONDARY_EMAIL/);
  });
});
