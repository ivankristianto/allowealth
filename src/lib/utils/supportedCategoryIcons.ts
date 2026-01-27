/**
 * Supported Category Icons
 *
 * This is the single source of truth for icons that can be used for categories.
 * These icons are supported in:
 * - CategoryIcon component (renders any Lucide icon)
 * - BudgetCard component (iconMap for budget display)
 * - CategoryModal component (icon picker dropdown)
 *
 * Icon names are in kebab-case (lowercase with dashes) as stored in the database.
 * The CategoryIcon component automatically converts to PascalCase for Lucide lookup.
 *
 * When adding new icons:
 * 1. Add to this list
 * 2. Add to BudgetCard.astro iconMap (if used in budget display)
 *
 * @see https://lucide.dev/icons for available icons
 */

export interface CategoryIconOption {
  /** Kebab-case icon name (stored in database) */
  value: string;
  /** Display label for the dropdown */
  label: string;
  /** Category grouping for better UX */
  group: 'expense' | 'income' | 'general';
}

/**
 * Supported icons organized by category type
 */
export const SUPPORTED_CATEGORY_ICONS: CategoryIconOption[] = [
  // Expense - Housing & Home
  { value: 'house', label: 'House', group: 'expense' },
  { value: 'home', label: 'Home', group: 'expense' },
  { value: 'hammer', label: 'Hammer (Renovation)', group: 'expense' },

  // Expense - Food & Groceries
  { value: 'shopping-cart', label: 'Shopping Cart', group: 'expense' },
  { value: 'shopping-basket', label: 'Shopping Basket', group: 'expense' },
  { value: 'utensils', label: 'Utensils (Dining)', group: 'expense' },

  // Expense - Transportation
  { value: 'car', label: 'Car', group: 'expense' },
  { value: 'plane', label: 'Plane (Travel)', group: 'expense' },

  // Expense - Entertainment
  { value: 'film', label: 'Film (Entertainment)', group: 'expense' },
  { value: 'smile', label: 'Smile (Entertainment)', group: 'expense' },

  // Expense - Utilities & Bills
  { value: 'zap', label: 'Zap (Utilities)', group: 'expense' },
  { value: 'shield', label: 'Shield (Insurance)', group: 'expense' },

  // Expense - Work & Business
  { value: 'briefcase', label: 'Briefcase (Work)', group: 'expense' },
  { value: 'user', label: 'User (Personal)', group: 'expense' },
  { value: 'users', label: 'Users (Family/Staff)', group: 'expense' },

  // Expense - Health & Education
  { value: 'heart', label: 'Heart (Health/Family)', group: 'expense' },
  { value: 'graduation-cap', label: 'Graduation Cap (Education)', group: 'expense' },

  // Expense - Shopping & Gifts
  { value: 'shirt', label: 'Shirt (Clothing)', group: 'expense' },
  { value: 'gift', label: 'Gift', group: 'expense' },
  { value: 'package', label: 'Package (Misc)', group: 'expense' },

  // Expense - Financial
  { value: 'wallet', label: 'Wallet', group: 'expense' },
  { value: 'repeat', label: 'Repeat (Recurring)', group: 'expense' },

  // Income icons
  { value: 'banknote', label: 'Banknote (Income)', group: 'income' },
  { value: 'trending-up', label: 'Trending Up (Investment)', group: 'income' },
  { value: 'circle-dollar-sign', label: 'Dollar Sign', group: 'income' },

  // General/Default
  { value: 'tag', label: 'Tag (Default)', group: 'general' },
  { value: 'circle-dot', label: 'Circle Dot', group: 'general' },
];

/**
 * Get icon options filtered by category type
 */
export function getIconOptionsForType(type: 'expense' | 'income'): CategoryIconOption[] {
  // Include type-specific icons plus general icons
  return SUPPORTED_CATEGORY_ICONS.filter((icon) => icon.group === type || icon.group === 'general');
}

/**
 * Get all icon options (for when type is not known)
 */
export function getAllIconOptions(): CategoryIconOption[] {
  return SUPPORTED_CATEGORY_ICONS;
}

/**
 * Check if an icon is supported
 */
export function isIconSupported(iconName: string): boolean {
  return SUPPORTED_CATEGORY_ICONS.some((icon) => icon.value === iconName.toLowerCase());
}

/**
 * Get default icon for a category type
 */
export function getDefaultIconForType(type: 'expense' | 'income'): string {
  return type === 'expense' ? 'tag' : 'banknote';
}
