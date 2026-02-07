# Super Admin Workspace Dashboard

## Summary

Create a super admin area to view and monitor all workspaces with aggregated metrics, member details, and activity tracking for platform-wide administration.

## Type of Feature

- [x] ✨ New feature (admin tooling)
- [x] 🔒 Security enhancement (privileged access control)

## Problem Statement

**Current Architecture:**
- Hard data isolation via workspace-based multi-tenancy (all entities have `workspace_id`)
- Two workspace-level roles: `admin` (full control), `member` (basic operations)
- **No system-level roles exist** - every user is scoped to their workspace
- Row-level security enabled on all tables

**Need for Super Admin:**
- Platform monitoring and health checks across all workspaces
- Support troubleshooting (view workspace issues without direct access)
- Usage analytics and resource planning (aggregate workspace metrics)
- Account management (suspend workspaces, investigate abuse)
- Data integrity audits (detect anomalies across workspaces)

**Current Gap:**
- No way to view cross-workspace data
- Support team must manually query database
- No centralized dashboard for platform health

## Proposed Solution

### High-Level Architecture

**System-Level Role:**
- Add `is_super_admin` boolean to `users` table (simplest approach)
- Alternative: Create `system_roles` table (more flexible, future-proof)
- Super admin status is orthogonal to workspace membership

**Access Control:**
- New middleware: `superAdminGuard` for `/admin/*` routes
- Super admin can view **any workspace** but cannot modify data (view-only by default)
- All super admin actions logged in audit trail

**Routes:**
```
/admin                       # Workspace list with summary stats
/admin/workspaces/[id]       # Detailed workspace view
/admin/workspaces/[id]/members    # Member list for workspace
/admin/workspaces/[id]/activity   # Activity timeline
/admin/audit-logs            # Super admin action audit log
```

**API Endpoints:**
```
GET  /api/admin/workspaces              # List all workspaces with stats
GET  /api/admin/workspaces/:id          # Workspace details
GET  /api/admin/workspaces/:id/members  # Workspace members
GET  /api/admin/workspaces/:id/activity # Workspace activity timeline
GET  /api/admin/audit-logs              # Super admin audit log
```

### Technical Implementation

**Database Changes:**

**Option 1: Simple Boolean Flag (Recommended for MVP)**
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0;
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin);
```

**Option 2: System Roles Table (Future-Proof)**
```sql
CREATE TABLE system_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'super_admin', 'support', 'auditor'
  granted_at INTEGER NOT NULL,
  granted_by TEXT REFERENCES users(id),
  UNIQUE(user_id, role)
);
```

**New Service Layer:**
```typescript
// lib/services/SuperAdminService.ts
export class SuperAdminService {
  // List all workspaces with aggregated stats
  async listWorkspaces(filters?: WorkspaceFilters): Promise<WorkspaceSummary[]> {
    // Query across all workspaces (bypasses workspace_id filter)
    // Return: name, member_count, created_at, last_activity, asset_total, transaction_count
  }

  // Get detailed workspace view
  async getWorkspaceDetails(workspaceId: string): Promise<WorkspaceDetails> {
    // Aggregated financial metrics, member list, recent activity
  }

  // Get workspace members
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    // Member list with roles, join dates, last login
  }
}
```

**Middleware Protection:**
```typescript
// middleware/superAdminGuard.ts
export async function superAdminGuard(context: APIContext) {
  const { user } = context.locals;

  if (!user?.is_super_admin) {
    return new Response('Forbidden', { status: 403 });
  }

  // Log super admin access for audit trail
  await auditLog.log({
    user_id: user.id,
    action: 'SUPER_ADMIN_ACCESS',
    resource: context.url.pathname,
    ip: context.clientAddress,
  });

  return undefined; // Allow request to proceed
}
```

### Workspace Dashboard UI

**Workspace List View (`/admin`):**

```
┌─────────────────────────────────────────────────────────────┐
│ Super Admin Dashboard                          🔍 Search     │
├─────────────────────────────────────────────────────────────┤
│ Filters: [ All ] [ Active ] [ Inactive ] [ Created Last 30d ]│
├───────────┬──────────┬────────────┬─────────────┬───────────┤
│ Workspace │ Members  │ Created    │ Last Active │ Assets    │
├───────────┼──────────┼────────────┼─────────────┼───────────┤
│ Acme Inc  │ 5 users  │ 2024-01-15 │ 2 hours ago │ $125,000  │
│ Smith Fam │ 3 users  │ 2024-02-20 │ 1 day ago   │ $85,000   │
│ StartupXYZ│ 12 users │ 2023-11-10 │ 5 mins ago  │ $320,000  │
└───────────┴──────────┴────────────┴─────────────┴───────────┘
                                    Showing 1-10 of 143 workspaces
