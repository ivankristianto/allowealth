import { DEFAULT_CURRENCY, type Currency } from './currency';

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
  COMPACT_NUMBERS: 'compact_numbers',
  MONTHLY_INCOME: 'monthly_income',
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
  [WORKSPACE_META_KEYS.COMPACT_NUMBERS]: 'true',
  [WORKSPACE_META_KEYS.MONTHLY_INCOME]: '',
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

/**
 * Type-safe workspace settings derived from meta values
 */
export interface WorkspaceSettings {
  currency: Currency;
  secondaryCurrency: Currency | '';
  weekStart: WeekStart;
  compactNumbers: boolean;
  monthlyIncome: string;
}

/**
 * Default workspace settings
 */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: DEFAULT_CURRENCY,
  secondaryCurrency: '',
  weekStart: 'monday',
  compactNumbers: true,
  monthlyIncome: '',
};
