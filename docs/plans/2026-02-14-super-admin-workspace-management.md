# Super Admin Workspace Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a super admin area to view and manage all workspaces across the platform with cross-workspace visibility, analytics, and administrative actions.

**Architecture:** Add `super_admin` role to users (with nullable `workspace_id`), create a dedicated service layer for cross-workspace queries, build admin pages under `/admin/*` with a separate layout that doesn't require workspace context, and protect all admin routes with `requireSuperAdmin()` middleware checks.

**Tech Stack:** Astro 5 pages, DaisyUI v5 components, Drizzle ORM (dual SQLite/PostgreSQL), existing audit log infrastructure, Zod validation.

**GitHub Issue:** #155

---

## Task 1: Extend User Schema — Add `super_admin` Role

**Files:**

- Modify: `src/db/schema/sqlite/users.ts`
- Modify: `src/db/schema/postgresql/users.ts`
- Modify: `src/lib/auth/lucia.ts:219` (UserRole type)
- Modify: `src/lib/tenant/context.ts:1` (TenantRole type)
- Modify: `src/lib/api-utils.ts:170` (AuthenticatedUser type)
- Modify: `src/env.d.ts` (if needed)

**Step 1: Update SQLite user schema**

In `src/db/schema/sqlite/users.ts`, change the role enum and make workspace_id nullable:

```typescript
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash'),
    avatar_url: text('avatar_url'),
    name: text('name').notNull(),
    role: text('role', { enum: ['admin', 'member', 'super_admin'] }).notNull(),
    email_verified_at: integer('email_verified_at', { mode: 'timestamp' }),
    deleted_at: integer('deleted_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [index('users_workspace_id_idx').on(table.workspace_id)]
);
```

Key changes:

- Remove `.notNull()` from `workspace_id` (super admins have null workspace_id)
- Add `'super_admin'` to role enum

**Step 2: Update PostgreSQL user schema**

In `src/db/schema/postgresql/users.ts`, make the same changes:

- Remove `.notNull()` from `workspace_id`
- Add `'super_admin'` to role enum

**Step 3: Update UserRole type**

In `src/lib/auth/lucia.ts:219`:

```typescript
export type UserRole = 'admin' | 'member' | 'super_admin';
```

In `src/lib/auth/lucia.ts:224-232` (User type):

```typescript
export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string | null; // null for super_admin
  role: UserRole;
  avatarUrl: string | null;
  deletedAt: Date | null;
};
```

**Step 4: Update TenantRole type**

In `src/lib/tenant/context.ts:1`:

```typescript
export type TenantRole = 'admin' | 'member' | 'super_admin';
```

Make `workspaceId` optional in `TenantContext` and `requireTenantContext`:

```typescript
export interface TenantContext {
  userId: string;
  workspaceId: string | null;
  role: TenantRole;
}

export function requireTenantContext(input: TenantContextInput): TenantContext {
  const userId = input.userId?.trim() ?? '';
  if (!userId) {
    throw new Error('Invalid tenant context: userId is required');
  }

  // Super admins don't need workspaceId
  if (input.role === 'super_admin') {
    return { userId, workspaceId: null, role: 'super_admin' };
  }

  const workspaceId = input.workspaceId?.trim() ?? '';
  if (!workspaceId) {
    throw new Error('Invalid tenant context: workspaceId is required');
  }

  return { userId, workspaceId, role: input.role ?? 'member' };
}
```

**Step 5: Update AuthenticatedUser type**

In `src/lib/api-utils.ts:167-171`:

```typescript
export interface AuthenticatedUser {
  userId: string;
  workspaceId: string | null;
  role: 'admin' | 'member' | 'super_admin';
}
```

Update `getAuthenticatedUser` to allow null workspaceId for super admins:

```typescript
export function getAuthenticatedUser(context: APIContext): AuthenticatedUser {
  const user = context.locals.user;

  if (!user?.id) {
    throw new Error('Unauthorized');
  }

  // Super admins don't have workspace context
  if (user.role === 'super_admin') {
    return { userId: user.id, workspaceId: null, role: 'super_admin' };
  }

  if (!user.workspaceId) {
    throw new Error('Unauthorized');
  }

  return requireTenantContext({
    userId: user.id,
    workspaceId: user.workspaceId,
    role: user.role,
  });
}
```

