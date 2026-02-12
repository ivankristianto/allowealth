// Export all schema tables (order matters for dependencies)
export * from './workspaces';
export * from './workspace-meta';
export * from './workspace-invitations';
export * from './users';
export * from './user-meta';
export * from './sessions';
export * from './password-reset-tokens';
export * from './email-verification-tokens';
export * from './categories';
export * from './asset-categories';
export * from './transactions';
export * from './assets';
export * from './asset-history';
export * from './asset-update-reminders';
export * from './asset-snapshots';
export * from './asset-snapshot-items';
export * from './exchange-rates';
export * from './audit-logs';
export * from './budgets';
export * from './api-keys';
export * from './oauth-accounts';

// Export all relations (centralized to avoid circular imports)
export * from './relations';
