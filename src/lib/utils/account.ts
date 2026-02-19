/**
 * Account utilities for portfolio calculation and visualization
 */

import type { AccountOutput, AccountClass } from '@/lib/types/account';

/**
 * Predefined color palette for account allocation visualization.
 * Colors are chosen for accessibility and visual distinction.
 */
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  stock: '#15803d', // forest-600 (accent)
  bank_account: '#0ea5e9', // sky-500 (info)
  mutual_fund: '#f59e0b', // amber-500
  bond: '#3b82f6', // blue-500
  crypto: '#8b5cf6', // violet-500
  other: '#9ca3af', // gray-400
};

/**
 * Fallback colors for additional types
 */
const FALLBACK_COLORS = [
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
] as const;

/**
 * Default fallback color
 */
const DEFAULT_COLOR = '#6b7280'; // gray-500

/**
 * Get color for account type
 * @param type - Account type
 * @param index - Optional index for fallback ordering
 * @returns Hex color string
 */
export function getAccountTypeColor(type: string, index?: number): string {
  // Check predefined colors first
  if (ACCOUNT_TYPE_COLORS[type]) {
    return ACCOUNT_TYPE_COLORS[type];
  }

  // Use fallback colors based on index
  if (index !== undefined) {
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }

  return DEFAULT_COLOR;
}

/**
 * Account allocation distribution item
 */
export interface AccountAllocationItem {
  type: string;
  percentage: number;
  totalIdr: number;
  color: string;
}

function getAccountGroupKey(account: AccountOutput): string {
  return account.category_id || account.type;
}

function getAccountGroupLabel(account: AccountOutput): string {
  return account.category_name || formatTypeForDisplay(account.type);
}

/**
 * @TODO: Wire with backend - Get actual exchange rate from API
 * Default exchange rate for IDR to USD conversion
 */
const IDR_TO_USD_RATE = 15000;

/**
 * Convert amount between currencies
 * @TODO: Wire with backend - Use real-time exchange rates
 */
export function convertToIdr(amount: number, currency: 'IDR' | 'USD'): number {
  return currency === 'IDR' ? amount : amount * IDR_TO_USD_RATE;
}

/**
 * Convert IDR to USD
 * @TODO: Wire with backend - Use real-time exchange rates
 */
export function convertIdrToUsd(amountIdr: number): number {
  return amountIdr / IDR_TO_USD_RATE;
}

/**
 * Calculate account allocation distribution by type
 * All values are normalized to IDR for percentage calculation
 *
 * @param accounts - Array of accounts
 * @returns Array of allocation items sorted by percentage (largest first)
 */
