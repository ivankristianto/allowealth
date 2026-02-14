# Super Admin User Management — Design

**Goal:** Add platform-wide user management to the super admin area, allowing super admins to view all users across workspaces and perform basic actions (deactivate, reactivate, change role).

**Context:** Extends the existing super admin workspace management (issue #155). Workspace management, dashboard, and audit logs are already implemented.

## Pages

### `/admin/users` — User List

Table listing all users across the platform with:

- **Search:** by name or email
- **Filters:** role (all/admin/member/super_admin), status (all/active/deactivated), workspace (dropdown)
- **Columns:** Name, Email, Role (badge), Workspace (linked to `/admin/workspaces/[id]`), Status, Created
- **Pagination:** 20 per page

Follows the same pattern as `/admin/workspaces` (Card-wrapped filter bar, Card-wrapped table, pagination nav).

### `/admin/users/[id]` — User Detail

Displays user info and provides actions:

- **Info:** Name, email, role badge, workspace name (linked), join date, email verified status, avatar
- **Actions:**
  - Deactivate user — soft-delete (`deleted_at`). Confirmation modal required.
  - Reactivate user — clears `deleted_at` for deactivated users.
  - Change role — dropdown to switch between `admin`/`member`. Super_admin promotion stays CLI-only for safety.

## Service Layer

Add to `SuperAdminService`:

- `listAllUsers(params)` — search, filter by role/status/workspace, sort, paginate. Returns `{ users: UserWithWorkspace[]; total: number }`
- `getUserDetails(userId)` — single user with workspace info
- `deactivateUser(userId)` — sets `deleted_at` to now
- `reactivateUser(userId)` — clears `deleted_at`
- `changeUserRole(userId, newRole)` — updates role (admin/member only, rejects super_admin)

## API Routes

- `GET /api/admin/users` — list (not needed for SSR pages, but included for consistency)
- `POST /api/admin/users/[id]/deactivate` — soft delete
- `POST /api/admin/users/[id]/reactivate` — restore
- `PATCH /api/admin/users/[id]/role` — change role (body: `{ role: 'admin' | 'member' }`)

All routes require super_admin authentication and CSRF protection.

## Navigation

- Add "Users" link to admin dashboard quick actions
- Add "View Users" button on admin nav/sidebar if one exists

## Components

- `AdminUserTable.astro` — organism: user table with clickable rows
- Reuse existing `Card`, `StatCard`, `Badge` atoms
- Delete/deactivate modals follow existing workspace detail modal pattern

## Constraints

- No super_admin promotion via UI (CLI-only)
- Soft-delete only (no hard delete of users)
- All actions logged to audit_logs table
