import { describe, expect, test } from 'bun:test';
import {
  auditActorFields,
  currentTokenActor,
  runWithTokenActor,
  type TokenActor,
} from './token-actor';

const owner = { userId: 'user_1', workspaceId: 'ws_1' };
const nightly: TokenActor = {
  ...owner,
  tokenId: 'pat_1',
  kind: 'app_password',
  tokenName: 'Nightly import',
  limits: { own_transactions_only: true },
};
const desktop: TokenActor = {
  ...owner,
  tokenId: 'tok_1',
  kind: 'oauth',
  tokenName: 'Claude Desktop',
  limits: {},
};

describe('auditActorFields', () => {
  test('is all null outside a token request', () => {
    expect(auditActorFields()).toEqual({
      actor_token_id: null,
      actor_token_kind: null,
      actor_token_name: null,
    });
  });

  test('returns the actor for the request it runs in, after awaits too', async () => {
    const fields = await runWithTokenActor(nightly, async () => {
      await Promise.resolve();
      return auditActorFields();
    });

    expect(fields).toEqual({
      actor_token_id: 'pat_1',
      actor_token_kind: 'app_password',
      actor_token_name: 'Nightly import',
    });
    expect(auditActorFields().actor_token_id).toBeNull();
  });

  test('keeps interleaved requests apart', async () => {
    let releaseFirst: () => void = () => {};
    const firstPaused = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = runWithTokenActor(nightly, async () => {
      await firstPaused;
      return auditActorFields().actor_token_id;
    });
    const second = runWithTokenActor(desktop, async () => {
      const id = auditActorFields().actor_token_id;
      releaseFirst();
      return id;
    });

    expect(await Promise.all([first, second])).toEqual(['pat_1', 'tok_1']);
  });
});

describe('currentTokenActor', () => {
  test("carries the token's limits inside the request and nothing outside it", () => {
    expect(runWithTokenActor(nightly, () => currentTokenActor()?.limits)).toEqual({
      own_transactions_only: true,
    });
    expect(currentTokenActor()).toBeUndefined();
  });
});
