import { describe, expect, test } from 'bun:test';
import { auditActorFields, auditActorFromAuth, runWithAuditActor } from './audit-actor';

const nightly = { tokenId: 'pat_1', kind: 'app_password', name: 'Nightly import' } as const;
const desktop = { tokenId: 'tok_1', kind: 'oauth', name: 'Claude Desktop' } as const;

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

describe('auditActorFromAuth', () => {
  test('maps an MCP auth context to an actor', () => {
    expect(
      auditActorFromAuth({ tokenId: 'tok_1', kind: 'oauth', tokenName: 'Claude Desktop' })
    ).toEqual(desktop);
  });
});
