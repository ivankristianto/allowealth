import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { accountCategoryService, accountService, transactionService } from '@/services';

let POST_ACCOUNTS: any;
let PUT_ACCOUNT: any;
let POST_BALANCE: any;
let PATCH_TRANSFER_OWNER: any;
let POST_TRANSFER: any;

const originalCreate = accountService.create;
const originalFindByName = accountCategoryService.findByName;
const originalFindById = accountCategoryService.findById;
const originalUpdate = accountService.update;
const originalUpdateBalance = accountService.updateBalance;
const originalTransferOwnership = accountService.transferOwnership;
const originalTransfer = accountService.transfer;
const originalCreateTransaction = transactionService.create;

function expectNormalizedIssue(issue: any, path: string[]) {
  expect(issue.path).toEqual(path);
  expect(typeof issue.message).toBe('string');
  expect(typeof issue.code).toBe('string');
}

function createApiContext(
  url: string,
  method: string,
  body?: unknown,
  params?: Record<string, string>
) {
  return {
    request: new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'workspace-1',
        role: 'admin',
      },
    },
    params,
  } as any;
}

describe('account route validation', () => {
  beforeAll(async () => {
    ({ POST: POST_ACCOUNTS } = await import('@/pages/api/accounts/index'));
    ({ PUT: PUT_ACCOUNT } = await import('@/pages/api/accounts/[id]'));
    ({ POST: POST_BALANCE } = await import('@/pages/api/accounts/[id]/balance'));
    ({ PATCH: PATCH_TRANSFER_OWNER } = await import('@/pages/api/accounts/[id]/transfer-owner'));
    ({ POST: POST_TRANSFER } = await import('@/pages/api/accounts/transfer'));
  });

  afterEach(() => {
    accountService.create = originalCreate;
    accountCategoryService.findByName = originalFindByName;
    accountCategoryService.findById = originalFindById;
    accountService.update = originalUpdate;
    accountService.updateBalance = originalUpdateBalance;
    accountService.transferOwnership = originalTransferOwnership;
    accountService.transfer = originalTransfer;
    transactionService.create = originalCreateTransaction;
  });

  it('returns normalized validation details when account creation is missing category and type', async () => {
    const response = await POST_ACCOUNTS(
      createApiContext('http://localhost/api/accounts', 'POST', {
        name: 'Wallet',
        balance: '1000',
        currency: 'IDR',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['categoryId']);
  });

  it('still accepts valid account creation payloads', async () => {
    accountCategoryService.findByName = mock(async () => ({
      id: 'cat-cash',
      name: 'Cash',
    })) as any;
    accountService.create = mock(async (input) => ({
      id: 'account-1',
      ...input,
    })) as any;

    const response = await POST_ACCOUNTS(
      createApiContext('http://localhost/api/accounts', 'POST', {
        name: 'Wallet',
        type: 'cash',
        balance: '1000',
        currency: 'IDR',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.name).toBe('Wallet');
    expect(accountService.create).toHaveBeenCalledTimes(1);
    const createdAccountInput = (accountService.create as any).mock.calls[0][0];
    expect(createdAccountInput.name).toBe('Wallet');
    expect(createdAccountInput.type).toBe('cash');
    expect(createdAccountInput.currency).toBe('IDR');
  });

  it('returns normalized validation details for invalid account updates', async () => {
    const response = await PUT_ACCOUNT(
      createApiContext(
        'http://localhost/api/accounts/account-1',
        'PUT',
        { currency: 'BTC' },
        { id: 'account-1' }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['currency']);
  });

  it('returns normalized validation details for invalid balance updates', async () => {
    const response = await POST_BALANCE(
      createApiContext(
        'http://localhost/api/accounts/account-1/balance',
        'POST',
        { balance: 'abc' },
        { id: 'account-1' }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['balance']);
  });

  it('returns normalized validation details for invalid ownership transfers', async () => {
    const response = await PATCH_TRANSFER_OWNER(
      createApiContext(
        'http://localhost/api/accounts/account-1/transfer-owner',
        'PATCH',
        { owner_user_id: '' },
        { id: 'account-1' }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['owner_user_id']);
  });

  it('returns normalized validation details when transfer source and destination match', async () => {
    const response = await POST_TRANSFER(
      createApiContext('http://localhost/api/accounts/transfer', 'POST', {
        fromAccountId: 'account-1',
        toAccountId: 'account-1',
        amount: '1000',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['toAccountId']);
  });

  it('still accepts valid transfer payloads', async () => {
    accountService.transfer = mock(async () => ({
      fromAccount: { id: 'account-1', currency: 'IDR' },
      toAccount: { id: 'account-2', currency: 'IDR' },
    })) as any;
    transactionService.create = mock(async () => ({ id: 'txn-1' })) as any;

    const response = await POST_TRANSFER(
      createApiContext('http://localhost/api/accounts/transfer', 'POST', {
        fromAccountId: 'account-1',
        toAccountId: 'account-2',
        amount: '1000',
        notes: 'Top up',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.transactionId).toBe('txn-1');
  });
});
