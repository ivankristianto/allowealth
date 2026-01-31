# Multi-Tenant Workspace Architecture Design

**Status:** Approved
**Date:** 2026-01-31
**Author:** Claude + Ivan

## Overview

Transform the personal finance app from a single-user model to a multi-tenant workspace architecture where each workspace represents a family unit sharing financial data.

## Goals

- Enable multiple family members to share financial data (transactions, budgets, assets)
- Provide workspace-level settings for consistent family experience
- Support role-based access control (Admin/Member)
- Maintain audit trail of who created each record
- Keep workspaces completely isolated from each other

## Key Decisions

| Decision           | Choice                  | Rationale                                             |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Data sharing model | Complete sharing        | All family members see all data; simpler for MVP      |
| Registration flow  | Workspace-first         | Super admin creates workspace owners via CLI          |
| Super admin        | Minimal (CLI only)      | No dashboard, no data access to workspaces            |
| Roles              | Admin + Member          | Simple two-role model for MVP                         |
| Settings scope     | Workspace-level only    | No user-specific settings in MVP                      |
| Migration strategy | Fresh schema rewrite    | No backward compatibility needed (dev phase)          |
| Invitation flow    | Email with signup token | Admin invites, member signs up via token link         |
| Workspace ID       | UUID only               | No slugs/subdomains; users auto-enter their workspace |
| User membership    | Single workspace        | One user belongs to exactly one workspace             |
| User deletion      | Soft delete             | Preserve audit trail; `deleted_at` timestamp          |

## Database Schema

### New Tables

#### `workspaces`

Top-level container for all family financial data.

```
workspaces
├── id (text, PK)
├── name (text, NOT NULL) - "Jenkins Family"
├── created_at (timestamp, NOT NULL)
├── updated_at (timestamp, NOT NULL)
```

#### `workspace_meta`

Key-value storage for workspace settings (extensible without migrations).

```
workspace_meta
├── id (text, PK)
├── workspace_id (FK → workspaces.id, CASCADE DELETE)
├── meta_key (text, NOT NULL)
├── meta_value (text, NOT NULL)
├── created_at (timestamp, NOT NULL)
├── updated_at (timestamp, NOT NULL)
├── UNIQUE(workspace_id, meta_key)
```

**Allowed keys (validated at service layer):**

| Key               | Type                 | Default  | Description                       |
| ----------------- | -------------------- | -------- | --------------------------------- |
| `currency`        | "IDR" \| "USD"       | "IDR"    | Primary workspace currency        |
| `week_start`      | "monday" \| "sunday" | "monday" | Week start day                    |
| `compact_numbers` | "true" \| "false"    | "true"   | Show amounts as 1.5M vs 1,500,000 |

#### `workspace_invitations`

Invitation tokens for new members.

```
workspace_invitations
├── id (text, PK)
├── workspace_id (FK → workspaces.id, CASCADE DELETE)
├── email (text, NOT NULL) - invited email address
├── token (text, NOT NULL, UNIQUE) - secure signup token
├── invited_by_user_id (FK → users.id, NO ACTION)
├── role (text, NOT NULL) - "admin" | "member"
├── expires_at (timestamp, NOT NULL) - 7 days from creation
├── accepted_at (timestamp, nullable) - set when invitation accepted
├── created_at (timestamp, NOT NULL)
```

### Modified Tables

#### `users`

Added workspace membership, role, and soft delete.

```
users
├── id (text, PK)
├── workspace_id (FK → workspaces.id, CASCADE DELETE) ← NEW
├── email (text, NOT NULL, UNIQUE)
├── password_hash (text, NOT NULL)
├── name (text, NOT NULL)
├── role (text, NOT NULL) - "admin" | "member" ← NEW
├── deleted_at (timestamp, nullable) ← NEW (soft delete)
├── created_at (timestamp, NOT NULL)
├── updated_at (timestamp, NOT NULL)
```

**FK Constraints:**

- `workspace_id` → CASCADE DELETE (workspace deleted = users deleted)
- When user soft-deleted, sessions are hard deleted

