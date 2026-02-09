/**
 * Workspace Invitation Service
 *
 * Manages workspace invitations for adding new members.
 * Handles invitation creation, acceptance, cancellation, and resending.
 *
 * Security features:
 * - Secure 64-character tokens using nanoid
 * - 7-day expiration for invitations
 * - One-time use tokens (marked as accepted after use)
 *
 * Error codes:
 * - WORKSPACE_NOT_FOUND: Workspace doesn't exist
 * - INVITATION_NOT_FOUND: Invitation doesn't exist
 * - INVITATION_EXPIRED: Invitation has expired
 * - INVITATION_ALREADY_ACCEPTED: Invitation was already used
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { workspaceInvitations as workspaceInvitationsSchema } from '@/db/schema/sqlite';
import { eq, and, isNull, gt, desc } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('workspace-invitation');
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { WorkspaceInvitationServiceError, ServiceErrorCode } from './service-errors';
import { emailService } from '@/services';

/**
 * Invitation expiration time in milliseconds (7 days)
 */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Secure token length for invitations
 */
const TOKEN_LENGTH = 64;

/**
 * Get base URL from environment or use default
 *
 * Note: Uses import.meta.env because Astro/Vite only populates
 * import.meta.env from .env files, not process.env.
 */
function getBaseUrl(): string {
  return (
    import.meta.env.PUBLIC_BASE_URL ||
    import.meta.env.PUBLIC_API_URL?.replace('/api', '') ||
    'http://localhost:4321'
  );
}

/**
 * Zod schemas for invitation service validation
 */
export const createInvitationSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
  invitedByUserId: z.string().min(1, 'Invited by user ID is required'),
  role: z.enum(['admin', 'member']),
});

/**
 * Input types inferred from Zod schemas
 */
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

/**
 * Invitation type inferred from schema
 */
export type WorkspaceInvitation = typeof workspaceInvitationsSchema.$inferSelect;

/**
 * Workspace Invitation Service
 */
export class WorkspaceInvitationService {
  private get schema() {
    return getActiveSchema();
  }

  /**
   * Create a new WorkspaceInvitationService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new workspace invitation
   *
   * Generates a secure token and sets expiration to 7 days from now.
   *
   * @param input - Invitation creation data
   * @returns Promise resolving to created invitation
   * @throws {WorkspaceInvitationServiceError} If workspace not found or validation fails
   */
  async create(input: CreateInvitationInput): Promise<WorkspaceInvitation> {
    // Validate input using Zod schema
    const validated = createInvitationSchema.parse(input);

    // Check if workspace exists
    await this.ensureWorkspaceExists(validated.workspaceId);

    const id = nanoid();
    const token = nanoid(TOKEN_LENGTH); // 64-character secure token
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_MS);

    const [invitation] = await this.db
      .insert(this.schema.workspaceInvitations)
      .values({
        id,
        workspace_id: validated.workspaceId,
        email: validated.email.toLowerCase(),
        token,
        invited_by_user_id: validated.invitedByUserId,
        role: validated.role,
        expires_at: expiresAt,
        accepted_at: null,
        created_at: now,
      })
      .returning();

    // Send invitation email
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  /**
   * Find invitation by token
   *
   * @param token - Invitation token
   * @returns Promise resolving to invitation or null if not found
   */
  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const invitation = await this.db.query.workspaceInvitations.findFirst({
      where: eq(this.schema.workspaceInvitations.token, token),
    });

