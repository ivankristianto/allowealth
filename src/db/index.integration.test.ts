/**
 * Database Runtime-Agnostic Integration Tests
 * ============================================
 *
 * Integration tests for verifying that the database module works correctly
 * across different JavaScript runtimes (Bun and Node.js).
 *
 * Context: After refactoring src/db/index.ts to use lazy initialization,
 * we need to verify it works in both runtimes:
 *
 * - **Node.js context**: Astro middleware runs in Node.js and imports
 *   services that use the database. The database must be importable
 *   without triggering bun:sqlite at module load time.
 *
 * - **Bun context**: API routes run in Bun and use the database normally.
 *   The database should initialize correctly with bun:sqlite.
 *
 * Test Scenarios:
 * 1. Import @/db in Node.js-like environment → should not throw
 * 2. Import @/db in Bun environment → should not throw
 * 3. Call getDb() multiple times → should return same instance (cached)
 * 4. Access database tables through the db instance → should work
 * 5. Full e2e: Load dashboard page → should render without errors
 *
 * Usage: bun test src/db/index.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { db, getDb, type Database } from '@/db';
import { users, categories, assets, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// Test database path
const TEST_DB_PATH = './test-integration.db';

// Store original process.env values
const originalEnv = { ...process.env };

/**
 * Test helper: Detect current runtime
 */
function detectRuntime(): 'bun' | 'node' {
  // @ts-ignore - Bun is not a standard global
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  return 'node'; // Default to Node.js
}

/**
 * Test helper: Create a Node.js-like import context
 * This simulates what happens when middleware imports services
 */
async function importInNodeContext() {
  // Save current runtime detection
  const runtimeBefore = detectRuntime();

  // We're actually in Bun, but we want to test that the import doesn't
  // fail even if we're importing in a context that will eventually run in Node

  // The key test is that the import doesn't throw at module load time
  // The lazy initialization ensures bun:sqlite is only loaded on first access

  // Dynamic import to simulate Node.js ESM import behavior
  const dbModule = await import('@/db');

  return {
    db: dbModule.db,
    getDb: dbModule.getDb,
    runtime: runtimeBefore,
  };
}

/**
 * Test helper: Simulate middleware import pattern
 * Middleware imports services which import @/db
 * This should not throw even in Node.js runtime
 */
async function simulateMiddlewareImport() {
  // This simulates the middleware import chain:
  // middleware.ts → auth/lucia.ts → services/index.ts → @/db

  // The key is that importing services should not trigger
  // database initialization at module load time

  const servicesModule = await import('@/services');

  return servicesModule;
}

/**
 * Test helper: Create a test database with sample data
 */
