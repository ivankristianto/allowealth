/**
 * Category Metadata Utility
 *
 * Provides icon and styling information for transaction categories.
 * Centralized here to avoid duplication across components.
 */

import type { TransactionOutput } from '@/lib/types/transaction';
import {
  Banknote,
  Briefcase,
  Car,
  Film,
  House,
  Pill,
  ShoppingBasket,
  UtensilsCrossed,
  Wallet,
  Zap,
} from '@lucide/astro';

/**
 * Available category icon components
 */
export type CategoryIconComponent =
  | typeof ShoppingBasket
  | typeof Zap
  | typeof Film
  | typeof Car
  | typeof Pill
  | typeof UtensilsCrossed
  | typeof House
  | typeof Banknote
  | typeof Briefcase
  | typeof Wallet;

/**
 * Category variant types for styling
 */
export type CategoryVariant =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

/**
 * Category metadata containing icon and variant
 */
export interface CategoryMeta {
  icon: CategoryIconComponent;
  variant: CategoryVariant;
}

/**
 * Get category metadata (icon and variant) based on category name and transaction type.
 *
 * @param name - The category name
 * @param type - The transaction type (income/expense)
 * @returns CategoryMeta with icon component and variant
 */
export function getCategoryMeta(name: string, type: TransactionOutput['type']): CategoryMeta {
  const normalized = name.toLowerCase();

  // Income transactions always use success variant
  if (type === 'income') {
    return { icon: Banknote, variant: 'success' };
  }

  // Match expense categories by keywords
  if (
    normalized.includes('grocery') ||
    normalized.includes('market') ||
    normalized.includes('food')
  ) {
    return { icon: ShoppingBasket, variant: 'warning' };
  }

  if (
    normalized.includes('utility') ||
    normalized.includes('electric') ||
    normalized.includes('water') ||
    normalized.includes('gas')
  ) {
    return { icon: Zap, variant: 'info' };
  }

  if (
    normalized.includes('entertainment') ||
    normalized.includes('movie') ||
    normalized.includes('netflix')
  ) {
    return { icon: Film, variant: 'error' };
  }

  if (
    normalized.includes('transport') ||
    normalized.includes('uber') ||
    normalized.includes('taxi') ||
    normalized.includes('ride')
  ) {
    return { icon: Car, variant: 'accent' };
  }

  if (
    normalized.includes('health') ||
    normalized.includes('pharmacy') ||
    normalized.includes('medical')
  ) {
    return { icon: Pill, variant: 'primary' };
  }

  if (normalized.includes('dining') || normalized.includes('restaurant')) {
    return { icon: UtensilsCrossed, variant: 'warning' };
  }

  if (
    normalized.includes('housing') ||
    normalized.includes('rent') ||
    normalized.includes('mortgage')
  ) {
    return { icon: House, variant: 'primary' };
  }

  if (normalized.includes('freelance') || normalized.includes('contract')) {
    return { icon: Briefcase, variant: 'info' };
  }

  // Default fallback
  return {
    icon: Wallet,
    variant: type === 'expense' ? 'error' : 'success',
  };
}
