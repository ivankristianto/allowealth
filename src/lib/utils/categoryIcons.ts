/**
 * Category Icon Mapping Utility
 * ===============================
 *
 * Provides a centralized mapping of category names to Lucide icon names.
 * This utility is used by components that need to display category icons.
 *
 * Usage:
 *   import { getIconForCategory } from '@/lib/utils/categoryIcons';
 *   const iconName = getIconForCategory('Groceries'); // Returns 'ShoppingCart'
 */

/**
 * Category name to icon name mapping
 *
 * Keys are lowercase category name patterns that are matched against
 * the category name using partial matching (includes check).
 *
 * Values are Lucide icon component names (strings) that correspond to
 * the icons imported from @lucide/astro.
 */
export const categoryIconMap: Record<string, string> = {
  // Housing
  housing: 'House',
  apartment: 'House',
  rent: 'House',
  home: 'House',

  // Groceries/Food
  groceries: 'ShoppingCart',
  grocery: 'ShoppingCart',
  food: 'Utensils',
  supermarket: 'ShoppingCart',

  // Dining/Restaurants
  dining: 'Utensils',
  restaurant: 'Utensils',
  restaurants: 'Utensils',
  cafe: 'Utensils',
  coffee: 'Utensils',

  // Transportation
  transport: 'Car',
  transportation: 'Car',
  car: 'Car',
  fuel: 'Car',
  gas: 'Car',
  parking: 'Car',
  taxi: 'Car',
  uber: 'Car',

  // Entertainment
  entertainment: 'Film',
  movies: 'Film',
  music: 'Film',
  games: 'Film',
  streaming: 'Film',

  // Utilities/Bills
  utilities: 'Zap',
  utility: 'Zap',
  bills: 'Zap',
  electricity: 'Zap',
  water: 'Zap',
  internet: 'Zap',
  phone: 'Zap',

  // Work/Business
  work: 'Briefcase',
  business: 'Briefcase',
  office: 'Briefcase',
  freelance: 'Briefcase',

  // Health/Medical
  health: 'Heart',
  medical: 'Heart',
  healthcare: 'Heart',
  doctor: 'Heart',
  pharmacy: 'Heart',
  fitness: 'Heart',

  // Education
  education: 'GraduationCap',
  school: 'GraduationCap',
  tuition: 'GraduationCap',
  books: 'GraduationCap',

  // Clothing/Shopping
  clothing: 'Shirt',
  apparel: 'Shirt',
  fashion: 'Shirt',
  shopping: 'ShoppingCart',

  // Gifts
  gifts: 'Gift',
  gift: 'Gift',
  charity: 'Gift',
  donation: 'Gift',

  // Travel/Vacation
  travel: 'Plane',
  vacation: 'Plane',
  flight: 'Plane',
  hotel: 'Plane',

  // Finance/Investment
  finance: 'CircleDollarSign',
  investment: 'CircleDollarSign',
  savings: 'CircleDollarSign',
  insurance: 'CircleDollarSign',
};

/**
 * Get the icon name for a category
 *
 * Performs a case-insensitive partial match (substring check) against known category names.
 * Returns the default icon (CircleDollarSign) if no match is found.
 *
 * Note: Matching is order-dependent - the first match in the map wins.
 *
 * @param categoryName - The category name to look up
 * @param explicitIcon - Optional explicit icon name that overrides the category mapping
 * @returns The Lucide icon name for the category
 *
 * @example
 * getIconForCategory('Groceries') // Returns 'ShoppingCart'
 * getIconForCategory('Dining Out') // Returns 'Utensils'
 * getIconForCategory('Unknown') // Returns 'CircleDollarSign'
 * getIconForCategory('Housing', 'Building') // Returns 'Building' (explicit override)
 */
export function getIconForCategory(categoryName: string, explicitIcon: string = ''): string {
  // If explicit icon is provided, use it immediately (override behavior)
  if (explicitIcon) {
    return explicitIcon;
  }

  const lowerName = categoryName.toLowerCase();

  // Check for partial matches
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }

  return 'CircleDollarSign';
}
