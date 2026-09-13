import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BackfillClient } from './client';
import type { BackfillConfig } from './config.schema';
import type { MonthRef } from './ledger';
import { parseMonth } from './parse';
import type { RawMonth } from './parse';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export class UsageError extends Error {}

/**
 * The data directory holds the config, the ledger, the saved plans and the
 * CSVs. It never lives in the working tree: none of it may enter the repo.
 */
export function resolveDataDir(flag: string | undefined, env: string | undefined): string {
  const dir = flag ?? env;
  if (!dir || dir.trim() === '') {
    throw new UsageError(
      'No data directory. Pass --dir, or export AW_BACKFILL_DIR to point at the directory ' +
        'holding the CSVs and the .aw-backfill state.'
    );
  }
  return dir;
}

/** Accepts `Jan`, `1`, or `2099-01`. Anything else aborts rather than being guessed at. */
export function parseMonthArg(value: string, defaultYear: number): MonthRef {
  const trimmed = value.trim();

  const explicit = /^(\d{4})-(\d{1,2})$/.exec(trimmed);
  if (explicit) {
    const month = Number(explicit[2]);
    if (month < 1 || month > 12) throw new UsageError(`Month out of range: ${value}`);
    return { month, year: Number(explicit[1]) };
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const month = Number(trimmed);
    if (month < 1 || month > 12) throw new UsageError(`Month out of range: ${value}`);
    return { month, year: defaultYear };
  }

  const index = MONTH_NAMES.findIndex((n) => n.toLowerCase() === trimmed.slice(0, 3).toLowerCase());
  if (index === -1) {
    throw new UsageError(`Unrecognised month "${value}". Use Jan, 1, or 2099-01.`);
  }
  return { month: index + 1, year: defaultYear };
}

export function monthRange(from: MonthRef, to: MonthRef): MonthRef[] {
  const ordinal = (m: MonthRef) => m.year * 12 + m.month;
  if (ordinal(from) > ordinal(to)) {
    throw new UsageError('The range start is after its end.');
  }

  const months: MonthRef[] = [];
  let { month, year } = from;
  while (year * 12 + month <= ordinal(to)) {
    months.push({ month, year });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function resolveFilenames(
  templates: BackfillConfig['filenames'],
  month: number,
  year: number
): { transactions: string; balance: string } {
  const fill = (template: string) =>
    template.replace(/\{mon\}/g, MONTH_NAMES[month - 1]!).replace(/\{year\}/g, String(year));
  return { transactions: fill(templates.transactions), balance: fill(templates.balance) };
}

export function readMonth(
  dataDir: string,
  config: BackfillConfig,
  month: number,
  year: number
): RawMonth {
  const names = resolveFilenames(config.filenames, month, year);
  const read = (name: string) => {
    try {
      return readFileSync(join(dataDir, name), 'utf8');
    } catch {
      throw new UsageError(`Missing CSV: ${name}\nExpected it in the data directory.`);
    }
  };
  return parseMonth(read(names.transactions), read(names.balance), month, year);
}

export function earliestFromConfig(config: BackfillConfig): MonthRef {
  const [year, month] = config.dateRules.earliestMonth.split('-').map(Number);
  return { month: month!, year: year! };
}

/** Credentials come from the environment only, so a secret cannot land in shell history. */
export async function createClient(): Promise<BackfillClient> {
  const baseUrl = process.env.AW_BACKFILL_BASE_URL ?? 'http://localhost:4321';
  const email = process.env.AW_BACKFILL_EMAIL;
  const password = process.env.AW_BACKFILL_PASSWORD;

  if (!email || !password) {
    throw new UsageError(
      'AW_BACKFILL_EMAIL and AW_BACKFILL_PASSWORD must be set. There is no password flag.'
    );
  }

  const client = new BackfillClient({ baseUrl, email, password });
  try {
    await client.signIn();
  } catch (error) {
    throw new UsageError(
      `Could not sign in at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}\n` +
        `Check that the app is running and that AW_BACKFILL_BASE_URL, AW_BACKFILL_EMAIL and ` +
        `AW_BACKFILL_PASSWORD are correct. Pass --dry-run to build and verify a plan offline.`
    );
  }
  return client;
}

/** The error classes whose message is the whole point: they name the fix. */
const DIRECTIVE_ERRORS = new Set([
  'ConfigError',
  'DetectionError',
  'LoadError',
  'OwnershipError',
  'ParseError',
  'SlotExhaustedError',
  'UsageError',
]);

/**
 * Runs a command, printing a directive abort as its message alone.
 *
 * Every abort names the config field that resolves it; a stack trace buries
 * that under frames the operator cannot act on. Unexpected errors still throw
 * with their trace intact.
 */
export async function withDirectiveErrors(fn: () => Promise<number | void>): Promise<number> {
  try {
    const code = await fn();
    return typeof code === 'number' ? code : 0;
  } catch (error) {
    if (error instanceof Error && DIRECTIVE_ERRORS.has(error.constructor.name)) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
}
