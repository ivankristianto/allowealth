/**
 * Request-scoped record of the token (app password or OAuth MCP token) acting on the user's behalf.
 * Every insert into audit_logs spreads auditActorFields(), and write limits read the token's limits here.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { McpAuthContext } from '@/lib/mcp-auth';

export type AuditActor = Pick<
  McpAuthContext,
  'kind' | 'tokenId' | 'tokenName' | 'userId' | 'workspaceId' | 'limits'
>;

export interface AuditActorFields {
  actor_token_id: string | null;
  actor_token_kind: AuditActor['kind'] | null;
  actor_token_name: string | null;
}

const actorStorage = new AsyncLocalStorage<AuditActor>();

export function runWithAuditActor<T>(actor: AuditActor, fn: () => T): T {
  return actorStorage.run(actor, fn);
}

/** The token acting in this request, or undefined for session requests and seeds. */
export function currentAuditActor(): AuditActor | undefined {
  return actorStorage.getStore();
}

/** The acting token's columns for an audit_logs row; all null for session requests and seeds. */
export function auditActorFields(): AuditActorFields {
  const actor = actorStorage.getStore();
  return {
    actor_token_id: actor?.tokenId ?? null,
    actor_token_kind: actor?.kind ?? null,
    actor_token_name: actor?.tokenName ?? null,
  };
}

export function auditActorFromAuth(auth: AuditActor): AuditActor {
  const { kind, tokenId, tokenName, userId, workspaceId, limits } = auth;
  return { kind, tokenId, tokenName, userId, workspaceId, limits };
}
