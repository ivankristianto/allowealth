/**
 * Request-scoped record of the token (app password or OAuth MCP token) acting on the user's behalf.
 * Every insert into audit_logs spreads auditActorFields(), so the row says which token made it.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { McpAuthContext } from '@/lib/mcp-auth';

export interface AuditActor {
  tokenId: string;
  kind: McpAuthContext['kind'];
  name: string;
}

export interface AuditActorFields {
  actor_token_id: string | null;
  actor_token_kind: AuditActor['kind'] | null;
  actor_token_name: string | null;
}

const actorStorage = new AsyncLocalStorage<AuditActor>();

export function runWithAuditActor<T>(actor: AuditActor, fn: () => T): T {
  return actorStorage.run(actor, fn);
}

/** The acting token's columns for an audit_logs row; all null for session requests and seeds. */
export function auditActorFields(): AuditActorFields {
  const actor = actorStorage.getStore();
  return {
    actor_token_id: actor?.tokenId ?? null,
    actor_token_kind: actor?.kind ?? null,
    actor_token_name: actor?.name ?? null,
  };
}

export function auditActorFromAuth(
  auth: Pick<McpAuthContext, 'tokenId' | 'kind' | 'tokenName'>
): AuditActor {
  return { tokenId: auth.tokenId, kind: auth.kind, name: auth.tokenName };
}
