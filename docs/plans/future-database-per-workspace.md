# Database-per-Workspace Architecture (Future)

**Status:** Planning / Future Feature
**Date:** 2026-02-01
**Current Architecture:** Shared tables with `workspace_id` filtering
**Target Architecture:** Optional dedicated database per workspace

## Overview

This document outlines the path to support dedicated databases per workspace while maintaining backward compatibility with the shared-database architecture.

## Why Database-per-Workspace?

### Benefits

1. **Complete Physical Isolation**
   - Workspace data stored in separate database files
   - Impossible for one workspace to accidentally access another's data
   - Meets compliance requirements for data segregation

2. **Easy Export/Import**

   ```bash
   # Export entire workspace
   cp workspace_abc123.db export/

   # Import workspace
   cp export/workspace_abc123.db data/
   ```

3. **Easy Workspace Deletion**

   ```bash
   # Delete all workspace data (no orphaned records)
   rm workspace_abc123.db
   ```

4. **Performance Isolation**
   - Heavy queries in one workspace don't slow down others
   - Each workspace can have dedicated resources

5. **Selective Backup/Restore**

   ```bash
   # Backup specific workspace
   sqlite3 workspace_abc123.db ".backup backup_$(date +%Y%m%d).db"

   # Restore without affecting other workspaces
   cp backup_20260201.db workspace_abc123.db
   ```

6. **Tiered Architecture (Future Monetization)**
   - Free tier: Shared database
   - Premium tier: Dedicated database
   - Enterprise tier: Dedicated server + database

## Current Architecture (MVP)

```
Single Database (data/expenses.db)
├── workspaces
├── users
├── transactions (workspace_id column)
├── assets (workspace_id column)
├── budgets (workspace_id column)
└── ... (all tables have workspace_id)

Services query with workspace_id filtering:
WHERE workspace_id = 'abc123'
```

**Pros:**

- ✅ Simple to implement and maintain
- ✅ Easy schema migrations (one migration for all workspaces)
- ✅ Works well for few workspaces with high data volume
- ✅ All Drizzle ORM features work out of the box

**Cons:**

- ❌ All workspace data in one file
- ❌ Cannot selectively export/backup workspace
- ❌ Harder to achieve complete data isolation

## Target Architecture

```
Database Pool
├── default.db (shared database)
│   ├── workspaces (metadata for ALL workspaces)
│   ├── users (users from all workspaces)
│   ├── workspace_databases (mapping table: workspace_id → db_path)
│   └── transactions/assets/budgets (for workspaces on shared DB)
│
├── workspace_abc123.db (dedicated database)
│   ├── workspace_local (single workspace metadata)
│   ├── users (only users from this workspace)
│   └── transactions/assets/budgets (only this workspace's data)
│
└── workspace_xyz789.db (dedicated database)
    └── ... (same structure)
```

### Key Design Principles

1. **Hybrid Model**: Support both shared and dedicated databases
2. **Transparent to Services**: Service layer doesn't need to know which DB it's using
3. **Gradual Migration**: Move workspaces one at a time from shared → dedicated
4. **Backward Compatible**: Existing workspaces continue working on shared DB
5. **Zero Downtime**: Migrate workspaces without app restart

## Database Schema Changes

### New Table: `workspace_databases` (in default.db only)

```typescript
// src/db/schema/sqlite/workspace-databases.ts
export const workspaceDatabases = sqliteTable('workspace_databases', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  database_path: text('database_path').notNull(), // e.g., "workspace_abc123.db"
  database_type: text('database_type', { enum: ['sqlite', 'postgresql'] }).notNull(),
  connection_string: text('connection_string'), // For PostgreSQL
  tier: text('tier', { enum: ['free', 'premium', 'enterprise'] })
    .default('premium')
    .notNull(),
  migrated_at: integer('migrated_at', { mode: 'timestamp' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

### Dedicated Database Schema

Each `workspace_*.db` file contains:

- Same schema as shared DB
- But only data for that single workspace
- No `workspace_databases` table (only in default.db)

## Implementation Architecture

### 1. Database Connection Manager

```typescript
// src/lib/db/connection-manager.ts

interface WorkspaceDatabaseConfig {
  workspaceId: string;
  databasePath?: string;
  type: 'sqlite' | 'postgresql';
  connectionString?: string;
}

class DatabaseConnectionManager {
  private connections: Map<string, Database> = new Map();
  private defaultDb: Database;

  constructor() {
    this.defaultDb = this.createConnection('data/expenses.db');
  }

