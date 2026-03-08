import type { AccountType } from '@/lib/types/account';

export interface DefaultAccountCategory {
  name: string;
  description: string;
  isLiability: boolean;
  sortOrder: number;
  legacyType: AccountType;
}

export const DEFAULT_ACCOUNT_CATEGORIES: DefaultAccountCategory[] = [
  {
    name: 'Bank Account',
    description: 'Checking and savings accounts',
    isLiability: false,
    sortOrder: 1,
    legacyType: 'bank_account',
  },
  {
    name: 'E-Wallet',
    description: 'Digital wallets (GoPay, OVO, etc.)',
    isLiability: false,
    sortOrder: 2,
    legacyType: 'e_wallet',
  },
  {
    name: 'Mutual Fund',
    description: 'Investment funds',
    isLiability: false,
    sortOrder: 3,
    legacyType: 'mutual_fund',
  },
  {
    name: 'Bond',
    description: 'Government and corporate bonds',
    isLiability: false,
    sortOrder: 4,
    legacyType: 'bond',
  },
  {
    name: 'Crypto',
    description: 'Cryptocurrencies',
    isLiability: false,
    sortOrder: 5,
    legacyType: 'crypto',
  },
  {
    name: 'Stock',
    description: 'Stocks',
    isLiability: false,
    sortOrder: 6,
    legacyType: 'stock',
  },
  {
    name: 'Other',
    description: 'Miscellaneous',
    isLiability: false,
    sortOrder: 7,
    legacyType: 'other',
  },
  {
    name: 'Commodities & Precious Metals',
    description: 'Gold, silver, and commodities',
    isLiability: false,
    sortOrder: 8,
    legacyType: 'other',
  },
  {
    name: 'Credit Card',
    description: 'Credit card balances',
    isLiability: true,
    sortOrder: 9,
    legacyType: 'credit_card',
  },
  {
    name: 'Loan',
    description: 'Loans and mortgages',
    isLiability: true,
    sortOrder: 10,
    legacyType: 'loan',
  },
];
