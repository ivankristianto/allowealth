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

  // Tag app data by workspace or user only. invalidateByTags deletes the union of its tags, so a
  // global tag such as 'accounts' would flush that entity's cache in every workspace.
  MCP_TOKENS: 'mcp_tokens' as const,
} as const;
