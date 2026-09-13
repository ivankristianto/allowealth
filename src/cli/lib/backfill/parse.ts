import { isFootnote, parseAmount, parseCsv } from './csv';
import type { Amount } from './types';

export interface RawRow {
  description: string;
  category: string;
  date: string;
  amount: Amount;
  usd: Amount;
}

export interface RawAccountRow {
  owner: 'primary' | 'secondary';
  name: string;
  occurrence: number;
  awal: Amount;
  income: Amount;
  akhir: Amount;
}

export interface RawBudgetRow {
  category: string;
  pct: string;
  budget: number;
  expense: number;
}

export interface RawMonth {
  month: number;
  year: number;
  rate: number;
  expenses: RawRow[];
  incomes: RawRow[];
  budgets: RawBudgetRow[];
  accounts: RawAccountRow[];
  totals: { expense: number; income: number; closing: number };
}

export class ParseError extends Error {}

/** Column offsets. The exports' header labels drift, so access is positional. */
const EXPENSE = { description: 1, category: 2, date: 3, amount: 4 } as const;
const INCOME = { description: 6, category: 7, date: 8, amount: 9, usd: 10 } as const;
const ACCOUNT_PRIMARY = { name: 1, awal: 2, income: 3, akhir: 4 } as const;
const ACCOUNT_SECONDARY = { name: 7, awal: 8, income: 9, akhir: 10 } as const;

function cell(row: string[], index: number): string {
  return (row[index] ?? '').trim();
}

function requireValue(amount: Amount, label: string): number {
  if (amount.kind === 'value') return amount.value;
  if (amount.kind === 'blank') throw new ParseError(`${label} is blank`);
  throw new ParseError(`${label} is not a number: ${amount.raw}`);
}

function assertParsable(amount: Amount, label: string): Amount {
  if (amount.kind === 'invalid') {
    throw new ParseError(`${label} is not a number: ${amount.raw}`);
  }
  return amount;
}

/**
 * Finds a labelled scalar by scanning every cell for the label and taking the
 * cell to its right. Labels move between columns across months; positions of
 * these summary rows are not stable.
 */
function labelledScalar(rows: string[][], label: string): Amount | null {
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      if (cell(row, i).toLowerCase() === label.toLowerCase()) {
        return parseAmount(row[i + 1] ?? '');
      }
    }
  }
  return null;
}

function requireScalar(rows: string[][], label: string): number {
  const found = labelledScalar(rows, label);
  if (!found) throw new ParseError(`Balance sheet has no "${label}" row`);
  return requireValue(found, `"${label}"`);
}

function parseTransactions(txnCsv: string): { expenses: RawRow[]; incomes: RawRow[] } {
  const rows = parseCsv(txnCsv);
  const expenses: RawRow[] = [];
  const incomes: RawRow[] = [];

  // Row 0 is the header, whatever it happens to be labelled this month.
  for (const row of rows.slice(1)) {
    const expenseDescription = cell(row, EXPENSE.description);
    if (expenseDescription !== '') {
      expenses.push({
        description: expenseDescription,
        category: cell(row, EXPENSE.category),
        date: cell(row, EXPENSE.date),
        amount: assertParsable(
          parseAmount(row[EXPENSE.amount] ?? ''),
          `Expense "${expenseDescription}" amount`
        ),
        usd: { kind: 'blank' },
      });
    }

    // The two halves are independent: a row may carry an income, an expense,
    // both, or neither.
    const incomeDescription = cell(row, INCOME.description);
    if (incomeDescription !== '') {
      incomes.push({
        description: incomeDescription,
        category: cell(row, INCOME.category),
        date: cell(row, INCOME.date),
        amount: assertParsable(
          parseAmount(row[INCOME.amount] ?? ''),
          `Income "${incomeDescription}" amount`
        ),
        usd: assertParsable(
          parseAmount(row[INCOME.usd] ?? ''),
          `Income "${incomeDescription}" foreign amount`
        ),
      });
    }
  }

  return { expenses, incomes };
}

function parseBudgets(rows: string[][]): RawBudgetRow[] {
  const budgets: RawBudgetRow[] = [];
  for (const row of rows) {
    if (!/^\d+$/.test(cell(row, 0))) continue;
    const category = cell(row, 1);
    if (category === '' || !cell(row, 2).includes('%')) continue;
    budgets.push({
      category,
      pct: cell(row, 2),
      budget: requireValue(parseAmount(row[3] ?? ''), `Budget for "${category}"`),
      expense: requireValue(parseAmount(row[4] ?? ''), `Expense for "${category}"`),
    });
  }
  return budgets;
}

function accountTableStart(rows: string[][]): number {
  const index = rows.findIndex(
    (row) => cell(row, 0).toLowerCase() === 'no' && cell(row, 2).toLowerCase() === 'awal bulan'
  );
  if (index === -1) {
    throw new ParseError('Balance sheet has no account table ("No" / "Awal Bulan" header row)');
  }
  return index;
}

function parseAccounts(rows: string[][]): RawAccountRow[] {
  const start = accountTableStart(rows);
  const accounts: RawAccountRow[] = [];
  const seen = new Map<string, number>();

  const sides = [
    { owner: 'primary' as const, cols: ACCOUNT_PRIMARY, done: false },
    { owner: 'secondary' as const, cols: ACCOUNT_SECONDARY, done: false },
  ];

  // Each side terminates on its own footnote marker. The row-number column is
  // blank past the numbered block, so it cannot be used as a terminator.
  for (const row of rows.slice(start + 1)) {
    for (const side of sides) {
      if (side.done) continue;
      const name = cell(row, side.cols.name);
      if (name === '') continue;
      if (isFootnote(name)) {
        side.done = true;
        continue;
      }
      const key = `${side.owner}|${name}`;
      const occurrence = (seen.get(key) ?? 0) + 1;
      seen.set(key, occurrence);
      accounts.push({
        owner: side.owner,
        name,
        occurrence,
        awal: assertParsable(parseAmount(row[side.cols.awal] ?? ''), `"${name}" opening balance`),
        income: assertParsable(parseAmount(row[side.cols.income] ?? ''), `"${name}" income`),
        akhir: assertParsable(parseAmount(row[side.cols.akhir] ?? ''), `"${name}" closing balance`),
      });
    }
    if (sides.every((s) => s.done)) break;
  }

  return accounts;
}

/** Turns a transactions/balance CSV pair into the month's raw, unresolved shape. */
export function parseMonth(
  txnCsv: string,
  balanceCsv: string,
  month: number,
  year: number
): RawMonth {
  const { expenses, incomes } = parseTransactions(txnCsv);
  const balanceRows = parseCsv(balanceCsv);

  return {
    month,
    year,
    rate: requireScalar(balanceRows, 'USD to IDR'),
    expenses,
    incomes,
    budgets: parseBudgets(balanceRows),
    accounts: parseAccounts(balanceRows),
    totals: {
      expense: requireScalar(balanceRows, 'Total Expenses'),
      income: requireScalar(balanceRows, 'Total Income'),
      closing: requireScalar(balanceRows, 'Total Akhir Bulan'),
    },
  };
}
