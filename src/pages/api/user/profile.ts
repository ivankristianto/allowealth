import type { APIRoute } from 'astro';
import { db, getActiveSchema } from '@/db';
import { userService, userMetaService, emailVerificationService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserServiceError, UserMetaServiceError } from '@/services/service-errors';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { and, eq } from 'drizzle-orm';
import { email, maxLength, minLength, object, optional, pipe, string } from 'valibot';
import { securityActivityService } from '@/services/security-activity.service';

/**
 * Schema for PUT request body - all profile fields in one request
 */
const updateFullProfileSchema = object({
  name: pipe(
    string(),
    minLength(1, 'Name is required'),
    maxLength(100, 'Name must be at most 100 characters')
  ),
  email: pipe(string(), email('Invalid email format')),
  phone: optional(pipe(string(), maxLength(50, 'Phone must be at most 50 characters')), ''),
});

/**
 * GET /api/user/profile
 *
 * Retrieves the current authenticated user's profile data including meta.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const user = await userService.getById(auth.userId);

    if (!user) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user settings from meta
    const settings = await userMetaService.getUserSettings(auth.userId);
    const pendingEmail = await emailVerificationService.getPendingEmailChange(auth.userId);

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: settings.phone,
      ...(pendingEmail && { pendingEmail }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching user profile', error);
    return errorResponse('Failed to fetch profile', 500);
  }
};

/**
 * PUT /api/user/profile
 *
 * Updates all profile fields in one request:
 * - name -> users table
 * - email -> verification flow (pending change + token)
 * - phone -> user_meta table
 *
 * @example
 * Request:
 * ```json
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "+1234567890"
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateFullProfileSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, email, phone } = validation.data;
    const currentUser = await userService.getById(auth.userId);

    if (!currentUser) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    let pendingEmail: string | undefined;
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== currentUser.email.toLowerCase()) {
      await emailVerificationService.requestEmailChange(auth.userId, normalizedEmail);
      pendingEmail = normalizedEmail;
    } else {
      const existingPending = await emailVerificationService.getPendingEmailChange(auth.userId);

      if (existingPending) {
        const schema = getActiveSchema();
        await db
          .delete(schema.userMeta)
          .where(
            and(
              eq(schema.userMeta.user_id, auth.userId),
              eq(schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
            )
          );

        await db
          .delete(schema.emailVerificationTokens)
          .where(eq(schema.emailVerificationTokens.user_id, auth.userId));
      }
    }

    // Track what changed for audit log
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    let hasProfileChanges = false;

    if (name !== currentUser.name) {
      oldValues.name = currentUser.name;
      newValues.name = name;
      hasProfileChanges = true;
    }

    const currentSettings = await userMetaService.getUserSettings(auth.userId);
    if (phone !== undefined && phone !== currentSettings.phone) {
      oldValues.phone = currentSettings.phone;
      newValues.phone = phone;
      hasProfileChanges = true;
    }

    // Update user table (name only; email changes are verification-driven)
    const user = await userService.updateProfile(auth.userId, { name });

    // Update meta values (phone)
    const metaPromises: Promise<void>[] = [];

    if (phone !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'phone', phone));
    }

    await Promise.all(metaPromises);

    // Log profile update if something changed
    if (hasProfileChanges) {
      await securityActivityService.logEvent({
        type: 'profile_updated',
        userId: auth.userId,
        oldValue: oldValues,
        newValue: newValues,
      });
    }

    // Log email change request
    if (pendingEmail) {
      await securityActivityService.logEvent({
        type: 'email_change_requested',
        userId: auth.userId,
        oldValue: { email: currentUser.email },
        newValue: { pendingEmail },
      });
    }

    // Get updated settings
    const settings = await userMetaService.getUserSettings(auth.userId);

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: settings.phone,
      ...(pendingEmail && { pendingEmail }),
      ...(pendingEmail && { message: `Verification email sent to ${pendingEmail}` }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error updating user profile', error);
    return errorResponse('Failed to update profile', 500);
  }
};
