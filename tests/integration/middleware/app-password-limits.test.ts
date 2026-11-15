import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import {
  accounts,
  auditLogs,
  categories,
  mcpAppPasswords,
  recurringOccurrences,
  recurringTemplates,
  transactions,
  users,
  workspaces,
} from '@/db/schema';
import type { AppPasswordLimits } from '@/lib/app-password-limits';
import { hydrateUser } from '@/lib/auth/hydrate-user';
import { resetCacheManager } from '@/lib/cache';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';

type Route = (context: never) => Response | Promise<Response>;

const WORKSPACE_ID = 'app-pw-limits-workspace';
const USER_ID = 'app-pw-limits-user';
const WALLET = 'app-pw-limits-wallet';
const SAVINGS = 'app-pw-limits-savings';
const FOOD = 'app-pw-limits-food';
const RENT = 'app-pw-limits-rent';
const TODAY = new Date().toISOString().slice(0, 10);
const service = new McpAppPasswordService(db);

let appPasswordAuthentication: typeof import('@/middleware/app-password').appPasswordAuthentication;
let routes: {
  createTransaction: Route;
  updateTransaction: Route;
  deleteTransaction: Route;
  createTemplate: Route;
  updateTemplate: Route;
  confirmOccurrence: Route;
};

interface CallOptions {
  bearer?: string;
  body?: unknown;
  id?: string;
}

function context(method: string, pathname: string, options: CallOptions) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.bearer) headers.Authorization = `Bearer ${options.bearer}`;
  const url = new URL(`http://localhost${pathname}`);
  return {
    locals: {} as App.Locals,
    params: options.id ? { id: options.id } : {},
    request: new Request(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    url,
    isPrerendered: false,
  };
}

/** A Bearer request through the app password middleware, as production runs it. */
async function call(route: Route, method: string, pathname: string, options: CallOptions) {
  const ctx = context(method, pathname, options);
  const response = await appPasswordAuthentication(ctx as never, async () => route(ctx as never));
  if (!(response instanceof Response)) throw new Error('middleware returned no Response');
  return response;
}

/** A signed-in browser request: the session middleware has already set the user. */
async function callAsSession(route: Route, method: string, pathname: string, options: CallOptions) {
  const ctx = context(method, pathname, options);
  ctx.locals.user = (await hydrateUser(USER_ID))!.user;
  return route(ctx as never);
}

async function createToken(limits: AppPasswordLimits): Promise<{ token: string; id: string }> {
  const { token, appPassword } = await service.create({
    userId: USER_ID,
    name: `limited ${nanoid(6)}`,
    permissions: ['*'],
    expiry: '30',
  });
  await db.update(mcpAppPasswords).set({ limits }).where(eq(mcpAppPasswords.id, appPassword.id));
  return { token, id: appPassword.id };
}

async function insertTransaction(category: string, createdByTokenId: string | null) {
  const id = nanoid();
  await db.insert(transactions).values({
    id,
    workspace_id: WORKSPACE_ID,
    created_by_user_id: USER_ID,
    type: 'expense',
    amount: '1000',
    currency: 'IDR',
    category_id: category,
    account_id: WALLET,
    transaction_date: new Date(`${TODAY}T00:00:00.000Z`),
    created_by_token_id: createdByTokenId,
  });
  return id;
}

async function insertTemplate(category: string) {
  const id = nanoid();
  await db.insert(recurringTemplates).values({
    id,
    workspace_id: WORKSPACE_ID,
    created_by_user_id: USER_ID,
    name: 'Rent',
    type: 'expense',
    amount: '500000',
    currency: 'IDR',
    category_id: category,
    account_id: WALLET,
    day_of_month: 1,
    start_date: '2026-01-01',
  });
  return id;
}

async function insertDueOccurrence(category: string) {
  const id = nanoid();
  await db.insert(recurringOccurrences).values({
    id,
    template_id: await insertTemplate(category),
    workspace_id: WORKSPACE_ID,
    due_date: '2026-01-01',
    occurrence_number: 1,
  });
  return id;
}

const expenseBody = (category: string) => ({
  type: 'expense',
  amount: '25000',
  currency: 'IDR',
  category_id: category,
  account_id: WALLET,
  transaction_date: TODAY,
});

const templateBody = (category: string) => ({
  name: 'Internet',
  type: 'expense',
  amount: '300000',
  currency: 'IDR',
  category_id: category,
  account_id: WALLET,
  day_of_month: 5,
  start_date: TODAY,
});

const confirmBody = (category: string) => ({
  amount: '500000',
  transaction_date: '2026-01-01',
  category_id: category,
  account_id: WALLET,
});

async function expectLimit(response: Response, limit: 'category' | 'own_transactions') {
  const body = await response.json();
  expect(response.status).toBe(403);
  expect(body.error.code).toBe('APP_PASSWORD_LIMIT');
  expect(body.error.details).toEqual({ limit });
}

