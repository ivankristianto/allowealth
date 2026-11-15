/**
 * Authenticates `Bearer aw_pat_...` requests to routes in APP_PASSWORD_REST_ROUTES.
 * A verified request ignores cookies and skips CSRF: browsers never send Authorization unasked.
 */

import type { MiddlewareHandler } from 'astro';
import { errorResponse } from '@/lib/api-utils';
import { authorizeAppPasswordRequest } from '@/lib/app-password-rest-access';
import { auditActorFromAuth, runWithAuditActor } from '@/lib/audit-actor';
import { hydrateUser } from '@/lib/auth/hydrate-user';
import { createLogger, logError } from '@/lib/logger';
import { isAppPasswordToken } from '@/lib/mcp-app-password';
import { checkMcpRateLimit } from '@/lib/mcp-rate-limit';
import { applyRateLimitHeaders, createRateLimitResponse } from '@/lib/rate-limit';
import { recordTokenDenial } from '@/lib/token-denial-audit';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';

const log = createLogger('app-password-auth');

const REST_RATE_LIMIT_ENDPOINT = 'api-rest';
const AUTH_API_PREFIX = '/api/auth/';
const MCP_PATH = '/api/mcp';
const MAX_RECORDED_METHOD_LENGTH = 16;
const MAX_RECORDED_PATH_LENGTH = 200;

/** Returns the Bearer credential, '' for an empty one, or null when there is no Bearer header. */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const match = /^Bearer(?:\s+(.*))?$/i.exec(header.trim());
  if (!match) return null;
  return (match[1] ?? '').trim();
}

function isMcpPath(pathname: string): boolean {
  return pathname === MCP_PATH || pathname.startsWith(`${MCP_PATH}/`);
}

function unauthorized(): Response {
  return errorResponse('Invalid, expired or revoked app password', 401, 'APP_PASSWORD_INVALID');
}

export const appPasswordAuthentication: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;
  if (context.isPrerendered || !pathname.startsWith('/api/') || isMcpPath(pathname)) {
    return next();
  }

  const token = extractBearerToken(context.request);
  if (token === null) {
    return next();
  }

  if (!isAppPasswordToken(token)) {
    // Better Auth's OAuth provider endpoints read their own Bearer tokens.
    if (pathname.startsWith(AUTH_API_PREFIX)) return next();
    return errorResponse(
      'Only app passwords (aw_pat_...) can be used as Bearer tokens on the REST API',
      401,
      'APP_PASSWORD_INVALID'
    );
  }

  let verified: Awaited<ReturnType<typeof mcpAppPasswordService.verify>>;
  let hydrated: Awaited<ReturnType<typeof hydrateUser>>;
  try {
    verified = await mcpAppPasswordService.verify(token);
    hydrated = verified ? await hydrateUser(verified.userId) : null;
  } catch (error) {
    const errorId = logError('App password validation error', error);
    return errorResponse('Failed to validate app password', 500, 'INTERNAL_ERROR', { errorId });
  }

  const user = hydrated?.user;
  if (
    !verified ||
    !hydrated ||
    !user ||
    user.deletedAt ||
    user.workspaceId !== verified.workspaceId
  ) {
    return unauthorized();
  }

  if (hydrated.workspaceInactive) {
    return errorResponse('This workspace has been archived', 403, 'WORKSPACE_INACTIVE');
  }

  const rateLimit = await checkMcpRateLimit(verified.tokenId, {
    endpointId: REST_RATE_LIMIT_ENDPOINT,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit, 'Too many API requests for this app password.');
  }

  const { permissions } = verified;
  const decision = authorizeAppPasswordRequest(context.request.method, pathname, permissions);
  if (!decision.allowed) {
    log.warn('App password request denied', {
      tokenId: verified.tokenId,
      method: context.request.method,
      path: pathname,
      code: decision.code,
      ...decision.details,
    });
    await recordTokenDenial(verified, {
      subject:
        decision.code === 'APP_PASSWORD_PERMISSION_MISSING'
          ? decision.details.permission
          : 'route:unlisted',
      details: {
        method: context.request.method.slice(0, MAX_RECORDED_METHOD_LENGTH),
        path: pathname.slice(0, MAX_RECORDED_PATH_LENGTH),
        ...decision.details,
      },
    });
    return applyRateLimitHeaders(
      errorResponse(decision.message, 403, decision.code, decision.details),
      rateLimit
    );
  }

  context.locals.user = user;
  context.locals.session = null;
  context.locals.appPassword = { tokenId: verified.tokenId, permissions };

  const response = await runWithAuditActor(auditActorFromAuth(verified), next);
  try {
    response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime));
  } catch {
    // Immutable headers (e.g. Response.redirect): rebuilding would drop Astro's cookie attachment.
  }
  return response;
};