#### Financial Tables

All financial tables change from `user_id` to `workspace_id` and add mandatory `created_by_user_id`.

**Pattern applied to:** `categories`, `asset_categories`, `transactions`, `assets`, `budgets`, `asset_snapshots`, `asset_update_reminders`, `audit_logs`

```
[table_name]
├── ...existing columns...
├── workspace_id (FK → workspaces.id, CASCADE DELETE) ← replaces user_id
├── created_by_user_id (FK → users.id, NO ACTION, NOT NULL) ← NEW
```

**FK Constraints:**

- `workspace_id` → CASCADE DELETE (workspace deleted = data deleted)
- `created_by_user_id` → NO ACTION (prevents user hard delete; preserves audit trail)

#### `user_meta`

Kept for user-specific data (not workspace settings).

```
user_meta
├── id (text, PK)
├── user_id (FK → users.id, CASCADE DELETE)
├── meta_key (text, NOT NULL)
├── meta_value (text, NOT NULL)
├── created_at (timestamp, NOT NULL)
├── updated_at (timestamp, NOT NULL)
├── UNIQUE(user_id, meta_key)
```

**Allowed keys:**

| Key      | Description                    |
| -------- | ------------------------------ |
| `phone`  | User phone number              |
| `bio`    | User bio/description           |
| (future) | Notification preferences, etc. |

### Unchanged Tables

| Table                   | Notes                                    |
| ----------------------- | ---------------------------------------- |
| `sessions`              | Still user-scoped (user_id FK)           |
| `password_reset_tokens` | Still user-scoped (user_id FK)           |
| `exchange_rates`        | Global table, no user/workspace relation |

### Inherited Tables (via FK)

These tables don't need direct workspace_id; they inherit scope via parent FK:

