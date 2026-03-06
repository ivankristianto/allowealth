import { SEEDER_CONFIG } from '../config';
/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Transactions Seeder
 */

import { db } from '@/db';
import { accounts, categories, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getSeedMonths, specificDate, SEED_TIME_HOUR } from '../lib/dates';
import { amt, randomAmount } from '../lib/amounts';
import { CATEGORY_STYLES, EXPENSE_CATEGORIES } from '../data/categories';
import { getPaymentAccounts } from '../data/accounts';
import { INCOME_TEMPLATES, EXPENSE_TRANSACTIONS } from '../data/transactions';

// Transfer templates: from -> to with amount ranges
const TRANSFER_TEMPLATES = [
  {
    from: 'Transfer',
    to: 'Cash',
    amount: [1000000, 3000000] as [number, number],
    description: 'ATM Withdrawal',
  },
  {
    from: 'Transfer',
    to: 'GoPay',
    amount: [200000, 500000] as [number, number],
    description: 'Top-up GoPay',
  },
  {
    from: 'Transfer',
    to: 'OVO',
    amount: [200000, 500000] as [number, number],
    description: 'Top-up OVO',
  },
  {
    from: 'Cash',
    to: 'Transfer',
    amount: [500000, 2000000] as [number, number],
    description: 'Cash Deposit',
  },
  {
    from: 'Transfer',
    to: 'BCA Credit Card',
    amount: [2000000, 5000000] as [number, number],
    description: 'Credit Card Payment',
  },
  {
    from: 'Transfer',
    to: 'Mandiri Credit Card',
    amount: [1000000, 3000000] as [number, number],
    description: 'Credit Card Payment',
  },
];

/**
 * Seed income transactions
 */
export async function seedIncomeTransactions(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('💰 Seeding income transactions...');

  let count = 0;
  const paymentAccountNames = getPaymentAccounts().map((a) => a.name);
  const now = new Date();
  const seedMonths = monthsToSeed ?? getSeedMonths();

  for (let i = 0; i < seedMonths.length; i++) {
    const { year, month } = seedMonths[i];
    const templateIndex = seedMonths.length - 1 - i;
    const template = INCOME_TEMPLATES[templateIndex] || INCOME_TEMPLATES[0];

    for (const income of template) {
      const categoryId = categoryMap.get(income.description);
      if (!categoryId) {
        const newId = nanoid();
        const style = CATEGORY_STYLES[income.description] || {
          icon: 'circle-dot',
          color: 'bg-slate-500',
        };
        await db.insert(categories).values({
          id: newId,
          workspace_id: workspaceId,
          created_by_user_id: userId,
          name: income.description,
          type: 'income',
          description: style.description || null,
          icon: style.icon,
          color: style.color,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        categoryMap.set(income.description, newId);
      }

      const finalCategoryId = categoryMap.get(income.description)!;
      const accountName =
        paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      const accountId = accountMap.get(accountName || 'Transfer')!;

      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.min(income.day, daysInMonth);

      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: finalCategoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(income.amount, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: income.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }
  }

  console.log(`✓ Created ${count} income transactions`);
  return count;
}

/**
 * Seed expense transactions
 */
export async function seedExpenseTransactions(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('💸 Seeding expense transactions...');

  let count = 0;
  const months = monthsToSeed ?? getSeedMonths();
  const paymentAccountNames = getPaymentAccounts().map((a) => a.name);

  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const expense of EXPENSE_TRANSACTIONS) {
      if (expense.months && !expense.months.includes(month)) {
        continue;
      }

      const categoryId = categoryMap.get(expense.category);
      if (!categoryId) continue;

      let amount: number;
      if (Array.isArray(expense.amount)) {
        amount = expense.amount[0] + Math.random() * (expense.amount[1] - expense.amount[0]);
      } else {
        amount = expense.amount * (0.95 + Math.random() * 0.1);
      }

      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      let accountName = paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      if (amount > 500000) {
        accountName = Math.random() > 0.5 ? 'Transfer' : 'BCA Credit Card';
      }

      const accountId = accountMap.get(accountName || 'Transfer');
      if (!accountId) continue;

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: amt(Math.round(amount), SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: expense.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      if (Math.random() > 0.7) continue;

      const numDailyExpenses = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numDailyExpenses; i++) {
        const randomCategory =
          EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
        const categoryId = categoryMap.get(randomCategory.name);
        if (!categoryId) continue;

        const amount = randomAmount(50000, 500000, SEEDER_CONFIG.PRIMARY_CURRENCY);
        const transactionDate = specificDate(year, month, day);
        if (!transactionDate) continue;

        const createdAt = new Date(transactionDate);
        createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 12), 0, 0, 0);

        const accountName =
          paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
        const accountId = accountMap.get(accountName || 'Cash');
        if (!accountId) continue;

        await db.insert(transactions).values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: userId,
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
          amount,
          currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
          description: `Daily expense - ${randomCategory.name}`,
          transaction_date: transactionDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} expense transactions`);
  return count;
}

/**
 * Seed transfer transactions between payment accounts
 */
export async function seedTransferTransactions(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('🔄 Seeding transfer transactions...');

  let count = 0;
  const seedMonths = monthsToSeed ?? getSeedMonths();

  for (const { year, month } of seedMonths) {
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const tmpl of TRANSFER_TEMPLATES) {
      const fromAccountId = accountMap.get(tmpl.from);
      const toAccountId = accountMap.get(tmpl.to);
      if (!fromAccountId || !toAccountId) continue;

      const numTransfers = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numTransfers; i++) {
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        const transactionDate = specificDate(year, month, day);
        if (!transactionDate) continue;

        const createdAt = new Date(transactionDate);
        createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

        const amount = tmpl.amount[0] + Math.random() * (tmpl.amount[1] - tmpl.amount[0]);

        await db.insert(transactions).values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: userId,
          account_id: fromAccountId,
          to_account_id: toAccountId,
          type: 'transfer',
          amount: amt(Math.round(amount), SEEDER_CONFIG.PRIMARY_CURRENCY),
          currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
          description: tmpl.description,
          transaction_date: transactionDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} transfer transactions`);
  return count;
}

