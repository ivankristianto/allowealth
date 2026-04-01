import type { APIRoute } from 'astro';
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils';
import { MigrationService } from '@/services/migration.service';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/upgrade/run
 *
 * Triggers database migrations synchronously. Blocks until complete.
 * Returns success/error result to the client.
 *
 * Returns 501 for Cloudflare/Vercel/Netlify deployments — use CLI instead.
 *
 * Any authenticated user. Requires x-csrf-token header (enforced by csrf middleware).
 */
export const POST: APIRoute = async (context) => {
  try {
    // Any authenticated user can trigger migrations — the SQL is deterministic
    // and idempotent, shipped with the app code. No user input flows into it.
    getAuthenticatedUser(context);

    const result = await MigrationService.runMigrations();

    if (!result.success) {
      logError('Migration run failed', result.error);
      // Workers deployments return a specific message; surface as 501
      const isNotSupported = result.error?.includes('not supported in this deployment');
      const status = isNotSupported ? 501 : 500;
      const code = isNotSupported ? 'NOT_IMPLEMENTED' : 'MIGRATION_RUN_ERROR';
      return errorResponse(result.error ?? 'Migration failed', status, code);
    }

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    logError('Unexpected error running migrations', error);
    return errorResponse('Unexpected error running migrations', 500, 'MIGRATION_RUN_ERROR');
  }
};
