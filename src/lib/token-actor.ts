/**
 * Request-scoped token (app password or OAuth MCP token) acting on the user's behalf.
 * Write limits authorize against it, and every audit_logs insert spreads auditActorFields().
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { McpAuthContext } from '@/lib/mcp-auth';

export type TokenActor = Pick<
  McpAuthContext,
  'kind' | 'tokenId' | 'tokenName' | 'userId' | 'workspaceId' | 'limits'
>;

export interface AuditActorFields {
  actor_token_id: string | null;
  actor_token_kind: TokenActor['kind'] | null;
  actor_token_name: string | null;
}

const actorStorage = new AsyncLocalStorage<TokenActor>();

export function runWithTokenActor<T>(actor: TokenActor, fn: () => T): T {
  return actorStorage.run(actor, fn);
}

/** The token acting in this request, or undefined for session requests and seeds. */
export function currentTokenActor(): TokenActor | undefined {
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
