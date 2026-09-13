import { describe, expect, it } from 'bun:test';
import { parseMonthArg, monthRange, resolveFilenames, resolveDataDir } from './runtime';
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
        1,
        2099
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
