import { afterEach, describe, expect, it, mock } from 'bun:test';
import { POST } from '@/pages/api/accounts/[id]/balance';
import { accountService } from '@/services';

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/accounts/account-1/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    params: { id: 'account-1' },
    locals: { user: { id: 'user-1', workspaceId: 'workspace-1', role: 'admin' } },
  } as any;
}

describe('POST /api/accounts/:id/balance', () => {
  const originalUpdateBalance = accountService.updateBalance;

  afterEach(() => {
    accountService.updateBalance = originalUpdateBalance;
  });

  function stubUpdateBalance() {
    const updateBalance = mock(async () => ({ id: 'account-1', balance: '100' }));
    accountService.updateBalance = updateBalance as any;
    return updateBalance;
  }

  it('accepts the millisecond UTC timestamp that Date.toISOString() produces', async () => {
    const updateBalance = stubUpdateBalance();

    const response = await POST(
      createApiContext({ balance: '100', recorded_at: '2099-01-31T12:00:00.000Z' })
    );

    expect(response.status).toBe(200);
    const [, , input] = updateBalance.mock.calls[0] as unknown as [
      string,
      string,
      { recorded_at: Date },
    ];
    expect(input.recorded_at.toISOString()).toBe('2099-01-31T12:00:00.000Z');
  });

  it('keeps second precision so distinct snapshots on one day stay distinct', async () => {
    const updateBalance = stubUpdateBalance();

    const response = await POST(
      createApiContext({ balance: '100', recorded_at: '2099-01-31T23:00:01Z' })
    );

    expect(response.status).toBe(200);
    const [, , input] = updateBalance.mock.calls[0] as unknown as [
      string,
      string,
      { recorded_at: Date },
    ];
    expect(input.recorded_at.toISOString()).toBe('2099-01-31T23:00:01.000Z');
  });

  it('rejects a timestamp without a timezone, which would parse in server-local time', async () => {
    const updateBalance = stubUpdateBalance();

    const response = await POST(
      createApiContext({ balance: '100', recorded_at: '2099-01-31T23:00' })
    );

    expect(response.status).toBe(400);
    expect(updateBalance).not.toHaveBeenCalled();
  });

  it('records at the current time when recorded_at is omitted', async () => {
    const updateBalance = stubUpdateBalance();

    const response = await POST(createApiContext({ balance: '100' }));

    expect(response.status).toBe(200);
    const [, , input] = updateBalance.mock.calls[0] as unknown as [
      string,
      string,
      { recorded_at?: Date },
    ];
    expect(input.recorded_at).toBeUndefined();
  });
});
