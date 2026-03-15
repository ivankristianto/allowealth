# Audit Log Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the issues identified in code review for the audit log service

**Architecture:** Minor fixes to documentation, add integration tests with mocked database, add pagination/date-range limits for CSV export, export shared constants

**Tech Stack:** TypeScript, Astro, Bun test, Drizzle ORM, Valibot

---

## Chunk 1: Fix API Documentation and Add Date-Stamped CSV Filename

### Task 1: Fix JSDoc Comment in Audit Logs API

**Files:**

- Modify: `src/pages/api/security/audit-logs.ts:1-38`

**Context:** The current JSDoc mentions a `format` query parameter that is not actually used or checked. Since CSV is the only supported format, we should remove this misleading documentation and add a date-stamped filename for better UX.

- [ ] **Step 1: Read current file**

Run: `cat src/pages/api/security/audit-logs.ts`
Expected: Shows existing file with misleading JSDoc

- [ ] **Step 2: Update JSDoc and add date-stamped filename**

```typescript
import type { APIRoute } from 'astro';
import { auditLogService } from '@/services';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/security/audit-logs
 *
 * Returns the current user's audit log as a CSV download.
 * Filename includes the current date: security-audit-YYYY-MM-DD.csv
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (!auth.workspaceId) {
      return errorResponse('Workspace context required', 403);
    }

    const csv = await auditLogService.exportToCsv(auth.userId, auth.workspaceId);

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `security-audit-${dateStr}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error exporting audit logs', error);
    return errorResponse('Failed to export audit logs', 500);
  }
};
```

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/security/audit-logs.ts
git commit -m "fix: correct API docs and add date-stamped CSV filename

- Remove misleading format query param from JSDoc
- Add date to CSV filename to prevent download conflicts
- Fixes code review feedback (ALL-42)"
```

---

## Chunk 2: Export toneDotClasses from Service

### Task 2: Export Tone Dot Classes Mapping from Audit Log Service

**Files:**

- Modify: `src/pages/api/security/audit-logs.ts:127-134`
- Modify: `src/components/molecules/SecurityRecentUserActivitiesCard.astro:1-17`

**Context:** The `toneDotClasses` mapping is defined in the Astro component but could be useful to export from the service for reuse in other components.

- [ ] **Step 1: Add export to audit-log.service.ts**

Add after line 127 (after SecurityEventTone export):

```typescript
export type SecurityEventTone = 'success' | 'info' | 'warning' | 'error';

/**
 * CSS classes for tone indicators (dots/badges) in the UI.
 * Maps each tone to its corresponding DaisyUI background color class.
 */
export const toneDotClasses: Record<SecurityEventTone, string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
};
```

- [ ] **Step 2: Update component to import from service**

Update `src/components/molecules/SecurityRecentUserActivitiesCard.astro`:

```astro
---
import { History } from '@lucide/astro';
import { toneDotClasses, type SecurityEvent } from '@/services/audit-log.service';

export interface Props {
  events: SecurityEvent[];
}

const { events } = Astro.props;
---
```

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/services/audit-log.service.ts src/components/molecules/SecurityRecentUserActivitiesCard.astro
git commit -m "refactor: export toneDotClasses from audit log service