**Step 6: Update MemberList component role type**

In `src/components/organisms/MemberList.astro:19`, update the Member interface:

```typescript
role: 'admin' | 'member' | 'super_admin';
```

**Step 7: Generate database migrations**

Run:

```bash
bun run db:generate          # SQLite migration
bun run db:generate:prod     # PostgreSQL migration
bun run db:migrate           # Apply SQLite migration locally
```

**Step 8: Fix type errors**

Run `bun run typecheck` and fix any type errors caused by the nullable `workspaceId`.

Key areas that may need updates:

- Any code doing `user.workspaceId` without null check
- Middleware auth code
- Route guard - add `/admin` to protected prefixes

**Step 9: Commit**

```bash
git add src/db/schema/sqlite/users.ts src/db/schema/postgresql/users.ts \
  src/lib/auth/lucia.ts src/lib/tenant/context.ts src/lib/api-utils.ts \
  src/components/organisms/MemberList.astro \
  drizzle/
git commit -m "feat(schema): add super_admin role and nullable workspace_id for cross-workspace access"
```

---

## Task 2: Add Route Guard and Auth Middleware for Admin Routes

**Files:**

- Modify: `src/middleware/route-guard.ts`
- Modify: `src/lib/auth/requireAuth.ts`

**Step 1: Add `/admin` to protected prefixes**

In `src/middleware/route-guard.ts`, add `/admin` to `PROTECTED_PREFIXES`:

```typescript
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/transactions',
  '/budget',
  '/assets',
  '/reports',
  '/forecast',
  '/calculators',
  '/settings',
  '/profile',
  '/security',
] as const;
```

**Step 2: Add super admin role check in route guard**

Add super admin check to route guard middleware. After the auth check, add:

```typescript
// Redirect non-super-admin users away from admin routes
const isAdminRoute = pathname.startsWith('/admin');
if (isAdminRoute && context.locals.user && context.locals.user.role !== 'super_admin') {
  return new Response(JSON.stringify({ error: 'Super admin access required' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Step 3: Add `requireSuperAdmin()` function**

In `src/lib/auth/requireAuth.ts`, add:

```typescript
/**
 * Require super admin role for a route
 *
 * Checks if the user is authenticated and has super_admin role.
 * If not authenticated, redirects to the login page.
 * If authenticated but not super admin, returns a 403 Forbidden response.
 */
export function requireSuperAdmin(astro: any): AuthCheckResult {
  // First check if user is authenticated
  const authResult = requireAuth(astro);
  if (authResult) return authResult;

  // Check if user has super_admin role
  if (astro.locals?.user?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Super admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}
```

**Step 4: Run typecheck**

```bash
bun run typecheck
```

**Step 5: Commit**

```bash
git add src/middleware/route-guard.ts src/lib/auth/requireAuth.ts
git commit -m "feat(auth): add requireSuperAdmin middleware and admin route protection"
```

---

## Task 3: Create Super Admin Service

**Files:**

- Create: `src/services/super-admin.service.ts`
- Modify: `src/services/service-errors.ts` (add SuperAdminServiceError)
- Modify: `src/services/index.ts` (register singleton)

**Step 1: Add error class**

In `src/services/service-errors.ts`, add:

```typescript
export class SuperAdminServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'SuperAdminServiceError';
  }
}
```

**Step 2: Create super-admin.service.ts**

Create `src/services/super-admin.service.ts` with these methods:

```typescript
import { type IDatabase, getActiveSchema } from '@/db';
import { eq, sql, desc, like, and, isNull, count } from 'drizzle-orm';
import { SuperAdminServiceError, ServiceErrorCode } from './service-errors';

export interface WorkspaceStats {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  memberCount: number;
  transactionCount: number;
  assetCount: number;
  budgetCount: number;
  categoryCount: number;
}

export interface WorkspaceStatsDetailed extends WorkspaceStats {
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }>;
  settings: Record<string, string>;
}

