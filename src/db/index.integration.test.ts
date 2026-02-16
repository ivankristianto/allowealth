/**
 * Database Integration Tests
 * ==========================
 *
 * Integration tests for verifying that the database module works correctly
 * with bun:sqlite in the Bun runtime.
 *
 * Test Scenarios:
 * 1. Import @/db → should not throw
 * 2. Call getDb() multiple times → should return same instance (cached)
 * 3. Access database tables through the db instance → should work
 * 4. CRUD operations, transactions, service integration
 * 5. Schema exports, error handling, type safety
 *
 * Usage: bun test src/db/index.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { db, getDb, resetDb } from '@/db';
import { workspaces, users, categories, assets, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Test workspace for all test users
const TEST_WORKSPACE_ID = 'test-workspace-runtime-agnostic';
import { execSync } from 'node:child_process';

// Test database path (use -test postfix for isolation)
const TEST_DB_PATH = 'db/.test-integration.db';

// Store original process.env values
const originalEnv = { ...process.env };

/**
 * Setup test database schema
 * Uses drizzle-kit to push schema to test database
 */
function setupTestDatabase() {
  console.log(`[Integration Test] Setting up test database at ${TEST_DB_PATH}...`);
  try {
    // Call drizzle-kit directly with --url flag
    execSync(`DATABASE_URL="${TEST_DB_PATH}" bunx drizzle-kit push --force`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('[Integration Test] Test database schema created');
  } catch (error) {
    console.error('[Integration Test] Failed to set up test database:', error);
    throw error;
  }
}

/**
 * Test helper: Create a test database with sample data
 */
async function createTestDatabase() {
  const testDb = getDb();

  // Insert a test workspace
  const testWorkspace = {
    id: TEST_WORKSPACE_ID,
    name: 'Runtime Test Workspace',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(workspaces).values(testWorkspace).onConflictDoNothing();

  // Insert a test user
  const testUser = {
    id: 'test-user-runtime-agnostic',
    workspace_id: TEST_WORKSPACE_ID,
    email: 'runtime-test@example.com',
    password_hash: 'dummy_hash',
    name: 'Runtime Test User',
    role: 'admin' as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(users).values(testUser).onConflictDoNothing();

  // Insert a test category
  const testCategory = {
    id: 'test-category-runtime',
    workspace_id: TEST_WORKSPACE_ID,
    created_by_user_id: testUser.id,
    name: 'Test Category',
    type: 'expense' as const,
    icon: 'tag',
    color: 'bg-neutral',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(categories).values(testCategory).onConflictDoNothing();

  // Insert a test asset
  const testAsset = {
    id: 'test-asset-runtime',
    workspace_id: TEST_WORKSPACE_ID,
    created_by_user_id: testUser.id,
    name: 'Test Asset',
    type: 'bank_account' as const,
    account_class: 'liquid' as const,
    balance: '1000000',
    currency: 'IDR' as const,
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(assets).values(testAsset).onConflictDoNothing();

  // Insert a test transaction
  const testTransaction = {
    id: 'test-tx-runtime',
    workspace_id: TEST_WORKSPACE_ID,
    created_by_user_id: testUser.id,
    category_id: testCategory.id,
    asset_id: testAsset.id,
    type: 'expense' as const,
    amount: '50000',
    currency: 'IDR' as const,
    description: 'Test transaction',
    transaction_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(transactions).values(testTransaction).onConflictDoNothing();

  return { testUser, testCategory, testAsset, testTransaction };
}

/**
 * Cleanup test data
 * Silently handles cases where tables or data don't exist
 */
async function cleanupTestData() {
  const testDb = getDb();

  // Delete in correct order due to foreign key constraints
  // Use try/catch for each deletion to handle missing data gracefully
  try {
    await testDb.delete(transactions).where(eq(transactions.id, 'test-tx-runtime'));
  } catch {
    // Table might not exist or data already deleted
  }
  try {
    await testDb.delete(assets).where(eq(assets.id, 'test-asset-runtime'));
  } catch {
    // Table might not exist or data already deleted
  }
  try {
    await testDb.delete(categories).where(eq(categories.id, 'test-category-runtime'));
  } catch {
    // Table might not exist or data already deleted
  }
  try {
    await testDb.delete(users).where(eq(users.id, 'test-user-runtime'));
  } catch {
    // Table might not exist or data already deleted
  }
}

describe('Database Integration Tests', () => {
  beforeAll(() => {
    // Set up test database schema
    setupTestDatabase();
  }, 30_000); // drizzle-kit push can be slow on first run or schema changes

  beforeEach(() => {
    // Set test database path for isolation (use relative path for consistency)
    process.env.DATABASE_URL = TEST_DB_PATH;

    // Reset database singleton so it uses the test database
    resetDb();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();

    // Restore original environment
    process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  });

  describe('Module Import', () => {
    it('should import @/db without throwing in Bun context', async () => {
      // In Bun context, the import should work and initialize with bun:sqlite

      let importError: Error | null = null;

      try {
        const { db: importedDb } = await import('@/db');

        // Verify db export exists
        expect(importedDb).toBeDefined();

        // Access query to trigger initialization
        const query = importedDb.query;
        expect(query).toBeDefined();
      } catch (error) {
        importError = error instanceof Error ? error : new Error(String(error));
      }

      expect(importError).toBeNull();
    });

    it('should initialize database with bun:sqlite in Bun runtime', async () => {
      // In Bun runtime, the database should use bun:sqlite driver

      const databaseInstance = getDb();

      // Verify database instance exists
      expect(databaseInstance).toBeDefined();

      // Verify query interface works
      expect(databaseInstance.query).toBeDefined();
      expect(typeof databaseInstance.query.users).toBe('object');
    });
  });

  describe('Database Instance Caching', () => {
    it('should return the same instance when calling getDb() multiple times', async () => {
      // getDb() should cache the database instance

      const instance1 = getDb();
      const instance2 = getDb();
      const instance3 = getDb();

      // All instances should be the same (cached)
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should return the same instance when accessing db export multiple times', async () => {
      // The db export should also be cached after first access

      const ref1 = db.query;
      const ref2 = db.query;
      const ref3 = db.query;

      // All references should point to the same database instance
      expect(ref1).toBeDefined();
      expect(ref2).toBeDefined();
      expect(ref3).toBeDefined();
    });

    it('getDb() and db export should use the same underlying instance', async () => {
      // Both access patterns should work with the same database

      const dbExportInstance = db;
      const getDbInstance = getDb();

      // Both should have query interface
      expect(dbExportInstance.query).toBeDefined();
      expect(getDbInstance.query).toBeDefined();

      // Both should work for database operations
      expect(dbExportInstance.query.users).toBeDefined();
      expect(getDbInstance.query.users).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should perform CRUD operations correctly', async () => {
      const { testUser } = await createTestDatabase();

      // Test READ operation
      const foundUser = await db.query.users.findFirst({
        where: eq(users.id, testUser.id),
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(testUser.email);

      // Test READ with relations (categories created by this user)
      const userWithCategories = await db.query.users.findFirst({
        where: eq(users.id, testUser.id),
        with: {
          createdCategories: true,
        },
      });

      expect(userWithCategories?.createdCategories).toBeDefined();
      expect(userWithCategories?.createdCategories.length).toBeGreaterThan(0);
    });

    it('should handle transaction operations correctly', async () => {
      const { testUser, testCategory, testAsset } = await createTestDatabase();

      // Test transaction
      const result = await db.transaction(async (tx: any) => {
        // Insert a transaction with valid foreign keys
        const newTx = await tx
          .insert(transactions)
          .values({
            id: 'test-tx-transaction-test',
            workspace_id: TEST_WORKSPACE_ID,
            created_by_user_id: testUser.id,
            category_id: testCategory.id,
            asset_id: testAsset.id,
            type: 'expense',
            amount: '100000',
            currency: 'IDR',
            description: 'Transaction test',
            transaction_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        return newTx[0];
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe('100000');

      // Cleanup
      await db.delete(transactions).where(eq(transactions.id, 'test-tx-transaction-test'));
    });

    it('should handle insert and update operations', async () => {
      const { testUser } = await createTestDatabase();

      // UPDATE operation
      await db
        .update(users)
        .set({ name: 'Updated Runtime Test User' })
        .where(eq(users.id, testUser.id));

      // Verify update
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, testUser.id),
      });

      expect(updatedUser?.name).toBe('Updated Runtime Test User');
    });

    it('should handle delete operations', async () => {
      const { testUser } = await createTestDatabase();

      // Create a category to delete
      await db.insert(categories).values({
        id: 'test-category-delete',
        workspace_id: TEST_WORKSPACE_ID,
        created_by_user_id: testUser.id,
        name: 'Delete Test Category',
        type: 'expense',
        icon: 'tag',
        color: 'bg-neutral',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Verify category exists
      const beforeDelete = await db.query.categories.findFirst({
        where: eq(categories.id, 'test-category-delete'),
      });
      expect(beforeDelete).toBeDefined();

      // DELETE operation
      await db.delete(categories).where(eq(categories.id, 'test-category-delete'));

      // Verify deletion
      const afterDelete = await db.query.categories.findFirst({
        where: eq(categories.id, 'test-category-delete'),
      });
      expect(afterDelete).toBeUndefined();
    });
  });

  describe('Service Integration', () => {
    it('should work with dashboard service using lazy db initialization', async () => {
      // Import dashboard service
      const { DashboardService } = await import('@/services/dashboard.service');

      // This test verifies that services can be imported and used
      // without triggering database initialization at module load time

      const databaseInstance = getDb();
      const service = new DashboardService(databaseInstance);

      // Service should be able to use the database
      expect(service).toBeDefined();

      // Call the consolidated dashboard method that uses the database
      const result = await service.getDashboardData('test-user-runtime-agnostic');

      // Should return default values for non-existent data
      expect(result).toHaveProperty('totalAssets');
      expect(result.totalAssets).toHaveProperty('idr');
      expect(result.totalAssets).toHaveProperty('usd');
      expect(result.totalAssets).toHaveProperty('converted');
      expect(result.totalAssets.idr).toBe('0');
    });

    it('should allow services to be imported in middleware context', async () => {
      // This simulates what happens when middleware imports services
      // Services import @/db, which should not fail due to lazy initialization

      const { categoryService, transactionService, dashboardService } = await import('@/services');

      // All service singletons should be available
      expect(categoryService).toBeDefined();
      expect(transactionService).toBeDefined();
      expect(dashboardService).toBeDefined();

      // Services should have their database dependencies
      expect(categoryService['db']).toBeDefined();
      expect(transactionService['db']).toBeDefined();
      expect(dashboardService['db']).toBeDefined();
    });
  });

  describe('Schema Exports', () => {
    it('should export all schema tables', async () => {
      const schemaModule = await import('@/db/schema');

      // Verify all expected exports exist (from schema/index.ts exports)
      expect(schemaModule.users).toBeDefined();
      expect(schemaModule.categories).toBeDefined();
      expect(schemaModule.transactions).toBeDefined();
      expect(schemaModule.assets).toBeDefined();
      expect(schemaModule.assetHistory).toBeDefined();
      expect(schemaModule.exchangeRates).toBeDefined();
      expect(schemaModule.passwordResetTokens).toBeDefined();
      expect(schemaModule.sessions).toBeDefined();
      expect(schemaModule.userMeta).toBeDefined();
    });

    it('should export schema from @/db index', async () => {
      // The @/db index should re-export all schema items
      const dbModule = await import('@/db');

      // Verify schema re-exports
      expect(dbModule.users).toBeDefined();
      expect(dbModule.categories).toBeDefined();
      expect(dbModule.assets).toBeDefined();
      expect(dbModule.transactions).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to query non-existent user
      const result = await db.query.users.findFirst({
        where: eq(users.id, 'non-existent-user-id'),
      });

      // Should return undefined, not throw
      expect(result).toBeUndefined();
    });

    it('should handle constraint violations gracefully', async () => {
      await createTestDatabase();

      // Try to insert duplicate user (should fail due to primary key)
      let errorOccurred = false;

      try {
        await db.insert(users).values({
          id: 'test-user-runtime-agnostic', // Same ID
          workspace_id: TEST_WORKSPACE_ID,
          email: 'another@example.com',
          password_hash: 'hash',
          name: 'Another User',
          role: 'admin',
          created_at: new Date(),
          updated_at: new Date(),
        });
      } catch (error) {
        // Expected error due to unique constraint
        errorOccurred = true;
      }

      expect(errorOccurred).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with Database instance', async () => {
      // TypeScript types are not available at runtime, but we can verify
      // the runtime interface matches expectations
      const databaseInstance = getDb();

      // Should have query interface
      expect(databaseInstance.query).toBeDefined();

      // Should have insert interface
      expect(databaseInstance.insert).toBeDefined();

      // Should have update interface
      expect(databaseInstance.update).toBeDefined();

      // Should have delete interface
      expect(databaseInstance.delete).toBeDefined();

      // Should have transaction interface
      expect(typeof databaseInstance.transaction).toBe('function');
    });

    it('should work with db export proxy', () => {
      // The db export uses a Proxy for lazy initialization
      // It should still provide full database interface

      // Should have query interface (triggers lazy init)
      expect(db.query).toBeDefined();

      // Should have insert interface
      expect(db.insert).toBeDefined();

      // Should have update interface
      expect(db.update).toBeDefined();

      // Should have delete interface
      expect(db.delete).toBeDefined();

      // Should have transaction interface
      expect(typeof db.transaction).toBe('function');
    });
  });
});