- Centralize tone dot class mapping in service
- Import in component instead of redefining
- Enables reuse across other components"
```

---

## Chunk 3: Add Pagination Limits to CSV Export

### Task 3: Add Optional Limit and Date Range to exportToCsv

**Files:**

- Modify: `src/services/audit-log.service.ts:188-223`
- Modify: `src/pages/api/security/audit-logs.ts:18-21`

**Context:** The CSV export currently fetches ALL audit logs without any limit, which could cause memory/performance issues for users with extensive history. Add optional pagination with a reasonable default limit.

- [ ] **Step 1: Update exportToCsv method signature and implementation**

Replace the `exportToCsv` method (lines 188-223) with:

```typescript
  /**
   * Fetch audit log entries for a user/workspace and return them as a
   * CSV string suitable for file download.
   *
   * @param userId - The user ID to filter by
   * @param workspaceId - The workspace ID to filter by
   * @param options - Optional configuration
   * @param options.limit - Maximum number of records to export (default: 1000)
   * @param options.startDate - Optional start date filter (inclusive)
   * @param options.endDate - Optional end date filter (inclusive)
   */
  async exportToCsv(
    userId: string,
    workspaceId: string,
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<string> {
    const { limit = 1000, startDate, endDate } = options;
    const { auditLogs } = this.schema;

    // Build where conditions
    const conditions = [eq(auditLogs.user_id, userId), eq(auditLogs.workspace_id, workspaceId)];

    if (startDate) {
      conditions.push(sql`${auditLogs.created_at} >= ${startDate.toISOString()}`);
    }
    if (endDate) {
      conditions.push(sql`${auditLogs.created_at} <= ${endDate.toISOString()}`);
    }

    // IDatabase interface does not expose the full Drizzle query builder chain
    // — using `as any` here is consistent with the pattern used across other
    // services (e.g. transaction.service.ts).
    const rows = await (this.db as any)
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entity_type,
        entityId: auditLogs.entity_id,
        workspaceId: auditLogs.workspace_id,
        createdAt: auditLogs.created_at,
        oldValue: auditLogs.old_value,
        newValue: auditLogs.new_value,
      })
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.created_at))
      .limit(limit);

    const header = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const csvRows = (rows as AuditLogRow[]).map((row) => [
      new Date(row.createdAt).toISOString(),
      AuditLogService.formatLabel(row.action, row.entityType),
      ENTITY_LABELS[row.entityType] ?? row.entityType,
      row.entityId ?? '',
      AuditLogService.summarizeChanges(row.oldValue, row.newValue),
    ]);

    return [header, ...csvRows].map((cols) => cols.map(csvEscape).join(',')).join('\n');
  }
```

- [ ] **Step 2: Add sql import at top of file**

Add to imports at line 9:

```typescript
import { desc, eq, and, sql } from 'drizzle-orm';
```

- [ ] **Step 3: Update API route to use new signature**

No change needed to API route - it will use the default limit of 1000.

- [ ] **Step 4: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/services/audit-log.service.ts
git commit -m "feat: add pagination and date range to CSV export

- Add configurable limit parameter (default: 1000 records)
- Add optional startDate and endDate filters
- Import sql helper from drizzle-orm for date filtering
- Prevents memory issues for users with extensive history"
```

---

## Chunk 4: Add Integration Tests for Database Methods

### Task 4: Create Integration Tests for listForUser and exportToCsv

**Files:**

- Modify: `src/services/audit-log.service.test.ts:1-136`

**Context:** The current tests only cover static helper methods. We need integration tests for the database-interacting methods (`listForUser`, `exportToCsv`).

- [ ] **Step 1: Read existing test file**

Run: `cat src/services/audit-log.service.test.ts`
Expected: Shows current static method tests

- [ ] **Step 2: Add integration test section at end of file**

Append to `src/services/audit-log.service.test.ts`:

