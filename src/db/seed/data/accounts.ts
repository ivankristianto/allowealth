import { SEEDER_CONFIG } from '../config';
/**
 * Account Data Templates
 */

export const CURRENT_ACCOUNT_NAME = 'Current Account';

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
    name: 'Emergency Savings',
    type: 'bank_account' as const,
    balance: 45_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Kids Education Fund',
    type: 'bank_account' as const,
    balance: 26_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Fixed Deposit - BCA',
    type: 'bank_account' as const,
    balance: 120_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Bond Ladder',
    type: 'bond' as const,
    balance: 78_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Dividend Portfolio',
    type: 'stock' as const,
    balance: 68_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'Retirement Mutual Fund',
    type: 'mutual_fund' as const,
    balance: 41_000_000,
    currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
  },
  {
    name: 'USD Travel Fund',
    type: 'bank_account' as const,
    balance: 4_500,
    currency: SEEDER_CONFIG.SECONDARY_CURRENCY,
    baseScale: 'secondary' as const,
  },
];
