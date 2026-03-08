import { SEEDER_CONFIG } from '../config';
/**
 * Account Data Templates
 */

export const CURRENT_ACCOUNT_NAME = 'BCA - 2332';

// Payment accounts (used for day-to-day spending and settlement)
export const getPaymentAccounts = () => [
  {
    name: 'Cash',
    type: 'cash' as const,
    balance: 1_500_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: true,
  },
  {
    name: CURRENT_ACCOUNT_NAME,
    type: 'bank_account' as const,
    balance: 18_500_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: true,
  },
  {
    name: 'BCA Credit Card',
    type: 'credit_card' as const,
    balance: 6_200_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: false,
    credit_limit: 60_000_000,
  },
  {
    name: 'Mandiri Credit Card',
    type: 'credit_card' as const,
    balance: 2_400_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: false,
    credit_limit: 35_000_000,
  },
  {
    name: 'GoPay',
    type: 'e_wallet' as const,
    balance: 750_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: true,
  },
  {
    name: 'OVO',
    type: 'e_wallet' as const,
    balance: 550_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
    is_cash_account: true,
  },
];

// Debt accounts (liabilities)
export const getLoanAccounts = () => [
  {
    name: 'Home Mortgage - BSD',
    type: 'loan' as const,
    balance: 425_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Car Loan - Innova',
    type: 'loan' as const,
    balance: 82_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
];

// Savings and investment accounts
export const getAccountTypes = () => [
  {
    name: 'Jenius - 8812',
    type: 'bank_account' as const,
    balance: 45_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'CIMB - 4410',
    type: 'bank_account' as const,
    balance: 26_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'BCA Deposit - 9912',
    type: 'bank_account' as const,
    balance: 120_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Mandiri Deposit - 1122',
    type: 'bank_account' as const,
    balance: 50_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'SBR012 Bond',
    type: 'bond' as const,
    balance: 78_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'ORI023 Bond',
    type: 'bond' as const,
    balance: 20_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'SR018 Sukuk',
    type: 'bond' as const,
    balance: 15_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Dividend Portfolio',
    type: 'stock' as const,
    balance: 68_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Sucorinvest Money Market Fund',
    type: 'mutual_fund' as const,
    balance: 41_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Schroder Dana Prestasi',
    type: 'mutual_fund' as const,
    balance: 25_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Batavia Dana Kas Maxima',
    type: 'mutual_fund' as const,
    balance: 15_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'DBS - 5521',
    type: 'bank_account' as const,
    balance: 4_500,
    currency: SEEDER_CONFIG.SECONDARY_CURRENCY,
    baseScale: 'secondary' as const,
  },
  {
    name: 'Antam Gold 10g',
    type: 'other' as const,
    balance: 14_500_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
];
