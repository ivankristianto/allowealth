import { describe, expect, test } from 'bun:test';
import {
  auditActorFields,
  auditActorFromAuth,
  currentAuditActor,
  runWithAuditActor,
  type AuditActor,
} from './audit-actor';

const owner = { userId: 'user_1', workspaceId: 'ws_1' };
const nightly: AuditActor = {
  ...owner,
  tokenId: 'pat_1',
  kind: 'app_password',
  tokenName: 'Nightly import',
  limits: { own_transactions_only: true },
};
const desktop: AuditActor = {
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
    const fields = await runWithAuditActor(nightly, async () => {
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

    const first = runWithAuditActor(nightly, async () => {
      await firstPaused;
      return auditActorFields().actor_token_id;
    });
    const second = runWithAuditActor(desktop, async () => {
      const id = auditActorFields().actor_token_id;
      releaseFirst();
      return id;
    });

    expect(await Promise.all([first, second])).toEqual(['pat_1', 'tok_1']);
  });
});

describe('currentAuditActor', () => {
  test("carries the token's limits inside the request and nothing outside it", () => {
    expect(runWithAuditActor(nightly, () => currentAuditActor()?.limits)).toEqual({
      own_transactions_only: true,
    });
    expect(currentAuditActor()).toBeUndefined();
  });
});

describe('auditActorFromAuth', () => {
  test('keeps only the actor fields of an MCP auth context', () => {
    expect(
      auditActorFromAuth({ ...desktop, permissions: ['accounts:read'] } as AuditActor)
    ).toEqual(desktop);
  });
});
