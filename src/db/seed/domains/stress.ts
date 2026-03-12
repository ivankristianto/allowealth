import { SEEDER_CONFIG } from '../config';
/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Stress Test Data Seeder
 *
 * Seeds 5 years of realistic family activity with multiple family members.
 */

import { db } from '@/db';
import {
  users,
  userMeta,
  budgets,
  accountHistory,
  accountSnapshots,
  accountSnapshotItems,
  transactions,
} from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { getTrailingMonths, specificDate, SEED_TIME_HOUR } from '../lib/dates';
import { amt, approxAmt } from '../lib/amounts';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { getPaymentAccounts, getLoanAccounts, getAccountTypes } from '../data/accounts';

const getAllAccounts = () => [...getPaymentAccounts(), ...getLoanAccounts(), ...getAccountTypes()];

export type FamilyMemberProfile = {
  userId: string;
  label: string;
  incomeCategory: string;
  incomeBase: number;
  incomeDay: number;
  preferredAccounts: string[];
  spendingWeights: Array<{
    category: string;
    weight: number;
    descriptions: string[];
    min: number;
    max: number;
  }>;
};

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let target = Math.random() * total;
  for (const item of items) {
    target -= item.weight;
    if (target <= 0) return item;
  }
  return items[items.length - 1]!;
}

/**
 * Seed additional family members for stress test
 */
export async function seedStressFamilyMembers(
  workspaceId: string
): Promise<Array<{ id: string; label: string }>> {
  const now = new Date();
  const extraMembers = [
    { email: 'teen@example.com', name: 'Teen Child' },
    { email: 'youngest@example.com', name: 'Youngest Child' },
  ] as const;
  const passwordHash = await hashPassword('demo123456789');
  const memberIds: Array<{ id: string; label: string }> = [];

  for (const member of extraMembers) {
    const id = nanoid();
    await db.insert(users).values({
      id,
      workspace_id: workspaceId,
      email: member.email,
      password_hash: passwordHash,
      name: member.name,
      role: 'member',
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    });

    await db.insert(userMeta).values([
      {
        meta_id: nanoid(),
        user_id: id,
        meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
        meta_value: 'true',
        created_at: now,
        updated_at: now,
      },
      {
        meta_id: nanoid(),
        user_id: id,
        meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
        meta_value: 'true',
        created_at: now,
        updated_at: now,
      },
    ]);

    memberIds.push({ id, label: member.name });
  }

  return memberIds;
}

/**
 * Seed stress test data (5 years of realistic family activity)
 */