export function calculateAccountAllocation(accounts: AccountOutput[]): AccountAllocationItem[] {
  if (!accounts || accounts.length === 0) {
    return [];
  }

  // Group accounts by type and calculate total in IDR
  const typeGroups: Record<
    string,
    { key: string; label: string; totalIdr: number; accounts: AccountOutput[] }
  > = {};

  for (const account of accounts) {
    const balance = parseFloat(account.balance || '0');
    if (isNaN(balance) || balance <= 0) continue;

    // Exclude debt accounts from allocation chart
    if (account.account_class === 'debt') continue;

    const balanceInIdr = convertToIdr(balance, account.currency);

    const groupKey = getAccountGroupKey(account);
    const groupLabel = getAccountGroupLabel(account);

    if (!typeGroups[groupKey]) {
      typeGroups[groupKey] = {
        key: groupKey,
        label: groupLabel,
        totalIdr: 0,
        accounts: [],
      };
    }

    typeGroups[groupKey].totalIdr += balanceInIdr;
    typeGroups[groupKey].accounts.push(account);
  }

  // Calculate total portfolio value in IDR
  const totalAccountsIdr = Object.values(typeGroups).reduce(
    (sum, group) => sum + group.totalIdr,
    0
  );

  if (totalAccountsIdr === 0) {
    return [];
  }

  // Calculate percentages and assign colors
  const allocation = Object.values(typeGroups)
    .map((group, index) => ({
      type: group.label,
      percentage: Math.round((group.totalIdr / totalAccountsIdr) * 100),
      totalIdr: group.totalIdr,
      color: getAccountTypeColor(group.key, index),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return allocation;
}

/**
 * Format account type for display (e.g., bank_account -> Bank Account)
 */
export function formatTypeForDisplay(type: string): string {
  const displayNames: Record<string, string> = {
    bank_account: 'Bank Account',
    mutual_fund: 'Mutual Fund',
    bond: 'Bond',
    crypto: 'Cryptocurrency',
    stock: 'Stock',
    other: 'Other',
  };

  return displayNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Group accounts by type
 * @param accounts - Array of accounts
 * @returns Record of accounts grouped by type
 */
export function groupAccountsByType(accounts: AccountOutput[]): Record<string, AccountOutput[]> {
  return accounts.reduce(
    (acc, account) => {
      const groupKey = getAccountGroupKey(account);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(account);
      return acc;
    },
    {} as Record<string, AccountOutput[]>
  );
}

/**
 * Group accounts by account class (liquid, non_liquid, debt)
 */
export function groupAccountsByClass(
  accounts: AccountOutput[]
): Record<AccountClass, AccountOutput[]> {
  const groups: Record<AccountClass, AccountOutput[]> = {
    liquid: [],
    non_liquid: [],
    debt: [],
  };

  for (const account of accounts) {
    const cls = account.account_class || 'liquid';
    groups[cls].push(account);
  }

  return groups;
}

/**
 * Calculate total by currency for a group of accounts
 */
export interface AccountGroupTotals {
  idr: number;
  usd: number;
}

export function calculateGroupTotals(accounts: AccountOutput[]): AccountGroupTotals {
  return accounts.reduce(
    (acc, account) => {
      const balance = parseFloat(account.balance || '0');
      if (isNaN(balance)) return acc;

      if (account.currency === 'IDR') {
        acc.idr += balance;
      } else {
        acc.usd += balance;
      }
      return acc;
    },
    { idr: 0, usd: 0 }
  );
}

/**
 * Calculate portfolio totals in both currencies
 */
export interface PortfolioTotals {
  totalIdr: number;
  totalUsd: number;
}

export function calculatePortfolioTotals(accounts: AccountOutput[]): PortfolioTotals {
  let totalIdr = 0;
  let totalUsd = 0;

  for (const account of accounts) {
    // Exclude debt accounts from total accounts
    if (account.account_class === 'debt') continue;

    const balance = parseFloat(account.balance || '0');
    if (isNaN(balance) || balance <= 0) continue;

    if (account.currency === 'USD') {
      totalUsd += balance;
    } else {
      totalIdr += balance;
    }
  }

  return { totalIdr, totalUsd };
}

/**
 * Calculate total debt by currency (absolute values)
 */
export interface DebtTotals {
  debtIdr: number;
  debtUsd: number;
}

export function calculateDebtTotals(accounts: AccountOutput[]): DebtTotals {
  let debtIdr = 0;
  let debtUsd = 0;

  for (const account of accounts) {
    if (account.account_class !== 'debt') continue;

    const balance = Math.abs(parseFloat(account.balance || '0'));
    if (isNaN(balance)) continue;

    if (account.currency === 'USD') {
      debtUsd += balance;
    } else {
      debtIdr += balance;
    }
  }

  return { debtIdr, debtUsd };
}

/**
 * Account type order for display
 */
export const ACCOUNT_TYPE_ORDER: Record<string, number> = {
  stock: 1,
  bank_account: 2,
  mutual_fund: 3,
  bond: 4,
  crypto: 5,
  other: 6,
};

/**
 * Sort account types by predefined order
 */
export function sortAccountTypes(types: string[]): string[] {
  return types.sort((a, b) => (ACCOUNT_TYPE_ORDER[a] || 99) - (ACCOUNT_TYPE_ORDER[b] || 99));
}
