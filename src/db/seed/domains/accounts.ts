/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Accounts Seeder
 */

import { db } from '@/db';
import {
  accounts,
  accountHistory,
  accountUpdateReminders,
  accountSnapshots,
  accountSnapshotItems,
} from '@/db/schema';
import { deriveAccountClass } from '@/lib/types/account';
import { nanoid } from 'nanoid';
import { daysAgo, SEED_TIME_HOUR } from '../lib/dates';
import { amt } from '../lib/amounts';
import { SNAPSHOT_GROWTH_RATE } from '../config';
import { PAYMENT_ACCOUNTS, LOAN_ACCOUNTS, ACCOUNT_TYPES } from '../data/accounts';

// Accounts created by the member user (personal e-wallets, some stocks, a credit card)
const MEMBER_OWNED_ACCOUNTS = new Set([
  'GoPay',
  'OVO',
  'Mandiri Credit Card',
  'Stock - AAPL',
  'Stock - GOOGL',
  'Chase Checking',
  'Car Loan - Innova',
]);

// Combined list of all accounts for lookup
const ALL_ACCOUNTS = [...PAYMENT_ACCOUNTS, ...LOAN_ACCOUNTS, ...ACCOUNT_TYPES];

/**
 * Seed accounts (both payment accounts and investment accounts)
 */
export async function seedAccounts(
  workspaceId: string,
  userId: string,
  memberUserId: string,
  accountCategoryMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('💰 Seeding accounts...');

  const accountMap = new Map<string, string>();
  const now = new Date();
  const createdAt = daysAgo(90);

  const ownerFor = (name: string) => (MEMBER_OWNED_ACCOUNTS.has(name) ? memberUserId : userId);

  // First, seed payment accounts (cash, bank accounts, credit cards, e-wallets)
  for (const account of PAYMENT_ACCOUNTS) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(account.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(account.name),
      name: account.name,
      type: account.type,
      account_class: deriveAccountClass(account.type),
      category_id: categoryId,
      balance: amt(account.balance),
      initial_balance: amt(account.balance),
      currency: account.currency,
      is_cash_account: account.is_cash_account,
      credit_limit: 'credit_limit' in account ? amt(account.credit_limit) : null,
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Then, seed investment accounts
  for (const account of ACCOUNT_TYPES) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(account.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(account.name),
      name: account.name,
      type: account.type,
      account_class: deriveAccountClass(account.type),
      category_id: categoryId,
      balance: amt(account.balance),
      initial_balance: amt(account.balance),
      currency: account.currency,
      is_cash_account: false, // Investment accounts are not cash accounts
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Seed loan accounts (debt class)
  for (const loan of LOAN_ACCOUNTS) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(loan.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(loan.name),
      name: loan.name,
      type: loan.type,
      account_class: deriveAccountClass(loan.type),
      category_id: categoryId,
      balance: amt(loan.balance),
      initial_balance: amt(loan.balance),
      currency: loan.currency,
      is_cash_account: false,
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(loan.name, id);
  }

  // Add a closed test account for testing the closed accounts page
  const closedId = nanoid();
  const closedCategoryId = accountCategoryMap.get('bank_account') || null;
  const closedAt = daysAgo(30);
  await db.insert(accounts).values({
    id: closedId,
    workspace_id: workspaceId,
    created_by_user_id: userId,
    name: 'Old Savings (Closed)',
    type: 'bank_account',
    account_class: deriveAccountClass('bank_account'),
    category_id: closedCategoryId,
    balance: '0',
    initial_balance: '0',
    currency: 'IDR',
    is_cash_account: false,
    status: 'closed',
    closed_at: closedAt,
    closed_by_user_id: userId,
    last_updated: closedAt,
    created_at: daysAgo(180),
    updated_at: closedAt,
  });
  accountMap.set('Old Savings (Closed)', closedId);

  const memberCount = MEMBER_OWNED_ACCOUNTS.size;
  console.log(`✓ Created ${accountMap.size} accounts (${memberCount} owned by member)`);
  return accountMap;
}

/**
 * Seed account history (monthly entries for 6 months, plus biweekly for recent 2 months)
 * Generates enough data so historical month navigation shows realistic values.
 */
export async function seedAccountHistory(accountMap: Map<string, string>): Promise<number> {
  console.log('📈 Seeding account history...');

  let historyCount = 0;
  const now = new Date();

  for (const [accountName, accountId] of accountMap.entries()) {
    const accountConfig = ALL_ACCOUNTS.find((a) => a.name === accountName);
    if (!accountConfig) continue;

    const baseBalance = parseFloat(accountConfig.balance.toString());

    // Generate entries for each of the past 6 months
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);

      // Simulate gradual growth/decline over time (older = further from current)
      const growthFactor = 1 - monthsAgo * 0.03; // ~3% growth per month
      const monthBaseBalance = baseBalance * growthFactor;

      if (monthsAgo <= 2) {
        // Recent months: biweekly entries (1st and 15th)
        for (const day of [1, 15]) {
          const recordedAt = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
            SEED_TIME_HOUR,
            0,
            0,
            0
          );
          if (recordedAt > now) continue;

          const variation = (Math.random() - 0.5) * monthBaseBalance * 0.04; // ±2% variation
          const balance = amt(monthBaseBalance + variation);

          await db.insert(accountHistory).values({
            id: nanoid(),
            account_id: accountId,
            balance,
            notes: null,
            recorded_at: recordedAt,
          });
          historyCount++;
        }
      } else {
        // Older months: just month-end entry
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const recordedAt = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          lastDay,
          SEED_TIME_HOUR,
          0,
          0,
          0
        );
        if (recordedAt > now) continue;

        const variation = (Math.random() - 0.5) * monthBaseBalance * 0.06; // ±3% variation for older
        const balance = amt(monthBaseBalance + variation);

        await db.insert(accountHistory).values({
          id: nanoid(),
          account_id: accountId,
          balance,
          notes: null,
          recorded_at: recordedAt,
        });
        historyCount++;
      }
    }
  }

  console.log(`✓ Created ${historyCount} account history entries`);
  return historyCount;
}

