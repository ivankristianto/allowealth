import { test } from './test.fixture';
import { createAccountViaAPI, generateTestId } from '../helpers';

test.describe('Accounts', () => {
  test('create an account', async ({ accountsPage }) => {
    const name = `E2E Bank ${generateTestId()}`;

    await accountsPage.goto();
    await accountsPage.createAccount({
      name,
      type: 'bank_account',
      currency: 'IDR',
      initialBalance: 5000000,
    });

    await accountsPage.expectAccountExists(name);
  });

  test('rename an account', async ({ request, accountsPage }) => {
    const name = `E2E Rename ${generateTestId()}`;
    const renamed = `${name} renamed`;
    const { id } = await createAccountViaAPI(request, {
      name,
      type: 'bank_account',
      balance: 1000000,
    });

    await accountsPage.goto();
    await accountsPage.editAccount(id, { name: renamed });

    await accountsPage.goto();
    await accountsPage.expectAccountExists(renamed);
  });
});