  /**
   * Get database connection for a workspace
   * Returns dedicated DB if exists, otherwise shared DB
   */
  async getWorkspaceDb(workspaceId: string): Promise<Database> {
    // Check cache
    if (this.connections.has(workspaceId)) {
      return this.connections.get(workspaceId)!;
    }

    // Check if workspace has dedicated DB
    const config = await this.getWorkspaceDatabaseConfig(workspaceId);

    if (config) {
      // Workspace has dedicated database
      const db = this.createConnection(config.databasePath);
      this.connections.set(workspaceId, db);
      return db;
    }

    // Use shared database
    return this.defaultDb;
  }

  private async getWorkspaceDatabaseConfig(
    workspaceId: string
  ): Promise<WorkspaceDatabaseConfig | null> {
    const result = await this.defaultDb.query.workspaceDatabases.findFirst({
      where: eq(workspaceDatabases.workspace_id, workspaceId),
    });

    if (!result) return null;

    return {
      workspaceId,
      databasePath: result.database_path,
      type: result.database_type,
      connectionString: result.connection_string,
    };
  }

  private createConnection(path: string): Database {
    // SQLite connection
    const sqlite = new Database(path);
    return drizzle(sqlite, { schema });
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  closeAll(): void {
    this.connections.forEach((db) => db.close());
    this.defaultDb.close();
  }
}

export const dbManager = new DatabaseConnectionManager();
```

### 2. Service Layer Changes

**Current (Shared DB only):**

```typescript
// src/services/transaction.service.ts
class TransactionService {
  async findByWorkspace(workspaceId: string) {
    return db.query.transactions.findMany({
      where: eq(transactions.workspace_id, workspaceId),
    });
  }
}
```

**Future (Hybrid - Shared or Dedicated DB):**

```typescript
// src/services/transaction.service.ts
import { dbManager } from '@/lib/db/connection-manager';

class TransactionService {
  async findByWorkspace(workspaceId: string) {
    const db = await dbManager.getWorkspaceDb(workspaceId); // <-- Only change!

    return db.query.transactions.findMany({
      where: eq(transactions.workspace_id, workspaceId), // Still filtered for safety
    });
  }
}
```

**Key Insight:** Service methods already accept `workspaceId`, so changes are minimal!

### 3. Workspace Migration Strategy

```typescript
// src/services/workspace-migration.service.ts

class WorkspaceMigrationService {
  /**
   * Migrate workspace from shared DB to dedicated DB
   * Steps:
   * 1. Create new database file
   * 2. Run schema migrations on new DB
   * 3. Copy workspace data from shared DB to dedicated DB
   * 4. Update workspace_databases table
   * 5. Verify data integrity
   * 6. Delete data from shared DB (optional - can keep for backup)
   */
  async migrateToDedicatedDatabase(workspaceId: string): Promise<void> {
    const dbPath = `data/workspace_${workspaceId}.db`;

    // 1. Create new database file
    const dedicatedDb = this.createWorkspaceDatabase(dbPath);

    // 2. Run schema migrations
    await this.runMigrations(dedicatedDb);

    // 3. Copy data
    await this.copyWorkspaceData(workspaceId, this.defaultDb, dedicatedDb);

    // 4. Register dedicated database
    await this.defaultDb.insert(workspaceDatabases).values({
      id: generateId(),
      workspace_id: workspaceId,
      database_path: dbPath,
      database_type: 'sqlite',
      tier: 'premium',
      migrated_at: new Date(),
    });

    // 5. Verify integrity
    const verified = await this.verifyDataIntegrity(workspaceId, dedicatedDb);
    if (!verified) {
      throw new Error('Data verification failed');
    }

    // 6. Optionally delete from shared DB (DANGEROUS - keep backup!)
    // await this.deleteWorkspaceDataFromSharedDb(workspaceId);
  }

  private async copyWorkspaceData(
    workspaceId: string,
    fromDb: Database,
    toDb: Database
  ): Promise<void> {
    // Copy workspace metadata
    const workspace = await fromDb.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    await toDb.insert(workspaces).values(workspace);

    // Copy workspace_meta
    const meta = await fromDb.query.workspaceMeta.findMany({
      where: eq(workspaceMeta.workspace_id, workspaceId),
    });
    if (meta.length > 0) {
      await toDb.insert(workspaceMeta).values(meta);
    }

    // Copy users
    const users = await fromDb.query.users.findMany({
      where: eq(users.workspace_id, workspaceId),
    });
    if (users.length > 0) {
      await toDb.insert(users).values(users);
    }

    // Copy transactions (batched for large datasets)
    await this.copyTableData(fromDb, toDb, transactions, workspaceId);

    // Copy assets
    await this.copyTableData(fromDb, toDb, assets, workspaceId);

    // Copy budgets
    await this.copyTableData(fromDb, toDb, budgets, workspaceId);

    // ... copy other tables
  }

