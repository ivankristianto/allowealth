import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { verifyPassword } from 'better-auth/crypto';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { closeDatabase, db, resetDb } from '@/db';
import { seedWorkspace } from './domains/workspace';
import { seedUsers } from './domains/users';
import { seedCategories, seedAccountCategories } from './domains/categories';
import { seedAccounts, seedAccountHistory, seedAccountSnapshots } from './domains/accounts';
import { seedIncomeTransactions } from './domains/transactions';
import { DEMO_ADMIN, DEMO_MEMBER } from './config';
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
  execFileSync('bun', ['run', 'db:setup'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: dbPath,
      D1_ENABLED: 'false',
    },
    stdio: 'ignore',
  });
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

  it('creates Better Auth credential records for seeded demo users', async () => {
    const workspaceId = await seedWorkspace();
    const { adminUserId, memberUserId } = await seedUsers(workspaceId);

    const [adminAuthUser, adminCredentialAccount, memberAuthUser, memberCredentialAccount] =
      await Promise.all([
        db.query.user.findFirst({
          where: (user, { eq }) => eq(user.id, adminUserId),
        }),
        db.query.account.findFirst({
          where: (account, { and, eq }) =>
            and(eq(account.userId, adminUserId), eq(account.providerId, 'credential')),
        }),
        db.query.user.findFirst({
          where: (user, { eq }) => eq(user.id, memberUserId),
        }),
        db.query.account.findFirst({
          where: (account, { and, eq }) =>
            and(eq(account.userId, memberUserId), eq(account.providerId, 'credential')),
        }),
      ]);

    expect(adminAuthUser?.email).toBe(DEMO_ADMIN.email);
    expect(memberAuthUser?.email).toBe(DEMO_MEMBER.email);
    expect(adminCredentialAccount?.accountId).toBe(adminUserId);
    expect(memberCredentialAccount?.accountId).toBe(memberUserId);
    expect(
      await verifyPassword({
        password: DEMO_ADMIN.password,
        hash: adminCredentialAccount?.password ?? '',
      })
    ).toBe(true);
    expect(
      await verifyPassword({
        password: DEMO_MEMBER.password,
        hash: memberCredentialAccount?.password ?? '',
      })
    ).toBe(true);
  });
});