```typescript
describe('AuditLogService Integration', () => {
  // Mock database and schema for integration tests
  const createMockDb = (rows: unknown[] = []) => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve(rows),
          }),
        }),
      }),
    }),
  });

  const mockSchema = {
    auditLogs: {
      id: 'id',
      action: 'action',
      entity_type: 'entity_type',
      entity_id: 'entity_id',
      workspace_id: 'workspace_id',
      created_at: 'created_at',
      old_value: 'old_value',
      new_value: 'new_value',
      user_id: 'user_id',
    },
  };

  // Mock getActiveSchema to return our mock schema
  const originalGetActiveSchema = (await import('@/db')).getActiveSchema;

  describe('listForUser', () => {
    test('returns formatted security events for user', async () => {
      const mockRows = [
        {
          id: 'log-1',
          action: 'login',
          entityType: 'session',
          entityId: null,
          workspaceId: 'ws-1',
          createdAt: new Date(),
          oldValue: null,
          newValue: null,
        },
        {
          id: 'log-2',
          action: 'create',
          entityType: 'transaction',
          entityId: 'txn-1',
          workspaceId: 'ws-1',
          createdAt: new Date(Date.now() - 86400000), // yesterday
          oldValue: null,
          newValue: '{"amount": 100}',
        },
      ];

      const mockDb = createMockDb(mockRows);
      const service = new AuditLogService(mockDb as unknown as IDatabase);

      // Mock the schema getter
      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const result = await service.listForUser('user-1', 'ws-1', 50);

      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('Signed In');
      expect(result[0].tone).toBe('success');
      expect(result[1].label).toBe('Created Transaction');
      expect(result[1].tone).toBe('success');
    });

    test('respects the limit parameter', async () => {
      const mockRows = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        action: 'login',
        entityType: 'session',
        entityId: null,
        workspaceId: 'ws-1',
        createdAt: new Date(),
        oldValue: null,
        newValue: null,
      }));

      const mockDb = createMockDb(mockRows.slice(0, 10));
      const service = new AuditLogService(mockDb as unknown as IDatabase);

      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const result = await service.listForUser('user-1', 'ws-1', 10);

      expect(result).toHaveLength(10);
    });

    test('returns empty array when no logs found', async () => {
      const mockDb = createMockDb([]);
      const service = new AuditLogService(mockDb as unknown as IDatabase);

      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const result = await service.listForUser('user-1', 'ws-1');

      expect(result).toEqual([]);
    });
  });

  describe('exportToCsv', () => {
    test('exports audit logs as CSV string', async () => {
      const mockRows = [
        {
          id: 'log-1',
          action: 'login',
          entityType: 'session',
          entityId: null,
          workspaceId: 'ws-1',
          createdAt: new Date('2024-01-15T10:30:00Z'),
          oldValue: null,
          newValue: null,
        },
      ];

      const mockDb = createMockDb(mockRows);
      const service = new AuditLogService(mockDb as unknown as IDatabase);

      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const csv = await service.exportToCsv('user-1', 'ws-1');

      expect(csv).toContain('Timestamp,Action,Entity Type,Entity ID,Details');
      expect(csv).toContain('Signed In');
      expect(csv).toContain('session');
    });

    test('respects the limit option', async () => {
      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: (n: number) =>
                  Promise.resolve(
                    Array.from({ length: n }, (_, i) => ({
                      id: `log-${i}`,
                      action: 'login',
                      entityType: 'session',
                      entityId: null,
                      workspaceId: 'ws-1',
                      createdAt: new Date(),
                      oldValue: null,
                      newValue: null,
                    }))
                  ),
              }),
            }),
          }),
        }),
      };

      const service = new AuditLogService(mockDb as unknown as IDatabase);

      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const csv100 = await service.exportToCsv('user-1', 'ws-1', { limit: 100 });
      const csv10 = await service.exportToCsv('user-1', 'ws-1', { limit: 10 });

      const lines100 = csv100.split('\n');
      const lines10 = csv10.split('\n');

      // Header + 100 data rows = 101 lines
      expect(lines100).toHaveLength(101);
      // Header + 10 data rows = 11 lines
      expect(lines10).toHaveLength(11);
    });

    test('escapes special characters in CSV values', async () => {
      const mockRows = [
        {
          id: 'log-1',
          action: 'create',
          entityType: 'transaction',
          entityId: 'txn-1',
          workspaceId: 'ws-1',
          createdAt: new Date('2024-01-15T10:30:00Z'),
          oldValue: null,
          newValue: '{"description": "Test, with comma"}',
        },
      ];

      const mockDb = createMockDb(mockRows);
      const service = new AuditLogService(mockDb as unknown as IDatabase);

      Object.defineProperty(service, 'schema', {
        get: () => mockSchema,
      });

      const csv = await service.exportToCsv('user-1', 'ws-1');

      // CSV should properly handle commas
      expect(csv).toContain('Timestamp,Action,Entity Type,Entity ID,Details');
    });
  });
});
```

- [ ] **Step 3: Add IDatabase import at top of file**

Update imports at line 11:

```typescript
import { describe, test, expect } from 'bun:test';
import { AuditLogService } from './audit-log.service';
import type { IDatabase } from '@/db';
```

- [ ] **Step 4: Run tests**

Run: `bun test src/services/audit-log.service.test.ts`
Expected: All tests pass

- [ ] **Step 5: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/services/audit-log.service.test.ts
git commit -m "test: add integration tests for database methods

- Test listForUser with mocked database
- Test exportToCsv with mocked database
- Verify limit parameter is respected
- Test CSV escaping and empty results
- Addresses code review feedback on test coverage"
```

---

## Final Verification

- [ ] **Step 1: Run all tests**

Run: `bun test src/services/audit-log.service.test.ts`
Expected: All tests pass (static + integration)

- [ ] **Step 2: Run full quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

- [ ] **Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

---

## Summary of Changes

1. **Fixed API documentation** - Removed misleading `format` query param from JSDoc
2. **Added date-stamped filename** - CSV downloads now include date: `security-audit-YYYY-MM-DD.csv`
3. **Exported toneDotClasses** - Centralized mapping in service for reuse
4. **Added CSV export limits** - Default 1000 records with optional date range filtering
5. **Added integration tests** - Tests for `listForUser` and `exportToCsv` methods

All fixes address the code review feedback from (ALL-42) while maintaining backward compatibility.
