/**
 * Records a token's refused request in the audit log: at most one row per token and subject,
 * and at most five per token, every 10 minutes, so retries cannot flood the user's activity.
 */

import { and, desc, eq, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db as defaultDb, getActiveSchema, runTransaction, type Database } from '@/db';
import { auditActorFields, auditActorFromAuth, runWithAuditActor } from '@/lib/audit-actor';
import { getCacheManager, type CacheManager } from '@/lib/cache';
import { logError } from '@/lib/logger';
import type { McpAuthContext } from '@/lib/mcp-auth';
import type { Permission } from '@/lib/permissions/registry';

const DENIAL_WINDOW_SECONDS = 600;
const MAX_DENIALS_PER_WINDOW = 5;

type DenyingToken = Pick<
  McpAuthContext,
  'kind' | 'tokenId' | 'tokenName' | 'userId' | 'workspaceId'
>;

/** A missing permission, a route or method off the allowlist, or an MCP tool (`tool:unknown` if unmapped). */
export type TokenDenialSubject = Permission | 'route:unlisted' | `tool:${string}`;

export interface TokenDenial {
  subject: TokenDenialSubject;
  details: Record<string, unknown>;
}

interface TokenDenialDeps {
  cache?: Pick<CacheManager, 'increment'>;
  database?: Database;
}

// A cache hit saves the database lookup. Drivers that fail answer 1, so a miss proves nothing.
async function seenInCache(key: string, cache: TokenDenialDeps['cache']): Promise<boolean> {
  try {
    return (await (cache ?? getCacheManager()).increment(key, DENIAL_WINDOW_SECONDS)) > 1;
  } catch (error) {
    logError('Token denial cache lookup failed', error);
    return false;
  }
}

function subjectOf(newValue: string | null): unknown {
  try {
    return newValue ? (JSON.parse(newValue) as { subject?: unknown }).subject : undefined;
  } catch {
    return undefined;
  }
}

/** Inserts the row unless the window already holds this subject or the token's cap; check and insert share one transaction. */
function insertWithinBounds(database: Database, token: DenyingToken, denial: TokenDenial): void {
  const { auditLogs } = getActiveSchema();
  const now = new Date();
  const windowStart = new Date(now.getTime() - DENIAL_WINDOW_SECONDS * 1000);

  runTransaction(database, (tx) => {
    const recent = tx
      .select({ newValue: auditLogs.new_value })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.actor_token_id, token.tokenId),
          eq(auditLogs.action, 'token_denied'),
          gte(auditLogs.created_at, windowStart)
        )
      )
      .orderBy(desc(auditLogs.created_at))
      .limit(MAX_DENIALS_PER_WINDOW)
      .all();
    if (recent.length >= MAX_DENIALS_PER_WINDOW) return;
    if (recent.some((row) => subjectOf(row.newValue) === denial.subject)) return;

    tx.insert(auditLogs)
      .values({
        id: nanoid(),
        workspace_id: token.workspaceId,
        user_id: token.userId,
        action: 'token_denied',
        entity_type: token.kind === 'oauth' ? 'mcp_token' : 'app_password',
        entity_id: token.tokenId,
        new_value: JSON.stringify({ subject: denial.subject, ...denial.details }),
        created_at: now,
        ...auditActorFields(),
      })
      .run();
  });
}

export async function recordTokenDenial(
  token: DenyingToken,
  denial: TokenDenial,
  deps: TokenDenialDeps = {}
): Promise<void> {
  if (await seenInCache(`audit-denial:${token.tokenId}:${denial.subject}`, deps.cache)) return;

  try {
    runWithAuditActor(auditActorFromAuth(token), () =>
      insertWithinBounds(deps.database ?? defaultDb, token, denial)
    );
  } catch (error) {
    // The refusal itself must still reach the caller, so a failed audit write is only logged.
    logError('Failed to record token denial', error);
  }
}
