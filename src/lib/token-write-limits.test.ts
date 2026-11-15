import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AppPasswordLimits } from '@/lib/app-password-limits';
import { runWithAuditActor, type AuditActor } from '@/lib/audit-actor';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';
import * as realDenialAudit from '@/lib/token-denial-audit';
import { TokenLimitError } from '@/services/service-errors';

const recordTokenDenial = mock(async () => {});
mockModuleForFile('@/lib/token-denial-audit', realDenialAudit, () => ({ recordTokenDenial }));

const { assertCategoriesAllowed, assertOwnTransaction, creatingAppPasswordId } =
  await import('./token-write-limits');

function actor(limits: AppPasswordLimits, kind: AuditActor['kind'] = 'app_password'): AuditActor {
  return { kind, tokenId: 'pat_1', tokenName: 'Agent', userId: 'u1', workspaceId: 'w1', limits };
}

async function refusal(run: () => Promise<void>): Promise<TokenLimitError> {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught
  );
  expect(error).toBeInstanceOf(TokenLimitError);
  return error as TokenLimitError;
}

beforeEach(() => recordTokenDenial.mockClear());

describe('assertCategoriesAllowed', () => {
  test('passes outside a token request and for a token without an allowlist', async () => {
    await assertCategoriesAllowed(['cat_a', null]);
    await runWithAuditActor(actor({}), () => assertCategoriesAllowed(['cat_a', null]));
    expect(recordTokenDenial).not.toHaveBeenCalled();
  });

  test('passes when every category is listed', async () => {
    await runWithAuditActor(actor({ category_ids: ['cat_a', 'cat_b'] }), () =>
      assertCategoriesAllowed(['cat_b', 'cat_a'])
    );
    expect(recordTokenDenial).not.toHaveBeenCalled();
  });

  test('refuses an unlisted category with a 403 naming the limit, and records it', async () => {
    const limited = actor({ category_ids: ['cat_a'] });
    const error = await refusal(() =>
      runWithAuditActor(limited, () => assertCategoriesAllowed(['cat_a', 'cat_z']))
    );

    expect(error).toMatchObject({
      statusCode: 403,
      code: 'APP_PASSWORD_LIMIT',
      limit: 'category',
      details: { limit: 'category' },
    });
    expect(recordTokenDenial).toHaveBeenCalledWith(limited, {
      subject: 'limit:category',
      details: { limit: 'category', category_id: 'cat_z' },
    });
  });

  test('refuses a transfer, which has no category', async () => {
    await refusal(() =>
      runWithAuditActor(actor({ category_ids: ['cat_a'] }), () => assertCategoriesAllowed([null]))
    );
  });

  test('an allowlist that matches nothing still refuses', async () => {
    await refusal(() =>
      runWithAuditActor(actor({ category_ids: ['deleted'] }), () =>
        assertCategoriesAllowed(['cat_a'])
      )
    );
  });
});

describe('assertOwnTransaction', () => {
  const own = actor({ own_transactions_only: true });

  test('passes without the limit, whoever created the transaction', async () => {
    await runWithAuditActor(actor({}), () =>
      assertOwnTransaction({ id: 'tx_1', created_by_token_id: null })
    );
  });

  test("passes for the token's own transaction", async () => {
    await runWithAuditActor(own, () =>
      assertOwnTransaction({ id: 'tx_1', created_by_token_id: 'pat_1' })
    );
    expect(recordTokenDenial).not.toHaveBeenCalled();
  });

  test("refuses another token's transaction and one with no creator", async () => {
    for (const created_by_token_id of ['pat_other', null]) {
      const error = await refusal(() =>
        runWithAuditActor(own, () => assertOwnTransaction({ id: 'tx_1', created_by_token_id }))
      );
      expect(error.limit).toBe('own_transactions');
    }
    expect(recordTokenDenial).toHaveBeenCalledWith(own, {
      subject: 'limit:own_transactions',
      details: { limit: 'own_transactions', transaction_id: 'tx_1' },
    });
  });
});

describe('creatingAppPasswordId', () => {
  test('is the app password id, and null for OAuth tokens and sessions', () => {
    expect(runWithAuditActor(actor({}), creatingAppPasswordId)).toBe('pat_1');
    expect(runWithAuditActor(actor({}, 'oauth'), creatingAppPasswordId)).toBeNull();
    expect(creatingAppPasswordId()).toBeNull();
  });
});