```

**Workspace Detail View (`/admin/workspaces/[id]`):**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Workspaces                                         │
├─────────────────────────────────────────────────────────────┤
│ Acme Inc                                  Created: 2024-01-15│
│ workspace_abc123                       Last Active: 2h ago   │
├─────────────────────────────────────────────────────────────┤
│ Overview                                                     │
│ • Members: 5 (3 active, 2 inactive)                         │
│ • Total Assets: $125,000                                    │
│ • Transactions (30d): 142 transactions                      │
│ • Budget Health: 85% (on track)                             │
│ • Categories: 12 active                                     │
│ • Payment Methods: 4 configured                             │
├─────────────────────────────────────────────────────────────┤
│ Members                                                      │
│ • john@acme.com (Admin) - Last login: 1 hour ago           │
│ • jane@acme.com (Member) - Last login: 2 days ago          │
│ • bob@acme.com (Member) - Last login: Never                │
├─────────────────────────────────────────────────────────────┤
│ Recent Activity (Last 7 days)                               │
│ • Feb 5: Transaction created ($250) by john@acme.com        │
│ • Feb 4: Budget updated (Groceries) by jane@acme.com        │
│ • Feb 3: Member invited (bob@acme.com) by john@acme.com     │
└─────────────────────────────────────────────────────────────┘
```

### Metrics Available

**Workspace-Level Aggregation:**
```typescript
interface WorkspaceSummary {
  workspace_id: string;
  workspace_name: string;
  member_count: number;
  active_member_count: number; // Active in last 30 days
  created_at: string;
  last_activity_at: string;

  // Financial Metrics (aggregated)
  total_assets: number;
  transaction_count_30d: number;
  budget_health_score: number; // 0-100
  category_count: number;
  payment_method_count: number;
}
```

**Member Metrics:**
```typescript
interface WorkspaceMember {
  user_id: string;
  email: string; // ⚠️ Redact in list views for privacy
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_login_at: string | null;
  is_active: boolean; // Logged in within 30 days
}
```

**Activity Timeline:**
```typescript
interface WorkspaceActivity {
  timestamp: string;
  action_type: string; // 'transaction_created', 'budget_updated', etc.
  actor_email: string; // Who performed the action
  resource_type: string; // 'transaction', 'budget', 'member'
  summary: string; // Human-readable description
}
```

### Security & Privacy Considerations

**Critical Security Requirements:**

- [x] **View-only by default** - No workspace data modification
- [x] **Aggregated metrics only** - No transaction details in list view
- [x] **Data redaction** - Never expose:
  - Transaction descriptions or amounts in list views
  - Category names or budget amounts
  - Email addresses in workspace list (use "5 members" instead)
- [x] **Audit trail** - Log all super admin access:
  - Who accessed what workspace
  - When (timestamp)
  - What action (view, search, filter)
  - IP address
- [x] **Rate limiting** - Strict limits on admin endpoints (100 req/min)
- [x] **Strict session timeout** - 2 hours (vs 30 days for regular users)
- [x] **2FA enforcement** (future) - Require 2FA for super admin accounts
- [x] **IP allowlist** (future) - Restrict super admin to office IPs

**Privacy Compliance (GDPR/CCPA):**
- Document super admin access in privacy policy
- Allow workspace admins to view audit logs of super admin access to their workspace
- Implement data retention policy for super admin audit logs (90 days)

### Access Control Strategy

**Who Can Be Super Admin:**
- Platform owners (manually assigned via database flag)
- Not user-selectable (cannot self-promote)
- Granted via direct database update or CLI tool

**Grant Super Admin Access (Manual):**
```sql
-- SQLite
UPDATE users SET is_super_admin = 1 WHERE email = 'admin@platform.com';

-- PostgreSQL
UPDATE users SET is_super_admin = true WHERE email = 'admin@platform.com';
```

**CLI Tool (Future):**
```bash
bun cli super-admin grant admin@platform.com
bun cli super-admin revoke admin@platform.com
bun cli super-admin list
```

## Implementation Plan

### Phase 1: Database & Authorization (Week 1)
- [ ] Create migration: Add `is_super_admin` to users table (SQLite + PostgreSQL)
- [ ] Apply migrations: `bun run db:migrate`
- [ ] Create `superAdminGuard` middleware
- [ ] Create `SuperAdminService` with basic queries
- [ ] Write unit tests for super admin authorization
- [ ] Manually grant super admin to test account

### Phase 2: API Layer (Week 1-2)
- [ ] Implement `GET /api/admin/workspaces` (list with stats)
- [ ] Implement `GET /api/admin/workspaces/:id` (details)
- [ ] Implement `GET /api/admin/workspaces/:id/members` (member list)
- [ ] Implement `GET /api/admin/audit-logs` (audit trail)
- [ ] Add rate limiting to admin endpoints (100 req/min)
- [ ] Add error handling for unauthorized access
- [ ] Update OpenAPI documentation

