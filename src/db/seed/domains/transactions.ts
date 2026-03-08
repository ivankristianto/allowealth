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
import { CATEGORY_STYLES } from '../data/categories';
import { CURRENT_ACCOUNT_NAME } from '../data/accounts';
import {
  DAILY_LIVING_EXPENSES,
  getExpensePlanForMonth,
  getIncomeTemplateForMonth,
} from '../data/transactions';

const TRANSFER_TEMPLATES = [
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'Cash',
    amount: [800_000, 2_200_000] as [number, number],
    description: 'ATM Withdrawal',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'GoPay',
    amount: [250_000, 600_000] as [number, number],
    description: 'Top-up GoPay',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'OVO',
    amount: [250_000, 600_000] as [number, number],
    description: 'Top-up OVO',
  },
  {
    from: 'Cash',
    to: CURRENT_ACCOUNT_NAME,
    amount: [500_000, 1_500_000] as [number, number],
    description: 'Cash Deposit',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'BCA Credit Card',
    amount: [2_500_000, 6_000_000] as [number, number],
    description: 'Credit Card Payment',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'Mandiri Credit Card',
    amount: [1_500_000, 3_500_000] as [number, number],
    description: 'Credit Card Payment',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'Emergency Savings',
    amount: [1_500_000, 4_000_000] as [number, number],
    description: 'Emergency Fund Top-up',
  },
  {
    from: CURRENT_ACCOUNT_NAME,
    to: 'Fixed Deposit - BCA',
    amount: [2_000_000, 5_000_000] as [number, number],
    description: 'Fixed Deposit Placement',
  },
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function varyAmount(amount: number, variance = 0.05): number {
  return Math.round(amount * (1 - variance + Math.random() * variance * 2));
}

async function ensureIncomeCategory(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  categoryName: string,
  createdAt: Date
) {
  const existingId = categoryMap.get(categoryName);
  if (existingId) {
    return existingId;
  }

  const newId = nanoid();
  const style = CATEGORY_STYLES[categoryName] || {
    icon: 'circle-dot',
    color: 'bg-slate-500',
  };

  await db.insert(categories).values({
    id: newId,
    workspace_id: workspaceId,
    created_by_user_id: userId,
    name: categoryName,
    type: 'income',
    description: style.description || null,
    icon: style.icon,
    color: style.color,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  });

  categoryMap.set(categoryName, newId);
  return newId;
}

/**
 * Seed income transactions
 */
