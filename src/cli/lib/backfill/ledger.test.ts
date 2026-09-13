import { describe, expect, it } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  claimMonth,
  commitMonth,
  readLedger,
  findGaps,
  newestLoaded,
  hashPlan,
  savePlan,
  readSavedPlan,
} from './ledger';
import type { LedgerEntry } from './ledger';
import type { Plan } from './types';

const dir = () => mkdtempSync(join(tmpdir(), 'bf-ledger-'));

const entry = (month: number, year: number, status: LedgerEntry['status']): LedgerEntry => ({
  month,
  year,
  status,
  planHash: 'h',
  loadedAt: '',
});

describe('ledger', () => {
  it('records a claim as loading before the load completes', () => {
    const d = dir();
    claimMonth(d, 1, 2099, 'h1');
    expect(readLedger(d)[0]).toMatchObject({ month: 1, status: 'loading' });
  });

  it('flips to loaded on commit', () => {
    const d = dir();
    claimMonth(d, 1, 2099, 'h1');
    commitMonth(d, 1, 2099);
    expect(readLedger(d)[0]?.status).toBe('loaded');
  });

  it('re-claiming an existing month replaces rather than duplicates', () => {
    const d = dir();
    claimMonth(d, 1, 2099, 'h1');
    claimMonth(d, 1, 2099, 'h2');
    expect(readLedger(d)).toHaveLength(1);
    expect(readLedger(d)[0]?.planHash).toBe('h2');
  });

  it('returns an empty ledger for a directory with no state', () => {
    expect(readLedger(dir())).toEqual([]);
  });

  it('names missing months behind the target', () => {
    expect(findGaps([entry(1, 2099, 'loaded')], 3, 2099, { month: 1, year: 2099 })).toEqual([
      '2099-02',
    ]);
  });

  it('reports no gap when every earlier month is loaded', () => {
    const entries = [entry(1, 2099, 'loaded'), entry(2, 2099, 'loaded')];
    expect(findGaps(entries, 3, 2099, { month: 1, year: 2099 })).toEqual([]);
  });

  it('treats a loading month as a gap, since it is not finished', () => {
    expect(findGaps([entry(1, 2099, 'loading')], 2, 2099, { month: 1, year: 2099 })).toEqual([
      '2099-01',
    ]);
  });

  it('walks gaps across a year boundary', () => {
    expect(findGaps([], 1, 2099, { month: 11, year: 2098 })).toEqual(['2098-11', '2098-12']);
  });

  it('finds the newest loaded month across a year boundary', () => {
    const entries = [entry(12, 2098, 'loaded'), entry(1, 2099, 'loaded')];
    expect(newestLoaded(entries)).toMatchObject({ month: 1, year: 2099 });
  });

  it('ignores a loading month when finding the newest loaded', () => {
    const entries = [entry(12, 2098, 'loaded'), entry(1, 2099, 'loading')];
    expect(newestLoaded(entries)).toMatchObject({ month: 12, year: 2098 });
  });

  it('hashes a plan stably regardless of key order', () => {
    const a = { month: 1, year: 2099, transactions: [{ a: 1, b: 2 }] } as unknown as Plan;
    const b = { year: 2099, month: 1, transactions: [{ b: 2, a: 1 }] } as unknown as Plan;
    expect(hashPlan(a)).toBe(hashPlan(b));
  });

  it('round-trips a saved plan', () => {
    const d = dir();
    const plan = { month: 1, year: 2099, transactions: [] } as unknown as Plan;
    savePlan(d, plan);
    expect(readSavedPlan(d, 1, 2099)).toEqual(plan);
    expect(readSavedPlan(d, 2, 2099)).toBeNull();
  });
});
