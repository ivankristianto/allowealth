import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

import { closeDatabase, db, resetDb } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { seedWorkspace } from './domains/workspace';
import { seedUsers } from './domains/users';
import { seedCategories, seedAccountCategories } from './domains/categories';
import { seedAccounts, seedAccountHistory, seedAccountSnapshots } from './domains/accounts';
import { seedIncomeTransactions } from './domains/transactions';
import { getTrailingMonths } from './lib/dates';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalD1Enabled = process.env.D1_ENABLED;

let testDbPath = '';

function deleteSqliteArtifacts(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    const filePath = `${dbPath}${suffix}`;
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

function setupTestDatabase(dbPath: string) {
  const rawDb = new Database(dbPath);
  const drizzleDb = drizzle(rawDb, { schema });
  migrate(drizzleDb, { migrationsFolder: join(process.cwd(), 'drizzle/sqlite') });
  rawDb.close();
}

describe('seed integration', () => {
  beforeEach(async () => {
    testDbPath = join(import.meta.dir, `seed-test-${nanoid(8)}.sqlite`);
    deleteSqliteArtifacts(testDbPath);

    process.env.DATABASE_URL = testDbPath;
    process.env.D1_ENABLED = 'false';

    setupTestDatabase(testDbPath);
    await closeDatabase();
    resetDb();
  });

  afterEach(async () => {
    await closeDatabase();
    resetDb();

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalD1Enabled === undefined) {
      delete process.env.D1_ENABLED;
    } else {
      process.env.D1_ENABLED = originalD1Enabled;
    }

    deleteSqliteArtifacts(testDbPath);
  });

  it('seeds mom-owned salary income and declining debt balances over time', async () => {
    const monthsToSeed = getTrailingMonths(3);

    const workspaceId = await seedWorkspace();
    const { adminUserId, memberUserId } = await seedUsers(workspaceId);
    const categoryMap = await seedCategories(workspaceId, adminUserId);
    const accountCategoryMap = await seedAccountCategories(workspaceId, adminUserId);
    const accountMap = await seedAccounts(
      workspaceId,
      adminUserId,
      memberUserId,
      accountCategoryMap
    );

    await seedIncomeTransactions(
      workspaceId,
      adminUserId,
      memberUserId,
      categoryMap,
      accountMap,
      monthsToSeed
    );
    await seedAccountHistory(accountMap);
    await seedAccountSnapshots(workspaceId, adminUserId, accountMap, monthsToSeed);

    const momSalaryTransactions = await db.query.transactions.findMany({
      where: (transactions, { eq }) =>
        eq(transactions.description, 'Mom Salary - Bright Steps School'),
    });

    expect(momSalaryTransactions.length).toBeGreaterThan(0);
    expect(
      momSalaryTransactions.every((transaction) => transaction.created_by_user_id === memberUserId)
    ).toBe(true);

    const mortgageAccountId = accountMap.get('Home Mortgage - BSD');
    expect(mortgageAccountId).toBeDefined();

    const mortgageHistory = await db.query.accountHistory.findMany({
      where: (accountHistory, { eq }) => eq(accountHistory.account_id, mortgageAccountId!),
      orderBy: (accountHistory, { asc }) => [asc(accountHistory.recorded_at)],
    });

    expect(mortgageHistory.length).toBeGreaterThan(1);
    expect(Number(mortgageHistory[0]!.balance)).toBeGreaterThan(
      Number(mortgageHistory[mortgageHistory.length - 1]!.balance)
    );

    const snapshotRows = await db.query.accountSnapshotItems.findMany({
      where: (accountSnapshotItems, { eq }) =>
        eq(accountSnapshotItems.account_id, mortgageAccountId!),
    });
    const snapshots = await db.query.accountSnapshots.findMany({
      orderBy: (accountSnapshots, { asc }) => [
        asc(accountSnapshots.year),
        asc(accountSnapshots.month),
      ],
    });
    const snapshotDateById = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`,
      ])
    );
    const mortgageSnapshots = snapshotRows
      .map((item) => ({
        snapshotKey: snapshotDateById.get(item.snapshot_id) ?? '',
        balance: Number(item.balance),
      }))
      .filter((item) => item.snapshotKey !== '')
      .sort((left, right) => left.snapshotKey.localeCompare(right.snapshotKey));

    expect(mortgageSnapshots.length).toBe(monthsToSeed.length);
    expect(mortgageSnapshots[0]!.balance).toBeGreaterThan(
      mortgageSnapshots[mortgageSnapshots.length - 1]!.balance
    );
  });
});
