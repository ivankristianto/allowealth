# Super Admin User Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add platform-wide user management to the super admin area — list all users with workspace association, view user details, deactivate/reactivate users, and change user roles.

**Architecture:** Extend the existing `SuperAdminService` with user-focused query methods, add API routes under `/api/admin/users/`, create two new pages (`/admin/users` list + `/admin/users/[id]` detail), and an `AdminUserTable` organism following the established workspace table pattern.

**Tech Stack:** Astro 5 pages, DaisyUI v5 + Card/StatCard atoms, Drizzle ORM (dual SQLite/PostgreSQL), existing audit log infrastructure, CSRF protection.

**Design Doc:** `docs/plans/2026-02-14-super-admin-user-management-design.md`

---

## Task 1: Add User Management Methods to SuperAdminService

**Files:**

- Modify: `src/services/super-admin.service.ts`

**Step 1: Add interfaces for user management**

Add these interfaces after the existing `PlatformOverview` interface (~line 53) in `src/services/super-admin.service.ts`:

```typescript
export interface UserWithWorkspace {
  id: string;
  name: string;
  email: string;
  role: string;
  workspaceId: string | null;
  workspaceName: string | null;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface UserDetailed extends UserWithWorkspace {
  avatarUrl: string | null;
  updatedAt: Date;
}

export interface ListUsersParams {
  search?: string;
  role?: 'admin' | 'member' | 'super_admin';
  status?: 'active' | 'deactivated';
  workspaceId?: string;
  sortBy?: 'name' | 'email' | 'created_at' | 'role';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

**Step 2: Add `listAllUsers` method**

Add this method to the `SuperAdminService` class, after the `deleteWorkspace` method:

```typescript
/**
 * List all users across workspaces with filtering, search, and pagination
 *
 * Uses LEFT JOIN on workspaces to include workspace name.
 * Supports filtering by role, status (active/deactivated), and workspace.
 */
async listAllUsers(
  params: ListUsersParams = {}
): Promise<{ users: UserWithWorkspace[]; total: number }> {
  const schema = this.schema;
  const {
    search,
    role,
    status,
    workspaceId,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
  } = params;

  // Build filter conditions
  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${like(schema.users.name, `%${search}%`)} OR ${like(schema.users.email, `%${search}%`)})`
    );
  }
  if (role) {
    conditions.push(eq(schema.users.role, role));
  }
  if (status === 'active') {
    conditions.push(isNull(schema.users.deleted_at));
  } else if (status === 'deactivated') {
    conditions.push(sql`${schema.users.deleted_at} IS NOT NULL`);
  }
  if (workspaceId) {
    conditions.push(eq(schema.users.workspace_id, workspaceId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countQuery = (this.db as any)
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);
  const [countResult] = whereClause ? await countQuery.where(whereClause) : await countQuery;
  const total = countResult?.count ?? 0;

  if (total === 0) {
    return { users: [], total: 0 };
  }

  // Build sort clause
  const sortColumnMap: Record<string, any> = {
    name: schema.users.name,
    email: schema.users.email,
    created_at: schema.users.created_at,
    role: schema.users.role,
  };
  const sortColumn = sortColumnMap[sortBy] ?? schema.users.created_at;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  // Get users with LEFT JOIN on workspaces for workspace name
  let usersQuery = (this.db as any)
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      workspace_id: schema.users.workspace_id,
      workspace_name: schema.workspaces.name,
      email_verified_at: schema.users.email_verified_at,
      deleted_at: schema.users.deleted_at,
      created_at: schema.users.created_at,
    })
    .from(schema.users)
    .leftJoin(schema.workspaces, eq(schema.users.workspace_id, schema.workspaces.id));

  if (whereClause) {
    usersQuery = usersQuery.where(whereClause);
  }

  const userRows = await usersQuery
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  const users: UserWithWorkspace[] = userRows.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    workspaceId: u.workspace_id,
    workspaceName: u.workspace_name,
    emailVerifiedAt: u.email_verified_at,
    deletedAt: u.deleted_at,
    createdAt: u.created_at,
  }));

  return { users, total };
}
```

