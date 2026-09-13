import { describe, expect, it } from 'bun:test';
import { nextSlot, settle, SlotExhaustedError } from './snapshots';
import { thrown } from './test-helpers/throws';
import type { Plan } from './types';

describe('nextSlot', () => {
  it('starts at 23:00:00 when no history exists for the day', () => {
    expect(nextSlot([], '2099-01-31')).toBe('2099-01-31T23:00:00.000Z');
  });

  it('takes one second past the latest existing entry', () => {
    expect(nextSlot(['2099-01-31T23:00:00.000Z'], '2099-01-31')).toBe('2099-01-31T23:00:01.000Z');
  });

  it('ignores entries from other days', () => {
    expect(nextSlot(['2099-01-30T23:00:05.000Z'], '2099-01-31')).toBe('2099-01-31T23:00:00.000Z');
  });

  it('aborts rather than crossing midnight', () => {
    expect(thrown(() => nextSlot(['2099-01-31T23:59:59.000Z'], '2099-01-31'))).toBeInstanceOf(
      SlotExhaustedError
    );
  });
});

describe('settle', () => {
  const plan = {
    snapshots: [{ account: 'A', closing: '100', currency: 'IDR', recordedAt: '' }],
  } as unknown as Plan;

  it('posts 0 for accounts absent from the newest month', async () => {
    const posted: Record<string, string> = {};
    const client = {
      get: async () => [],
      post: async (p: string, b: { balance: string }) => {
        posted[p] = b.balance;
        return {};
      },
    };
    await settle(client as never, plan, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    expect(posted['/api/accounts/b/balance']).toBe('0');
  });

  it("posts the newest month's closing for accounts it covers", async () => {
    const posted: Record<string, string> = {};
    const client = {
      get: async () => [],
      post: async (p: string, b: { balance: string }) => {
        posted[p] = b.balance;
        return {};
      },
    };
    await settle(client as never, plan, [{ id: 'a', name: 'A' }]);
    expect(posted['/api/accounts/a/balance']).toBe('100');
  });
});