    return invitation ?? null;
  }

  /**
   * Find invitation by ID
   *
   * @param id - Invitation ID
   * @returns Promise resolving to invitation or null if not found
   */
  async findById(id: string): Promise<WorkspaceInvitation | null> {
    const invitation = await this.db.query.workspaceInvitations.findFirst({
      where: eq(this.schema.workspaceInvitations.id, id),
    });

    return invitation ?? null;
  }

  /**
   * Find all pending invitations for a workspace
   *
   * Returns invitations that:
   * - Have not been accepted (accepted_at is null)
   * - Have not expired (expires_at > now)
   *
   * @param workspaceId - Workspace ID
   * @returns Promise resolving to array of pending invitations
   * @throws {WorkspaceInvitationServiceError} If workspace not found
   */
  async findPendingByWorkspace(workspaceId: string): Promise<WorkspaceInvitation[]> {
    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    const now = new Date();

    const invitations = await this.db.query.workspaceInvitations.findMany({
      where: and(
        eq(this.schema.workspaceInvitations.workspace_id, workspaceId),
        isNull(this.schema.workspaceInvitations.accepted_at),
        gt(this.schema.workspaceInvitations.expires_at, now)
      ),
      orderBy: [desc(this.schema.workspaceInvitations.created_at)],
    });

    return invitations;
  }

  /**
   * Accept an invitation
   *
   * Marks the invitation as accepted by setting accepted_at timestamp.
   * The actual user creation and workspace membership should be handled
   * by the calling code (e.g., auth service during signup).
   *
   * @param token - Invitation token
   * @throws {WorkspaceInvitationServiceError} If invitation not found, expired, or already accepted
   */
  async accept(token: string): Promise<void> {
    // Find invitation
    const invitation = await this.findByToken(token);

    if (!invitation) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_NOT_FOUND,
        'Invitation not found',
        404
      );
    }

    // Check if already accepted
    if (invitation.accepted_at !== null) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_ALREADY_ACCEPTED,
        'Invitation has already been accepted',
        400
      );
    }

    // Check if expired
    const now = new Date();
    if (invitation.expires_at < now) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_EXPIRED,
        'Invitation has expired',
        400
      );
    }

    // Mark as accepted
    await this.db
      .update(this.schema.workspaceInvitations)
      .set({
        accepted_at: now,
      })
      .where(eq(this.schema.workspaceInvitations.token, token));
  }

  /**
   * Cancel (delete) an invitation
   *
   * @param id - Invitation ID
   * @throws {WorkspaceInvitationServiceError} If invitation not found
   */
  async cancel(id: string): Promise<void> {
    // Check if invitation exists
    const invitation = await this.findById(id);

    if (!invitation) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_NOT_FOUND,
        'Invitation not found',
        404
      );
    }

    // Delete invitation
    await this.db
      .delete(this.schema.workspaceInvitations)
      .where(eq(this.schema.workspaceInvitations.id, id));
  }

  /**
   * Resend an invitation by extending its expiration
   *
   * Sets the expiration to 7 days from now, effectively extending the invitation.
   *
   * @param id - Invitation ID
   * @throws {WorkspaceInvitationServiceError} If invitation not found or already accepted
   */
  async resend(id: string): Promise<void> {
    // Check if invitation exists
    const invitation = await this.findById(id);

    if (!invitation) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_NOT_FOUND,
        'Invitation not found',
        404
      );
    }

    // Check if already accepted
    if (invitation.accepted_at !== null) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_ALREADY_ACCEPTED,
        'Cannot resend an accepted invitation',
        400
      );
    }

    // Extend expiration
    const newExpiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

    await this.db
      .update(this.schema.workspaceInvitations)
      .set({
        expires_at: newExpiresAt,
      })
      .where(eq(this.schema.workspaceInvitations.id, id));

    // Send invitation email
    await this.sendInvitationEmail({
      ...invitation,
      expires_at: newExpiresAt,
    });
  }

  /**
   * Get invitation details with validation
   *
   * Validates that the invitation exists, is not expired, and has not been accepted.
   * Useful for checking invitation validity before accepting.
   *
   * @param token - Invitation token
   * @returns Promise resolving to invitation
   * @throws {WorkspaceInvitationServiceError} If invitation not found, expired, or already accepted
   */
  async validateAndGet(token: string): Promise<WorkspaceInvitation> {
    // Find invitation
    const invitation = await this.findByToken(token);

    if (!invitation) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_NOT_FOUND,
        'Invitation not found',
        404
      );
    }

    // Check if already accepted
    if (invitation.accepted_at !== null) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_ALREADY_ACCEPTED,
        'Invitation has already been accepted',
        400
      );
    }

    // Check if expired
    const now = new Date();
    if (invitation.expires_at < now) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_EXPIRED,
        'Invitation has expired',
        400
      );
    }

    return invitation;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Check if workspace exists, throw if not
   */
  private async ensureWorkspaceExists(workspaceId: string): Promise<void> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }
  }

  /**
   * Send invitation email to the invitee
   */
  private async sendInvitationEmail(invitation: WorkspaceInvitation): Promise<void> {
    try {
      // Get workspace name
      const workspace = await this.db.query.workspaces.findFirst({
        where: eq(this.schema.workspaces.id, invitation.workspace_id),
      });
      const workspaceName = workspace?.name || 'Unknown Workspace';

      // Get inviter name
      const inviter = await this.db.query.users.findFirst({
        where: eq(this.schema.users.id, invitation.invited_by_user_id),
      });
      const inviterName = inviter?.name || 'A team member';

      // Build invite URL
      const baseUrl = getBaseUrl();
      const inviteUrl = `${baseUrl}/invite?token=${invitation.token}`;

      // Calculate expiration time
      const expiresIn = '7 days';

      await emailService.sendWorkspaceInvitation(invitation.workspace_id, {
        to: invitation.email,
        inviterName,
        workspaceName,
        inviteUrl,
        expiresIn,
      });
    } catch (emailError) {
      // Log email error but don't fail the invitation creation
      log.error('email sending failed:', emailError);
    }
  }
}