**Step 3: Add `getUserDetails` method**

```typescript
/**
 * Get detailed user information including workspace
 *
 * @param userId - User ID to retrieve
 * @throws {SuperAdminServiceError} If user not found
 */
async getUserDetails(userId: string): Promise<UserDetailed> {
  const schema = this.schema;

  const rows = await (this.db as any)
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      avatar_url: schema.users.avatar_url,
      workspace_id: schema.users.workspace_id,
      workspace_name: schema.workspaces.name,
      email_verified_at: schema.users.email_verified_at,
      deleted_at: schema.users.deleted_at,
      created_at: schema.users.created_at,
      updated_at: schema.users.updated_at,
    })
    .from(schema.users)
    .leftJoin(schema.workspaces, eq(schema.users.workspace_id, schema.workspaces.id))
    .where(eq(schema.users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.USER_NOT_FOUND,
      'User not found',
      404
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url,
    workspaceId: user.workspace_id,
    workspaceName: user.workspace_name,
    emailVerifiedAt: user.email_verified_at,
    deletedAt: user.deleted_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}
```

**Step 4: Add `deactivateUser` method**

```typescript
/**
 * Deactivate (soft-delete) a user
 *
 * Sets deleted_at to now. Cannot deactivate super_admin users.
 *
 * @param userId - User ID to deactivate
 * @throws {SuperAdminServiceError} If user not found or is super_admin
 */
async deactivateUser(userId: string): Promise<void> {
  const schema = this.schema;

  const user = await this.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.USER_NOT_FOUND,
      'User not found',
      404
    );
  }

  if (user.role === 'super_admin') {
    throw new SuperAdminServiceError(
      ServiceErrorCode.FORBIDDEN,
      'Cannot deactivate super admin users',
      403
    );
  }

  await this.db
    .update(schema.users)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(eq(schema.users.id, userId));
}
```

**Step 5: Add `reactivateUser` method**

```typescript
/**
 * Reactivate a deactivated user
 *
 * Clears deleted_at. Only works on deactivated users.
 *
 * @param userId - User ID to reactivate
 * @throws {SuperAdminServiceError} If user not found or not deactivated
 */
async reactivateUser(userId: string): Promise<void> {
  const schema = this.schema;

  const user = await this.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.USER_NOT_FOUND,
      'User not found',
      404
    );
  }

  if (!user.deleted_at) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.VALIDATION_ERROR,
      'User is not deactivated',
      400
    );
  }

  await this.db
    .update(schema.users)
    .set({ deleted_at: null, updated_at: new Date() })
    .where(eq(schema.users.id, userId));
}
```

**Step 6: Add `changeUserRole` method**

```typescript
/**
 * Change a user's role
 *
 * Only allows changing between 'admin' and 'member'.
 * Super_admin promotion is CLI-only for safety.
 *
 * @param userId - User ID to update
 * @param newRole - New role ('admin' or 'member')
 * @throws {SuperAdminServiceError} If user not found, is super_admin, or invalid role
 */
async changeUserRole(userId: string, newRole: 'admin' | 'member'): Promise<void> {
  const schema = this.schema;

  if (!['admin', 'member'].includes(newRole)) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.VALIDATION_ERROR,
      'Role must be admin or member',
      400
    );
  }

  const user = await this.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    throw new SuperAdminServiceError(
      ServiceErrorCode.USER_NOT_FOUND,
      'User not found',
      404
    );
  }

  if (user.role === 'super_admin') {
    throw new SuperAdminServiceError(
      ServiceErrorCode.FORBIDDEN,
      'Cannot change super admin role via UI',
      403
    );
  }

  await this.db
    .update(schema.users)
    .set({ role: newRole, updated_at: new Date() })
    .where(eq(schema.users.id, userId));
}
```

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 8: Commit**

```bash
git add src/services/super-admin.service.ts
git commit -m "feat(admin): add user management methods to SuperAdminService"
```

---

## Task 2: Add Audit Action Types for User Management

**Files:**

- Modify: `src/lib/audit-log.ts`

**Step 1: Add new audit action types**

