import { describe, expect, it } from 'bun:test';
import { nextSlot, settle, SlotExhaustedError } from './snapshots';
import { thrown } from './test-helpers/throws';
import type { Plan } from './types';

describe('nextSlot', () => {
  it('starts at 12:00:00 UTC, mid-day on the last day in any timezone within ±11 hours', () => {
    expect(nextSlot([], '2099-01-31')).toBe('2099-01-31T12:00:00.000Z');
  });

  it('takes one second past the latest existing entry', () => {
    expect(nextSlot(['2099-01-31T12:00:00.000Z'], '2099-01-31')).toBe('2099-01-31T12:00:01.000Z');
  });

  it('ignores entries from other days', () => {
    expect(nextSlot(['2099-01-30T12:00:05.000Z'], '2099-01-31')).toBe('2099-01-31T12:00:00.000Z');
  });

  it('aborts rather than leaving the 12:00–12:59 window', () => {
    expect(thrown(() => nextSlot(['2099-01-31T12:59:59.000Z'], '2099-01-31'))).toBeInstanceOf(
      SlotExhaustedError
    );
  });
});

describe('settle', () => {
  const plan = {
    month: 1,
    year: 2099,
    snapshots: [
      { account: 'A', closing: '100', localClosing: '100', currency: 'IDR', recordedAt: '' },
    ],
  } as unknown as Plan;

  /** Accounts as the app holds them now; posts are recorded for inspection. */
  function settleClient(balances: Record<string, string>) {
    const posted: { path: string; body: { balance: string; recorded_at?: string } }[] = [];
    const client = {
      get: async (path: string) =>
        path === '/api/accounts'
          ? Object.entries(balances).map(([id, balance]) => ({ id, balance }))
          : [],
      post: async (path: string, body: { balance: string; recorded_at?: string }) => {
        posted.push({ path, body });
        return {};
      },
    };
    return { client, posted };
  }

  it('posts 0 for accounts absent from the newest month', async () => {
    const { client, posted } = settleClient({ a: '100', b: '55' });
    await settle(client as never, plan, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    expect(posted.find((p) => p.path === '/api/accounts/b/balance')?.body.balance).toBe('0');
  });

  it("posts the newest month's closing for an account that drifted from it", async () => {
    const { client, posted } = settleClient({ a: '999' });
    await settle(client as never, plan, [{ id: 'a', name: 'A' }]);
    expect(posted.find((p) => p.path === '/api/accounts/a/balance')?.body.balance).toBe('100');
  });

  it('writes nothing for an account already at its newest closing', async () => {
    const { client, posted } = settleClient({ a: '100.00' });
    await settle(client as never, plan, [{ id: 'a', name: 'A' }]);
    expect(posted).toEqual([]);
  });

  it("dates a settling write at the newest month's end, never now", async () => {
    const { client, posted } = settleClient({ b: '55' });
    await settle(client as never, plan, [{ id: 'b', name: 'B' }]);
    expect(posted[0]?.body.recorded_at).toBe('2099-01-31T12:00:00.000Z');
  });
});
