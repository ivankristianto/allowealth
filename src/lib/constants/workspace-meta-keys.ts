import { DEFAULT_CURRENCY, isValidCurrency, type Currency } from './currency';

/**
 * Workspace Meta Keys Constants
 *
 * Defines the allowlist of workspace meta keys, their types, and defaults.
 * Workspace-level settings that apply to all members of a workspace.
 */

/**
 * Allowed workspace meta keys - only these keys can be stored in workspace_meta
 */
export const WORKSPACE_META_KEYS = {
  CURRENCY: 'currency',
  SECONDARY_CURRENCY: 'secondary_currency',
  WEEK_START: 'week_start',
  MONTHLY_INCOME: 'monthly_income',
  FORECAST_MONTHLY_TOPUP: 'forecast_monthly_topup',
  FORECAST_ANNUAL_RATE: 'forecast_annual_rate',
  ONBOARDING_EXPENSE_SKIPPED: 'onboarding_expense_skipped',
} as const;

/**
 * Type for valid workspace meta key values
 */
export type WorkspaceMetaKey = (typeof WORKSPACE_META_KEYS)[keyof typeof WORKSPACE_META_KEYS];

/**
 * Default values for each workspace meta key (stored as strings in database)
 */
export const WORKSPACE_META_DEFAULTS: Record<WorkspaceMetaKey, string> = {
  [WORKSPACE_META_KEYS.CURRENCY]: DEFAULT_CURRENCY,
  [WORKSPACE_META_KEYS.SECONDARY_CURRENCY]: '',
  [WORKSPACE_META_KEYS.WEEK_START]: 'monday',
  [WORKSPACE_META_KEYS.MONTHLY_INCOME]: '',
  [WORKSPACE_META_KEYS.FORECAST_MONTHLY_TOPUP]: '5000000',
  [WORKSPACE_META_KEYS.FORECAST_ANNUAL_RATE]: '7',
  [WORKSPACE_META_KEYS.ONBOARDING_EXPENSE_SKIPPED]: 'false',
};

/**
 * Array of all valid workspace meta keys for validation
 */
export const ALLOWED_WORKSPACE_META_KEYS = Object.values(WORKSPACE_META_KEYS);

/**
 * Check if a string is a valid workspace meta key
 */
export function isValidWorkspaceMetaKey(key: string): key is WorkspaceMetaKey {
  return ALLOWED_WORKSPACE_META_KEYS.includes(key as WorkspaceMetaKey);
}

/**
 * Supported week start values
 */
export const WEEK_START_VALUES = ['monday', 'sunday'] as const;
export type WeekStart = (typeof WEEK_START_VALUES)[number];
export type MonthlyIncomeMap = Partial<Record<Currency, string>>;
export const MONTHLY_INCOME_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isValidMonthlyIncomeAmount(value: unknown): value is string {
  return typeof value === 'string' && MONTHLY_INCOME_AMOUNT_PATTERN.test(value);
}

export function isMonthlyIncomeMap(value: unknown): value is MonthlyIncomeMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([currency, amount]) => isValidCurrency(currency) && isValidMonthlyIncomeAmount(amount)
  );
}

export function parseMonthlyIncomeValue(
  value: string | MonthlyIncomeMap | null | undefined
): MonthlyIncomeMap {
  if (!value) return {};

  if (typeof value !== 'string') {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([currency, amount]) => isValidCurrency(currency) && isValidMonthlyIncomeAmount(amount)
      )
    ) as MonthlyIncomeMap;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([currency, amount]) => isValidCurrency(currency) && isValidMonthlyIncomeAmount(amount)
      )
    ) as MonthlyIncomeMap;
  } catch {
    return {};
  }
}

/**
 * Type-safe workspace settings derived from meta values
 */
export interface WorkspaceSettings {
  currency: Currency;
  secondaryCurrency: Currency | '';
  weekStart: WeekStart;
  monthlyIncome: MonthlyIncomeMap;
  forecastMonthlyTopup: number;
  forecastAnnualRate: number;
}

/**
 * Default workspace settings
 */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: DEFAULT_CURRENCY,
  secondaryCurrency: '',
  weekStart: 'monday',
  monthlyIncome: {},
  forecastMonthlyTopup: 5000000,
  forecastAnnualRate: 7,
};