In `src/lib/audit-log.ts`, add these to the `AuditAction` type union (~line 15):

```typescript
| 'admin_deactivate'
| 'admin_reactivate'
| 'admin_role_change'
```

**Step 2: Commit**

```bash
git add src/lib/audit-log.ts
git commit -m "feat(audit): add admin user management audit actions"
```

---

## Task 3: Create User Management API Routes

**Files:**

- Create: `src/pages/api/admin/users/[id]/deactivate.ts`
- Create: `src/pages/api/admin/users/[id]/reactivate.ts`
- Create: `src/pages/api/admin/users/[id]/role.ts`

**Step 1: Create deactivate endpoint**

Create `src/pages/api/admin/users/[id]/deactivate.ts`:

```typescript
import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/users/:id/deactivate
 *
 * Soft-deletes a user by setting deleted_at.
 * Super admin only. Logs an audit event.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const userId = context.params.id;
    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    // Get user details before deactivation for audit log
    const user = await superAdminService.getUserDetails(userId);

    await superAdminService.deactivateUser(userId);

    await logAuditEvent({
      workspaceId: user.workspaceId || 'system',
      userId: auth.userId,
      action: 'admin_deactivate',
      entityType: 'user',
      entityId: userId,
      oldValue: { name: user.name, email: user.email },
    });

    return successResponse({ message: 'User deactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deactivating user', error);
    return errorResponse('Failed to deactivate user', 500);
  }
};
```

**Step 2: Create reactivate endpoint**

Create `src/pages/api/admin/users/[id]/reactivate.ts`:

```typescript
import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/users/:id/reactivate
 *
 * Restores a deactivated user by clearing deleted_at.
 * Super admin only. Logs an audit event.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const userId = context.params.id;
    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    const user = await superAdminService.getUserDetails(userId);

    await superAdminService.reactivateUser(userId);

    await logAuditEvent({
      workspaceId: user.workspaceId || 'system',
      userId: auth.userId,
      action: 'admin_reactivate',
      entityType: 'user',
      entityId: userId,
      newValue: { name: user.name, email: user.email },
    });

    return successResponse({ message: 'User reactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reactivating user', error);
    return errorResponse('Failed to reactivate user', 500);
  }
};
```

**Step 3: Create role change endpoint**

Create `src/pages/api/admin/users/[id]/role.ts`:

```typescript
import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * PATCH /api/admin/users/:id/role
 *
 * Changes a user's role between 'admin' and 'member'.
 * Super admin only. Logs an audit event.
 *
 * Request body: { role: 'admin' | 'member' }
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const userId = context.params.id;
    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    let body: { role?: string };
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const newRole = body?.role;
    if (!newRole || !['admin', 'member'].includes(newRole)) {
      return errorResponse('Role must be "admin" or "member"', 400);
    }

    // Get user details before change for audit log
    const user = await superAdminService.getUserDetails(userId);

    await superAdminService.changeUserRole(userId, newRole as 'admin' | 'member');

    await logAuditEvent({
      workspaceId: user.workspaceId || 'system',
      userId: auth.userId,
      action: 'admin_role_change',
      entityType: 'user',
      entityId: userId,
      oldValue: { role: user.role },
      newValue: { role: newRole },
    });

    return successResponse({ message: `User role changed to ${newRole}` });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error changing user role', error);
    return errorResponse('Failed to change user role', 500);
  }
};
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/pages/api/admin/users/
git commit -m "feat(api): add admin user management endpoints (deactivate, reactivate, role)"
```

---

## Task 4: Create AdminUserTable Component

**Files:**

- Create: `src/components/organisms/AdminUserTable.astro`

**Step 1: Create the component**

Create `src/components/organisms/AdminUserTable.astro`:

