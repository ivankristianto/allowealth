import type { APIRoute } from 'astro';
import { workspaceService, userService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { WorkspaceServiceError, UserServiceError } from '@/services/service-errors';

/**
 * GET /api/workspace/members
 *
 * Retrieves all members of the current workspace.
 * Available to all workspace members.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Get workspace members
    const members = await workspaceService.getMembers(auth.workspaceId);

    // Map to safe response format (excluding sensitive data)
    const membersResponse = members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.created_at,
    }));

    return successResponse({
      members: membersResponse,
      total: membersResponse.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching workspace members', error);
    return errorResponse('Failed to fetch workspace members', 500);
  }
};

/**
 * DELETE /api/workspace/members/:id
 *
 * Remove a member from the workspace (soft delete).
 * Admin only. Cannot remove yourself.
 *
 * Note: This endpoint is at /api/workspace/members with member ID in query params
 * since Astro's file-based routing doesn't support nested dynamic routes easily.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    // Check admin role
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    // Get member ID from query params
    const memberId = url.searchParams.get('memberId');
    if (!memberId) {
      return errorResponse('Member ID is required', 400, 'MISSING_MEMBER_ID');
    }

    // Cannot remove yourself
    if (memberId === auth.userId) {
      return errorResponse('Cannot remove yourself from the workspace', 400, 'CANNOT_REMOVE_SELF');
    }

    // Verify the member belongs to this workspace before deleting
    const members = await workspaceService.getMembers(auth.workspaceId);
    const member = members.find((m) => m.id === memberId);

    if (!member) {
      return errorResponse('Member not found in this workspace', 404, 'NOT_FOUND');
    }

    // Soft delete the user
    await userService.softDelete(memberId);

    return successResponse({ message: 'Member removed successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceServiceError || error instanceof UserServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error removing workspace member', error);
    return errorResponse('Failed to remove workspace member', 500);
  }
};
