import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import {
  accountService,
  budgetService,
  diagnosticsService,
  workspaceMetaService,
  AccountServiceError,
  BudgetServiceError,
  ServiceErrorCode,
} from '@/services';

const SQL_MESSAGE =
  'Failed query: update "accounts" set "name" = ? where "accounts"."id" = ? params: Savings,acc_secret_123';

const originals = {
  update: accountService.update,
  close: accountService.close,
  initializeAllBudgets: budgetService.initializeAllBudgets,
  importFromCSV: budgetService.importFromCSV,
  getWorkspaceCurrencies: workspaceMetaService.getWorkspaceCurrencies,
  getDiagnostics: diagnosticsService.getDiagnostics,
};

function throwSql(): never {
  throw new Error(SQL_MESSAGE);
}

function createContext(
  url: string,
  method: string,
  options: { body?: BodyInit; json?: unknown; role?: string; params?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = {};
  let body = options.body;
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }
  return {
    request: new Request(url, { method, headers, body }),
    url: new URL(url),
    locals: {
      user: { id: 'user-1', workspaceId: 'workspace-1', role: options.role ?? 'admin' },
    },
    params: options.params ?? {},
  } as any;
}

function budgetCsvForm(): FormData {
  const form = new FormData();
  form.append('csv_file', new File(['budget_id,budget_amount\nb1,100'], 'budget.csv'));
  form.append('month', '3');
  form.append('year', '2026');
  form.append('currency', 'IDR');
  return form;
}

async function expectGenericInternalError(response: Response) {
  const raw = await response.text();
  expect(response.status).toBe(500);
  expect(raw).not.toContain('Failed query');
  expect(raw).not.toContain('acc_secret_123');
  expect(raw).not.toContain('"accounts"');
  const payload = JSON.parse(raw);
  expect(payload.success).toBe(false);
  expect(payload.error.details.errorId).toMatch(/^[0-9a-f]{8}$/);
  return payload;
}

describe('API routes keep raw errors out of responses', () => {
  let accountRoute: any;
  let initializeRoute: any;
  let importRoute: any;
  let diagnosticsRoute: any;

  beforeAll(async () => {
    accountRoute = await import('@/pages/api/accounts/[id]');
    initializeRoute = await import('@/pages/api/budgets/initialize');
    importRoute = await import('@/pages/api/budget/import');
    diagnosticsRoute = await import('@/pages/api/admin/diagnostics');
  });

  afterEach(() => {
    accountService.update = originals.update;
    accountService.close = originals.close;
    budgetService.initializeAllBudgets = originals.initializeAllBudgets;
    budgetService.importFromCSV = originals.importFromCSV;
    workspaceMetaService.getWorkspaceCurrencies = originals.getWorkspaceCurrencies;
    diagnosticsService.getDiagnostics = originals.getDiagnostics;
  });

  it('PUT /api/accounts/:id hides a raw database error', async () => {
    accountService.update = throwSql as typeof accountService.update;

    const response = await accountRoute.PUT(
      createContext('http://localhost/api/accounts/acc-1', 'PUT', {
        json: { name: 'Savings' },
        params: { id: 'acc-1' },
      })
    );

    const payload = await expectGenericInternalError(response);
    expect(payload.error.message).toBe('Failed to update account');
    expect(payload.error.code).toBe('INTERNAL_ERROR');
  });

  it('PUT /api/accounts/:id still passes a ServiceError message through', async () => {
    accountService.update = (() => {
      throw new AccountServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'Cannot change currency of an account with transactions',
        409
      );
    }) as typeof accountService.update;

    const response = await accountRoute.PUT(
      createContext('http://localhost/api/accounts/acc-1', 'PUT', {
        json: { name: 'Savings' },
        params: { id: 'acc-1' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.message).toBe('Cannot change currency of an account with transactions');
  });

  it('DELETE /api/accounts/:id hides a raw database error', async () => {
    accountService.close = throwSql as typeof accountService.close;

    const response = await accountRoute.DELETE(
      createContext('http://localhost/api/accounts/acc-1', 'DELETE', { params: { id: 'acc-1' } })
    );

    await expectGenericInternalError(response);
  });

  it('POST /api/budgets/initialize hides a raw database error', async () => {
    budgetService.initializeAllBudgets = throwSql as typeof budgetService.initializeAllBudgets;

    const response = await initializeRoute.POST(
      createContext('http://localhost/api/budgets/initialize', 'POST', {
        json: { month: 3, year: 2026, currency: 'IDR' },
      })
    );

    await expectGenericInternalError(response);
  });

  it('POST /api/budget/import hides a raw database error', async () => {
    workspaceMetaService.getWorkspaceCurrencies = (async () => ({
      primary: 'IDR',
      secondary: null,
    })) as unknown as typeof workspaceMetaService.getWorkspaceCurrencies;
    budgetService.importFromCSV = throwSql as typeof budgetService.importFromCSV;

    const response = await importRoute.POST(
      createContext('http://localhost/api/budget/import', 'POST', { body: budgetCsvForm() })
    );

    await expectGenericInternalError(response);
  });

  it('POST /api/budget/import passes a ServiceError message through', async () => {
    workspaceMetaService.getWorkspaceCurrencies = (async () => ({
      primary: 'IDR',
      secondary: null,
    })) as unknown as typeof workspaceMetaService.getWorkspaceCurrencies;
    budgetService.importFromCSV = (() => {
      throw new BudgetServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'Budget month is closed',
        400
      );
    }) as typeof budgetService.importFromCSV;

    const response = await importRoute.POST(
      createContext('http://localhost/api/budget/import', 'POST', { body: budgetCsvForm() })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.message).toBe('Budget month is closed');
  });

  it('GET /api/admin/diagnostics shows super admins the error class, not the SQL', async () => {
    diagnosticsService.getDiagnostics = throwSql as typeof diagnosticsService.getDiagnostics;

    const response = await diagnosticsRoute.GET(
      createContext('http://localhost/api/admin/diagnostics', 'GET', { role: 'super_admin' })
    );

    const payload = await expectGenericInternalError(response);
    expect(payload.error.code).toBe('DIAGNOSTICS_ERROR');
    expect(payload.error.details.errorName).toBe('Error');
  });
});