```html
---
/**
 * Admin User Table
 *
 * Displays user list in a table with name, email, role, workspace, status, and creation date.
 * Each row links to the user details page.
 * Uses the Card atom component for design system consistency.
 */
import Card from '@/components/atoms/Card.astro';
import type { UserWithWorkspace } from '@/services/super-admin.service';
import { Users } from '@lucide/astro';

interface Props {
  users: UserWithWorkspace[];
}

const { users } = Astro.props;
---

<Card padding="sm">
  <div class="overflow-x-auto">
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Workspace</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {
          users.length === 0 ? (
            <tr>
              <td colspan="6" class="text-center py-8 text-base-content/60">
                <Users size={32} class="stroke-current mx-auto mb-2 opacity-50" aria-hidden="true" />
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr class="hover cursor-pointer" data-href={`/admin/users/${user.id}`}>
                <td class="font-semibold">{user.name}</td>
                <td class="text-base-content/70">{user.email}</td>
                <td>
                  <span
                    class={`badge badge-sm ${
                      user.role === 'super_admin'
                        ? 'badge-error'
                        : user.role === 'admin'
                          ? 'badge-accent'
                          : 'badge-ghost'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.workspaceName ? (
                    <a
                      href={`/admin/workspaces/${user.workspaceId}`}
                      class="link link-hover text-sm"
                      onclick="event.stopPropagation()"
                    >
                      {user.workspaceName}
                    </a>
                  ) : (
                    <span class="text-base-content/40">—</span>
                  )}
                </td>
                <td>
                  {user.deletedAt ? (
                    <span class="badge badge-sm badge-warning">deactivated</span>
                  ) : (
                    <span class="badge badge-sm badge-success">active</span>
                  )}
                </td>
                <td class="text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )
        }
      </tbody>
    </table>
  </div>
</Card>

<script>
  function initUserTable() {
    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('tr[data-href]'));
    for (const row of rows) {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'link');
      const href = row.dataset.href;
      if (href) {
        row.setAttribute('aria-label', 'View user details');
      }

      row.addEventListener('click', () => {
        if (href) window.location.href = href;
      });

      row.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && href) {
          e.preventDefault();
          window.location.href = href;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserTable);
  } else {
    initUserTable();
  }
  document.addEventListener('astro:page-load', initUserTable);
</script>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/organisms/AdminUserTable.astro
git commit -m "feat(admin): add AdminUserTable component"
```

---

## Task 5: Create User List Page

**Files:**

- Create: `src/pages/admin/users/index.astro`

**Step 1: Create the page**

Create `src/pages/admin/users/index.astro`:

```html
---
/**
 * User List Page
 *
 * Lists all users across workspaces with search, role/status/workspace filtering, and pagination.
 * Super admin only.
 */
import AdminLayout from '@/layouts/AdminLayout.astro';
import Card from '@/components/atoms/Card.astro';
import AdminUserTable from '@/components/organisms/AdminUserTable.astro';
import { superAdminService } from '@/services';
import { Search } from '@lucide/astro';

// Parse query params for server-side filtering
const url = Astro.url;
const search = url.searchParams.get('search') || '';
const role = (url.searchParams.get('role') as 'admin' | 'member' | 'super_admin') || undefined;
const status = (url.searchParams.get('status') as 'active' | 'deactivated') || undefined;
const workspaceId = url.searchParams.get('workspaceId') || undefined;
const sortBy =
  (url.searchParams.get('sortBy') as 'name' | 'email' | 'created_at' | 'role') || 'created_at';
const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
const page = parseInt(url.searchParams.get('page') || '1', 10);
const limit = 20;
const offset = (page - 1) * limit;

// Fetch users and workspaces for filter dropdown in parallel
const [result, workspaceResult] = await Promise.all([
  superAdminService.listAllUsers({
    search: search || undefined,
    role,
    status,
    workspaceId,
    sortBy,
    sortOrder,
    limit,
    offset,
  }),
  superAdminService.listAllWorkspaces({ limit: 200 }),
]);

const totalPages = Math.ceil(result.total / limit);

// Build query string for pagination links
function buildQueryString(pageNum: number): string {
  const params = new URLSearchParams();
  params.set('page', String(pageNum));
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (workspaceId) params.set('workspaceId', workspaceId);
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  return `/admin/users?${params.toString()}`;
}
---

