import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextMonth, ordinal, sameMonth } from './money';
import { monthKey } from './plan';
import type { MonthRef, Plan } from './types';

export interface LedgerEntry {
  month: number;
  year: number;
  status: 'loading' | 'loaded';
  planHash: string;
  loadedAt: string;
}

function stateDir(dataDir: string): string {
  const dir = join(dataDir, '.aw-backfill');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function ledgerPath(dataDir: string): string {
  return join(stateDir(dataDir), 'ledger.json');
}

function planPath(dataDir: string, ref: MonthRef): string {
  return join(stateDir(dataDir), 'plans', `${monthKey(ref)}.json`);
}

/**
 * Writes via a temp file in the same directory then renames, so an interrupted
 * write can never leave a half-written ledger behind.
 */
function writeAtomic(path: string, contents: string): void {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, contents);
  renameSync(temp, path);
}

export function readLedger(dataDir: string): LedgerEntry[] {
  const path = ledgerPath(dataDir);
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return Array.isArray(parsed) ? (parsed as LedgerEntry[]) : [];
}

function writeLedger(dataDir: string, entries: LedgerEntry[]): void {
  const sorted = [...entries].sort((a, b) => a.year - b.year || a.month - b.month);
  writeAtomic(ledgerPath(dataDir), `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * Marks a month as in-flight before anything is written to the app.
 *
 * Without the claim, an aborted load leaves rows the ownership check cannot
 * account for, and the repairing re-run would be refused.
 */
export function claimMonth(dataDir: string, ref: MonthRef, planHash: string): void {
  const entries = readLedger(dataDir).filter((e) => !sameMonth(e, ref));
  entries.push({ month: ref.month, year: ref.year, status: 'loading', planHash, loadedAt: '' });
  writeLedger(dataDir, entries);
}

export function commitMonth(dataDir: string, ref: MonthRef): void {
  const entries = readLedger(dataDir);
  const found = entries.find((e) => sameMonth(e, ref));
  if (!found) {
    throw new Error(`Cannot commit ${monthKey(ref)}: it was never claimed.`);
  }
  found.status = 'loaded';
  found.loadedAt = new Date().toISOString();
  writeLedger(dataDir, entries);
}

/** Names every month from `earliest` up to (not including) the target that is not loaded. */
export function findGaps(entries: LedgerEntry[], target: MonthRef, earliest: MonthRef): string[] {
  const loaded = new Set(entries.filter((e) => e.status === 'loaded').map((e) => monthKey(e)));

  const gaps: string[] = [];
  for (
    let cursor = { ...earliest };
    ordinal(cursor) < ordinal(target);
    cursor = nextMonth(cursor)
  ) {
    const key = monthKey(cursor);
    if (!loaded.has(key)) gaps.push(key);
  }
  return gaps;
}

export function newestLoaded(entries: LedgerEntry[]): LedgerEntry | null {
  return (
    entries
      .filter((e) => e.status === 'loaded')
      .sort((a, b) => b.year - a.year || b.month - a.month)[0] ?? null
  );
}

export function savePlan(dataDir: string, plan: Plan): void {
  const path = planPath(dataDir, plan);
  mkdirSync(join(stateDir(dataDir), 'plans'), { recursive: true });
  writeAtomic(path, `${JSON.stringify(plan, null, 2)}\n`);
}

export function readSavedPlan(dataDir: string, ref: MonthRef): Plan | null {
  const path = planPath(dataDir, ref);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Plan;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)])
    );
  }
  return value;
}

/** Stable regardless of key order, so a re-derived plan hashes to the same value. */
export function hashPlan(plan: Plan): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(JSON.stringify(sortKeys(plan)));
  return hasher.digest('hex');
}
