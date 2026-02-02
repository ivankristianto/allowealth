import type { APIRoute } from 'astro';
import { workspaceMetaService, workspaceService, emailService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { WorkspaceMetaServiceError, WorkspaceServiceError } from '@/services/service-errors';
import { EmailServiceError } from '@/services/email';
import { z } from 'zod';
import { encrypt } from '@/lib/crypto/encryption';

/**
 * Schema for PUT request body - email settings update
 */
const updateEmailSettingsSchema = z.object({
  provider: z.enum(['sendgrid', 'resend']).optional(),
  apiKey: z.string().optional(),
  senderName: z.string().min(1).max(100).optional(),
  senderAddress: z
    .string()
    .min(1)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address')
    .optional(),
});

/**
 * GET /api/workspace/email-settings
 *
 * Retrieves email configuration for the workspace.
 * Returns provider and sender info, but NOT the API key (for security).
 * Admin only.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    const settings = await workspaceMetaService.getEmailSettings(auth.workspaceId);
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);

    return successResponse({
      provider: settings.provider,
      senderName: settings.senderName,
      senderAddress: settings.senderAddress,
      hasApiKey: !!settings.apiKey,
      isConfigured,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching email settings', error);
    return errorResponse('Failed to fetch email settings', 500);
  }
};

/**
 * PUT /api/workspace/email-settings
 *
 * Updates email configuration for the workspace.
 * Admin only.
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    const validation = await validateBody(context.request, updateEmailSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { provider, apiKey, senderName, senderAddress } = validation.data;

    // Update individual settings
    if (provider !== undefined) {
      await workspaceMetaService.setEmailProvider(auth.workspaceId, provider);
    }
    if (apiKey !== undefined) {
      // Encrypt the API key before storing
      const encryptedApiKey = encrypt(apiKey);
      await workspaceMetaService.setEmailApiKey(auth.workspaceId, encryptedApiKey);
    }
    if (senderName !== undefined) {
      await workspaceMetaService.setEmailSenderName(auth.workspaceId, senderName);
    }
    if (senderAddress !== undefined) {
      await workspaceMetaService.setEmailSenderAddress(auth.workspaceId, senderAddress);
    }

    // Get updated settings
    const settings = await workspaceMetaService.getEmailSettings(auth.workspaceId);
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);

    return successResponse({
      provider: settings.provider,
      senderName: settings.senderName,
      senderAddress: settings.senderAddress,
      hasApiKey: !!settings.apiKey,
      isConfigured,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating email settings', error);
    return errorResponse('Failed to update email settings', 500);
  }
};

/**
 * POST /api/workspace/email-settings
 *
 * Sends a test email to the current user.
 * Admin only.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    // Check if email is configured
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);
    if (!isConfigured) {
      return errorResponse(
        'Email is not configured. Please save your settings first.',
        400,
        'EMAIL_NOT_CONFIGURED'
      );
    }

    // Get user email from context.locals.user
    const user = context.locals.user;
    if (!user?.email) {
      return errorResponse('User email not found', 400, 'EMAIL_NOT_FOUND');
    }

    // Get workspace name for email
    const workspace = await workspaceService.findById(auth.workspaceId);
    const workspaceName = workspace?.name || 'Your Workspace';

    // Send test email to current user
    const result = await emailService.sendTest(auth.workspaceId, {
      to: user.email,
      workspaceName,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send test email', 500, 'EMAIL_SEND_FAILED');
    }

    return successResponse({
      message: `Test email sent to ${user.email}`,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof EmailServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    if (error instanceof WorkspaceMetaServiceError || error instanceof WorkspaceServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error sending test email', error);
    return errorResponse('Failed to send test email', 500);
  }
};

/**
 * DELETE /api/workspace/email-settings
 *
 * Clears all email configuration for the workspace.
 * Admin only.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    await workspaceMetaService.clearEmailSettings(auth.workspaceId);

    return successResponse({
      message: 'Email settings cleared',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error clearing email settings', error);
    return errorResponse('Failed to clear email settings', 500);
  }
};
