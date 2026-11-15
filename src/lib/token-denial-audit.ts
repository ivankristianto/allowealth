/**
 * Records a token's permission denial in the audit log, at most once per token and
 * permission (or tool) every 10 minutes, so retries do not flood the user's activity.
 */

import { auditActorFromAuth, runWithAuditActor } from '@/lib/audit-actor';
import { logAuditEvent } from '@/lib/audit-log';
import { getCacheManager } from '@/lib/cache';
import { logError } from '@/lib/logger';
import type { McpAuthContext } from '@/lib/mcp-auth';

const DENIAL_WINDOW_SECONDS = 600;

type DenyingToken = Pick<
  McpAuthContext,
  'kind' | 'tokenId' | 'tokenName' | 'userId' | 'workspaceId'
>;

interface TokenDenial {
  /** What was refused: a permission for REST, a tool name for MCP. Must come from a fixed set. */
  subject: string;
  details: Record<string, unknown>;
}

async function isFirstInWindow(key: string): Promise<boolean> {
  try {
    return (await getCacheManager().increment(key, DENIAL_WINDOW_SECONDS)) === 1;
  } catch (error) {
    // Without the dedupe the denial goes unrecorded; the warning log still has it.
    logError('Could not rate limit the token denial audit event', error);
    return false;
  }
}

export async function recordTokenDenial(token: DenyingToken, denial: TokenDenial): Promise<void> {
  if (!(await isFirstInWindow(`audit-denial:${token.tokenId}:${denial.subject}`))) return;

  await runWithAuditActor(auditActorFromAuth(token), () =>
    logAuditEvent({
      workspaceId: token.workspaceId,
      userId: token.userId,
      action: 'app_password_denied',
      entityType: token.kind === 'oauth' ? 'mcp_token' : 'app_password',
      entityId: token.tokenId,
      newValue: denial.details,
    })
  );
}
