/**
 * Design Tokens - JavaScript/TypeScript exports
 * ==========================================
 * Use these values in component logic for consistency
 *
 * Version: 1.0.0 - Oasis Finance Design System
 * Color semantic model:
 * - primary = slate-900 → headings, primary text, secondary buttons
 * - accent = indigo-500 → CTAs, interactive elements, active states
 * - success = emerald-500 → positive status, confirmations
 * - warning = amber-500 → budget alerts, caution states
 * - error = rose-500 → over budget, destructive actions
 */

/* ========================================
 * COLORS
 * ======================================== */

export const colors = {
  // Primary semantic color - slate-900 (headings, primary text, secondary buttons)
  primary: '#0f172a',
  primaryLight: '#f1f5f9',

  // Accent color - indigo-500 (CTAs, interactive elements, active states)
  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentContent: '#ffffff',

  warning: '#f59e0b',
  warningHover: '#d97706',

  error: '#f43f5e',
  errorHover: '#e11d48',

  success: '#10b981',
  info: '#6366f1',

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

  // Indigo color scale
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  } as const,

  // Rose color scale
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    500: '#f43f5e',
    600: '#e11d48',
  } as const,

  currency: {
    idr: '#10b981',
    usd: '#3b82f6',
  },

  status: {
    ok: '#22c55e', // Under 80%
    warning: '#f59e0b', // 80-99%
    danger: '#f43f5e', // Over 100%
  },
} as const;

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
  section: '2rem', // 32px - section gaps
  form: '1rem', // 16px - form field gaps
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

/* ========================================
 * CURRENCY FORMATTING
 * ======================================== */

export const currencyFormats = {
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    decimals: 0,
    locale: 'id-ID',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    decimals: 2,
    locale: 'en-US',
  },
} as const;

/**
 * Format currency amount
 * @param amount - Amount as string or number (string preferred for decimal precision)
 * @param currency - Currency code (IDR or USD)
 * @param compact - Use compact notation for large numbers
 */
export function formatCurrency(
  amount: string | number,
  currency: string = 'IDR',
  compact: boolean = false
): string {
  const config = currencyFormats[currency as keyof typeof currencyFormats] || currencyFormats.IDR;
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: compact ? 0 : config.decimals,
    maximumFractionDigits: compact ? 0 : config.decimals,
  };

  // Convert string to number for Intl.NumberFormat
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (compact && numericAmount >= 1_000_000) {
    const millions = numericAmount / 1_000_000;
    return `${config.symbol}${millions.toFixed(1)}M`;
  }

  return new Intl.NumberFormat(config.locale, options).format(numericAmount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get budget status color class
 */
export function getBudgetStatusClass(
  percentage: number
): 'status-ok' | 'status-warning' | 'status-danger' {
  if (percentage >= 100) return 'status-danger';
  if (percentage >= 80) return 'status-warning';
  return 'status-ok';
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
 * Format number with compact notation
 */
export function formatCompactNumber(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
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
