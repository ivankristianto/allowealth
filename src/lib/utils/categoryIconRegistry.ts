import {
  Banknote,
  Briefcase,
  Car,
  CircleDollarSign,
  CircleDot,
  Film,
  Gift,
  GraduationCap,
  Hammer,
  Heart,
  HeartPulse,
  House,
  Package,
  PiggyBank,
  Plane,
  Repeat,
  Shield,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smile,
  Tag,
  TrendingUp,
  Tv,
  User,
  Users,
  Utensils,
  Wallet,
  Zap,
} from '@lucide/astro';

export type CategoryIconComponent = typeof Tag;

const CATEGORY_ICON_COMPONENTS: Record<string, CategoryIconComponent> = {
  // Housing
  house: House,
  home: House,
  hammer: Hammer,
  // Food
  'shopping-cart': ShoppingCart,
  'shopping-basket': ShoppingBasket,
  utensils: Utensils,
  // Transport
  car: Car,
  plane: Plane,
  // Entertainment
  film: Film,
  smile: Smile,
  tv: Tv,
  // Utilities
  zap: Zap,
  shield: Shield,
  // Work / people
  briefcase: Briefcase,
  user: User,
  users: Users,
  // Health / education
  heart: Heart,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  // Shopping / gifts
  shirt: Shirt,
  gift: Gift,
  package: Package,
  // Financial
  wallet: Wallet,
  repeat: Repeat,
  banknote: Banknote,
  'trending-up': TrendingUp,
  'circle-dollar-sign': CircleDollarSign,
  'circle-dot': CircleDot,
  'piggy-bank': PiggyBank,
  // Fallback
  tag: Tag,
};

function normalizeIconKey(iconName: string): string {
  return iconName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function resolveCategoryIconComponent(
  iconName: string | null | undefined,
  fallback: CategoryIconComponent = Tag
): CategoryIconComponent {
  if (!iconName) {
    return fallback;
  }

  return CATEGORY_ICON_COMPONENTS[normalizeIconKey(iconName)] || fallback;
}