export interface ListWorkspacesParams {
  search?: string;
  status?: string;
  sortBy?: 'name' | 'created_at' | 'member_count';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlatformOverview {
  totalWorkspaces: number;
  totalUsers: number;
  activeWorkspaces: number;
}

export class SuperAdminService {
  private get schema() {
    return getActiveSchema();
  }

  constructor(private db: IDatabase) {}

  async getPlatformOverview(): Promise<PlatformOverview> {
    // Aggregate counts using SQL
    // totalWorkspaces, totalUsers (non-deleted, non-super_admin), activeWorkspaces
  }

  async listAllWorkspaces(params: ListWorkspacesParams = {}): Promise<{
    workspaces: WorkspaceStats[];
    total: number;
  }> {
    // Query all workspaces with aggregated counts via JOINs
    // Support search, status filter, sorting, pagination
  }

  async getWorkspaceDetails(workspaceId: string): Promise<WorkspaceStatsDetailed> {
    // Get single workspace with full member list and settings
  }

  async archiveWorkspace(workspaceId: string): Promise<void> {
    // Set workspace status to 'inactive'
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    // Hard delete workspace (cascades to all data)
  }
}
```

Implementation details:

- Use `sql<number>\`count(\*)\`` for aggregation
- Use subqueries or LEFT JOINs for member/transaction/asset/budget/category counts
- Pagination with limit/offset (default 50)
- Search by workspace name with `like`
- Sort by name, created_at, or member_count

**Step 3: Register singleton in services/index.ts**

Add to `src/services/index.ts`:

```typescript
import { SuperAdminService } from './super-admin.service';

export * from './super-admin.service';

export const superAdminService = new SuperAdminService(db);
```

**Step 4: Run typecheck**

```bash
bun run typecheck
```

**Step 5: Commit**

```bash
git add src/services/super-admin.service.ts src/services/service-errors.ts src/services/index.ts
git commit -m "feat(service): add SuperAdminService with workspace listing, stats, and management"
```

---

## Task 4: Create Admin API Routes

**Files:**

- Create: `src/pages/api/admin/workspaces/index.ts` (list workspaces)
- Create: `src/pages/api/admin/workspaces/[id].ts` (workspace details)
- Create: `src/pages/api/admin/workspaces/[id]/archive.ts` (archive workspace)
- Create: `src/pages/api/admin/workspaces/[id]/delete.ts` (delete workspace)
- Create: `src/pages/api/admin/overview.ts` (platform overview)

**Step 1: Create list workspaces API**

`src/pages/api/admin/workspaces/index.ts`:

```typescript
import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const url = context.url;
    const params = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      sortBy: (url.searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as any) || 'desc',
      limit: parseInt(url.searchParams.get('limit') || '50', 10),
      offset: parseInt(url.searchParams.get('offset') || '0', 10),
    };

    const result = await superAdminService.listAllWorkspaces(params);
    return successResponse(result);
  } catch (error) {
    // error handling following existing patterns
  }
};
```

**Step 2: Create workspace details API**

`src/pages/api/admin/workspaces/[id].ts`:

```typescript
export const GET: APIRoute = async (context) => {
  // Auth check for super_admin
  // Get workspace details with members, settings, counts
};
```

**Step 3: Create archive workspace API**

`src/pages/api/admin/workspaces/[id]/archive.ts`:

```typescript
export const POST: APIRoute = async (context) => {
  // Auth check for super_admin
  // Archive workspace (set status to 'inactive')
  // Log audit event
};
```

**Step 4: Create delete workspace API**

`src/pages/api/admin/workspaces/[id]/delete.ts`:

```typescript
export const DELETE: APIRoute = async (context) => {
  // Auth check for super_admin
  // Require confirmation (workspace name in body)
  // Delete workspace (cascades)
  // Log audit event
};
```

**Step 5: Create platform overview API**

`src/pages/api/admin/overview.ts`:

```typescript
export const GET: APIRoute = async (context) => {
  // Auth check for super_admin
  // Return totalWorkspaces, totalUsers, activeWorkspaces
};
```

**Step 6: Run typecheck**

```bash
bun run typecheck
```

**Step 7: Commit**

```bash
git add src/pages/api/admin/
git commit -m "feat(api): add admin API routes for workspace management"
```

---

## Task 5: Create Admin Layout

**Files:**

- Create: `src/layouts/AdminLayout.astro`

**Step 1: Create AdminLayout**

Create a layout similar to `ProtectedLayout.astro` but without workspace-dependent data loading (no categories, assets, transaction drawer). The admin layout should:

- Wrap `MainLayout.astro` (reuses sidebar, header, footer)
- Check for super_admin role
- NOT load workspace-scoped data (categories, assets, etc.)
- NOT include TransactionDrawer

```astro
---
import MainLayout from './MainLayout.astro';
import { requireSuperAdmin } from '@/lib/auth/requireAuth';

interface Props {
  title?: string;
  currentPath?: string;
  subtitle?: string;
}

const { title = 'Admin', currentPath = '/admin', subtitle } = Astro.props;

// Require super admin access
const authResult = requireSuperAdmin(Astro);
if (authResult) return authResult;

const user = Astro.locals.user!;
---

<MainLayout title={title} currentPath={currentPath} user={user} subtitle={subtitle}>
  <slot />
</MainLayout>
```

**Step 2: Commit**

```bash
git add src/layouts/AdminLayout.astro
git commit -m "feat(layout): add AdminLayout for super admin pages"
```

---

## Task 6: Create Admin Dashboard Page

**Files:**

- Create: `src/pages/admin/index.astro`

**Step 1: Create admin dashboard page**

Use `AdminLayout` and display:

- Platform overview cards (total workspaces, total users, active workspaces)
- Quick action links (view workspaces, audit logs)
- Use DaisyUI stat cards and responsive grid

```astro
---
import AdminLayout from '@/layouts/AdminLayout.astro';
import { superAdminService } from '@/services';
import { Building2, Users, Activity } from '@lucide/astro';

const overview = await superAdminService.getPlatformOverview();
---

<AdminLayout title="Admin Dashboard" currentPath="/admin" subtitle="Platform Overview">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <!-- Total Workspaces card -->
      <!-- Total Users card -->
      <!-- Active Workspaces card -->
    </div>

    <!-- Quick Actions -->
    <div class="card bg-base-100 shadow-sm">
      <!-- Links to /admin/workspaces, /admin/audit-logs -->
    </div>
  </div>
</AdminLayout>
```

Use DaisyUI classes: `stat`, `stat-title`, `stat-value`, `stat-desc`, `card`, `btn`.

**Step 2: Commit**

```bash
git add src/pages/admin/index.astro
git commit -m "feat(ui): add admin dashboard page with platform overview stats"
```

---

## Task 7: Create Workspace List Page

**Files:**

- Create: `src/pages/admin/workspaces/index.astro`
- Create: `src/components/organisms/AdminWorkspaceTable.astro`

**Step 1: Create AdminWorkspaceTable component**

`src/components/organisms/AdminWorkspaceTable.astro`:

Props:

- `workspaces: WorkspaceStats[]`
- `total: number`
- `currentPage: number`

Display:

- DaisyUI table with columns: Name, Status, Members, Transactions, Created, Actions
- Status badges (active=success, inactive=warning)
- Click row to navigate to `/admin/workspaces/[id]`
- Responsive: horizontal scroll on mobile

**Step 2: Create workspace list page**

`src/pages/admin/workspaces/index.astro`:

- Search input (debounced, fetches `?_render=html` partial)
- Status filter dropdown
- Sort controls
- Pagination
- Links to create workspace

**Step 3: Commit**

```bash
git add src/pages/admin/workspaces/index.astro src/components/organisms/AdminWorkspaceTable.astro
git commit -m "feat(ui): add admin workspace list page with search, filter, and pagination"
```

---

## Task 8: Create Workspace Details Page

**Files:**

- Create: `src/pages/admin/workspaces/[id].astro`
- Create: `src/components/molecules/AdminWorkspaceStats.astro`
- Create: `src/components/molecules/AdminWorkspaceMemberList.astro`

**Step 1: Create stats card component**

`src/components/molecules/AdminWorkspaceStats.astro`:

Display workspace metrics in a card grid:

- Member count, transaction count, asset count, budget count, category count
- Status, created date
- DaisyUI stat components

**Step 2: Create member list component**

`src/components/molecules/AdminWorkspaceMemberList.astro`:

Read-only member list (no remove action):

- Name, email, role, joined date
- Similar to existing `MemberList.astro` but read-only

**Step 3: Create workspace details page**

`src/pages/admin/workspaces/[id].astro`:

- Breadcrumb: Admin > Workspaces > [name]
- Stats overview cards
- Member list
- Workspace settings (read-only)
- Action buttons: Archive (if active), Delete (with confirmation)
- Use DaisyUI tabs for sections

**Step 4: Create delete confirmation modal**

Add inline confirmation modal requiring user to type workspace name:

```astro
<dialog id="delete-workspace-modal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg text-error">Delete Workspace</h3>
    <p>Type the workspace name to confirm deletion:</p>
    <input type="text" data-confirm-name-input class="input input-bordered w-full" />
    <div class="modal-action">
      <button class="btn btn-ghost">Cancel</button>
      <button class="btn btn-error" data-confirm-delete disabled>Delete</button>
    </div>
  </div>
</dialog>
```

Client script enables delete button only when typed name matches.

**Step 5: Commit**

```bash
git add src/pages/admin/workspaces/\[id\].astro \
  src/components/molecules/AdminWorkspaceStats.astro \
  src/components/molecules/AdminWorkspaceMemberList.astro
git commit -m "feat(ui): add admin workspace details page with stats, members, and actions"
```

---

## Task 9: Create CLI Command for Super Admin Promotion

**Files:**

- Create: `src/cli/create-super-admin.ts`
- Modify: `package.json` (add script)

**Step 1: Create CLI script**

`src/cli/create-super-admin.ts`:

```typescript
/**
 * CLI Script: Create/Promote Super Admin
 *
 * Promotes an existing user to super_admin role.
 * Removes workspace association (sets workspace_id to null).
 *
 * Usage: bun run cli:create-super-admin -- --email admin@example.com
 */

import { db, users } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';

async function main() {
  // Parse --email arg
  // Find user by email (must exist, must not be soft-deleted)
  // Confirm action
  // Update user: role = 'super_admin', workspace_id = null
  // Log success
}
```

**Step 2: Add package.json script**

```json
"cli:create-super-admin": "bun run src/cli/create-super-admin.ts",
"cli:create-super-admin:prod": "bun --env-file=.env.production run src/cli/create-super-admin.ts",
```

**Step 3: Commit**

```bash
git add src/cli/create-super-admin.ts package.json
git commit -m "feat(cli): add create-super-admin command to promote users"
```

---

## Task 10: Add Audit Logging for Admin Actions

**Files:**

- Modify: `src/lib/audit-log.ts` (extend types)
- Modify: `src/pages/api/admin/workspaces/[id]/archive.ts` (add logging)
- Modify: `src/pages/api/admin/workspaces/[id]/delete.ts` (add logging)

**Step 1: Extend audit types**

In `src/lib/audit-log.ts`, add admin-specific audit actions and entity types:

```typescript
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'archive'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'member_invite'
  | 'member_remove'
  | 'admin_view'
  | 'admin_archive'
  | 'admin_delete';

// Note: the audit_logs table has workspace_id as NOT NULL with foreign key.
// For super admin actions that span workspaces, we log with the TARGET workspace_id.
```

**Step 2: Add audit logging to archive and delete APIs**

Use `logAuditEvent()` in the archive/delete API handlers with the target workspace ID.

**Step 3: Commit**

```bash
git add src/lib/audit-log.ts src/pages/api/admin/
git commit -m "feat(audit): add audit logging for super admin workspace actions"
```

---

## Task 11: Create Audit Logs Page

**Files:**

- Create: `src/pages/admin/audit-logs.astro`
- Create: `src/pages/api/admin/audit-logs.ts`

**Step 1: Create audit logs API**

`src/pages/api/admin/audit-logs.ts`:

```typescript
export const GET: APIRoute = async (context) => {
  // Auth check for super_admin
  // Query audit_logs with filters: action type, date range
  // Filter for admin_* actions
  // Pagination
  // Join with users table for actor name
};
```

**Step 2: Create audit logs page**

`src/pages/admin/audit-logs.astro`:

- Table showing admin audit events
- Columns: Date, Admin User, Action, Target Workspace, Details
- Filter by action type
- Pagination

**Step 3: Commit**

```bash
git add src/pages/admin/audit-logs.astro src/pages/api/admin/audit-logs.ts
git commit -m "feat(ui): add admin audit logs page with filtering"
```

---

## Task 12: Add Navigation for Admin Area

**Files:**

- Modify: `src/components/layouts/Navigation.astro` (add admin nav items)
- Modify: `src/components/layouts/MobileNavigation.astro` (add admin nav items)

**Step 1: Add admin navigation items**

Add admin-only nav section to sidebar navigation, visible only when `user.role === 'super_admin'`:

```html
{user?.role === 'super_admin' && (
<li class="menu-title mt-4">Admin</li>
<li><a href="/admin">Dashboard</a></li>
<li><a href="/admin/workspaces">Workspaces</a></li>
<li><a href="/admin/audit-logs">Audit Logs</a></li>
)}
```

**Step 2: Commit**

```bash
git add src/components/layouts/Navigation.astro src/components/layouts/MobileNavigation.astro
git commit -m "feat(nav): add admin navigation items for super admin users"
```

---

## Task 13: Update OpenAPI Documentation

**Files:**

- Create: `openapi/paths/admin.yml`

**Step 1: Create admin API docs**

Document all admin endpoints:

- `GET /api/admin/overview`
- `GET /api/admin/workspaces`
- `GET /api/admin/workspaces/{id}`
- `POST /api/admin/workspaces/{id}/archive`
- `DELETE /api/admin/workspaces/{id}/delete`
- `GET /api/admin/audit-logs`

Include authentication requirements (super_admin role).

**Step 2: Commit**

```bash
git add openapi/paths/admin.yml
git commit -m "docs(openapi): add admin API endpoint documentation"
```

---

## Task 14: Quality Gates and Final Verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Build verification**

```bash
bun run build
```

**Step 3: Manual testing checklist**

- [ ] Run `bun run cli:create-super-admin -- --email admin@example.com` to promote a user
- [ ] Log in as super admin
- [ ] Verify `/admin` dashboard loads with correct stats
- [ ] Verify `/admin/workspaces` shows all workspaces
- [ ] Verify workspace details page loads
- [ ] Verify archive action works
- [ ] Verify delete action requires name confirmation
- [ ] Verify non-super-admin gets 403 on `/admin` routes
- [ ] Verify audit logs capture admin actions
- [ ] Verify mobile responsive layout

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: quality gates and final cleanup for super admin feature"
```

---

## Summary of All Files

### New Files (13)

- `src/services/super-admin.service.ts`
- `src/layouts/AdminLayout.astro`
- `src/pages/admin/index.astro`
- `src/pages/admin/workspaces/index.astro`
- `src/pages/admin/workspaces/[id].astro`
- `src/pages/admin/audit-logs.astro`
- `src/pages/api/admin/overview.ts`
- `src/pages/api/admin/workspaces/index.ts`
- `src/pages/api/admin/workspaces/[id].ts`
- `src/pages/api/admin/workspaces/[id]/archive.ts`
- `src/pages/api/admin/workspaces/[id]/delete.ts`
- `src/pages/api/admin/audit-logs.ts`
- `src/cli/create-super-admin.ts`
- `src/components/organisms/AdminWorkspaceTable.astro`
- `src/components/molecules/AdminWorkspaceStats.astro`
- `src/components/molecules/AdminWorkspaceMemberList.astro`
- `openapi/paths/admin.yml`

### Modified Files (11)

- `src/db/schema/sqlite/users.ts`
- `src/db/schema/postgresql/users.ts`
- `src/lib/auth/lucia.ts`
- `src/lib/tenant/context.ts`
- `src/lib/api-utils.ts`
- `src/lib/auth/requireAuth.ts`
- `src/lib/audit-log.ts`
- `src/middleware/route-guard.ts`
- `src/services/service-errors.ts`
- `src/services/index.ts`
- `src/components/organisms/MemberList.astro`
- `src/components/layouts/Navigation.astro`
- `src/components/layouts/MobileNavigation.astro`
- `package.json`

### Migrations

- `drizzle/sqlite/` (new migration)
- `drizzle/postgresql/` (new migration)
