/**
 * Account Data Templates
 */

// Payment accounts (used for daily transactions - cash, bank accounts, credit cards, e-wallets)
export const PAYMENT_ACCOUNTS = [
  {
    name: 'Cash',
    type: 'cash' as const,
    balance: 2000000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'BCA Credit Card',
    type: 'credit_card' as const,
    balance: 5000000, // Outstanding debt
    currency: 'IDR' as const,
    is_cash_account: false,
    credit_limit: 50000000,
  },
  {
    name: 'Mandiri Credit Card',
    type: 'credit_card' as const,
    balance: 3200000, // Outstanding debt
    currency: 'IDR' as const,
    is_cash_account: false,
    credit_limit: 30000000,
  },
  {
    name: 'GoPay',
    type: 'e_wallet' as const,
    balance: 500000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'OVO',
    type: 'e_wallet' as const,
    balance: 300000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'Transfer',
    type: 'bank_account' as const,
    balance: 10000000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
];

// Debt accounts (loans - long-term liabilities)
export const LOAN_ACCOUNTS = [
  {
    name: 'Home Mortgage - BSD',
    type: 'loan' as const,
    balance: 450000000, // Outstanding principal
    currency: 'IDR' as const,
  },
  {
    name: 'Car Loan - Innova',
    type: 'loan' as const,
    balance: 85000000,
    currency: 'IDR' as const,
  },
];

// Investment and other account types
export const ACCOUNT_TYPES = [
  // Indonesian bank accounts (IDR)
  {
    name: 'BCA Savings',
    type: 'bank_account' as const,
    balance: 50000000,
    currency: 'IDR' as const,
  },

  // USD-denominated bank accounts
  {
    name: 'Chase Checking',
    type: 'bank_account' as const,
    balance: 5000,
    currency: 'USD' as const,
  },
  { name: 'DBS Savings', type: 'bank_account' as const, balance: 3000, currency: 'USD' as const },

  // Mutual funds (IDR)
  {
    name: 'Reksa Dana BCAP',
    type: 'mutual_fund' as const,
    balance: 25000000,
    currency: 'IDR' as const,
  },

  // Indonesian stocks (IDR)
  { name: 'Stock - BBRI', type: 'stock' as const, balance: 12000000, currency: 'IDR' as const },
  { name: 'Stock - BBCA', type: 'stock' as const, balance: 18000000, currency: 'IDR' as const },

  // USD-denominated stocks
  { name: 'Stock - AAPL', type: 'stock' as const, balance: 15000, currency: 'USD' as const },
  { name: 'Stock - MSFT', type: 'stock' as const, balance: 12000, currency: 'USD' as const },
  { name: 'Stock - GOOGL', type: 'stock' as const, balance: 8000, currency: 'USD' as const },
  { name: 'Stock - AMZN', type: 'stock' as const, balance: 10000, currency: 'USD' as const },

  // Indonesian government bonds
  { name: 'ORI020', type: 'bond' as const, balance: 10000000, currency: 'IDR' as const },
  { name: 'SBN032', type: 'bond' as const, balance: 15000000, currency: 'IDR' as const },
  { name: 'SBR010', type: 'bond' as const, balance: 20000000, currency: 'IDR' as const },

  // Corporate bonds
  {
    name: 'Corporate Bond - ABC',
    type: 'bond' as const,
    balance: 25000000,
    currency: 'IDR' as const,
  },
  {
    name: 'Corporate Bond - XYZ',
    type: 'bond' as const,
    balance: 30000000,
    currency: 'IDR' as const,
  },

  // Cryptocurrency
  { name: 'Bitcoin', type: 'crypto' as const, balance: 45000000, currency: 'IDR' as const },
  { name: 'Ethereum', type: 'crypto' as const, balance: 28000000, currency: 'IDR' as const },
  { name: 'Tether (USDT)', type: 'crypto' as const, balance: 15000000, currency: 'IDR' as const },
  { name: 'USD Coin (USDC)', type: 'crypto' as const, balance: 10000000, currency: 'IDR' as const },
];