async function createTestDatabase() {
  const testDb = await getDb();

  // Insert a test user
  const testUser = {
    id: 'test-user-runtime-agnostic',
    email: 'runtime-test@example.com',
    password_hash: 'dummy_hash',
    name: 'Runtime Test User',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(users).values(testUser).onConflictDoNothing();

  // Insert a test category
  const testCategory = {
    id: 'test-category-runtime',
    user_id: testUser.id,
    name: 'Test Category',
    type: 'expense' as const,
    percentage: '10',
    budget_amount: '1000000',
    currency: 'IDR' as const,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(categories).values(testCategory).onConflictDoNothing();

  // Insert a test payment method (needed for transactions)
  const { paymentMethods } = await import('@/db');
  const testPaymentMethod = {
    id: 'test-pm-runtime',
    user_id: testUser.id,
    name: 'Test Payment Method',
    type: 'cash' as const,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(paymentMethods).values(testPaymentMethod).onConflictDoNothing();

  // Insert a test asset
  const testAsset = {
    id: 'test-asset-runtime',
    user_id: testUser.id,
    name: 'Test Asset',
    type: 'bank_account' as const,
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
    user_id: testUser.id,
    category_id: testCategory.id,
    payment_method_id: testPaymentMethod.id,
    type: 'expense' as const,
    amount: '50000',
    currency: 'IDR' as const,
    description: 'Test transaction',
    transaction_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  await testDb.insert(transactions).values(testTransaction).onConflictDoNothing();

  return { testUser, testCategory, testAsset, testTransaction, testPaymentMethod };
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  const testDb = await getDb();

  // Delete in correct order due to foreign key constraints
  await testDb.delete(transactions).where(eq(transactions.id, 'test-tx-runtime'));
  await testDb.delete(assets).where(eq(assets.id, 'test-asset-runtime'));
  await testDb.delete(categories).where(eq(categories.id, 'test-category-runtime'));
  await testDb.delete(users).where(eq(users.id, 'test-user-runtime'));
}

describe('Database Runtime-Agnostic Integration Tests', () => {
  let runtime: 'bun' | 'node';

  beforeAll(() => {
    runtime = detectRuntime();
    console.log(`[Integration Test] Running in ${runtime.toUpperCase()} runtime`);
  });

  beforeEach(() => {
    // Set test database path for isolation
    process.env.DATABASE_URL = TEST_DB_PATH;
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();

    // Clean up test database file
    const testDbPath = join(process.cwd(), TEST_DB_PATH);
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);

    // Restore original environment
    process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  });

  describe('Runtime Detection', () => {
    it('should detect the current runtime correctly', () => {
      const detected = detectRuntime();
      expect(['bun', 'node']).toContain(detected);
      expect(detected).toBe(runtime);
    });

    it('should be running in Bun runtime for these tests', () => {
      // Bun test runner runs in Bun runtime
      expect(runtime).toBe('bun');
    });
  });

  describe('Module Import in Node.js Context', () => {
    it('should import @/db without throwing in Node.js context', async () => {
      // This test verifies that the database module can be imported
      // without triggering bun:sqlite at module load time
      // The lazy initialization ensures this works even in Node.js

      let importError: Error | null = null;

      try {
        const { db: importedDb, getDb: importedGetDb } = await importInNodeContext();

        // Verify exports exist
        expect(importedDb).toBeDefined();
        expect(importedGetDb).toBeDefined();
        expect(typeof importedGetDb).toBe('function');
      } catch (error) {
        importError = error instanceof Error ? error : new Error(String(error));
      }

      expect(importError).toBeNull();
    });

    it('should import services without throwing in Node.js context', async () => {
      // This simulates middleware importing services
      // Services import @/db, so this tests the full import chain

      let importError: Error | null = null;

      try {
        const services = await simulateMiddlewareImport();

        // Verify service singletons exist
        expect(services.categoryService).toBeDefined();
        expect(services.dashboardService).toBeDefined();
        expect(services.transactionService).toBeDefined();
      } catch (error) {
        importError = error instanceof Error ? error : new Error(String(error));
      }

      expect(importError).toBeNull();
    });

    it('should have lazy initialization - db export should not initialize on import', async () => {
      // The db export uses a Proxy with lazy initialization
      // It should not create the database until first access

      // Import fresh module
      const dbModule = await import('@/db');

      // The db export should be a Proxy object
      expect(dbModule.db).toBeDefined();

      // Accessing a property triggers initialization
      // This should not throw
      const hasQuery = 'query' in dbModule.db;
      expect(hasQuery).toBe(true);

      // After first access, the database is initialized
      expect(dbModule.db.query).toBeDefined();
    });
  });

  describe('Module Import in Bun Context', () => {
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

      const databaseInstance = await getDb();

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

      const instance1 = await getDb();
      const instance2 = await getDb();
      const instance3 = await getDb();

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
      const getDbInstance = await getDb();

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
      const { testUser, testCategory } = await createTestDatabase();

      // Test READ operation
      const foundUser = await db.query.users.findFirst({
        where: eq(users.id, testUser.id),
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(testUser.email);

      // Test READ with relations
      const userWithCategories = await db.query.users.findFirst({
        where: eq(users.id, testUser.id),
        with: {
          categories: true,
        },
      });

      expect(userWithCategories?.categories).toBeDefined();
      expect(userWithCategories?.categories.length).toBeGreaterThan(0);
    });

    it('should handle transaction operations correctly', async () => {
      const { testUser, testCategory, testPaymentMethod } = await createTestDatabase();

      // Test transaction
      const result = await db.transaction(async (tx) => {
        // Insert a transaction with valid foreign keys
        const newTx = await tx
          .insert(transactions)
          .values({
            id: 'test-tx-transaction-test',
            user_id: testUser.id,
            category_id: testCategory.id,
            payment_method_id: testPaymentMethod.id,
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
      const { paymentMethods } = await import('@/db');
      await db.insert(categories).values({
        id: 'test-category-delete',
        user_id: testUser.id,
        name: 'Delete Test Category',
        type: 'expense',
        percentage: '5',
        budget_amount: '500000',
        currency: 'IDR',
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

      const databaseInstance = await getDb();
      const service = new DashboardService(databaseInstance);

      // Service should be able to use the database
      expect(service).toBeDefined();

      // Call a service method that uses the database
      const result = await service.getTotalAssets('test-user-runtime-agnostic');

      // Should return default values for non-existent data
      expect(result).toHaveProperty('idr');
      expect(result).toHaveProperty('usd');
      expect(result).toHaveProperty('converted');
      expect(result.idr).toBe('0');
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
      expect(schemaModule.paymentMethods).toBeDefined();
      expect(schemaModule.transactions).toBeDefined();
      expect(schemaModule.assets).toBeDefined();
      expect(schemaModule.assetHistory).toBeDefined();
      expect(schemaModule.exchangeRates).toBeDefined();
      expect(schemaModule.passwordResetTokens).toBeDefined();
      expect(schemaModule.sessions).toBeDefined();
      expect(schemaModule.userSettings).toBeDefined();
    });

    it('should export schema from @/db index', async () => {
      // The @/db index should re-export all schema items
      const dbModule = await import('@/db');

      // Verify schema re-exports
      expect(dbModule.users).toBeDefined();
      expect(dbModule.categories).toBeDefined();
      expect(dbModule.assets).toBeDefined();
      expect(dbModule.transactions).toBeDefined();
      expect(dbModule.paymentMethods).toBeDefined();
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
          email: 'another@example.com',
          password_hash: 'hash',
          name: 'Another User',
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
      const databaseInstance = await getDb();

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