| Table                  | Inherits via                               |
| ---------------------- | ------------------------------------------ |
| `asset_history`        | asset_id → assets.workspace_id             |
| `asset_snapshot_items` | snapshot_id → asset_snapshots.workspace_id |

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKSPACE-CENTRIC SCHEMA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │   WORKSPACES     │◀─────────────────────────────────────────────────┐   │
│  │                  │                                                   │   │
│  └────────┬─────────┘                                                   │   │
│           │                                                             │   │
│           │ Cascade Delete                                              │   │
│           │                                                             │   │
│  ┌────────┼─────────────────────────────────────────────────────────┐  │   │
│  │        │                                                         │  │   │
│  │  ┌─────▼──────────┐    ┌──────────────────┐                     │  │   │
│  │  │ WORKSPACE_META │    │ WORKSPACE_       │                     │  │   │
│  │  │ (key-value)    │    │ INVITATIONS      │                     │  │   │
│  │  └────────────────┘    └──────────────────┘                     │  │   │
│  │                                                                  │  │   │
│  │  ┌──────────────────┐                                           │  │   │
│  │  │     USERS        │◀───────────────────────────────────┐      │  │   │
│  │  │ (workspace_id,   │                                    │      │  │   │
│  │  │  role, deleted_at│                                    │      │  │   │
│  │  └────────┬─────────┘                                    │      │  │   │
│  │           │                                              │      │  │   │
│  │           │ created_by_user_id (NO ACTION)              │      │  │   │
│  │           │                                              │      │  │   │
│  │  ┌────────┼──────────────────────────────────────────────┼──┐   │  │   │
│  │  │        │                                              │  │   │  │   │
│  │  │  ┌─────▼────────┐   ┌──────────────┐   ┌───────────┐ │  │   │  │   │
│  │  │  │ CATEGORIES   │   │ BUDGETS      │   │ ASSETS    │ │  │   │  │   │
│  │  │  └──────────────┘   └──────────────┘   └───────────┘ │  │   │  │   │
│  │  │                                                       │  │   │  │   │
│  │  │  ┌──────────────┐   ┌──────────────┐                 │  │   │  │   │
│  │  │  │ TRANSACTIONS │   │ ASSET_       │                 │  │   │  │   │
│  │  │  │              │   │ CATEGORIES   │                 │  │   │  │   │
│  │  │  └──────────────┘   └──────────────┘                 │  │   │  │   │
│  │  │                                                       │  │   │  │   │
│  │  │  (All have workspace_id + created_by_user_id)        │  │   │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │  │   │
│  │                                                              │  │   │   │
│  └──────────────────────────────────────────────────────────────┘  │   │   │
│                                                                     │   │   │
│  ┌──────────────────┐    ┌──────────────────┐                      │   │   │
│  │ USER_META        │    │ SESSIONS         │ (user-scoped)        │   │   │
│  │ (phone, bio)     │    │                  │                      │   │   │
│  └──────────────────┘    └──────────────────┘                      │   │   │
│                                                                     │   │   │
│  ┌──────────────────┐                                              │   │   │
│  │ EXCHANGE_RATES   │  (global, no workspace relation)             │   │   │
│  └──────────────────┘                                              │   │   │
│                                                                         │   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### Login Flow

```
1. User submits email + password
2. System validates credentials
3. Check: user.deleted_at IS NULL (reject soft-deleted users)
4. Create session linked to user_id
5. User automatically in their workspace (user.workspace_id)
6. No workspace selection needed (single workspace per user)
```

### Authorization Middleware

```typescript
// Every protected request:
1. Validate session → get user_id
2. Fetch user with workspace_id and role
3. Reject if user.deleted_at IS NOT NULL
4. Attach to request context:
   - user.id
   - user.workspace_id
   - user.role ("admin" | "member")
```

### Role Permissions

| Action                          | Admin | Member |
| ------------------------------- | ----- | ------ |
| View all financial data         | ✅    | ✅     |
| Create/edit/delete transactions | ✅    | ✅     |
| Create/edit/delete budgets      | ✅    | ✅     |
| Create/edit/delete assets       | ✅    | ✅     |
| Manage categories               | ✅    | ✅     |
| Invite members                  | ✅    | ❌     |
| Remove members                  | ✅    | ❌     |
| Change member roles             | ✅    | ❌     |
| Edit workspace settings         | ✅    | ❌     |
| Delete workspace                | ✅    | ❌     |

## Invitation Flow

### Admin Invites Member

```
1. Admin enters email + selects role (admin/member)
2. System validates:
   - Email not already registered in any workspace
   - No pending invitation for this email in this workspace
3. Create workspace_invitations record:
   - Generate unique token (UUID or secure random)
   - Set expires_at = now + 7 days
   - Set invited_by_user_id = current admin
4. Send email with signup link: /signup?token={token}
   (Or admin copies link and shares manually)
```

### Invitee Accepts Invitation

```
1. User visits /signup?token={token}
2. System validates:
   - Token exists and not expired
   - accepted_at IS NULL (not already used)
3. Show signup form pre-filled with email (read-only)
4. User submits: name, password
5. System creates:
   - User record with workspace_id and role from invitation
   - Set invitation.accepted_at = now
6. Auto-login, redirect to dashboard
```

### Edge Cases

| Scenario                 | Handling                                        |
| ------------------------ | ----------------------------------------------- |
| Token expired            | Show error, suggest asking admin for new invite |
| Email already registered | Show error, suggest login instead               |
| Token already used       | Show error, suggest login                       |
| Admin resends invite     | Delete old invitation, create new one           |

## Query Pattern Changes

### Before (user-scoped)

```typescript
const txns = await db.query.transactions.findMany({
  where: and(eq(transactions.user_id, userId), isNull(transactions.deleted_at)),
});
```

### After (workspace-scoped)

```typescript
const txns = await db.query.transactions.findMany({
  where: and(eq(transactions.workspace_id, workspaceId), isNull(transactions.deleted_at)),
});
```

### Tables Requiring Query Updates

| Table                  | Old Filter     | New Filter     |
| ---------------------- | -------------- | -------------- |
| transactions           | user_id        | workspace_id   |
| categories             | user_id        | workspace_id   |
| budgets                | user_id        | workspace_id   |
| assets                 | user_id        | workspace_id   |
| asset_categories       | user_id        | workspace_id   |
| asset_history          | (via asset)    | (via asset)    |
| asset_snapshots        | user_id        | workspace_id   |
| asset_snapshot_items   | (via snapshot) | (via snapshot) |
| asset_update_reminders | user_id        | workspace_id   |
| audit_logs             | user_id        | workspace_id   |

### Request Context

```typescript
// Astro.locals after auth middleware
{
  user: { id, email, name, role, workspaceId, deletedAt },
  session: { id, expiresAt }
}
```

## Super Admin CLI Operations

No admin dashboard. Workspace creation via CLI/seed scripts only.

### Create Workspace + Owner

```typescript
// Example: bun run cli:create-workspace

async function createWorkspace(input: {
  workspaceName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
}) {
  // 1. Create workspace
  const workspace = await db.insert(workspaces).values({
    id: generateId(),
    name: input.workspaceName,
  });

  // 2. Create default workspace_meta
  await db.insert(workspaceMeta).values([
    { id: generateId(), workspace_id: workspace.id, meta_key: 'currency', meta_value: 'IDR' },
    { id: generateId(), workspace_id: workspace.id, meta_key: 'week_start', meta_value: 'monday' },
    {
      id: generateId(),
      workspace_id: workspace.id,
      meta_key: 'compact_numbers',
      meta_value: 'true',
    },
  ]);

  // 3. Create owner user (admin role)
  const owner = await db.insert(users).values({
    id: generateId(),
    workspace_id: workspace.id,
    email: input.ownerEmail,
    name: input.ownerName,
    password_hash: await hashPassword(input.ownerPassword),
    role: 'admin',
  });

  // 4. Seed default categories (workspace-scoped)
  await seedDefaultCategories(workspace.id, owner.id);

  return { workspace, owner };
}
```

### CLI Commands

```bash
bun run cli:create-workspace    # Create workspace + owner
bun run cli:list-workspaces     # List all workspaces
bun run cli:delete-workspace    # Hard delete workspace + all data
```

## User Lifecycle

### User Removal (Soft Delete)

```
1. Admin removes member from workspace
2. System sets users.deleted_at = now()
3. User's sessions are hard deleted (logged out)
4. User cannot log in (check deleted_at IS NULL on auth)
5. Financial records keep valid created_by_user_id reference
6. Soft-deleted user's name still shows in transaction history
```

### Workspace Deletion (Hard Delete)

```
1. Admin deletes workspace (or super admin via CLI)
2. CASCADE DELETE removes:
   - All workspace_meta records
   - All workspace_invitations records
   - All users (including soft-deleted)
   - All financial data (transactions, budgets, assets, etc.)
3. Complete data removal, no recovery
```

## Migration Strategy

**Approach:** Fresh schema rewrite (drop all tables, recreate)

**Steps:**

1. Drop all existing tables
2. Create new workspace-centric schema
3. Run new seed script to create test workspace + data

**No migration path for existing data** (acceptable for development phase).

## Implementation Order

1. **Schema changes** - Create new tables, modify existing tables
2. **Auth middleware** - Update to include workspace_id and role
3. **Services** - Update all queries from user_id to workspace_id
4. **API endpoints** - Update request handlers
5. **UI components** - Update settings page, add member management
6. **CLI tools** - Create workspace management commands
7. **Invitation system** - Implement invite flow

## Testing Considerations

- Test workspace isolation (user A cannot see workspace B data)
- Test role permissions (member cannot invite/remove)
- Test soft delete (removed user cannot login, audit trail preserved)
- Test cascade deletes (workspace delete removes all data)
- Test invitation flow (token expiry, duplicate email, etc.)

## Future Considerations (Out of Scope for MVP)

- Multiple workspaces per user
- Workspace switching UI
- Super admin dashboard
- Granular permissions (per-feature access)
- User-specific display preferences
- Workspace transfer (change owner)
- Audit log UI (who did what)
