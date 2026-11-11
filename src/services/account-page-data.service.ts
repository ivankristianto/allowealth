/**
 * Data for the /accounts page: the account list for the chosen month, its reconciliation
 * against transactions, and the portfolio totals, allocation and class groups.
 */

import type { AccountClass, AccountOutput, AccountType } from '@/lib/types/account';
import { ACCOUNT_CLASS_LABELS, deriveAccountClass, formatAccountType } from '@/lib/types/account';
import type { Currency } from '@/lib/constants/currency';
import type { PerfCollector } from '@/lib/perf';
import {
  calculateAccountAllocation,
  calculateAccountTotalsByCurrency,
  calculateDebtTotalsByCurrency,
  calculateReconciliation,
  groupAccountsByClass,
} from '@/lib/utils/account';
import type { AccountService } from './account.service';
import type { TransactionService } from './transaction.service';

type CurrentAccount = Awaited<ReturnType<AccountService['findAll']>>[number];
type SnapshotAccount = Awaited<ReturnType<AccountService['getSnapshotForMonth']>>[number];

export interface AccountsPageFilters {
  user_id: string;
  type?: AccountType;
  category_id?: string;
  currency?: Currency;
  owner_user_id?: string;
}

export interface AccountsPageDataInput {
  workspaceId: string;
  filters: AccountsPageFilters;
  ownerUserId?: string;
  year: number;
  month: number;
  isViewingCurrentMonth: boolean;
  now: Date;
  currencies: Currency[];
  categoryNamesById: Map<string, string>;
  perf?: PerfCollector;
}

export interface AccountsPageDeps {
  accountService: Pick<AccountService, 'findAll' | 'getSnapshotForMonth'>;
  transactionService: Pick<TransactionService, 'getMonthSummary'>;
}

const CLASS_ORDER: AccountClass[] = ['liquid', 'debt', 'non_liquid'];

