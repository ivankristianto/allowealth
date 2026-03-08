import { SEEDER_CONFIG } from '../config';
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
import { daysAgo, getTrailingMonths, SEED_TIME_HOUR } from '../lib/dates';
import { amt } from '../lib/amounts';
import { SNAPSHOT_GROWTH_RATE } from '../config';
import { getPaymentAccounts, getLoanAccounts, getAccountTypes } from '../data/accounts';

// Accounts created by the mom user
const MEMBER_OWNED_ACCOUNTS = new Set([
  'GoPay',
  'OVO',
  'Mandiri Credit Card',
  'Kids Education Fund',
  'Fixed Deposit - BCA',
  'Car Loan - Innova',
]);

// Combined list of all accounts for lookup
const getAllAccounts = () => [...getPaymentAccounts(), ...getLoanAccounts(), ...getAccountTypes()];

function calculateHistoricalBalance(
  accountConfig: ReturnType<typeof getAllAccounts>[number],
  monthsAgo: number,
  variationRatio: number
): number {
  const currentBalance = parseFloat(accountConfig.balance.toString());
  const isDebtAccount = deriveAccountClass(accountConfig.type) === 'debt';

  if (isDebtAccount) {
    const debtFactor = 1 + monthsAgo * 0.04;
    return currentBalance * debtFactor * variationRatio;
  }

  const assetFactor = Math.max(0.7, 1 - monthsAgo * 0.03);
  return currentBalance * assetFactor * variationRatio;
}

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
  for (const account of getPaymentAccounts()) {
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
      balance: amt(account.balance, account.currency, (account as any).baseScale || 'primary'),
      initial_balance: amt(
        account.balance,
        account.currency,
        (account as any).baseScale || 'primary'
      ),
      currency: account.currency,
      is_cash_account: account.is_cash_account,
      credit_limit:
        'credit_limit' in account
          ? amt(account.credit_limit, account.currency, (account as any).baseScale || 'primary')
          : null,
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Then, seed investment accounts
  for (const account of getAccountTypes()) {
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
      balance: amt(account.balance, account.currency, (account as any).baseScale || 'primary'),
      initial_balance: amt(
        account.balance,
        account.currency,
        (account as any).baseScale || 'primary'
      ),
      currency: account.currency,
      is_cash_account: false, // Investment accounts are not cash accounts
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Seed loan accounts (debt class)
  for (const loan of getLoanAccounts()) {
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
      balance: amt(loan.balance, loan.currency, (loan as any).baseScale || 'primary'),
      initial_balance: amt(loan.balance, loan.currency, (loan as any).baseScale || 'primary'),
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
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
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
  console.log(`✓ Created ${accountMap.size} accounts (${memberCount} owned by mom)`);
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
    const accountConfig = getAllAccounts().find((a) => a.name === accountName);
    if (!accountConfig) continue;

    // Generate entries for each of the past 6 months
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);

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

          const variationRatio = 0.98 + Math.random() * 0.04;
          const balance = amt(
            calculateHistoricalBalance(accountConfig, monthsAgo, variationRatio),
            accountConfig.currency,
            (accountConfig as any).baseScale || 'primary'
          );

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

        const variationRatio = 0.97 + Math.random() * 0.06;
        const balance = amt(
          calculateHistoricalBalance(accountConfig, monthsAgo, variationRatio),
          accountConfig.currency,
          (accountConfig as any).baseScale || 'primary'
        );

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

  // Create update reminders for savings and investment accounts
  const investmentAccountIds = [
    'Emergency Savings',
    'Kids Education Fund',
    'Fixed Deposit - BCA',
    'Bond Ladder',
    'Dividend Portfolio',
    'Retirement Mutual Fund',
    'USD Travel Fund',
  ]
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
  const months = monthsToSeed ?? getTrailingMonths(3);

  const snapshotAccountIds = getAllAccounts()
    .map((account) => account.name)
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
    for (const accountId of snapshotAccountIds) {
      // Find account balance
      const accountName = [...accountMap.entries()].find(([, id]) => id === accountId)?.[0];
      const accountConfig = getAllAccounts().find((a) => a.name === accountName);
      if (!accountConfig) continue;

      const isDebtAccount = deriveAccountClass(accountConfig.type) === 'debt';
      const trajectoryFactor = isDebtAccount
        ? 1 + monthsAgo * SNAPSHOT_GROWTH_RATE
        : Math.pow(1 + SNAPSHOT_GROWTH_RATE, -monthsAgo);
      const variationRatio = isDebtAccount
        ? 0.99 + Math.random() * 0.02
        : 0.95 + Math.random() * 0.1;
      const snapshotBalance =
        parseFloat(accountConfig.balance.toString()) * trajectoryFactor * variationRatio;

      await db.insert(accountSnapshotItems).values({
        id: nanoid(),
        snapshot_id: snapshotId,
        account_id: accountId,
        balance: amt(
          snapshotBalance,
          accountConfig.currency,
          (accountConfig as any).baseScale || 'primary'
        ),
        currency: accountConfig.currency,
      });
      snapshotCount++;
    }
  }

  console.log(`✓ Created ${months.length} snapshots with ${snapshotCount} items`);
  return snapshotCount;
}