async function transactionRow(id: string) {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
  return row;
}

async function resetFixtures(): Promise<void> {
  await db.delete(auditLogs).where(eq(auditLogs.user_id, USER_ID));
  await db.delete(recurringOccurrences).where(eq(recurringOccurrences.workspace_id, WORKSPACE_ID));
  await db.delete(transactions).where(eq(transactions.workspace_id, WORKSPACE_ID));
  await db.delete(recurringTemplates).where(eq(recurringTemplates.workspace_id, WORKSPACE_ID));
  await db.delete(accounts).where(eq(accounts.workspace_id, WORKSPACE_ID));
  await db.delete(categories).where(eq(categories.workspace_id, WORKSPACE_ID));
  await db.delete(mcpAppPasswords).where(eq(mcpAppPasswords.user_id, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
}

describe('app password limits on the REST API', () => {
  beforeAll(async () => {
    ({ appPasswordAuthentication } = await import('@/middleware/app-password'));
    const transactionsIndex = await import('@/pages/api/transactions/index');
    const transactionById = await import('@/pages/api/transactions/[id]');
    const recurringIndex = await import('@/pages/api/recurring/index');
    const recurringById = await import('@/pages/api/recurring/[id]/index');
    const confirm = await import('@/pages/api/recurring/occurrences/[id]/confirm');
    routes = {
      createTransaction: transactionsIndex.POST as Route,
      updateTransaction: transactionById.PUT as Route,
      deleteTransaction: transactionById.DELETE as Route,
      createTemplate: recurringIndex.POST as Route,
      updateTemplate: recurringById.PUT as Route,
      confirmOccurrence: confirm.POST as Route,
    };
  });

  beforeEach(async () => {
    clearRateLimitStore();
    resetCacheManager();
    await resetFixtures();
    await db.insert(workspaces).values({ id: WORKSPACE_ID, name: 'Limits', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'limits-owner@example.com',
      name: 'Limits Owner',
      role: 'admin',
    });
    await db.insert(accounts).values(
      [WALLET, SAVINGS].map((id) => ({
        id,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: id === WALLET ? 'Wallet' : 'Savings',
        type: 'cash' as const,
        balance: '1000000',
        currency: 'IDR',
      }))
    );
    await db.insert(categories).values(
      [FOOD, RENT].map((id) => ({
        id,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: id === FOOD ? 'Food' : 'Rent',
        type: 'expense' as const,
      }))
    );
  });

  afterAll(async () => {
    await resetFixtures();
    resetCacheManager();
  });

  describe('category allowlist', () => {
    test('creates in a listed category, records the token, and refuses others and transfers', async () => {
      const { token, id: tokenId } = await createToken({ category_ids: [FOOD] });
      const create = (body: unknown) =>
        call(routes.createTransaction, 'POST', '/api/transactions', { bearer: token, body });

      const allowed = await create(expenseBody(FOOD));
      expect(allowed.status).toBe(201);
      const created = await transactionRow((await allowed.json()).data.id);
      expect(created.created_by_token_id).toBe(tokenId);

      await expectLimit(await create(expenseBody(RENT)), 'category');
      await expectLimit(
        await create({ ...expenseBody(FOOD), type: 'transfer', to_account_id: WALLET }),
        'category'
      );
    });

    test('updates only stay inside listed categories, even when the category is unchanged', async () => {
      const { token } = await createToken({ category_ids: [FOOD] });
      const listed = await insertTransaction(FOOD, null);
      const unlisted = await insertTransaction(RENT, null);
      const update = (id: string, body: unknown) =>
        call(routes.updateTransaction, 'PUT', `/api/transactions/${id}`, {
          bearer: token,
          id,
          body,
        });

      expect((await update(listed, { amount: '2000' })).status).toBe(200);
      await expectLimit(await update(listed, { category_id: RENT }), 'category');
      await expectLimit(await update(unlisted, { amount: '2000' }), 'category');
      await expectLimit(await update(unlisted, { category_id: FOOD }), 'category');
      expect((await transactionRow(unlisted)).category_id).toBe(RENT);
      await expectLimit(
        await update(listed, { type: 'transfer', to_account_id: SAVINGS }),
        'category'
      );
      expect((await transactionRow(listed)).type).toBe('expense');
    });

    test('recurring templates are created and edited only in listed categories', async () => {
      const { token } = await createToken({ category_ids: [FOOD] });
      const createTemplate = (body: unknown) =>
        call(routes.createTemplate, 'POST', '/api/recurring', { bearer: token, body });
      const updateTemplate = (id: string, body: unknown) =>
        call(routes.updateTemplate, 'PUT', `/api/recurring/${id}`, { bearer: token, id, body });

      expect((await createTemplate(templateBody(FOOD))).status).toBe(201);
      await expectLimit(await createTemplate(templateBody(RENT)), 'category');

      const listed = await insertTemplate(FOOD);
      const unlisted = await insertTemplate(RENT);
      expect((await updateTemplate(listed, { name: 'Groceries' })).status).toBe(200);
      await expectLimit(await updateTemplate(listed, { category_id: RENT }), 'category');
      await expectLimit(await updateTemplate(unlisted, { name: 'Rent 2' }), 'category');
    });

    test('confirming an occurrence needs a listed category and records the token', async () => {
      const { token, id: tokenId } = await createToken({ category_ids: [FOOD] });
      const confirm = (id: string, category: string) =>
        call(routes.confirmOccurrence, 'POST', `/api/recurring/occurrences/${id}/confirm`, {
          bearer: token,
          id,
          body: confirmBody(category),
        });

      const refused = await insertDueOccurrence(RENT);
      await expectLimit(await confirm(refused, RENT), 'category');
      // A listed category in the body does not open a bill outside the allowlist.
      await expectLimit(await confirm(refused, FOOD), 'category');
      const [stillPending] = await db
        .select({ status: recurringOccurrences.status })
        .from(recurringOccurrences)
        .where(eq(recurringOccurrences.id, refused));
      expect(stillPending.status).toBe('pending');

      const response = await confirm(await insertDueOccurrence(FOOD), FOOD);
      expect(response.status).toBe(201);
      const created = await transactionRow((await response.json()).data.id);
      expect(created.created_by_token_id).toBe(tokenId);
    });
  });

  describe('own transactions only', () => {
    test("changes the token's own transactions and refuses everyone else's", async () => {
      const { token, id: tokenId } = await createToken({ own_transactions_only: true });
      const { id: otherTokenId } = await createToken({});
      const update = (id: string) =>
        call(routes.updateTransaction, 'PUT', `/api/transactions/${id}`, {
          bearer: token,
          id,
          body: { amount: '2000' },
        });
      const remove = (id: string) =>
        call(routes.deleteTransaction, 'DELETE', `/api/transactions/${id}`, { bearer: token, id });

      const created = await call(routes.createTransaction, 'POST', '/api/transactions', {
        bearer: token,
        body: expenseBody(RENT),
      });
      const own = (await created.json()).data.id;
      expect((await transactionRow(own)).created_by_token_id).toBe(tokenId);

      for (const foreign of [
        await insertTransaction(FOOD, otherTokenId),
        await insertTransaction(FOOD, null),
      ]) {
        await expectLimit(await update(foreign), 'own_transactions');
        await expectLimit(await remove(foreign), 'own_transactions');
        expect((await transactionRow(foreign)).deleted_at).toBeNull();
      }

      expect((await update(own)).status).toBe(200);
      expect((await remove(own)).status).toBe(200);
    });
  });

  test('refusals are recorded as token_denied under limit subjects', async () => {
    const { token, id: tokenId } = await createToken({
      category_ids: [FOOD],
      own_transactions_only: true,
    });
    const foreign = await insertTransaction(FOOD, null);

    await call(routes.createTransaction, 'POST', '/api/transactions', {
      bearer: token,
      body: expenseBody(RENT),
    });
    await call(routes.deleteTransaction, 'DELETE', `/api/transactions/${foreign}`, {
      bearer: token,
      id: foreign,
    });

    const denials = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.user_id, USER_ID), eq(auditLogs.action, 'token_denied')));
    expect(denials.every((row) => row.entity_id === tokenId)).toBe(true);
    expect(denials.map((row) => JSON.parse(row.new_value!))).toEqual(
      expect.arrayContaining([
        { subject: 'limit:category', limit: 'category', category_id: RENT },
        { subject: 'limit:own_transactions', limit: 'own_transactions', transaction_id: foreign },
      ])
    );
  });

  test('without limits a token and a session change any transaction', async () => {
    const { token } = await createToken({});
    const pastWrite = await insertTransaction(RENT, null);

    const tokenUpdate = await call(
      routes.updateTransaction,
      'PUT',
      `/api/transactions/${pastWrite}`,
      { bearer: token, id: pastWrite, body: { category_id: FOOD } }
    );
    expect(tokenUpdate.status).toBe(200);

    const sessionCreate = await callAsSession(
      routes.createTransaction,
      'POST',
      '/api/transactions',
      {
        body: expenseBody(RENT),
      }
    );
    expect(sessionCreate.status).toBe(201);
    const created = await transactionRow((await sessionCreate.json()).data.id);
    expect(created.created_by_token_id).toBeNull();

    const sessionDelete = await callAsSession(
      routes.deleteTransaction,
      'DELETE',
      `/api/transactions/${pastWrite}`,
      { id: pastWrite }
    );
    expect(sessionDelete.status).toBe(200);
  });
});
