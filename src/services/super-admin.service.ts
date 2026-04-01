/**
 * Super Admin Service
 *
 * Provides cross-workspace visibility and management for platform administrators.
 * Used by admin API routes and admin dashboard pages.
 *
 * Error codes:
 * - WORKSPACE_NOT_FOUND: Workspace doesn't exist
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { eq, sql, desc, asc, like, and, isNull } from 'drizzle-orm';
import { isValidWorkspaceMetaKey } from '@/lib/constants/workspace-meta-keys';
import { SuperAdminServiceError, ServiceErrorCode } from './service-errors';
import { softDeleteUserAndRevokeMcpTokens } from './mcp-token-revocation.service';

// === Interfaces ===

export interface WorkspaceStats {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  memberCount: number;
  transactionCount: number;
  accountCount: number;
  budgetCount: number;
  categoryCount: number;
}

export interface WorkspaceStatsDetailed extends WorkspaceStats {
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'member' | 'super_admin';
    createdAt: Date;
  }>;
  settings: Record<string, string>;
}

export interface ListWorkspacesParams {
  search?: string;
  status?: 'active' | 'inactive';
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

// === Service ===

export class SuperAdminService {
  private get schema() {
    return getActiveSchema();
  }

  constructor(private db: IDatabase) {}

  /**
   * Get aggregate platform statistics
   *
   * Returns total workspaces, total non-deleted non-super_admin users,
   * and count of active workspaces.
   */
  async getPlatformOverview(): Promise<PlatformOverview> {
    const schema = this.schema;

    const [workspaceResult, activeResult, userResult] = await Promise.all([
      (this.db as any).select({ count: sql<number>`count(*)` }).from(schema.workspaces),

      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.status, 'active')),

      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .where(and(isNull(schema.users.deleted_at), sql`${schema.users.role} != 'super_admin'`)),
    ]);

    return {
      totalWorkspaces: workspaceResult[0]?.count ?? 0,
      totalUsers: userResult[0]?.count ?? 0,
      activeWorkspaces: activeResult[0]?.count ?? 0,
    };
  }

  /**
   * List all workspaces with aggregated counts, paginated
   *
   * Uses grouped subqueries to avoid N+1 queries for member/transaction/account/budget/category counts.
   *
   * @param params - Filter, sort, and pagination parameters
   * @returns Paginated workspaces with aggregate counts
   */
  async listAllWorkspaces(
    params: ListWorkspacesParams = {}
  ): Promise<{ workspaces: WorkspaceStats[]; total: number }> {
    const schema = this.schema;
    const {
      search,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = params;

    // Build filter conditions
    const conditions = [];
    if (search) {
      conditions.push(like(schema.workspaces.name, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(schema.workspaces.status, status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(schema.workspaces);

    const [countResult] = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = countResult?.count ?? 0;

    if (total === 0) {
      return { workspaces: [], total: 0 };
    }

    // Build sort clause
    const sortColumn = sortBy === 'name' ? schema.workspaces.name : schema.workspaces.created_at;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Get workspaces with pagination
    let workspacesQuery = (this.db as any)
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
        status: schema.workspaces.status,
        created_at: schema.workspaces.created_at,
      })
      .from(schema.workspaces);

    if (whereClause) {
      workspacesQuery = workspacesQuery.where(whereClause);
    }

    const workspaceRows = await workspacesQuery
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    if (workspaceRows.length === 0) {
      return { workspaces: [], total };
    }

    // Batch-fetch counts for all visible workspaces using grouped queries
    const [memberCounts, transactionCounts, accountCounts, budgetCounts, categoryCounts] =
      await Promise.all([
        // Member counts per workspace (exclude deleted, exclude super_admin)
        (this.db as any)
          .select({
            workspace_id: schema.users.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.users)
          .where(and(isNull(schema.users.deleted_at), sql`${schema.users.role} != 'super_admin'`))
          .groupBy(schema.users.workspace_id),

        // Transaction counts per workspace (exclude soft-deleted)
        (this.db as any)
          .select({
            workspace_id: schema.transactions.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.transactions)
          .where(isNull(schema.transactions.deleted_at))
          .groupBy(schema.transactions.workspace_id),

        // Account counts per workspace (exclude soft-deleted)
        (this.db as any)
          .select({
            workspace_id: schema.accounts.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.accounts)
          .where(isNull(schema.accounts.deleted_at))
          .groupBy(schema.accounts.workspace_id),

        // Budget counts per workspace
        (this.db as any)
          .select({
            workspace_id: schema.budgets.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.budgets)
          .groupBy(schema.budgets.workspace_id),

        // Category counts per workspace
        (this.db as any)
          .select({
            workspace_id: schema.categories.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.categories)
          .groupBy(schema.categories.workspace_id),
      ]);

    // Build lookup maps for O(1) access
    const memberMap = toCountMap(memberCounts);
    const transactionMap = toCountMap(transactionCounts);
    const accountMap = toCountMap(accountCounts);
    const budgetMap = toCountMap(budgetCounts);
    const categoryMap = toCountMap(categoryCounts);

    // Assemble results
    const workspaces: WorkspaceStats[] = workspaceRows.map((w: any) => ({
      id: w.id,
      name: w.name,
      status: w.status,
      createdAt: w.created_at,
      memberCount: memberMap.get(w.id) ?? 0,
      transactionCount: transactionMap.get(w.id) ?? 0,
      accountCount: accountMap.get(w.id) ?? 0,
      budgetCount: budgetMap.get(w.id) ?? 0,
      categoryCount: categoryMap.get(w.id) ?? 0,
    }));

    // If sorting by member_count, sort in-memory (cannot sort by subquery in pagination)
    if (sortBy === 'member_count') {
      workspaces.sort((a, b) =>
        sortOrder === 'asc' ? a.memberCount - b.memberCount : b.memberCount - a.memberCount
      );
    }

    return { workspaces, total };
  }

  /**
   * Get detailed workspace information including members and settings
   *
   * @param workspaceId - Workspace ID to retrieve
   * @throws {SuperAdminServiceError} If workspace not found
   */
  async getWorkspaceDetails(workspaceId: string): Promise<WorkspaceStatsDetailed> {
    const schema = this.schema;

    // Get workspace
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new SuperAdminServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    // Fetch members, counts, and settings in parallel
    const [
      members,
      transactionCountResult,
      accountCountResult,
      budgetCountResult,
      categoryCountResult,
      metaRecords,
    ] = await Promise.all([
      // Members (non-deleted, non-super_admin)
      (this.db as any)
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          created_at: schema.users.created_at,
        })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.workspace_id, workspaceId),
            isNull(schema.users.deleted_at),
            sql`${schema.users.role} != 'super_admin'`
          )
        ),

      // Transaction count
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspace_id, workspaceId),
            isNull(schema.transactions.deleted_at)
          )
        ),

      // Account count
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.accounts)
        .where(
          and(eq(schema.accounts.workspace_id, workspaceId), isNull(schema.accounts.deleted_at))
        ),

      // Budget count
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.budgets)
        .where(eq(schema.budgets.workspace_id, workspaceId)),

      // Category count
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.categories)
        .where(eq(schema.categories.workspace_id, workspaceId)),

      // Settings from workspace_meta
      this.db.query.workspaceMeta.findMany({
        where: eq(schema.workspaceMeta.workspace_id, workspaceId),
      }),
    ]);

    // Build settings map
    const settings: Record<string, string> = {};
    for (const meta of metaRecords) {
      if (!isValidWorkspaceMetaKey(meta.meta_key)) {
        continue;
      }
      settings[meta.meta_key] = meta.meta_value;
    }

    return {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      createdAt: workspace.created_at,
      memberCount: members.length,
      transactionCount: transactionCountResult[0]?.count ?? 0,
      accountCount: accountCountResult[0]?.count ?? 0,
      budgetCount: budgetCountResult[0]?.count ?? 0,
      categoryCount: categoryCountResult[0]?.count ?? 0,
      members: members.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role as 'admin' | 'member' | 'super_admin',
        createdAt: m.created_at,
      })),
      settings,
    };
  }

  /**
   * Archive a workspace by setting its status to 'inactive'
   *
   * @param workspaceId - Workspace ID to archive
   * @throws {SuperAdminServiceError} If workspace not found
   */
  async archiveWorkspace(workspaceId: string): Promise<void> {
    const schema = this.schema;

    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new SuperAdminServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    await this.db
      .update(schema.workspaces)
      .set({ status: 'inactive', updated_at: new Date() })
      .where(eq(schema.workspaces.id, workspaceId));
  }

  /**
   * Hard delete a workspace and all associated data
   *
   * Due to ON DELETE CASCADE constraints, deleting a workspace will
   * automatically delete all related data (users, transactions, accounts, etc.)
   *
   * @param workspaceId - Workspace ID to delete
   * @throws {SuperAdminServiceError} If workspace not found
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const schema = this.schema;

    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new SuperAdminServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    await this.db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
  }

  // === User Management ===

  /**
   * List all users across all workspaces with filtering, sorting, and pagination
   *
   * @param params - Filter, sort, and pagination parameters
   * @returns Paginated users with workspace info and total count
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

    const countQuery = (this.db as any).select({ count: sql<number>`count(*)` }).from(schema.users);
    const [countResult] = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = countResult?.count ?? 0;

    if (total === 0) {
      return { users: [], total: 0 };
    }

    const sortColumnMap: Record<string, any> = {
      name: schema.users.name,
      email: schema.users.email,
      created_at: schema.users.created_at,
      role: schema.users.role,
    };
    const sortColumn = sortColumnMap[sortBy] ?? schema.users.created_at;
    const orderFn = sortOrder === 'asc' ? asc : desc;

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

    const userRows = await usersQuery.orderBy(orderFn(sortColumn)).limit(limit).offset(offset);

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

  /**
   * Get detailed user information including workspace association
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
      throw new SuperAdminServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
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

  /**
   * Deactivate a user by setting deleted_at timestamp
   *
   * Cannot deactivate super_admin users.
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
      throw new SuperAdminServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    if (user.role === 'super_admin') {
      throw new SuperAdminServiceError(
        ServiceErrorCode.FORBIDDEN,
        'Cannot deactivate super admin users',
        403
      );
    }

    if (user.deleted_at) {
      throw new SuperAdminServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'User is already deactivated',
        400
      );
    }

    await softDeleteUserAndRevokeMcpTokens(this.db, userId);
  }

  /**
   * Reactivate a previously deactivated user by clearing deleted_at
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
      throw new SuperAdminServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
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

  /**
   * Change a user's role (admin or member only)
   *
   * Cannot change the role of super_admin users.
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
      throw new SuperAdminServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
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
}

// === Helpers ===

/**
 * Convert grouped count query results into a Map<workspace_id, count>
 */
function toCountMap(rows: Array<{ workspace_id: string; count: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.workspace_id, row.count);
  }
  return map;
}