  private async copyTableData(
    fromDb: Database,
    toDb: Database,
    table: any,
    workspaceId: string,
    batchSize = 1000
  ): Promise<void> {
    let offset = 0;

    while (true) {
      const rows = await fromDb.query[table.tableName].findMany({
        where: eq(table.workspace_id, workspaceId),
        limit: batchSize,
        offset,
      });

      if (rows.length === 0) break;

      await toDb.insert(table).values(rows);
      offset += batchSize;
    }
  }
}
```

## CLI Tools

### Create Dedicated Database for Workspace

```bash
bun run cli:migrate-workspace --workspace-id=abc123 --tier=premium
```

```typescript
// src/cli/migrate-workspace.ts
const workspaceId = parseArgs().workspaceId;
const migrationService = new WorkspaceMigrationService();

await migrationService.migrateToDedicatedDatabase(workspaceId);
console.log(`✅ Workspace ${workspaceId} migrated to dedicated database`);
```

### List Workspace Databases

```bash
bun run cli:list-workspace-dbs
```

```
Workspace Databases:
┌──────────────┬─────────────────────────┬──────────┬──────────────┐
│ Workspace ID │ Database Path           │ Type     │ Tier         │
├──────────────┼─────────────────────────┼──────────┼──────────────┤
│ abc123       │ workspace_abc123.db     │ sqlite   │ premium      │
│ xyz789       │ workspace_xyz789.db     │ sqlite   │ enterprise   │
│ (others)     │ (shared database)       │ sqlite   │ free         │
└──────────────┴─────────────────────────┴──────────┴──────────────┘
```

### Export Workspace Database

```bash
bun run cli:export-workspace --workspace-id=abc123 --output=exports/
```

```typescript
// src/cli/export-workspace.ts
const workspaceId = parseArgs().workspaceId;
const config = await dbManager.getWorkspaceDatabaseConfig(workspaceId);

if (config) {
  // Workspace has dedicated DB - just copy the file
  await fs.copyFile(config.databasePath, `exports/workspace_${workspaceId}.db`);
} else {
  // Workspace on shared DB - export data to new DB file
  await exportWorkspaceFromSharedDb(workspaceId, `exports/workspace_${workspaceId}.db`);
}
```

## Migration Checklist

When implementing database-per-workspace:

### Phase 1: Foundation (Estimated: 1-2 days)

- [ ] Create `workspace_databases` table
- [ ] Implement `DatabaseConnectionManager`
- [ ] Add tests for connection pooling
- [ ] Update service base class to use `dbManager.getWorkspaceDb()`

### Phase 2: Migration Service (Estimated: 2-3 days)

- [ ] Implement `WorkspaceMigrationService`
- [ ] Add data copying logic with batching
- [ ] Add data integrity verification
- [ ] Add rollback mechanism (if migration fails)
- [ ] Test migration with production-size datasets

### Phase 3: CLI Tools (Estimated: 1 day)

- [ ] `cli:migrate-workspace` - Move workspace to dedicated DB
- [ ] `cli:list-workspace-dbs` - Show DB allocation
- [ ] `cli:export-workspace` - Export workspace data
- [ ] `cli:import-workspace` - Import workspace data
- [ ] `cli:rollback-migration` - Move workspace back to shared DB

### Phase 4: Service Layer Updates (Estimated: 2-3 days)

- [ ] Update all services to use `dbManager.getWorkspaceDb(workspaceId)`
- [ ] Update tests to support both shared and dedicated DBs
- [ ] Add integration tests for hybrid architecture
- [ ] Performance testing (ensure no regression)

### Phase 5: Admin UI (Optional, Estimated: 2-3 days)

- [ ] Workspace tier management (free/premium/enterprise)
- [ ] Migration status tracking
- [ ] Database health monitoring
- [ ] Export/import UI

## Performance Considerations

### Connection Pooling

```typescript
// Limit number of open connections
class DatabaseConnectionManager {
  private maxConnections = 10;
  private lruCache = new LRUCache<string, Database>(this.maxConnections);

