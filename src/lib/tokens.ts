/**
 * Design Tokens - JavaScript/TypeScript exports
 * ==========================================
 * Use these values in component logic for consistency
 *
 * Version: 1.1.0 - Oasis Finance Design System (Forest Green)
 * Color semantic model:
 * - primary = slate-900 → headings, primary text, secondary buttons
 * - accent = forest-600 (#16a34a) → CTAs, interactive elements, active states
 * - success = emerald-500 → positive status, confirmations
 * - warning = amber-500 → budget alerts, caution states
 * - error = rose-500 → over budget, destructive actions
 * - info = sky-500 (#0ea5e9) → informational messages (distinct from accent)
 */

/* ========================================
 * STATUS TYPES
 * ========================================
 *
 * Two status conventions exist in this codebase:
 *
 * 1. BudgetStatus ('ok' | 'warning' | 'exceeded')
 *    - Business logic type for budget calculations
 *    - Defined in '@/lib/utils/budget'
 *    - Uses semantic naming: 'exceeded' = over 100%
 *
 * 2. BudgetStatusClassName ('status-ok' | 'status-warning' | 'status-danger')
 *    - CSS class type for visual styling
 *    - Defined here in tokens.ts
 *    - Uses danger naming: 'status-danger' = over 100%
 *
 * Use `toBudgetStatusClassName()` to convert between them.
 * ======================================== */

/**
 * Budget status type for CSS class-oriented naming.
 * Use this for progress bars, badges, and visual indicators.
 *
 * Convention:
 * - 'status-ok': Under 80% usage (green/success)
 * - 'status-warning': 80-99% usage (amber/warning)
 * - 'status-danger': 100%+ usage (red/error)
 *
 * @see BudgetStatus in '@/lib/utils/budget' for business logic status ('ok' | 'warning' | 'exceeded')
 */
export type BudgetStatusClassName = 'status-ok' | 'status-warning' | 'status-danger';

/**
 * Convert BudgetStatus (business logic) to BudgetStatusClassName (CSS styling)
 *
 * @param status - Business logic status from budget calculations
 * @returns CSS class name for styling
 *
 * @example
 * import { type BudgetStatus } from '@/lib/utils/budget';
 * const status: BudgetStatus = 'exceeded';
 * const cssClass = toBudgetStatusClassName(status); // 'status-danger'
 */
export function toBudgetStatusClassName(
  status: 'ok' | 'warning' | 'exceeded'
): BudgetStatusClassName {
  const mapping: Record<'ok' | 'warning' | 'exceeded', BudgetStatusClassName> = {
    ok: 'status-ok',
    warning: 'status-warning',
    exceeded: 'status-danger',
  };
  return mapping[status];
}

/* ========================================
 * COLORS
 * ======================================== */

export const colors = {
  // Primary semantic color - slate-900 (headings, primary text, secondary buttons)
  primary: '#0f172a',
  primaryLight: '#f1f5f9',

  // Accent color - forest-600 (CTAs, interactive elements, active states)
  accent: '#16a34a',
  accentHover: '#15803d',
  accentContent: '#ffffff',

  warning: '#f59e0b',
  warningHover: '#d97706',

  error: '#f43f5e',
  errorHover: '#e11d48',

  success: '#10b981',
  info: '#0ea5e9', // sky-500 - distinct from forest accent

  // Slate color scale
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  } as const,

  // Forest green color scale (accent)
  forest: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  } as const,

  // Sky color scale (info)
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
  } as const,

  // Rose color scale
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    500: '#f43f5e',
    600: '#e11d48',
  } as const,

  currency: {
    idr: '#10b981', // emerald
    usd: '#0ea5e9', // sky - distinct from forest accent
  },

  status: {
    ok: '#22c55e', // Under 80%
    warning: '#f59e0b', // 80-99%
    danger: '#f43f5e', // Over 100%
  },

  /**
   * Category colors - DaisyUI semantic classes for theme compatibility
   * Use these for category icons and visual indicators
   */
  category: {
    utilities: 'bg-info',
    dining: 'bg-warning',
    health: 'bg-accent',
    transport: 'bg-secondary',
    entertainment: 'bg-primary',
    groceries: 'bg-success',
    housing: 'bg-error',
    default: 'bg-base-300',
  },
} as const;

/**
 * Category color map for chart/icon backgrounds
 * Returns DaisyUI semantic class for theme compatibility
 */
export const categoryColors: Record<string, string> = {
  Utilities: colors.category.utilities,
  Dining: colors.category.dining,
  Health: colors.category.health,
  Transport: colors.category.transport,
  Entertainment: colors.category.entertainment,
  Groceries: colors.category.groceries,
  Housing: colors.category.housing,
};

/**
 * Get category color class (DaisyUI semantic)
 * @param categoryName - Category name
 * @returns DaisyUI background color class
 */
export function getCategoryColor(categoryName: string): string {
  return categoryColors[categoryName] || colors.category.default;
}