<AdminLayout title="Users" currentPath="/admin/users" subtitle="All Users">
  <div class="max-w-7xl mx-auto space-y-6" data-testid="admin-users">
    <!-- Search and filters -->
    <section aria-label="Search and filters">
      <Card compact padding="sm">
        <form method="GET" class="flex flex-col sm:flex-row gap-3">
          <label class="input input-bordered flex items-center gap-2 flex-1">
            <Search size={16} class="stroke-current opacity-50" aria-hidden="true" />
            <input
              type="text"
              name="search"
              value={search}
              placeholder="Search by name or email..."
              class="grow"
            />
          </label>
          <select name="role" class="select select-bordered">
            <option value="">All Roles</option>
            <option value="admin" selected={role === 'admin'}>Admin</option>
            <option value="member" selected={role === 'member'}>Member</option>
            <option value="super_admin" selected={role === 'super_admin'}>Super Admin</option>
          </select>
          <select name="status" class="select select-bordered">
            <option value="">All Status</option>
            <option value="active" selected={status === 'active'}>Active</option>
            <option value="deactivated" selected={status === 'deactivated'}>Deactivated</option>
          </select>
          <select name="workspaceId" class="select select-bordered">
            <option value="">All Workspaces</option>
            {workspaceResult.workspaces.map((ws) => (
              <option value={ws.id} selected={workspaceId === ws.id}>{ws.name}</option>
            ))}
          </select>
          <button type="submit" class="btn btn-accent">Search</button>
        </form>
      </Card>
    </section>

    <!-- Results count -->
    <p class="text-sm text-base-content/60">{result.total} user(s) found</p>

    <!-- Table -->
    <section aria-label="User list">
      <AdminUserTable users={result.users} />
    </section>

    <!-- Pagination -->
    {
      totalPages > 1 && (
        <nav aria-label="Pagination">
          <div class="join flex justify-center">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <a
                href={buildQueryString(p)}
                class:list={['join-item btn btn-sm', { 'btn-active': p === page }]}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </a>
            ))}
          </div>
        </nav>
      )
    }
  </div>
</AdminLayout>
```

**Step 2: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: 0 errors, build succeeds

**Step 3: Commit**

```bash
git add src/pages/admin/users/index.astro
git commit -m "feat(admin): add user list page with search, filters, and pagination"
```

---

## Task 6: Create User Detail Page

**Files:**

- Create: `src/pages/admin/users/[id].astro`

**Step 1: Create the page**

Create `src/pages/admin/users/[id].astro`:

```html
---
/**
 * User Details Page
 *
 * Shows detailed user information with workspace association.
 * Provides deactivate/reactivate and role change actions for super admins.
 */
import AdminLayout from '@/layouts/AdminLayout.astro';
import Card from '@/components/atoms/Card.astro';
import { superAdminService } from '@/services';
import type { UserDetailed } from '@/services/super-admin.service';
import { SuperAdminServiceError } from '@/services/service-errors';
import { TriangleAlert, Mail, Calendar, Shield, Building2, CheckCircle, XCircle } from '@lucide/astro';

const userId = Astro.params.id;
if (!userId) return Astro.redirect('/admin/users');

let user: UserDetailed;
try {
  user = await superAdminService.getUserDetails(userId);
} catch (error) {
  if (error instanceof SuperAdminServiceError && error.statusCode === 404) {
    return Astro.redirect('/admin/users');
  }
  throw error;
}

const isDeactivated = !!user.deletedAt;
const isSuperAdmin = user.role === 'super_admin';
---