export async function seedIncomeTransactions(
  workspaceId: string,
  dadUserId: string,
  momUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('💰 Seeding income transactions...');

  let count = 0;
  const now = new Date();
  const seedMonths = monthsToSeed ?? getSeedMonths();

  for (let monthIndex = 0; monthIndex < seedMonths.length; monthIndex++) {
    const { year, month } = seedMonths[monthIndex]!;
    const incomeTemplate = getIncomeTemplateForMonth(monthIndex);

    for (const income of incomeTemplate) {
      const categoryId = await ensureIncomeCategory(
        workspaceId,
        dadUserId,
        categoryMap,
        income.category,
        now
      );
      const createdByUserId = income.owner === 'mom' ? momUserId : dadUserId;
      const accountId =
        accountMap.get(income.account) ?? accountMap.get(CURRENT_ACCOUNT_NAME) ?? null;
      if (!accountId) continue;

      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.min(income.day, daysInMonth);
      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 4), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: createdByUserId,
        category_id: categoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(varyAmount(income.amount, 0.03), SEEDER_CONFIG.PRIMARY_CURRENCY),
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

function buildDailyExpenseAllocations(
  totalBudget: number,
  minAmount: number,
  maxAmount: number
): number[] {
  const averageAmount = Math.round((minAmount + maxAmount) / 2);
  const transactionCount = clamp(Math.round(totalBudget / averageAmount), 8, 18);
  const amounts: number[] = [];
  let remaining = totalBudget;

  for (let index = 0; index < transactionCount; index++) {
    const remainingSlots = transactionCount - index - 1;
    if (remainingSlots === 0) {
      amounts.push(remaining);
      break;
    }

    const averageRemaining = Math.round(remaining / (remainingSlots + 1));
    const minimumAllowed = Math.max(minAmount, remaining - maxAmount * remainingSlots);
    const maximumAllowed = Math.min(maxAmount, remaining - minAmount * remainingSlots);
    const nextAmount = clamp(varyAmount(averageRemaining, 0.18), minimumAllowed, maximumAllowed);

    amounts.push(nextAmount);
    remaining -= nextAmount;
  }

  return amounts.filter((amount) => amount > 0);
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

  for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
    const { year, month } = months[monthIndex]!;
    const expensePlan = getExpensePlanForMonth(monthIndex);
    const plannedExpenses = [
      ...expensePlan.fixedExpenses,
      ...expensePlan.variableExpenses,
      ...expensePlan.extraExpenses,
    ];

    for (const expense of plannedExpenses) {
      const categoryId = categoryMap.get(expense.category);
      const accountId =
        accountMap.get(expense.account) ?? accountMap.get(CURRENT_ACCOUNT_NAME) ?? null;
      if (!categoryId || !accountId) continue;

      const transactionDate = specificDate(year, month, expense.day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 6), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: amt(varyAmount(expense.amount, 0.05), SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: expense.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }

    const [minDailyAmount, maxDailyAmount] = expensePlan.profile.dailyExpenseAmountRange;
    const dailyAmounts = buildDailyExpenseAllocations(
      expensePlan.profile.plannedDailyExpenseTotal,
      minDailyAmount,
      maxDailyAmount
    );
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let index = 0; index < dailyAmounts.length; index++) {
      const dailyTemplate = pickRandom(DAILY_LIVING_EXPENSES);
      const categoryId = categoryMap.get(dailyTemplate.category);
      if (!categoryId) continue;

      const day = clamp(
        Math.round(((index + 1) * daysInMonth) / (dailyAmounts.length + 1)) +
          Math.floor(Math.random() * 3) -
          1,
        1,
        daysInMonth
      );
      const accountName = pickRandom(dailyTemplate.accountOptions);
      const accountId = accountMap.get(accountName);
      if (!accountId) continue;

      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: amt(dailyAmounts[index]!, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: pickRandom(dailyTemplate.descriptions),
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
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
    for (const template of TRANSFER_TEMPLATES) {
      const fromAccountId = accountMap.get(template.from);
      const toAccountId = accountMap.get(template.to);
      if (!fromAccountId || !toAccountId) continue;

      const transactionDate = specificDate(year, month, 1 + Math.floor(Math.random() * 26));
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        account_id: fromAccountId,
        to_account_id: toAccountId,
        type: 'transfer',
        amount: amt(
          Math.round(
            template.amount[0] + Math.random() * (template.amount[1] - template.amount[0])
          ),
          SEEDER_CONFIG.PRIMARY_CURRENCY
        ),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: template.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }
  }

  console.log(`✓ Created ${count} transfer transactions`);
  return count;
}

/**
 * Seed transactions for the mom user
 */
export async function seedMemberTransactions(
  workspaceId: string,
  memberUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('👩 Seeding mom transactions...');

  let count = 0;
  const months = monthsToSeed ?? getSeedMonths();
  const memberAccountNames = ['GoPay', 'OVO', 'Mandiri Credit Card'];

  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 2; day <= daysInMonth; day += 3 + Math.floor(Math.random() * 4)) {
      const categoryName = pickRandom([
        'Food & Groceries',
        'Kids Expenses',
        'Entertainment',
        'Pocket Money',
      ]);
      const categoryId = categoryMap.get(categoryName);
      const accountId = accountMap.get(pickRandom(memberAccountNames));
      if (!categoryId || !accountId) continue;

      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      const descriptions: Record<string, string[]> = {
        'Food & Groceries': ['Fruit Shop', 'Supermarket', 'Bakery', 'Milk Refill'],
        'Kids Expenses': ['School Snack', 'Books', 'Craft Materials', 'Class Contribution'],
        Entertainment: ['Movie', 'Playdate Cafe', 'Streaming', 'Ice Cream Outing'],
        'Pocket Money': ['Coffee', 'Personal Care', 'Snacks', 'Stationery'],
      };

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: memberUserId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: randomAmount(40_000, 420_000, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: pickRandom(descriptions[categoryName]!),
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }
  }

  console.log(`✓ Created ${count} mom transactions`);
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
