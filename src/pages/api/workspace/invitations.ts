import type { APIRoute } from 'astro';
import { workspaceInvitationService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { WorkspaceInvitationServiceError } from '@/services/service-errors';
import { z } from 'zod';

/**
 * Schema for POST request body - create invitation
 */
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member']).default('member'),
});

/**
 * GET /api/workspace/invitations
 *
 * Retrieves all pending invitations for the current workspace.
 * Available to all workspace members.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Get pending invitations
    const invitations = await workspaceInvitationService.findPendingByWorkspace(auth.workspaceId);

    // Map to safe response format
    const invitationsResponse = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }));

    return successResponse({
      invitations: invitationsResponse,
      total: invitationsResponse.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceInvitationServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching workspace invitations', error);
    return errorResponse('Failed to fetch workspace invitations', 500);
  }
};

/**
 * POST /api/workspace/invitations
 *
 * Create a new workspace invitation.
 * Admin only.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Check admin role
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    const validation = await validateBody(context.request, createInvitationSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Create invitation
    const invitation = await workspaceInvitationService.create({
      workspaceId: auth.workspaceId,
      email: validation.data.email,
      role: validation.data.role,
      invitedByUserId: auth.userId,
    });

    return successResponse(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceInvitationServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error creating workspace invitation', error);
    return errorResponse('Failed to create workspace invitation', 500);
  }
};

/**
 * DELETE /api/workspace/invitations
 *
 * Cancel (delete) a workspace invitation.
 * Admin only.
 *
 * Query params:
 * - invitationId: string (required) - The invitation ID to cancel
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    // Check admin role
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    // Get invitation ID from query params
    const invitationId = url.searchParams.get('invitationId');
    if (!invitationId) {
      return errorResponse('Invitation ID is required', 400, 'MISSING_INVITATION_ID');
    }

    // Verify the invitation belongs to this workspace before canceling
    const invitation = await workspaceInvitationService.findById(invitationId);

    if (!invitation || invitation.workspace_id !== auth.workspaceId) {
      return errorResponse('Invitation not found', 404, 'NOT_FOUND');
    }

    // Cancel (delete) the invitation
    await workspaceInvitationService.cancel(invitationId);

    return successResponse({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceInvitationServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error cancelling workspace invitation', error);
    return errorResponse('Failed to cancel workspace invitation', 500);
  }
};
