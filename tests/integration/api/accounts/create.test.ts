import { afterEach, describe, expect, it, mock } from 'bun:test';
import { POST } from '@/pages/api/accounts/index';
import { accountCategoryService, accountService } from '@/services';

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user: { id: 'user-1', workspaceId: 'workspace-1', role: 'admin' } },
  } as any;
}

type CreateCall = [{ opened_at?: Date; category_id?: string | null; type: string }];

describe('POST /api/accounts', () => {
  const originalCreate = accountService.create;
  const originalFindByName = accountCategoryService.findByName;

  afterEach(() => {
    accountService.create = originalCreate;
    accountCategoryService.findByName = originalFindByName;
  });

  function stubServices() {
    const create = mock(async () => ({ id: 'account-1' }));
    const findByName = mock(async (name: string) => ({ id: `category:${name}` }));
    accountService.create = create as any;
    accountCategoryService.findByName = findByName as any;
    return { create, findByName };
  }

  const body = { name: 'Bank1 OwnerA', balance: '100', currency: 'IDR' };

  it("files a type 'other' account under the 'Other' category", async () => {
    const { create, findByName } = stubServices();

    const response = await POST(createApiContext({ ...body, type: 'other' }));

    expect(response.status).toBe(201);
    expect(findByName.mock.calls[0]?.[0]).toBe('Other');
    const [input] = create.mock.calls[0] as unknown as CreateCall;
    expect(input.category_id).toBe('category:Other');
  });

  it('passes opened_at to the service as a Date', async () => {
    const { create } = stubServices();

    const response = await POST(
      createApiContext({ ...body, type: 'bank_account', opened_at: '2099-01-01T00:00:00.000Z' })
    );

    expect(response.status).toBe(201);
    const [input] = create.mock.calls[0] as unknown as CreateCall;
    expect(input.opened_at?.toISOString()).toBe('2099-01-01T00:00:00.000Z');
  });

  it('leaves opened_at unset when omitted', async () => {
    const { create } = stubServices();

    await POST(createApiContext({ ...body, type: 'bank_account' }));

    const [input] = create.mock.calls[0] as unknown as CreateCall;
    expect(input.opened_at).toBeUndefined();
  });

  it('rejects an opened_at without a timezone', async () => {
    const { create } = stubServices();

    const response = await POST(
      createApiContext({ ...body, type: 'bank_account', opened_at: '2099-01-01T00:00' })
    );

    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