export async function seedStressData(
  workspaceId: string,
  adminUserId: string,
  memberUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsCount = 60
): Promise<{ transactionCount: number; monthsCount: number }> {
  console.log(`\n🔥 Seeding stress-test data (${monthsCount} months of family history)...`);
  const startTime = Date.now();
  const months = getTrailingMonths(monthsCount);
  const now = new Date();

  // Rebuild monthly datasets to guarantee full coverage
  await db.delete(accountSnapshotItems);
  await db.delete(accountSnapshots);
  await db.delete(accountHistory);
  await db.delete(budgets);

  const extraMembers = await seedStressFamilyMembers(workspaceId);

  const memberProfiles: FamilyMemberProfile[] = [
    {
      userId: adminUserId,
      label: 'Dad',
      incomeCategory: 'Dad Salary',
      incomeBase: 22_000_000,
      incomeDay: 25,
      preferredAccounts: ['BCA - 2332', 'BCA Credit Card'],
      spendingWeights: [
        {
          category: 'Utility Bills',
          weight: 3,
          descriptions: ['Electricity', 'Internet', 'Water Bill', 'Mobile Plan 1'],
          min: 120_000,
          max: 1_600_000,
        },
        {
          category: 'Transportation',
          weight: 3,
          descriptions: ['Gasoline', 'Transit Card Top-up', 'Ride-hailing'],
          min: 35_000,
          max: 850_000,
        },
        {
          category: 'Work Support',
          weight: 2,
          descriptions: ['Office Supplies', 'Business Lunch', 'Transport for Business'],
          min: 75_000,
          max: 1_400_000,
        },
      ],
    },
    {
      userId: memberUserId,
      label: 'Mom',
      incomeCategory: 'Mom Salary',
      incomeBase: 12_500_000,
      incomeDay: 24,
      preferredAccounts: ['BCA - 2332', 'OVO', 'GoPay'],
      spendingWeights: [
        {
          category: 'Food & Groceries',
          weight: 4,
          descriptions: ['Supermarket', 'Market Groceries', 'Fruit Shop', 'Bakery'],
          min: 80_000,
          max: 900_000,
        },
        {
          category: 'Kids Expenses',
          weight: 3,
          descriptions: ['School Supplies', 'Tutoring', 'Indoor Playground', 'Books'],
          min: 120_000,
          max: 1_250_000,
        },
        {
          category: 'House Expenses',
          weight: 2,
          descriptions: ['Home Supplies', 'Household Items', 'Home Maintenance'],
          min: 90_000,
          max: 1_100_000,
        },
      ],
    },
    {
      userId: extraMembers[0]!.id,
      label: extraMembers[0]!.label,
      incomeCategory: 'Other Side Income',
      incomeBase: 2_200_000,
      incomeDay: 12,
      preferredAccounts: ['GoPay', 'OVO', 'Cash'],
      spendingWeights: [
        {
          category: 'Entertainment',
          weight: 4,
          descriptions: ['Movie Tickets', 'Game Purchase', 'Karaoke', 'Sports Event'],
          min: 50_000,
          max: 600_000,
        },
        {
          category: 'Pocket Money',
          weight: 3,
          descriptions: ['Coffee Shop', 'Clothing', 'Personal Care', 'Snacks'],
          min: 25_000,
          max: 350_000,
        },
        {
          category: 'Dine Out',
          weight: 2,
          descriptions: ['Cafe Lunch', 'Ramen Seirockya', 'Mie Gacoan'],
          min: 40_000,
          max: 450_000,
        },
      ],
    },
    {
      userId: extraMembers[1]!.id,
      label: extraMembers[1]!.label,
      incomeCategory: 'Other Side Income',
      incomeBase: 900_000,
      incomeDay: 6,
      preferredAccounts: ['Cash', 'GoPay'],
      spendingWeights: [
        {
          category: 'Kids Expenses',
          weight: 4,
          descriptions: ['School Project', 'Books', 'Play Center', 'Theme Park'],
          min: 35_000,
          max: 450_000,
        },
        {
          category: 'Food & Groceries',
          weight: 3,
          descriptions: ['Snacks', 'Juice Bar', 'Breakfast Street Food'],
          min: 20_000,
          max: 180_000,
        },
        {
          category: 'Entertainment',
          weight: 2,
          descriptions: ['Arcade', 'Movie Tickets', 'Indoor Playground'],
          min: 40_000,
          max: 320_000,
        },
      ],
    },
  ];

  const memberWeights = [
    { userId: memberProfiles[0]!.userId, weight: 3 },
    { userId: memberProfiles[1]!.userId, weight: 3 },
    { userId: memberProfiles[2]!.userId, weight: 2 },
    { userId: memberProfiles[3]!.userId, weight: 1.5 },
  ];
  const memberProfileById = new Map(memberProfiles.map((profile) => [profile.userId, profile]));

  const paymentAccountIds = memberProfiles
    .flatMap((profile) => profile.preferredAccounts)
    .map((name) => accountMap.get(name))
    .filter((id): id is string => !!id);
  const fallbackAccountIds = [...new Set(paymentAccountIds)];

  const txBatch: Array<{
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    account_id: string;
    type: 'income' | 'expense';
    amount: string;
    currency: string;
    description: string;
    transaction_date: Date;
    created_at: Date;
    updated_at: Date;
  }> = [];
  const TX_BATCH_SIZE = 500;
  let transactionCount = 0;

  const flushTransactions = async () => {
    if (txBatch.length === 0) return;
    await db.insert(transactions).values(txBatch);
    transactionCount += txBatch.length;
    txBatch.length = 0;
  };

  for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
    const { year, month } = months[monthIndex]!;
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxDay =
      year === now.getFullYear() && month === now.getMonth() + 1
        ? Math.min(now.getDate(), daysInMonth)
        : daysInMonth;
    const progressPct = Math.round(((monthIndex + 1) / months.length) * 100);
    console.log(
      `   [${String(monthIndex + 1).padStart(2, '0')}/${months.length}] ${year}-${String(month).padStart(2, '0')} (${progressPct}%)`
    );

    // 1) Monthly income per member profile
    for (const profile of memberProfiles) {
      const categoryId = categoryMap.get(profile.incomeCategory);
      const accountId = accountMap.get(profile.preferredAccounts[0] || '') || fallbackAccountIds[0];
      if (!categoryId || !accountId) continue;

      const incomeDay = Math.min(profile.incomeDay, maxDay);
      const txDate = specificDate(year, month, incomeDay);
      if (!txDate) continue;

      const variation = 0.92 + Math.random() * 0.18;
      const amount = Math.round(profile.incomeBase * variation);
      const createdAt = new Date(txDate);
      createdAt.setHours(8 + Math.floor(Math.random() * 3), 0, 0, 0);

      txBatch.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: profile.userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(amount, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: profile.incomeCategory,
        transaction_date: txDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // 2) Daily family expenses (3-8/day, distributed across family members)
    for (let day = 1; day <= maxDay; day++) {
      const dailyCount = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < dailyCount; i++) {
        const selectedMember = pickWeighted(memberWeights);
        const profile = memberProfileById.get(selectedMember.userId);
        if (!profile) continue;

        const chosenSpend = pickWeighted(profile.spendingWeights);
        const categoryId = categoryMap.get(chosenSpend.category);
        if (!categoryId) continue;

        const accountName =
          profile.preferredAccounts[Math.floor(Math.random() * profile.preferredAccounts.length)];
        const accountId =
          (accountName && accountMap.get(accountName)) ||
          fallbackAccountIds[Math.floor(Math.random() * fallbackAccountIds.length)];
        if (!accountId) continue;

        const weekEndBoost = [0, 6].includes(new Date(year, month - 1, day).getDay()) ? 1.12 : 1;
        const amount = Math.round(
          (chosenSpend.min + Math.random() * (chosenSpend.max - chosenSpend.min)) * weekEndBoost
        );
        const description =
          chosenSpend.descriptions[Math.floor(Math.random() * chosenSpend.descriptions.length)] ||
          `${profile.label} expense`;

        const txDate = specificDate(year, month, day);
        if (!txDate) continue;
        const createdAt = new Date(txDate);
        createdAt.setHours(
          7 + Math.floor(Math.random() * 14),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        txBatch.push({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: profile.userId,
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
          amount: amt(amount, SEEDER_CONFIG.PRIMARY_CURRENCY),
          currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
          description,
          transaction_date: txDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
    }

    // 3) Budgets for all categories every month
    const budgetValues = EXPENSE_CATEGORIES.map((category) => {
      const inflationFactor = 1 + monthIndex * 0.0025;
      return {
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: adminUserId,
        category_id: categoryMap.get(category.name)!,
        month,
        year,
        budget_amount: approxAmt(
          Math.round(category.budget * inflationFactor),
          SEEDER_CONFIG.PRIMARY_CURRENCY
        ),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        is_closed: false,
        notes: null,
        created_at: now,
        updated_at: now,
      };
    }).filter((record) => !!record.category_id);

    if (budgetValues.length > 0) {
      // Chunk to stay within D1's SQL variable limit (999 params)
      // Budgets have 12 bound columns, so 10 rows = 120 params (extremely safe)
      const BUDGET_CHUNK_SIZE = 10;
      for (let i = 0; i < budgetValues.length; i += BUDGET_CHUNK_SIZE) {
        const chunk = budgetValues.slice(i, i + BUDGET_CHUNK_SIZE);
        await db.insert(budgets).values(chunk);
      }
    }

    // 4) Account history month-end balances
    const historyValues: Array<{
      id: string;
      account_id: string;
      balance: string;
      notes: string;
      recorded_at: Date;
    }> = [];
    for (const [accountName, accountId] of accountMap.entries()) {
      // Skip history for closed accounts
      if (accountName.includes('(Closed)')) continue;

      const accountConfig = getAllAccounts().find((account) => account.name === accountName);
      if (!accountConfig) {
        throw new Error(`Account template not found for name: ${accountName}`);
      }
      const baseBalance = Number(accountConfig.balance || 0);
      const trendFactor = 1 + monthIndex * 0.0015;
      const variation = 0.94 + Math.random() * 0.12;
      const balance = Math.round(baseBalance * trendFactor * variation);
      historyValues.push({
        id: nanoid(),
        account_id: accountId,
        balance: amt(balance, accountConfig.currency),
        notes: `Stress monthly close ${year}-${String(month).padStart(2, '0')}`,
        recorded_at: new Date(year, month - 1, Math.min(28, maxDay), SEED_TIME_HOUR, 0, 0, 0),
      });
    }
    if (historyValues.length > 0) {
      // Chunk to stay within D1's SQL variable limit (999 params)
      // account_history has 5 bound columns, so 25 rows = 125 params (extremely safe)
      const HISTORY_CHUNK_SIZE = 25;
      for (let i = 0; i < historyValues.length; i += HISTORY_CHUNK_SIZE) {
        const chunk = historyValues.slice(i, i + HISTORY_CHUNK_SIZE);
        await db.insert(accountHistory).values(chunk);
      }
    }

    // 5) Monthly snapshot + items for each account
    const snapshotDate = new Date(year, month - 1, 1, SEED_TIME_HOUR, 0, 0, 0);
    const snapshotId = nanoid();
    await db.insert(accountSnapshots).values({
      id: snapshotId,
      workspace_id: workspaceId,
      created_by_user_id: adminUserId,
      snapshot_date: snapshotDate,
      month,
      year,
      notes: `Stress snapshot ${snapshotDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      created_at: snapshotDate,
    });
    const snapshotItems = Array.from(accountMap.entries())
      .filter(([accountName]) => !accountName.includes('(Closed)'))
      .map(([accountName, accountId]) => {
        const accountConfig = getAllAccounts().find((account) => account.name === accountName);
        if (!accountConfig) {
          throw new Error(`Account template not found for name: ${accountName}`);
        }
        const baseBalance = Number(accountConfig.balance || 0);
        const variation = 0.9 + Math.random() * 0.2;
        return {
          id: nanoid(),
          snapshot_id: snapshotId,
          account_id: accountId,
          balance: amt(Math.round(baseBalance * variation), accountConfig.currency),
          currency: accountConfig.currency,
        };
      });
    if (snapshotItems.length > 0) {
      // Chunk to stay within D1's SQL variable limit (999 params)
      // account_snapshot_items has 5 bound columns, so 25 rows = 125 params (extremely safe)
      const SNAPSHOT_CHUNK_SIZE = 25;
      for (let i = 0; i < snapshotItems.length; i += SNAPSHOT_CHUNK_SIZE) {
        const chunk = snapshotItems.slice(i, i + SNAPSHOT_CHUNK_SIZE);
        await db.insert(accountSnapshotItems).values(chunk);
      }
    }

    if (txBatch.length >= TX_BATCH_SIZE) {
      await flushTransactions();
    }
  }

  await flushTransactions();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Stress data seeded in ${elapsed}s`);
  console.log(`   ✓ ${months.length} months generated`);
  console.log(`   ✓ ${transactionCount} stress transactions inserted`);
  console.log(`   ✓ 4 family members in workspace (2 original + 2 additional)`);

  return { transactionCount, monthsCount: months.length };
}
