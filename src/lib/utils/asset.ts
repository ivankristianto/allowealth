/**
 * Asset utilities for portfolio calculation and visualization
 */

import type { AssetOutput, AccountClass } from '@/lib/types/asset';

/**
 * Predefined color palette for asset allocation visualization.
 * Colors are chosen for accessibility and visual distinction.
 */
const ASSET_TYPE_COLORS: Record<string, string> = {
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
 * Get color for asset type
 * @param type - Asset type
 * @param index - Optional index for fallback ordering
 * @returns Hex color string
 */
export function getAssetTypeColor(type: string, index?: number): string {
  // Check predefined colors first
  if (ASSET_TYPE_COLORS[type]) {
    return ASSET_TYPE_COLORS[type];
  }

  // Use fallback colors based on index
  if (index !== undefined) {
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }

  return DEFAULT_COLOR;
}

/**
 * Asset allocation distribution item
 */
export interface AssetAllocationItem {
  type: string;
  percentage: number;
  totalIdr: number;
  color: string;
}

function getAssetGroupKey(asset: AssetOutput): string {
  return asset.category_id || asset.type;
}

function getAssetGroupLabel(asset: AssetOutput): string {
  return asset.category_name || formatTypeForDisplay(asset.type);
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
 * Calculate asset allocation distribution by type
 * All values are normalized to IDR for percentage calculation
 *
 * @param assets - Array of assets
 * @returns Array of allocation items sorted by percentage (largest first)
 */
export function calculateAssetAllocation(assets: AssetOutput[]): AssetAllocationItem[] {
  if (!assets || assets.length === 0) {
    return [];
  }

  // Group assets by type and calculate total in IDR
  const typeGroups: Record<
    string,
    { key: string; label: string; totalIdr: number; assets: AssetOutput[] }
  > = {};

  for (const asset of assets) {
    const balance = parseFloat(asset.balance || '0');
    if (isNaN(balance) || balance <= 0) continue;

    // Exclude debt accounts from allocation chart
    if (asset.account_class === 'debt') continue;

    const balanceInIdr = convertToIdr(balance, asset.currency);

    const groupKey = getAssetGroupKey(asset);
    const groupLabel = getAssetGroupLabel(asset);

    if (!typeGroups[groupKey]) {
      typeGroups[groupKey] = {
        key: groupKey,
        label: groupLabel,
        totalIdr: 0,
        assets: [],
      };
    }

    typeGroups[groupKey].totalIdr += balanceInIdr;
    typeGroups[groupKey].assets.push(asset);
  }

  // Calculate total portfolio value in IDR
  const totalPortfolioIdr = Object.values(typeGroups).reduce(
    (sum, group) => sum + group.totalIdr,
    0
  );

  if (totalPortfolioIdr === 0) {
    return [];
  }

  // Calculate percentages and assign colors
  const allocation = Object.values(typeGroups)
    .map((group, index) => ({
      type: group.label,
      percentage: Math.round((group.totalIdr / totalPortfolioIdr) * 100),
      totalIdr: group.totalIdr,
      color: getAssetTypeColor(group.key, index),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return allocation;
}

/**
 * Format asset type for display (e.g., bank_account -> Bank Account)
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
 * Group assets by type
 * @param assets - Array of assets
 * @returns Record of assets grouped by type
 */
export function groupAssetsByType(assets: AssetOutput[]): Record<string, AssetOutput[]> {
  return assets.reduce(
    (acc, asset) => {
      const groupKey = getAssetGroupKey(asset);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(asset);
      return acc;
    },
    {} as Record<string, AssetOutput[]>
  );
}

/**
 * Group assets by account class (liquid, non_liquid, debt)
 */
export function groupAssetsByClass(assets: AssetOutput[]): Record<AccountClass, AssetOutput[]> {
  const groups: Record<AccountClass, AssetOutput[]> = {
    liquid: [],
    non_liquid: [],
    debt: [],
  };

  for (const asset of assets) {
    const cls = asset.account_class || 'liquid';
    groups[cls].push(asset);
  }

  return groups;
}

/**
 * Calculate total by currency for a group of assets
 */
export interface AssetGroupTotals {
  idr: number;
  usd: number;
}

export function calculateGroupTotals(assets: AssetOutput[]): AssetGroupTotals {
  return assets.reduce(
    (acc, asset) => {
      const balance = parseFloat(asset.balance || '0');
      if (isNaN(balance)) return acc;

      if (asset.currency === 'IDR') {
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

export function calculatePortfolioTotals(assets: AssetOutput[]): PortfolioTotals {
  let totalIdr = 0;
  let totalUsd = 0;

  for (const asset of assets) {
    // Exclude debt accounts from total assets
    if (asset.account_class === 'debt') continue;

    const balance = parseFloat(asset.balance || '0');
    if (isNaN(balance) || balance <= 0) continue;

    if (asset.currency === 'USD') {
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

export function calculateDebtTotals(assets: AssetOutput[]): DebtTotals {
  let debtIdr = 0;
  let debtUsd = 0;

  for (const asset of assets) {
    if (asset.account_class !== 'debt') continue;

    const balance = Math.abs(parseFloat(asset.balance || '0'));
    if (isNaN(balance)) continue;

    if (asset.currency === 'USD') {
      debtUsd += balance;
    } else {
      debtIdr += balance;
    }
  }

  return { debtIdr, debtUsd };
}

/**
 * Asset type order for display
 */
export const ASSET_TYPE_ORDER: Record<string, number> = {
  stock: 1,
  bank_account: 2,
  mutual_fund: 3,
  bond: 4,
  crypto: 5,
  other: 6,
};

/**
 * Sort asset types by predefined order
 */
export function sortAssetTypes(types: string[]): string[] {
  return types.sort((a, b) => (ASSET_TYPE_ORDER[a] || 99) - (ASSET_TYPE_ORDER[b] || 99));
}
