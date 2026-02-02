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
  WEEK_START: 'week_start',
  COMPACT_NUMBERS: 'compact_numbers',
  // Email configuration
  EMAIL_PROVIDER: 'email_provider',
  EMAIL_API_KEY: 'email_api_key',
  EMAIL_SENDER_NAME: 'email_sender_name',
  EMAIL_SENDER_ADDRESS: 'email_sender_address',
} as const;

/**
 * Type for valid workspace meta key values
 */
export type WorkspaceMetaKey = (typeof WORKSPACE_META_KEYS)[keyof typeof WORKSPACE_META_KEYS];

/**
 * Default values for each workspace meta key (stored as strings in database)
 * Note: Email keys have no defaults (unconfigured state)
 */
export const WORKSPACE_META_DEFAULTS: Record<WorkspaceMetaKey, string> = {
  [WORKSPACE_META_KEYS.CURRENCY]: 'IDR',
  [WORKSPACE_META_KEYS.WEEK_START]: 'monday',
  [WORKSPACE_META_KEYS.COMPACT_NUMBERS]: 'true',
  [WORKSPACE_META_KEYS.EMAIL_PROVIDER]: '',
  [WORKSPACE_META_KEYS.EMAIL_API_KEY]: '',
  [WORKSPACE_META_KEYS.EMAIL_SENDER_NAME]: '',
  [WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS]: '',
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
 * Supported email providers
 */
export const EMAIL_PROVIDERS = ['sendgrid', 'resend'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

/**
 * Check if a string is a valid email provider
 */
export function isValidEmailProvider(value: string): value is EmailProvider {
  return EMAIL_PROVIDERS.includes(value as EmailProvider);
}

/**
 * Type-safe workspace settings derived from meta values
 */
export interface WorkspaceSettings {
  currency: string;
  weekStart: WeekStart;
  compactNumbers: boolean;
}

/**
 * Default workspace settings
 */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: 'IDR',
  weekStart: 'monday',
  compactNumbers: true,
};

/**
 * Email configuration settings
 */
export interface EmailSettings {
  provider: EmailProvider | null;
  apiKey: string | null; // Encrypted
  senderName: string | null;
  senderAddress: string | null;
}
