import { test, expect } from './test.fixture';
import {
  TEST_AMOUNTS,
  generateTestId,
  createAccountViaAPI,
  createCategoryViaAPI,
  setWorkspaceTimezoneViaAPI,
} from '../helpers';

// The rest of the suite runs on UTC. This spec puts the workspace and the browser in a zone whose
// calendar day differs from UTC at the moment it runs (UTC-11 before 10:00 UTC, UTC+14 after), so
// any "today" that still comes from the UTC day lands on the wrong date and fails here (#428).
const WORKSPACE_ZONE = new Date().getUTCHours() < 10 ? 'Pacific/Pago_Pago' : 'Pacific/Kiritimati';

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

test.use({ timezoneId: WORKSPACE_ZONE });

test.describe('Workspace timezone', () => {
  let categoryName: string;
  let accountName: string;

  test.beforeAll(async ({ request }) => {
    const runId = generateTestId();
    categoryName = `E2E TZ Spend ${runId}`;
    accountName = `E2E TZ Wallet ${runId}`;
    await createCategoryViaAPI(request, { name: categoryName, type: 'expense' });
    await createAccountViaAPI(request, {
      name: accountName,
      type: 'bank_account',
      balance: TEST_AMOUNTS.LARGE_INCOME,
    });
    await setWorkspaceTimezoneViaAPI(request, WORKSPACE_ZONE);
  });

  test.afterAll(async ({ request }) => {
    await setWorkspaceTimezoneViaAPI(request, 'UTC');
  });

  test('a new expense defaults to today in the workspace zone and shows in its month', async ({
    page,
    addTransactionPage,
  }) => {
    const zoneToday = todayIn(WORKSPACE_ZONE);
    expect(zoneToday, 'the chosen zone must be on a different day than UTC').not.toBe(
      todayIn('UTC')
    );

    const title = `E2E TZ ${generateTestId()}`;
    await addTransactionPage.gotoAddTransaction('expense');

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().endsWith('/api/transactions') && resp.request().method() === 'POST'
      ),
      // No date: the form's own "Today" default is what's under test
      addTransactionPage.fillAndSubmit({
        type: 'expense',
        amount: TEST_AMOUNTS.SMALL_EXPENSE,
        categoryName,
        accountName,
        description: title,
      }),
    ]);
    expect(createResponse.ok()).toBe(true);
    const created = (await createResponse.json()).data as { transaction_date: string };
    expect(created.transaction_date.slice(0, 10)).toBe(zoneToday);

    // The list defaults to the workspace's current month, which can differ from UTC's on the 1st
    await page.goto(`/transactions?type=expense&search=${encodeURIComponent(title)}`);
    await expect(page.locator('[data-transaction-card]', { hasText: title })).toBeVisible();
  });
});
