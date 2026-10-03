import type { BackfillConfig } from '../config.schema';

/** Config matching the hand-authored 2099-01 fixture pair. All names invented. */
export const fixtureConfig: BackfillConfig = {
  filenames: {
    transactions: 'txn-{year}-{mon}.csv',
    balance: 'balance-{year}-{mon}.csv',
  },
  members: { primary: 'OwnerA', secondary: 'OwnerB', fallback: 'OwnerA' },
  accounts: [
    { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bank Account' },
    { name: 'Bank2 OwnerA USD', currency: 'USD', owner: 'OwnerA', category: 'Bank Account' },
    { name: 'Bond1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bond' },
    { name: 'Bank1 OwnerB', currency: 'IDR', owner: 'OwnerB', category: 'Bank Account' },
    { name: 'Bank2 OwnerB', currency: 'IDR', owner: 'OwnerB', category: 'Bank Account' },
    { name: 'Bond1 OwnerB', currency: 'IDR', owner: 'OwnerB', category: 'Bond' },
  ],
  accountAliases: [],
  duplicateRules: [],
  syntheticAccounts: {
    expense: 'Household (historical)',
    passiveIncome: {
      OwnerA: 'Passive Income (OwnerA)',
      OwnerB: 'Passive Income (OwnerB)',
    },
    category: 'Other',
  },
  categories: {
    expense: ['Cat1', 'Cat2', 'Cat3'],
    income: [
      { name: 'IncSalaryA', sourceType: 'active' },
      { name: 'IncSalaryB', sourceType: 'active' },
      { name: 'IncInterest', sourceType: 'passive' },
    ],
  },
  categoryRenames: [],
  expenseOwners: [],
  salaryRouting: [
    { category: 'IncSalaryA', account: 'Bank2 OwnerA USD' },
    { category: 'IncSalaryB', account: 'Bank1 OwnerB' },
  ],
  incomeRouting: [],
  suppressedRows: [],
  dateRules: { incomeDayOfMonth: 10, earliestMonth: '2099-01' },
};
