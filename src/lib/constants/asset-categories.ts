import type { AssetType } from '@/lib/types/asset';

export interface DefaultAssetCategory {
  name: string;
  description: string;
  isLiability: boolean;
  sortOrder: number;
  legacyType: AssetType;
}

export const DEFAULT_ASSET_CATEGORIES: DefaultAssetCategory[] = [
  {
    name: 'Cash',
    description: 'Physical cash holdings',
    isLiability: false,
    sortOrder: 1,
    legacyType: 'cash',
  },
  {
    name: 'Bank Account',
    description: 'Checking and savings accounts',
    isLiability: false,
    sortOrder: 2,
    legacyType: 'bank_account',
  },
  {
    name: 'E-Wallet',
    description: 'Digital wallets (GoPay, OVO, etc.)',
    isLiability: false,
    sortOrder: 3,
    legacyType: 'e_wallet',
  },
  {
    name: 'Mutual Fund',
    description: 'Investment fund holdings',
    isLiability: false,
    sortOrder: 4,
    legacyType: 'mutual_fund',
  },
  {
    name: 'Bond',
    description: 'Government and corporate bonds',
    isLiability: false,
    sortOrder: 5,
    legacyType: 'bond',
  },
  {
    name: 'Crypto',
    description: 'Cryptocurrency holdings',
    isLiability: false,
    sortOrder: 6,
    legacyType: 'crypto',
  },
  {
    name: 'Stock',
    description: 'Stock market investments',
    isLiability: false,
    sortOrder: 7,
    legacyType: 'stock',
  },
  {
    name: 'Other',
    description: 'Miscellaneous assets',
    isLiability: false,
    sortOrder: 8,
    legacyType: 'other',
  },
  {
    name: 'Credit Card',
    description: 'Credit card balances (what you owe)',
    isLiability: true,
    sortOrder: 9,
    legacyType: 'credit_card',
  },
  {
    name: 'Loan',
    description: 'Personal loans and mortgages',
    isLiability: true,
    sortOrder: 10,
    legacyType: 'loan',
  },
];