/* ========================================
 * TYPOGRAPHY
 * ======================================== */

export const fonts = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SF Mono', Monaco, 'Cascadia Code', monospace",
} as const;

// Accessibility-adjusted font sizes (WCAG compliance: min 12px for xs)
export const fontSizes = {
  xs: '0.75rem', // 12px - minimum accessible size
  sm: '0.8125rem', // 13px
  base: '0.875rem', // 14px - accessible body text
  md: '0.9375rem', // 15px
  lg: '1rem', // 16px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem', // 48px
  '6xl': '3.75rem', // 60px
} as const;

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/* ========================================
 * SPACING
 * ======================================== */

export const spacing = {
  card: '1.5rem', // 24px - card padding
  cardLg: '2rem', // 32px - large card padding (PoC)
  section: '2rem', // 32px - section gaps
  form: '1rem', // 16px - form field gaps
} as const;

export const tokenClasses = {
  badgePadding: 'token-badge-padding',
  textXs: 'token-text-xs',
  textSm: 'token-text-sm',
  marginTopLg: 'token-mt-6',
  cardPaddingLg: 'token-card-padding-lg',
  paddingMd: 'token-padding-md',
  paddingSm: 'token-padding-sm',
  gapLg: 'token-gap-lg',
  gapMd: 'token-gap-md',
  stackSm: 'token-stack-sm',
} as const;

/* ========================================
 * BREAKPOINTS
 * ======================================== */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/* ========================================
 * ANIMATIONS
 * ======================================== */

export const animationDuration = {
  fast: 0.15, // 150ms
  normal: 0.3, // 300ms
  slow: 0.5, // 500ms
} as const;

export const springPresets = {
  smooth: {
    stiffness: 100,
    damping: 15,
    mass: 1,
  },
  bouncy: {
    stiffness: 300,
    damping: 10,
    mass: 1,
  },
  gentle: {
    stiffness: 50,
    damping: 20,
    mass: 1,
  },
  snappy: {
    stiffness: 400,
    damping: 30,
    mass: 1,
  },
} as const;

/* ========================================
 * TRANSITIONS (Legacy - use animationDuration)
 * ======================================== */

export const transitions = {
  fast: 150,
  base: 200,
  slow: 300,
} as const;

/**
 * Get budget status class name based on percentage used
 * @param percentage - Budget usage percentage (0-100+)
 * @returns Status class name for styling
 */
export function getBudgetStatusClass(percentage: number): BudgetStatusClassName {
  if (percentage >= 100) return 'status-danger';
  if (percentage >= 80) return 'status-warning';
  return 'status-ok';
}

/**
 * Progress bar status type for visual indicators.
 * Use this for progress bars and compact status badges.
 */
export type ProgressBarStatus = 'ok' | 'warning' | 'danger';

/**
 * Get status color classes for progress bars and compact badges.
 * Returns just the color classes (text + background) without typography.
 *
 * @param status - Progress bar status
 * @returns DaisyUI color classes for the status
 * @example
 * getProgressBarStatusColors('ok') // 'text-success bg-success/10'
 */
export function getProgressBarStatusColors(status: ProgressBarStatus): string {
  const statusColors: Record<ProgressBarStatus, string> = {
    ok: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-error bg-error/10',
  };
  return statusColors[status];
}

/**
 * Get status badge classes for spending/usage badges
 * Returns DaisyUI semantic color classes for theme compatibility
 *
 * @param status - The budget status class name
 * @returns A string of CSS classes for styling the status badge
 * @example
 * getStatusBadgeClasses('status-ok') // 'text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-full text-success bg-success/10'
 */
export function getStatusBadgeClasses(status: BudgetStatusClassName): string {
  const baseClasses = 'text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-full';

  const statusClasses: Record<BudgetStatusClassName, string> = {
    'status-ok': 'text-success bg-success/10',
    'status-warning': 'text-warning bg-warning/10',
    'status-danger': 'text-error bg-error/10',
  };

  // No fallback needed - TypeScript enforces valid status values at compile time
  return `${baseClasses} ${statusClasses[status]}`;
}

/**
 * Get asset update priority
 * Returns: 'high' (>30 days), 'medium' (>14 days), 'low' (>7 days), 'none' (<=7 days)
 */
export function getAssetUpdatePriority(
  daysSinceUpdate: number
): 'high' | 'medium' | 'low' | 'none' {
  if (daysSinceUpdate > 30) return 'high';
  if (daysSinceUpdate > 14) return 'medium';
  if (daysSinceUpdate > 7) return 'low';
  return 'none';
}

/**
 * Format asset type for display
 */
export function formatAssetType(type: string): string {
  const labels: Record<string, string> = {
    bank_account: 'Bank Account',
    mutual_fund: 'Mutual Fund',
    bond: 'Bond',
    crypto: 'Cryptocurrency',
    stock: 'Stock',
    other: 'Other',
  };
  return labels[type] || type;
}