/**
 * Seed transactions for member user (Mom)
 */
export async function seedMemberTransactions(
  workspaceId: string,
  memberUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('👩 Seeding member transactions...');

  let count = 0;
  const months = monthsToSeed ?? getSeedMonths();
  const memberAccountNames = ['GoPay', 'OVO', 'Mandiri Credit Card'];

  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();

    // Member creates some personal expenses
    for (let day = 1; day <= daysInMonth; day += 2 + Math.floor(Math.random() * 5)) {
      const numExpenses = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numExpenses; i++) {
        const categoryNames = [
          'Food & Groceries',
          'Transportation',
          'Entertainment',
          'Pocket Money',
        ];
        const categoryName = categoryNames[Math.floor(Math.random() * categoryNames.length)];
        const categoryId = categoryMap.get(categoryName);
        if (!categoryId) continue;

        const accountName =
          memberAccountNames[Math.floor(Math.random() * memberAccountNames.length)];
        const accountId = accountMap.get(accountName);
        if (!accountId) continue;

        const amount = randomAmount(25000, 450000, SEEDER_CONFIG.PRIMARY_CURRENCY);
        const transactionDate = specificDate(year, month, day);
        if (!transactionDate) continue;

        const createdAt = new Date(transactionDate);
        createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

        const descriptions: Record<string, string[]> = {
          'Food & Groceries': ['Supermarket', 'Market', 'Convenience Store', 'Bakery'],
          Transportation: ['Gasoline', 'Toll', 'Parking', 'Ride-hailing'],
          Entertainment: ['Movie', 'Game', 'Streaming', 'Cafe'],
          'Pocket Money': ['Coffee', 'Snacks', 'Personal Care', 'Stationery'],
        };
        const description =
          descriptions[categoryName][Math.floor(Math.random() * descriptions[categoryName].length)];

        await db.insert(transactions).values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: memberUserId,
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
          amount,
          currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
          description,
          transaction_date: transactionDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} member transactions`);
  return count;
}

/**
 * Backfill initial_balance for any accounts that don't have it
 */
export async function backfillInitialBalance(): Promise<number> {
  console.log('🔄 Backfilling initial balances...');

  const accountsWithoutInitialBalance = await db.query.accounts.findMany({
    where: (accounts, { isNull }) => isNull(accounts.initial_balance),
  });

  let count = 0;
  for (const account of accountsWithoutInitialBalance) {
    await db
      .update(accounts)
      .set({ initial_balance: account.balance })
      .where(eq(accounts.id, account.id));
    count++;
  }

  console.log(`✓ Backfilled ${count} accounts`);
  return count;
}