/** Categoryless accounts are labelled with their type; a deleted category reads as null. */
function toPageAccount(
  account: CurrentAccount | SnapshotAccount,
  overrides: Pick<AccountOutput, 'account_class' | 'balance' | 'last_updated'>,
  categoryNamesById: Map<string, string>
): AccountOutput {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    account_class: overrides.account_class,
    category_id: account.category_id,
    category_name: account.category_id
      ? categoryNamesById.get(account.category_id) || null
      : formatAccountType(account.type),
    balance: overrides.balance,
    initial_balance: account.initial_balance || null,
    currency: account.currency,
    status: account.status ?? 'active',
    closed_at: account.closed_at ?? null,
    closed_by_user_id: account.closed_by_user_id ?? null,
    created_by_user_id: account.created_by_user_id,
    last_updated: overrides.last_updated,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

export function fromCurrentAccount(
  account: CurrentAccount,
  categoryNamesById: Map<string, string>
): AccountOutput {
  return toPageAccount(
    account,
    {
      account_class: account.account_class,
      balance: account.balance,
      last_updated: account.last_updated,
    },
    categoryNamesById
  );
}

export function fromSnapshot(
  snapshot: SnapshotAccount,
  categoryNamesById: Map<string, string>
): AccountOutput {
  return toPageAccount(
    snapshot,
    {
      account_class: snapshot.account_class ?? deriveAccountClass(snapshot.type),
      balance: snapshot.snapshot_balance,
      last_updated: snapshot.snapshot_date || snapshot.last_updated,
    },
    categoryNamesById
  );
}

/** The first workspace currency holding a positive non-debt balance, else the primary one. */
export function pickAllocationCurrency(
  accounts: AccountOutput[],
  currencies: Currency[]
): Currency | undefined {
  return (
    currencies.find((currency) =>
      accounts.some((account) => {
        if (account.account_class === 'debt' || account.currency !== currency) return false;
        const balance = parseFloat(account.balance || '0');
        return Number.isFinite(balance) && balance > 0;
      })
    ) ?? currencies[0]
  );
}

export function summarizeAccounts(accounts: AccountOutput[], currencies: Currency[]) {
  const allocationCurrency = pickAllocationCurrency(accounts, currencies);
  const accountsByClass = groupAccountsByClass(accounts);

  return {
    accountTotalsByCurrency: calculateAccountTotalsByCurrency(accounts, currencies),
    debtTotalsByCurrency: calculateDebtTotalsByCurrency(accounts, currencies),
    allocationCurrency,
    accountAllocation: calculateAccountAllocation(accounts, allocationCurrency),
    latestUpdate: accounts.reduce<Date | null>((latest, account) => {
      const updated = new Date(account.last_updated);
      return !latest || updated > latest ? updated : latest;
    }, null),
    sortedGroups: CLASS_ORDER.filter((cls) => accountsByClass[cls].length > 0).map((cls) => ({
      groupKey: cls,
      label: ACCOUNT_CLASS_LABELS[cls],
      accounts: accountsByClass[cls],
    })),
  };
}

async function loadAccounts(input: AccountsPageDataInput, deps: AccountsPageDeps) {
  const { workspaceId, filters, categoryNamesById, perf } = input;

  if (!input.isViewingCurrentMonth) {
    const snapshots = await deps.accountService.getSnapshotForMonth(
      workspaceId,
      input.year,
      input.month,
      filters,
      perf
    );
    const accounts = snapshots.map((snapshot) => fromSnapshot(snapshot, categoryNamesById));
    // Snapshots already include closed accounts, so they double as the reconciliation set.
    return { accounts, reconciliationAccounts: accounts };
  }

  const [current, withInactive] = await Promise.all([
    deps.accountService.findAll(workspaceId, filters, perf),
    deps.accountService.findAll(workspaceId, { ...filters, includeInactive: true }, perf),
  ]);
  return {
    accounts: current.map((account) => fromCurrentAccount(account, categoryNamesById)),
    reconciliationAccounts: withInactive.map((account) =>
      fromCurrentAccount(account, categoryNamesById)
    ),
  };
}

async function loadReconciliation(
  input: AccountsPageDataInput,
  reconciliationAccounts: AccountOutput[],
  deps: AccountsPageDeps
) {
  if (reconciliationAccounts.length === 0) return [];

  const accountIds = reconciliationAccounts.map((account) => account.id);
  const periodStart = new Date(input.year, input.month - 1, 1);
  const periodEnd = input.isViewingCurrentMonth
    ? input.now
    : new Date(input.year, input.month, 0, 23, 59, 59, 999);

  const [startSnapshots, transactionSummaries] = await Promise.all([
    // getSnapshotForMonth adds includeInactive itself and rolls month 0 back to December.
    deps.accountService.getSnapshotForMonth(
      input.workspaceId,
      input.year,
      input.month - 1,
      input.filters,
      input.perf
    ),
    Promise.all(
      input.currencies.map((currency) =>
        deps.transactionService
          .getMonthSummary(
            {
              workspace_id: input.workspaceId,
              created_by_user_id: input.ownerUserId,
              currency,
              account_ids: accountIds,
              start_date: periodStart,
              end_date: periodEnd,
            },
            input.perf
          )
          .then((summary) => ({ currency, ...summary }))
      )
    ),
  ]);

  return calculateReconciliation({
    currencies: input.currencies,
    startSnapshots: startSnapshots.map((snapshot) => ({
      currency: snapshot.currency,
      balance: snapshot.snapshot_balance,
      account_class: snapshot.account_class ?? deriveAccountClass(snapshot.type),
    })),
    endAccounts: reconciliationAccounts.map((account) => ({
      currency: account.currency,
      balance: account.balance,
      account_class: account.account_class,
    })),
    transactionSummaries,
  });
}

export async function getAccountsPageData(input: AccountsPageDataInput, deps: AccountsPageDeps) {
  const { accounts, reconciliationAccounts } = await loadAccounts(input, deps);
  const reconciliation = await loadReconciliation(input, reconciliationAccounts, deps);

  return {
    accounts,
    reconciliation,
    ...summarizeAccounts(accounts, input.currencies),
  };
}
