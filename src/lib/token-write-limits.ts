/**
 * Enforces the acting app password's write limits, so REST and MCP writes share one check.
 * Session requests and OAuth tokens carry no limits, so every check passes for them.
 */

import type { AppPasswordLimitName } from '@/lib/app-password-limits';
import { currentTokenActor, type TokenActor } from '@/lib/token-actor';
import { recordTokenDenial } from '@/lib/token-denial-audit';
import { TokenLimitError } from '@/services/service-errors';

const LIMIT_MESSAGES: Readonly<Record<AppPasswordLimitName, string>> = {
  category: "This app password's category limit does not allow this category.",
  own_transactions:
    "This app password's own transactions limit lets it change only transactions it created.",
};

async function refuse(
  actor: TokenActor,
  limit: AppPasswordLimitName,
  details: Record<string, unknown>
): Promise<never> {
  await recordTokenDenial(actor, { subject: `limit:${limit}`, details: { limit, ...details } });
  throw new TokenLimitError(limit, LIMIT_MESSAGES[limit]);
}

/** Refuses unless every category is on the token's allowlist. Null, a transfer's category, never is. */
export async function assertCategoriesAllowed(
  categoryIds: ReadonlyArray<string | null>
): Promise<void> {
  const actor = currentTokenActor();
  const allowed = actor?.limits.category_ids;
  if (!actor || allowed === undefined) return;
  const refused = categoryIds.find((id) => id === null || !allowed.includes(id));
  if (refused !== undefined) await refuse(actor, 'category', { category_id: refused });
}

/** Refuses to change a transaction that another token, a person or an import created. */
export async function assertOwnTransaction(transaction: {
  id: string;
  created_by_token_id: string | null;
}): Promise<void> {
  const actor = currentTokenActor();
  if (!actor?.limits.own_transactions_only) return;
  if (transaction.created_by_token_id === actor.tokenId) return;
  await refuse(actor, 'own_transactions', { transaction_id: transaction.id });
}

/** The app password creating a row, for `created_by_token_id`; null for sessions and OAuth. */
export function creatingAppPasswordId(): string | null {
  const actor = currentTokenActor();
  return actor?.kind === 'app_password' ? actor.tokenId : null;
}
