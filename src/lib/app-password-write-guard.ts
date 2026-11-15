import { errorResponse } from '@/lib/api-utils';
import { isDemoMode } from '@/lib/demo-mode';
import { APP_PASSWORD_WRITE_RATE_LIMIT, isRecentSignIn } from '@/lib/mcp-app-password';
import { checkRateLimitByKey, createRateLimitResponse } from '@/lib/rate-limit';

export type AppPasswordWrite = 'create' | 'update';

const WRITE_COPY: Readonly<Record<AppPasswordWrite, { verb: string; rateLimited: string }>> = {
  create: { verb: 'create', rateLimited: 'Too many app passwords created. Try again later.' },
  update: { verb: 'change', rateLimited: 'Too many app password changes. Try again later.' },
};

/**
 * Refuses a create or edit in demo mode, from a session older than the reauth window, or over
 * the per-user rate limit (one bucket per kind of write). Returns null when the write may go on.
 */
export function refuseAppPasswordWrite(
  write: AppPasswordWrite,
  userId: string,
  session: { createdAt: Date | string | number }
): Response | null {
  if (isDemoMode()) return errorResponse('App passwords are disabled in demo mode', 403);

  if (!isRecentSignIn(session.createdAt)) {
    return errorResponse(
      `Sign in again to ${WRITE_COPY[write].verb} an app password. This needs a sign-in from the last 15 minutes.`,
      403,
      'REAUTH_REQUIRED'
    );
  }

  const rateLimit = checkRateLimitByKey(
    `app-password-${write}:${userId}`,
    APP_PASSWORD_WRITE_RATE_LIMIT
  );
  if (!rateLimit.allowed) return createRateLimitResponse(rateLimit, WRITE_COPY[write].rateLimited);

  return null;
}