/**
 * Seed account update reminders
 */
export async function seedAccountUpdateReminders(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>
): Promise<number> {
  console.log('🔔 Seeding account update reminders...');

  const now = new Date();
  let reminderCount = 0;

  // Create update reminders for investment accounts
  const investmentAccountIds = ['Stock - BBRI', 'Stock - BBCA', 'Stock - AAPL', 'Stock - MSFT']
    .map((name) => accountMap.get(name))
    .filter((id): id is string => !!id);

  for (const accountId of investmentAccountIds) {
    await db.insert(accountUpdateReminders).values({
      id: nanoid(),
      workspace_id: workspaceId,
      account_id: accountId,
      frequency: 'monthly',
      next_reminder: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      created_by_user_id: userId,
    });
    reminderCount++;
  }

  // Create update reminders for loan accounts
  const loanAccountIds = ['Home Mortgage - BSD', 'Car Loan - Innova']
    .map((name) => accountMap.get(name))
    .filter((id): id is string => !!id);

  for (const accountId of loanAccountIds) {
    await db.insert(accountUpdateReminders).values({
      id: nanoid(),
      workspace_id: workspaceId,
      account_id: accountId,
      frequency: 'quarterly',
      next_reminder: new Date(now.getFullYear(), now.getMonth() + 3, 1),
      created_by_user_id: userId,
    });
    reminderCount++;
  }

  console.log(`✓ Created ${reminderCount} account update reminders`);
  return reminderCount;
}

/**
 * Seed account snapshots (monthly balance snapshots)
 */
export async function seedAccountSnapshots(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('📸 Seeding account snapshots...');

  const now = new Date();
  const months = monthsToSeed ?? [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { year: now.getFullYear(), month: now.getMonth() },
    { year: now.getFullYear(), month: now.getMonth() - 1 || 12 },
  ];

  const assetAccountIds = [
    'Cash',
    'BCA Credit Card',
    'Mandiri Credit Card',
    'GoPay',
    'OVO',
    'Transfer',
    'BCA Savings',
    'Chase Checking',
    'DBS Savings',
    'Reksa Dana BCAP',
    'Stock - BBRI',
    'Stock - BBCA',
    'Stock - AAPL',
    'Stock - MSFT',
    'Stock - GOOGL',
    'Stock - AMZN',
    'ORI020',
    'SBN032',
    'SBR010',
    'Corporate Bond - ABC',
    'Corporate Bond - XYZ',
    'Bitcoin',
    'Ethereum',
    'Tether (USDT)',
    'USD Coin (USDC)',
  ]
    .map((name) => accountMap.get(name))
    .filter((id): id is string => !!id);

  let snapshotCount = 0;

  for (const { year, month } of months) {
    const snapshotDate = new Date(year, month - 1, 1, SEED_TIME_HOUR, 0, 0, 0);
    const snapshotId = nanoid();

    await db.insert(accountSnapshots).values({
      id: snapshotId,
      workspace_id: workspaceId,
      snapshot_date: snapshotDate,
      month,
      year,
      created_by_user_id: userId,
    });

    // Get market growth factor (simulated - older months have lower values)
    const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
    const marketFactor = Math.pow(1 + SNAPSHOT_GROWTH_RATE, -monthsAgo);

    for (const accountId of assetAccountIds) {
      // Find account balance
      const accountName = [...accountMap.entries()].find(([, id]) => id === accountId)?.[0];
      const accountConfig = ALL_ACCOUNTS.find((a) => a.name === accountName);
      if (!accountConfig) continue;

      const currentBalance = parseFloat(accountConfig.balance.toString());
      // Apply market factor and add some variation
      const snapshotBalance = currentBalance * marketFactor * (0.95 + Math.random() * 0.1);

      await db.insert(accountSnapshotItems).values({
        id: nanoid(),
        snapshot_id: snapshotId,
        account_id: accountId,
        balance: amt(snapshotBalance),
        currency: accountConfig.currency,
      });
      snapshotCount++;
    }
  }

  console.log(`✓ Created ${months.length} snapshots with ${snapshotCount} items`);
  return snapshotCount;
}
