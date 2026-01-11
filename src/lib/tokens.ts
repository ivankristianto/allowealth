/**
 * Design Tokens - JavaScript/TypeScript exports
 * ==========================================
 * Use these values in component logic for consistency
 */

/* ========================================
 * COLORS
 * ======================================== */

export const colors = {
  primary: '#10b981',
  primaryHover: '#059669',
  primaryLight: '#d1fae5',

  warning: '#f59e0b',
  warningHover: '#d97706',

  error: '#ef4444',
  errorHover: '#dc2626',

  success: '#10b981',
  info: '#3b82f6',

  currency: {
    idr: '#10b981',
    usd: '#3b82f6',
  },

  status: {
    ok: '#22c55e', // Under 80%
    warning: '#f59e0b', // 80-99%
    danger: '#ef4444', // Over 100%
  },
} as const;

/* ========================================
 * TYPOGRAPHY
 * ======================================== */

export const fonts = {
  sans: 'system-ui, -apple-system, sans-serif',
  mono: "'SF Mono', Monaco, monospace",
} as const;

export const fontSizes = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
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
 * TRANSITIONS
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
  currency: keyof typeof currencyFormats = 'IDR',
  compact: boolean = false
): string {
  const config = currencyFormats[currency];
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