  async getWorkspaceDb(workspaceId: string): Promise<Database> {
    // Check LRU cache
    if (this.lruCache.has(workspaceId)) {
      return this.lruCache.get(workspaceId)!;
    }

    // If cache full, close least recently used connection
    if (this.lruCache.size >= this.maxConnections) {
      const [oldestKey, oldestDb] = this.lruCache.oldest()!;
      oldestDb.close();
      this.lruCache.delete(oldestKey);
    }

    // Create new connection
    const db = await this.createWorkspaceConnection(workspaceId);
    this.lruCache.set(workspaceId, db);
    return db;
  }
}
```

### Query Performance

- Keep `workspace_id` filtering even in dedicated DBs (defense in depth)
- Add indexes on `workspace_id` columns (already needed for shared DB)
- Monitor query performance per workspace
- Alert on slow queries

## Security Considerations

### Access Control

```typescript
// Ensure user can only access their workspace's DB
async function validateWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user?.workspace_id === workspaceId;
}

// In service methods:
async getTransactions(userId: string, workspaceId: string) {
  // Validate access BEFORE getting DB connection
  if (!await validateWorkspaceAccess(userId, workspaceId)) {
    throw new Error('Access denied');
  }

  const db = await dbManager.getWorkspaceDb(workspaceId);
  // ... query
}
```

### Database File Permissions

```bash
# Ensure workspace DBs are not world-readable
chmod 600 data/workspace_*.db
```

## Backup Strategy

### Shared Database Backup

```bash
# Backup everything (current approach)
sqlite3 data/expenses.db ".backup data/backup_$(date +%Y%m%d).db"
```

### Per-Workspace Backup

```bash
# Backup specific workspace
sqlite3 data/workspace_abc123.db ".backup backups/workspace_abc123_$(date +%Y%m%d).db"

# Automated backup script
for db in data/workspace_*.db; do
  workspace_id=$(basename "$db" .db | cut -d_ -f2)
  sqlite3 "$db" ".backup backups/${workspace_id}_$(date +%Y%m%d).db"
done
```

### Backup Retention

- Daily backups: Keep last 7 days
- Weekly backups: Keep last 4 weeks
- Monthly backups: Keep last 12 months

## Cost-Benefit Analysis

### When to Use Dedicated Database

✅ **Good candidates for dedicated DB:**

- Premium/Enterprise customers
- Workspaces with >100k transactions
- Workspaces with strict compliance requirements
- Workspaces with frequent export/backup needs

❌ **Keep on shared DB:**

- Free tier users
- Small workspaces (<10k transactions)
- Trial accounts
- Inactive workspaces

### Resource Usage

```
Shared DB approach:
- 1 database file
- 1 connection pool
- Simple schema migrations

Dedicated DB approach (50 workspaces):
- 51 database files (1 default + 50 dedicated)
- Need connection pooling (limit open connections)
- 50x schema migrations (when schema changes)
```

## Future Enhancements

### PostgreSQL Support

```typescript
// Support both SQLite and PostgreSQL
const config = await dbManager.getWorkspaceDatabaseConfig(workspaceId);

if (config.type === 'postgresql') {
  return drizzle(
    new Pool({
      connectionString: config.connectionString,
    })
  );
} else {
  return drizzle(new Database(config.databasePath));
}
```

### Multi-Region Support

```
Region-based database allocation:
- us-east-1: workspace_us_abc123.db
- eu-west-1: workspace_eu_xyz789.db
- ap-south-1: workspace_ap_def456.db
```

### Auto-Tiering

```typescript
// Automatically migrate workspace to dedicated DB when threshold reached
if (transactionCount > 50_000) {
  await migrationService.migrateToDedicatedDatabase(workspaceId);
  await notifyAdmin(`Workspace ${workspaceId} auto-migrated to dedicated DB`);
}
```

## Summary

**Current MVP Architecture:**

- ✅ Shared database with `workspace_id` filtering
- ✅ Simple, works well for few workspaces
- ✅ Easy schema migrations
- ✅ All Drizzle ORM features work

**Future Database-per-Workspace:**

- ✅ Complete physical isolation
- ✅ Easy export/import/backup per workspace
- ✅ Tiered architecture (free/premium/enterprise)
- ✅ Minimal service layer changes (just DB connection)
- ✅ Gradual migration (hybrid model)
- ✅ Zero downtime

**Key Insight:**
The current shared-table architecture is the PERFECT foundation for database-per-workspace. The service layer already accepts `workspaceId`, so transitioning only requires changing where the DB connection comes from.

**Estimated Implementation Time:** 1-2 weeks full-time

**Priority:** Implement when:

1. You have >20 workspaces with high data volume
2. Users request dedicated database (compliance/isolation)
3. You launch tiered pricing (premium = dedicated DB)
4. You need per-workspace export/import tooling
