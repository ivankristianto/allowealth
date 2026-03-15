/**
 * Cache Tags
 *
 * Tag constants and builders for cache invalidation.
 */

export const CacheTags = {
  /** Workspace-scoped tag: workspace:{id} */
  workspace: (id: string): string => `workspace:${id}`,

  /** User-scoped tag: user:{id} */
  user: (id: string): string => `user:${id}`,

  /** Session-scoped tag: session:{id} */
  session: (id: string): string => `session:${id}`,

  // Entity type tags
  BUDGET: 'budget' as const,
  TRANSACTIONS: 'transactions' as const,
  SETTINGS: 'settings' as const,
  DASHBOARD: 'dashboard' as const,
  RECURRING: 'recurring' as const,
  RECURRING_OCCURRENCES: 'recurring-occurrences' as const,
  RECURRING_CALENDAR: 'recurring-calendar' as const,
  RECURRING_FORECAST: 'recurring-forecast' as const,
  SESSION: 'session' as const,
  CATEGORIES: 'categories' as const,
  ACCOUNTS: 'accounts' as const,
  LAYOUT: 'layout' as const,
  ACCOUNT_CATEGORIES: 'account-categories' as const,
  MCP_TOKENS: 'mcp_tokens' as const,
} as const;