### Phase 3: UI - Workspace List (Week 2)
- [ ] Create `/admin` page layout (protected by `superAdminGuard`)
- [ ] Create WorkspaceListTable component
- [ ] Implement search/filter functionality (by name, date)
- [ ] Add pagination (50 workspaces per page)
- [ ] Display aggregated metrics (member count, assets, last activity)
- [ ] Add loading states and error handling
- [ ] Test responsive design (mobile + desktop)

### Phase 4: UI - Workspace Details (Week 2-3)
- [ ] Create `/admin/workspaces/[id]` detail page
- [ ] Display workspace overview (financial snapshot)
- [ ] Create member list component (roles, last login)
- [ ] Create activity timeline component (recent 7 days)
- [ ] Add navigation breadcrumbs
- [ ] Implement data redaction for privacy (no sensitive details)

### Phase 5: Audit Logging (Week 3)
- [ ] Create `audit_logs` table for super admin actions
- [ ] Log all super admin page views
- [ ] Log all API calls to admin endpoints
- [ ] Create `/admin/audit-logs` page to view logs
- [ ] Add filters: date range, action type, user
- [ ] Implement log retention policy (90 days auto-delete)

### Phase 6: Testing & Documentation (Week 3)
- [ ] E2E tests: Super admin can access workspace list
- [ ] E2E tests: Non-super-admin gets 403 Forbidden
- [ ] E2E tests: Workspace details load correctly
- [ ] E2E tests: Audit logs record access
- [ ] Update `CLAUDE.md` with super admin guidelines
- [ ] Document CLI tool for granting/revoking access
- [ ] Update privacy policy with super admin disclosure

### Phase 7: Production Rollout (Week 4)
- [ ] Deploy to staging for QA
- [ ] Grant super admin to designated users in production
- [ ] Monitor audit logs for suspicious activity
- [ ] Verify rate limiting is enforced
- [ ] Document runbook for granting/revoking access

## Dependencies

**No new packages required** - Uses existing stack

**Database Tables:**
- Migration for `users.is_super_admin` column
- Migration for `audit_logs` table (super admin actions)

## Acceptance Criteria

- [ ] Super admin can view list of all workspaces
- [ ] Workspace list shows aggregated stats (member count, assets, activity)
- [ ] Super admin can view workspace details (financial snapshot, members)
- [ ] Non-super-admin users get 403 Forbidden on `/admin/*` routes
- [ ] All super admin access is logged in audit trail
- [ ] Sensitive data is redacted in list views (no transaction details)
- [ ] Rate limiting prevents abuse (100 req/min on admin endpoints)
- [ ] Search and filter work correctly (by name, date range)
- [ ] Pagination works for large workspace lists (50 per page)
- [ ] All tests pass (unit + E2E)
- [ ] OpenAPI documentation updated
- [ ] Works on all supported browsers (Chrome, Firefox, Safari)

## Out of Scope (Future Enhancements)

- Workspace data modification (delete, suspend, edit)
- Cross-workspace reporting and analytics dashboard
- Export workspace data as CSV/JSON
- 2FA enforcement for super admin accounts
- IP allowlist for super admin access
- Email notifications on super admin access (to workspace owners)
- Advanced filtering (by usage tier, billing status)

## Testing Checklist

### Manual Testing
- [ ] Super admin can access `/admin` → See workspace list
- [ ] Regular user tries `/admin` → 403 Forbidden
- [ ] Workspace list shows correct stats (member count, assets)
- [ ] Workspace detail page loads financial snapshot
- [ ] Member list shows roles and last login
- [ ] Activity timeline shows recent 7 days
- [ ] Audit log records all super admin page views
- [ ] Search filters workspaces by name
- [ ] Pagination works correctly (50 per page)

### E2E Tests
- [ ] `test('super-admin-access-granted')` - Super admin can view dashboard
- [ ] `test('super-admin-access-denied')` - Regular user gets 403
- [ ] `test('workspace-list-loads')` - Workspace list renders
- [ ] `test('workspace-details-loads')` - Detail page shows metrics
- [ ] `test('audit-log-records-access')` - All access logged

## References

- Multi-Tenancy Security: https://cheatsheetseries.owasp.org/cheatsheets/Multitenant_Security_Cheat_Sheet.html
- GDPR Compliance: https://gdpr.eu/

## Labels

`enhancement`, `admin-tooling`, `security`, `monitoring`

## Estimated Effort

**Story Points:** 21 (X-Large)
**Duration:** 3-4 weeks
**Complexity:** High (cross-workspace queries, strict security requirements, audit logging)
