/**
 * Workspace Service
 *
 * Provides high-level workspace operations.
 * Handles workspace CRUD and member management.
 *
 * Error codes:
 * - WORKSPACE_NOT_FOUND: Workspace doesn't exist
 * - VALIDATION_ERROR: Input validation failed
 */

import { workspaces, users, type IDatabase, getActiveSchema } from '@/db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { WorkspaceServiceError, ServiceErrorCode } from './service-errors';

/**
 * Zod schemas for workspace service validation
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(255, 'Workspace name must be less than 255 characters'),
});

export const updateWorkspaceNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(255, 'Workspace name must be less than 255 characters'),
});

/**
 * Input types inferred from Zod schemas
 */
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceNameInput = z.infer<typeof updateWorkspaceNameSchema>;

/**
 * Workspace type inferred from schema
 */
export type Workspace = typeof workspaces.$inferSelect;

/**
 * User type for getMembers result (excludes password hash)
 */
export type WorkspaceMember = Omit<typeof users.$inferSelect, 'password_hash'>;

/**
 * Onboarding completion status for a workspace
 * Each field indicates whether that setup step has been completed
 */
export interface OnboardingStatus {
  currency: boolean;
  categories: boolean;
  budgets: boolean;
  assets: boolean;
  transactions: boolean;
}

/**
 * Workspace Service
 */
export class WorkspaceService {
  private get schema() {
    return getActiveSchema();
  }

  /**
   * Create a new WorkspaceService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new workspace
   *
   * @param input - Workspace creation data
   * @returns Promise resolving to created workspace
   * @throws {WorkspaceServiceError} If validation fails
   */
  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    // Validate input using Zod schema
    const validated = createWorkspaceSchema.parse(input);

    const id = nanoid();
    const now = new Date();

    const [workspace] = await this.db
      .insert(this.schema.workspaces)
      .values({
        id,
        name: validated.name.trim(),
        created_at: now,
        updated_at: now,
      })
      .returning();

    return workspace;
  }

  /**
   * Activate workspace after owner email verification
   * @param workspaceId - Workspace ID to activate
   */
  async activateWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    await this.db
      .update(this.schema.workspaces)
      .set({ status: 'active', updated_at: new Date() })
      .where(eq(this.schema.workspaces.id, workspaceId));
  }

  /**
   * Check if workspace is active
   * @param workspaceId - Workspace ID to check
   */
  async isWorkspaceActive(workspaceId: string): Promise<boolean> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.id, workspaceId),
    });

    return workspace != null && workspace.status === 'active';
  }

  /**
   * Find workspace by ID
   *
   * @param id - Workspace ID
   * @returns Promise resolving to workspace or null if not found
   */
  async findById(id: string): Promise<Workspace | null> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.id, id),
    });

    return workspace ?? null;
  }

  /**
   * Delete workspace and all associated data
   *
   * Note: Due to ON DELETE CASCADE constraints, deleting a workspace will
   * automatically delete all related data (users, categories, transactions, etc.)
   *
   * @param id - Workspace ID to delete
   * @throws {WorkspaceServiceError} If workspace not found
   */
  async delete(id: string): Promise<void> {
    // Check if workspace exists
    const workspace = await this.findById(id);
    if (!workspace) {
      throw new WorkspaceServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    // Delete workspace (cascades to all related data)
    await this.db.delete(this.schema.workspaces).where(eq(this.schema.workspaces.id, id));
  }

  /**
   * Get all members of a workspace
   *
   * Returns users who belong to the workspace and are not soft-deleted.
   *
   * @param workspaceId - Workspace ID
   * @returns Promise resolving to array of workspace members
   * @throws {WorkspaceServiceError} If workspace not found
   */
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    // Check if workspace exists
    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    // Get all non-deleted users in the workspace
    const members = await this.db.query.users.findMany({
      where: and(
        eq(this.schema.users.workspace_id, workspaceId),
        isNull(this.schema.users.deleted_at)
      ),
    });

    // Map to exclude password_hash for security
    return members.map(({ password_hash: _, ...member }) => member);
  }

  /**
   * Update workspace name
   *
   * @param id - Workspace ID
   * @param name - New workspace name
   * @returns Promise resolving to updated workspace
   * @throws {WorkspaceServiceError} If workspace not found or validation fails
   */
  async updateName(id: string, name: string): Promise<Workspace> {
    // Validate input
    const validated = updateWorkspaceNameSchema.parse({ name });

    // Check if workspace exists
    const workspace = await this.findById(id);
    if (!workspace) {
      throw new WorkspaceServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }

    // Update workspace name
    await this.db
      .update(this.schema.workspaces)
      .set({
        name: validated.name.trim(),
        updated_at: new Date(),
      })
      .where(eq(this.schema.workspaces.id, id));

    // Return updated workspace
    const updated = await this.findById(id);
    return updated!;
  }

  /**
   * Get onboarding completion status for a workspace
   *
   * Checks whether each setup step has been completed by querying existing data.
   * No stored onboarding state — purely derived from data presence.
   *
   * @param workspaceId - Workspace ID
   * @returns OnboardingStatus with boolean for each step
   */
  async getOnboardingStatus(workspaceId: string): Promise<OnboardingStatus> {
    // Run all 5 checks in parallel for performance
    const [currencyMeta, expenseCategory, nonZeroBudget, asset, transaction] = await Promise.all([
      // 1. Currency: workspace meta has an explicit currency entry
      this.db.query.workspaceMeta.findFirst({
        where: and(
          eq(this.schema.workspaceMeta.workspace_id, workspaceId),
          eq(this.schema.workspaceMeta.meta_key, 'currency')
        ),
        columns: { id: true },
      }),

      // 2. Categories: at least 1 active expense category
      this.db.query.categories.findFirst({
        where: and(
          eq(this.schema.categories.workspace_id, workspaceId),
          eq(this.schema.categories.type, 'expense'),
          eq(this.schema.categories.is_active, true)
        ),
        columns: { id: true },
      }),

      // 3. Budgets: current month has at least 1 budget with non-zero amount
      (() => {
        const now = new Date();
        return this.db.query.budgets.findFirst({
          where: and(
            eq(this.schema.budgets.workspace_id, workspaceId),
            eq(this.schema.budgets.month, now.getMonth() + 1),
            eq(this.schema.budgets.year, now.getFullYear()),
            sql`CAST(${this.schema.budgets.budget_amount} AS NUMERIC) > 0`
          ),
          columns: { id: true },
        });
      })(),

      // 4. Assets: at least 1 non-deleted asset
      this.db.query.assets.findFirst({
        where: and(
          eq(this.schema.assets.workspace_id, workspaceId),
          isNull(this.schema.assets.deleted_at)
        ),
        columns: { id: true },
      }),

      // 5. Transactions: at least 1 non-deleted transaction
      this.db.query.transactions.findFirst({
        where: and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          isNull(this.schema.transactions.deleted_at)
        ),
        columns: { id: true },
      }),
    ]);

    return {
      currency: !!currencyMeta,
      categories: !!expenseCategory,
      budgets: !!nonZeroBudget,
      assets: !!asset,
      transactions: !!transaction,
    };
  }
}