<AdminLayout title={user.name} currentPath="/admin/users" subtitle="User Details">
  <div class="max-w-7xl mx-auto space-y-6" data-testid="admin-user-details">
    <!-- Breadcrumb -->
    <nav aria-label="Breadcrumb">
      <div class="breadcrumbs text-sm">
        <ul>
          <li><a href="/admin">Admin</a></li>
          <li><a href="/admin/users">Users</a></li>
          <li>{user.name}</li>
        </ul>
      </div>
    </nav>

    <!-- Header with actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        {user.avatarUrl ? (
          <div class="avatar">
            <div class="w-12 rounded-full">
              <img src={user.avatarUrl} alt={`${user.name} avatar`} />
            </div>
          </div>
        ) : (
          <div class="avatar placeholder">
            <div class="bg-base-300 text-base-content w-12 rounded-full">
              <span class="text-lg">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        )}
        <div>
          <h2 class="text-2xl font-bold">{user.name}</h2>
          <div class="flex items-center gap-2 mt-1">
            <span
              class={`badge ${
                user.role === 'super_admin'
                  ? 'badge-error'
                  : user.role === 'admin'
                    ? 'badge-accent'
                    : 'badge-ghost'
              }`}
            >
              {user.role}
            </span>
            {isDeactivated && <span class="badge badge-warning">deactivated</span>}
          </div>
        </div>
      </div>
      {!isSuperAdmin && (
        <div class="flex gap-2">
          {isDeactivated ? (
            <button
              class="btn btn-success btn-sm"
              data-reactivate-btn
              data-user-id={user.id}
            >
              Reactivate
            </button>
          ) : (
            <button
              class="btn btn-warning btn-sm"
              data-deactivate-btn
              data-user-id={user.id}
              data-user-name={user.name}
            >
              Deactivate
            </button>
          )}
        </div>
      )}
    </div>

    <!-- User Info -->
    <section aria-label="User information">
      <Card padding="md">
        <h3 class="text-lg font-bold mb-4">User Information</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <Mail size={16} class="text-base-content/40" aria-hidden="true" />
            <div>
              <p class="text-xs text-base-content/40 uppercase font-bold">Email</p>
              <p>{user.email}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Building2 size={16} class="text-base-content/40" aria-hidden="true" />
            <div>
              <p class="text-xs text-base-content/40 uppercase font-bold">Workspace</p>
              {user.workspaceName ? (
                <a href={`/admin/workspaces/${user.workspaceId}`} class="link link-hover">
                  {user.workspaceName}
                </a>
              ) : (
                <p class="text-base-content/40">No workspace</p>
              )}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Calendar size={16} class="text-base-content/40" aria-hidden="true" />
            <div>
              <p class="text-xs text-base-content/40 uppercase font-bold">Joined</p>
              <p>{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            {user.emailVerifiedAt ? (
              <CheckCircle size={16} class="text-success" aria-hidden="true" />
            ) : (
              <XCircle size={16} class="text-warning" aria-hidden="true" />
            )}
            <div>
              <p class="text-xs text-base-content/40 uppercase font-bold">Email Verified</p>
              <p>{user.emailVerifiedAt ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </Card>
    </section>

    <!-- Role Management (only for non-super_admin users) -->
    {!isSuperAdmin && (
      <section aria-label="Role management">
        <Card padding="md">
          <h3 class="text-lg font-bold mb-4">Role Management</h3>
          <div class="flex items-center gap-4">
            <Shield size={16} class="text-base-content/40" aria-hidden="true" />
            <select
              class="select select-bordered select-sm"
              data-role-select
              data-user-id={user.id}
            >
              <option value="admin" selected={user.role === 'admin'}>Admin</option>
              <option value="member" selected={user.role === 'member'}>Member</option>
            </select>
            <button class="btn btn-accent btn-sm" data-save-role-btn disabled>
              Save Role
            </button>
          </div>
        </Card>
      </section>
    )}
  </div>

  <!-- Deactivate Confirmation Modal -->
  <dialog id="deactivate-user-modal" class="modal" data-deactivate-modal>
    <div class="modal-box max-w-md">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
          <TriangleAlert size={20} class="text-warning" aria-hidden="true" />
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-lg">Deactivate User</h3>
          <p class="py-2 text-base-content/70">
            This will soft-delete the user. They will no longer be able to log in.
            You can reactivate them later.
          </p>
        </div>
      </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost">Cancel</button>
        </form>
        <button class="btn btn-warning" data-confirm-deactivate>Deactivate</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</AdminLayout>

<script>
  import { addToast } from '@/lib/stores/toastStore';
  import { getCsrfHeaders } from '@/lib/csrf-client';

  function initUserDetails() {
    // Deactivate button handler
    const deactivateBtn = document.querySelector('[data-deactivate-btn]') as HTMLButtonElement | null;
    const deactivateModal = document.getElementById('deactivate-user-modal') as HTMLDialogElement | null;
    const confirmDeactivateBtn = deactivateModal?.querySelector('[data-confirm-deactivate]') as HTMLButtonElement | null;

    if (deactivateBtn && deactivateModal && confirmDeactivateBtn) {
      const userId = deactivateBtn.dataset.userId || '';

      deactivateBtn.addEventListener('click', () => {
        deactivateModal.showModal();
      });

      confirmDeactivateBtn.addEventListener('click', async () => {
        confirmDeactivateBtn.classList.add('loading');
        try {
          const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
            method: 'POST',
            credentials: 'include',
            headers: getCsrfHeaders(),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to deactivate user');
          }
          addToast('User deactivated successfully', 'success');
          window.location.reload();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to deactivate user';
          addToast(message, 'error');
          deactivateModal.close();
        } finally {
          confirmDeactivateBtn.classList.remove('loading');
        }
      });
    }

    // Reactivate button handler
    const reactivateBtn = document.querySelector('[data-reactivate-btn]') as HTMLButtonElement | null;
    if (reactivateBtn) {
      reactivateBtn.addEventListener('click', async () => {
        const userId = reactivateBtn.dataset.userId;
        if (!userId) return;

        reactivateBtn.classList.add('loading');
        try {
          const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
            method: 'POST',
            credentials: 'include',
            headers: getCsrfHeaders(),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to reactivate user');
          }
          addToast('User reactivated successfully', 'success');
          window.location.reload();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to reactivate user';
          addToast(message, 'error');
        } finally {
          reactivateBtn.classList.remove('loading');
        }
      });
    }

    // Role change handler
    const roleSelect = document.querySelector('[data-role-select]') as HTMLSelectElement | null;
    const saveRoleBtn = document.querySelector('[data-save-role-btn]') as HTMLButtonElement | null;

    if (roleSelect && saveRoleBtn) {
      const userId = roleSelect.dataset.userId || '';
      const originalRole = roleSelect.value;

      roleSelect.addEventListener('change', () => {
        saveRoleBtn.disabled = roleSelect.value === originalRole;
      });

      saveRoleBtn.addEventListener('click', async () => {
        saveRoleBtn.classList.add('loading');
        try {
          const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...getCsrfHeaders(),
            },
            body: JSON.stringify({ role: roleSelect.value }),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to change role');
          }
          addToast('User role updated successfully', 'success');
          window.location.reload();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to change role';
          addToast(message, 'error');
        } finally {
          saveRoleBtn.classList.remove('loading');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserDetails);
  } else {
    initUserDetails();
  }
  document.addEventListener('astro:page-load', initUserDetails);
</script>
```

**Step 2: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: 0 errors, build succeeds

**Step 3: Commit**

```bash
git add src/pages/admin/users/[id].astro
git commit -m "feat(admin): add user detail page with deactivate/reactivate and role management"
```

---

## Task 7: Update Admin Dashboard with Users Link

**Files:**

- Modify: `src/pages/admin/index.astro`

**Step 1: Add Users quick action link**

In `src/pages/admin/index.astro`, add a "View Users" button to the Quick Actions section, after the existing links. Add `Users as UsersIcon` to the Lucide import:

```typescript
import { Building2, Users as UsersIcon, Activity, ClipboardList } from '@lucide/astro';
```

Add this link after the "View Audit Logs" link inside the quick actions flex container:

```html
<a href="/admin/users" class="btn btn-outline btn-sm">
  <UsersIcon size="{16}" aria-hidden="true" /> View Users
</a>
```

**Step 2: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/admin/index.astro
git commit -m "feat(admin): add users link to dashboard quick actions"
```

---

## Task 8: Quality Gates and Verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Expected: All pass with 0 errors.

**Step 2: Run tests**

```bash
bun run test
```

Expected: All existing tests pass (no regressions).

**Step 3: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```

(Skip if no changes.)
