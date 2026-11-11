import type { Database as SqliteDriver } from 'bun:sqlite';

export const FIXTURE_WORKSPACE = 'ws-money';
export const FIXTURE_USER = 'user-money';

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function seedAccount(
  raw: SqliteDriver,
  id: string,
  options: { balance?: string; currency?: string; status?: string; accountClass?: string } = {}
): void {
  const now = toSeconds(new Date());
  raw.run(
    `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, account_class, balance,
       currency, status, last_updated, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'bank', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      FIXTURE_WORKSPACE,
      FIXTURE_USER,
      `Account ${id}`,
      options.accountClass ?? 'liquid',
      options.balance ?? '0',
      options.currency ?? 'USD',
      options.status ?? 'active',
      now,
      now,
      now,
    ]
  );
}

export function seedCategory(
  raw: SqliteDriver,
  id: string,
  type: 'expense' | 'income' = 'expense'
): void {
  raw.run(
    `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
     VALUES (?, ?, ?, ?, ?)`,
    [id, FIXTURE_WORKSPACE, FIXTURE_USER, `Category ${id}`, type]
  );
}

export function seedBudget(
  raw: SqliteDriver,
  id: string,
  categoryId: string,
  date: Date,
  amount: string,
  currency = 'USD'
): void {
  raw.run(
    `INSERT INTO budgets (id, workspace_id, created_by_user_id, category_id, month, year, budget_amount, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      FIXTURE_WORKSPACE,
      FIXTURE_USER,
      categoryId,
      date.getMonth() + 1,
      date.getFullYear(),
      amount,
      currency,
    ]
  );
}

export function seedTransaction(
  raw: SqliteDriver,
  id: string,
  fields: {
    amount: string;
    accountId: string;
    date: Date;
    type?: 'expense' | 'income' | 'transfer';
    categoryId?: string | null;
    toAccountId?: string | null;
    currency?: string;
    deleted?: boolean;
  }
): void {
  const now = toSeconds(new Date());
  raw.run(
    `INSERT INTO transactions (id, workspace_id, created_by_user_id, category_id, account_id, to_account_id,
       type, amount, currency, transaction_date, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      FIXTURE_WORKSPACE,
      FIXTURE_USER,
      fields.categoryId ?? null,
      fields.accountId,
      fields.toAccountId ?? null,
      fields.type ?? 'expense',
      fields.amount,
      fields.currency ?? 'USD',
      toSeconds(fields.date),
      fields.deleted ? now : null,
      now,
      now,
    ]
  );
}

/** Mid-month, so local-time month bounds and UTC never disagree about the bucket. */
export function midMonth(monthsAgo = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15, 12, 0, 0);
}
