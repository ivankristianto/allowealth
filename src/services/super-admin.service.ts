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
import { SuperAdminServiceError, ServiceErrorCode } from './service-errors';

// === Interfaces ===

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
   * Uses grouped subqueries to avoid N+1 queries for member/transaction/asset/budget/category counts.
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
    const [memberCounts, transactionCounts, assetCounts, budgetCounts, categoryCounts] =
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

        // Asset counts per workspace (exclude soft-deleted)
        (this.db as any)
          .select({
            workspace_id: schema.assets.workspace_id,
            count: sql<number>`count(*)`,
          })
          .from(schema.assets)
          .where(isNull(schema.assets.deleted_at))
          .groupBy(schema.assets.workspace_id),

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
    const assetMap = toCountMap(assetCounts);
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
      assetCount: assetMap.get(w.id) ?? 0,
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
      assetCountResult,
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

      // Asset count
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(schema.assets)
        .where(and(eq(schema.assets.workspace_id, workspaceId), isNull(schema.assets.deleted_at))),

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
      settings[meta.meta_key] = meta.meta_value;
    }

    return {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      createdAt: workspace.created_at,
      memberCount: members.length,
      transactionCount: transactionCountResult[0]?.count ?? 0,
      assetCount: assetCountResult[0]?.count ?? 0,
      budgetCount: budgetCountResult[0]?.count ?? 0,
      categoryCount: categoryCountResult[0]?.count ?? 0,
      members: members.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
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
   * automatically delete all related data (users, transactions, assets, etc.)
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
