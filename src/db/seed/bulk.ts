import { SEEDER_CONFIG } from './config';
/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Bulk Data Seeder for Benchmark/Stress Testing
 *
 * Generates large volumes of transactions for performance testing.
 */

import { db } from '@/db';
import {
  transactions,
  recurringTemplates,
  recurringOccurrences,
  auditLogs,
  users,
  userMeta,
} from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { hashPassword } from '@/lib/auth/password';
import { calculateDueDate, shouldGenerateOccurrence } from '@/lib/utils/recurring-dates';
import { nanoid } from 'nanoid';
import { getTrailingMonths, maxDayForMonth, SEED_TIME_HOUR } from './lib/dates';
import { amt, randomAmount } from './lib/amounts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './data/categories';
import { getPaymentAccounts } from './data/accounts';
import { INCOME_TEMPLATES } from './data/transactions';

export interface BulkSeedOptions {
  transactionCount: number;
  monthsCount: number;
  recurringTemplateCount: number;
}

/**
 * Seed bulk transaction data for performance testing
 */
export async function seedBulkTransactions(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>,
  options: BulkSeedOptions
): Promise<{ transactionCount: number; recurringCount: number; auditCount: number }> {
  console.log(`\n📊 Seeding benchmark data (~${options.transactionCount} transactions)...`);
  const startTime = Date.now();

  // Collect category IDs by type
  const expenseCategoryIds: string[] = [];
  const incomeCategoryIds: string[] = [];
  const categoryNameToId: Map<string, string> = new Map();
  for (const cat of EXPENSE_CATEGORIES) {
    const id = categoryMap.get(cat.name);
    if (id) {
      expenseCategoryIds.push(id);
      categoryNameToId.set(cat.name, id);
    }
  }
  for (const cat of INCOME_CATEGORIES) {
    const id = categoryMap.get(cat.name);
    if (id) {
      incomeCategoryIds.push(id);
      categoryNameToId.set(cat.name, id);
    }
  }
  for (const name of ['Dad Salary', 'Mom Salary', 'Side Business', 'Dividend']) {
    const id = categoryMap.get(name);
    if (id) {
      incomeCategoryIds.push(id);
      categoryNameToId.set(name, id);
    }
  }
  const uniqueIncomeCategoryIds = [...new Set(incomeCategoryIds)];

  // Collect account IDs
  const paymentAccountIds: string[] = [];
  const accountNameToId: Map<string, string> = new Map();
  for (const acct of getPaymentAccounts()) {
    const id = accountMap.get(acct.name);
    if (id) {
      paymentAccountIds.push(id);
      accountNameToId.set(acct.name, id);
    }
  }
  if (paymentAccountIds.length === 0) {
    for (const [name, id] of accountMap.entries()) {
      paymentAccountIds.push(id);
      accountNameToId.set(name, id);
    }
  }

  const largeAmountAccountIds = ['Transfer', 'BCA Credit Card', 'Mandiri Credit Card']
    .map((n) => accountNameToId.get(n))
    .filter((id): id is string => !!id);

  const now = new Date();
  const benchMonths = getTrailingMonths(options.monthsCount);

  // --- Benchmark income transactions ---
  console.log('   Inserting benchmark income transactions...');
  const BATCH_SIZE = 500;
  type TxnRow = {
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    account_id: string;
    to_account_id?: string;
    type: 'expense' | 'income' | 'transfer';
    amount: string;
    currency: string;
    description: string;
    transaction_date: Date;
    created_at: Date;
    updated_at: Date;
  };
  let batch: TxnRow[] = [];
  let totalTxns = 0;
  const allTxnIds: string[] = [];

  async function flushBatch() {
    if (batch.length > 0) {
      await db.insert(transactions).values(batch);
      totalTxns += batch.length;
      batch = [];
    }
  }

  const canQueueMoreTransactions = () => totalTxns + batch.length < options.transactionCount;
  const remainingTransactionSlots = () =>
    Math.max(0, options.transactionCount - (totalTxns + batch.length));

  // Income: cycling through INCOME_TEMPLATES
  for (let mi = 0; mi < benchMonths.length && canQueueMoreTransactions(); mi++) {
    const { year, month } = benchMonths[mi];
    const pattern = INCOME_TEMPLATES[mi % INCOME_TEMPLATES.length];
    const maxDay = maxDayForMonth(year, month);

    for (const tmpl of pattern) {
      if (!canQueueMoreTransactions()) break;
      const day = Math.min(tmpl.day, maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const catId = categoryNameToId.get(tmpl.description) ?? uniqueIncomeCategoryIds[0];
      const accountId =
        tmpl.amount >= 5_000_000
          ? (largeAmountAccountIds[0] ?? paymentAccountIds[0])
          : paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)];
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: accountId,
        type: 'income',
        amount: amt(tmpl.amount * (0.9 + Math.random() * 0.2), SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: tmpl.description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }

    // Additional sporadic income
    const extraIncome = 10 + Math.floor(Math.random() * 5);
    for (let j = 0; j < extraIncome && canQueueMoreTransactions(); j++) {
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const catId =
        uniqueIncomeCategoryIds[Math.floor(Math.random() * uniqueIncomeCategoryIds.length)];
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)],
        type: 'income',
        amount: randomAmount(500_000, 5_000_000, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: ['Freelance payment', 'Bonus', 'Cashback', 'Gift money', 'Refund'][
          Math.floor(Math.random() * 5)
        ],
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();

  // --- Benchmark expense transactions ---
  console.log('   Inserting benchmark expense transactions...');
  const targetExpenseCount = Math.floor(options.transactionCount * 0.75);
  const targetPerMonth = Math.floor(targetExpenseCount / options.monthsCount);

  for (let mi = 0; mi < benchMonths.length && canQueueMoreTransactions(); mi++) {
    const { year, month } = benchMonths[mi];
    const maxDay = maxDayForMonth(year, month);
    const monthCount = Math.min(
      targetPerMonth,
      Math.floor(options.transactionCount * 0.75 - (totalTxns + batch.length)),
      remainingTransactionSlots()
    );
    if (monthCount <= 0) break;

    for (let i = 0; i < monthCount && canQueueMoreTransactions(); i++) {
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const catId = expenseCategoryIds[Math.floor(Math.random() * expenseCategoryIds.length)];
      const accountId = paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)];
      const id = nanoid();
      allTxnIds.push(id);

      const descriptions = [
        'Supermarket',
        'Gasoline',
        'Restaurant',
        'Coffee',
        'Online shopping',
        'Pharmacy',
        'Transport',
        'Entertainment',
        'Utilities',
        'Miscellaneous',
      ];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: accountId,
        type: 'expense',
        amount: randomAmount(25_000, 1_500_000, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();

  // --- Benchmark transfer transactions ---
  console.log('   Inserting benchmark transfer transactions...');
  const transferPairs = [
    { from: 'Transfer', to: 'Cash' },
    { from: 'Transfer', to: 'GoPay' },
    { from: 'Transfer', to: 'OVO' },
    { from: 'Cash', to: 'Transfer' },
  ];

  for (let mi = 0; mi < benchMonths.length && canQueueMoreTransactions(); mi++) {
    const { year, month } = benchMonths[mi];
    const maxDay = maxDayForMonth(year, month);
    const numTransfers = Math.min(3 + Math.floor(Math.random() * 5), remainingTransactionSlots());
    if (numTransfers <= 0) break;

    for (let i = 0; i < numTransfers && canQueueMoreTransactions(); i++) {
      const pair = transferPairs[Math.floor(Math.random() * transferPairs.length)];
      const fromId = accountMap.get(pair.from);
      const toId = accountMap.get(pair.to);
      if (!fromId || !toId) continue;

      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: expenseCategoryIds[0]!,
        account_id: fromId,
        to_account_id: toId,
        type: 'transfer',
        amount: randomAmount(100_000, 2_000_000, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        description: 'Transfer',
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();

  console.log(`   ✓ ${totalTxns} total benchmark transactions`);

  // --- Benchmark audit logs ---
  console.log('   Seeding benchmark audit logs...');
  const auditSampleSize = Math.min(500, allTxnIds.length);
  const auditSample = allTxnIds.slice(0, auditSampleSize);
  const auditBatch: Array<{
    id: string;
    workspace_id: string;
    user_id: string;
    action: 'create' | 'update' | 'delete';
    entity_type: string;
    entity_id: string;
    old_value: string | null;
    new_value: string | null;
    created_at: Date;
  }> = [];
  let auditCount = 0;

  for (const txnId of auditSample) {
    auditBatch.push({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: userId,
      action: 'create',
      entity_type: 'transaction',
      entity_id: txnId,
      old_value: null,
      new_value: JSON.stringify({ id: txnId, seeded: true }),
      created_at: now,
    });
    auditCount++;

    if (Math.random() > 0.7) {
      auditBatch.push({
        id: nanoid(),
        workspace_id: workspaceId,
        user_id: userId,
        action: 'update',
        entity_type: 'transaction',
        entity_id: txnId,
        old_value: JSON.stringify({ amount: '100000' }),
        new_value: JSON.stringify({ amount: '150000' }),
        created_at: new Date(now.getTime() + 1000 * 60 * 60),
      });
      auditCount++;
    }

    if (auditBatch.length >= BATCH_SIZE) {
      await db.insert(auditLogs).values(auditBatch);
      auditBatch.length = 0;
    }
  }

  if (auditBatch.length > 0) {
    await db.insert(auditLogs).values(auditBatch);
  }

  console.log(`   ✓ ${auditCount} audit log entries`);

  // --- Benchmark recurring templates ---
  console.log(`   Inserting ${options.recurringTemplateCount} recurring templates...`);
  const recurringNames = [
    'Rent',
    'Insurance',
    'Subscription',
    'Membership',
    'Loan Payment',
    'Internet',
    'Phone Bill',
    'Gym',
    'Streaming',
    'Cloud Storage',
  ];
  const recurringCategories = ['Utility Bills', 'Insurance', 'Misc. Cost', 'House Expenses'];
  let occurrenceCount = 0;

  for (let t = 0; t < options.recurringTemplateCount; t++) {
    const categoryName = recurringCategories[t % recurringCategories.length];
    const categoryId = categoryMap.get(categoryName);
    const accountId = paymentAccountIds[t % paymentAccountIds.length];
    if (!categoryId) continue;

    const templateId = nanoid();
    const dayOfMonth = 1 + (t % 28);
    const amount = String(100_000 + (t % 50) * 10_000);
    const totalOccurrences = 12;
    const startDate = `2025-01-01`;

    await db.insert(recurringTemplates).values({
      id: templateId,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: `${recurringNames[t % recurringNames.length]} ${t + 1}`,
      type: 'expense',
      amount,
      currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
      category_id: categoryId,
      account_id: accountId,
      day_of_month: dayOfMonth,
      start_date: startDate,
      total_occurrences: totalOccurrences,
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    // Generate occurrences
    const windowStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
      .toISOString()
      .slice(0, 10);
    const windowEndIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0))
      .toISOString()
      .slice(0, 10);

    for (let offset = 0; offset < 24; offset++) {
      const occurrenceNumber = 1 + offset;
      const dueDate = calculateDueDate(startDate, dayOfMonth, offset);

      if (dueDate < windowStartIso) continue;
      if (dueDate > windowEndIso) break;
      if (
        !shouldGenerateOccurrence(
          { total_occurrences: totalOccurrences, end_date: null },
          occurrenceNumber,
          dueDate
        )
      ) {
        break;
      }

      const dueAt = new Date(`${dueDate}T${String(SEED_TIME_HOUR).padStart(2, '0')}:00:00.000Z`);

      await db.insert(recurringOccurrences).values({
        id: nanoid(),
        template_id: templateId,
        workspace_id: workspaceId,
        due_date: dueDate,
        occurrence_number: occurrenceNumber,
        status: 'pending',
        transaction_id: null,
        confirmed_amount: null,
        skip_reason: null,
        confirmed_at: null,
        created_at: dueAt,
        updated_at: dueAt,
      });
      occurrenceCount++;
    }
  }

  console.log(`   ✓ ${options.recurringTemplateCount} templates, ${occurrenceCount} occurrences`);

  // --- Second benchmark user ---
  console.log('   Seeding second benchmark user...');
  const secondUserId = nanoid();
  const secondPasswordHash = await hashPassword('demo123456789');

  await db.insert(users).values({
    id: secondUserId,
    workspace_id: workspaceId,
    email: 'second@example.com',
    password_hash: secondPasswordHash,
    name: 'Second User',
    role: 'member',
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  await db.insert(userMeta).values([
    {
      meta_id: nanoid(),
      user_id: secondUserId,
      meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
    {
      meta_id: nanoid(),
      user_id: secondUserId,
      meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
  ]);

  const remainingTransactions = remainingTransactionSlots();
  const secondUserTransactionCount = Math.min(100, remainingTransactions);

  // Add transactions for second user without exceeding requested transactionCount
  for (let i = 0; i < secondUserTransactionCount; i++) {
    const catId = expenseCategoryIds[i % expenseCategoryIds.length];
    const accountId = paymentAccountIds[i % paymentAccountIds.length];
    const txDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1 + (i % 28),
      SEED_TIME_HOUR,
      0,
      0,
      0
    );

    batch.push({
      id: nanoid(),
      workspace_id: workspaceId,
      created_by_user_id: secondUserId,
      category_id: catId,
      account_id: accountId,
      type: 'expense',
      amount: randomAmount(50_000, 500_000, SEEDER_CONFIG.PRIMARY_CURRENCY),
      currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
      description: `Second user expense ${i + 1}`,
      transaction_date: txDate,
      created_at: txDate,
      updated_at: txDate,
    });
    if (batch.length >= BATCH_SIZE) await flushBatch();
  }
  await flushBatch();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Benchmark data seeded in ${elapsed}s`);

  return {
    transactionCount: totalTxns,
    recurringCount: options.recurringTemplateCount,
    auditCount,
  };
}
