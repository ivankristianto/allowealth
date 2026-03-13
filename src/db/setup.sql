-- Initial Database Schema
-- This is the single source of truth for database structure
-- Run this file to create all tables from scratch

-- ============================================
-- WORKSPACES (Root entity)
-- ============================================
CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

-- ============================================
-- USERS & AUTH
-- ============================================

-- Application users table (domain model)
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text,
  `email` text NOT NULL,
  `password_hash` text,
  `avatar_url` text,
  `name` text NOT NULL,
  `role` text NOT NULL,
  `email_verified_at` integer,
  `deleted_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `users_workspace_id_idx` ON `users` (`workspace_id`);

-- Better-Auth tables (must be created in dependency order)
-- user table first (no FK dependencies)
CREATE TABLE IF NOT EXISTS `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `emailVerified` integer DEFAULT false NOT NULL,
  `image` text,
  `twoFactorEnabled` integer DEFAULT false NOT NULL,
  `createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);
CREATE INDEX IF NOT EXISTS `user_email_idx` ON `user` (`email`);

-- account table references user
CREATE TABLE IF NOT EXISTS `account` (
  `id` text PRIMARY KEY NOT NULL,
  `accountId` text NOT NULL,
  `providerId` text NOT NULL,
  `userId` text NOT NULL,
  `accessToken` text,
  `refreshToken` text,
  `idToken` text,
  `accessTokenExpiresAt` integer,
  `refreshTokenExpiresAt` integer,
  `scope` text,
  `password` text,
  `createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `account_user_id_idx` ON `account` (`userId`);
CREATE INDEX IF NOT EXISTS `account_provider_id_idx` ON `account` (`providerId`);
CREATE UNIQUE INDEX IF NOT EXISTS `account_provider_account_unique` ON `account` (`providerId`,`accountId`);

CREATE TABLE IF NOT EXISTS `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expiresAt` integer NOT NULL,
  `token` text NOT NULL,
  `createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `ipAddress` text,
  `userAgent` text,
  `userId` text NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);
CREATE INDEX IF NOT EXISTS `session_user_id_idx` ON `session` (`userId`);
CREATE INDEX IF NOT EXISTS `session_expires_at_idx` ON `session` (`expiresAt`);

CREATE TABLE IF NOT EXISTS `twoFactor` (
  `id` text PRIMARY KEY NOT NULL,
  `secret` text NOT NULL,
  `backupCodes` text NOT NULL,
  `userId` text NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `twoFactor_userId_unique` ON `twoFactor` (`userId`);
CREATE INDEX IF NOT EXISTS `two_factor_user_id_idx` ON `twoFactor` (`userId`);
CREATE INDEX IF NOT EXISTS `two_factor_secret_idx` ON `twoFactor` (`secret`);

CREATE TABLE IF NOT EXISTS `passkey` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `publicKey` text NOT NULL,
  `userId` text NOT NULL,
  `credentialID` text NOT NULL,
  `counter` integer NOT NULL,
  `deviceType` text NOT NULL,
  `backedUp` integer NOT NULL,
  `transports` text,
  `aaguid` text,
  `createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `passkey_credential_id_unique` ON `passkey` (`credentialID`);
CREATE INDEX IF NOT EXISTS `passkey_user_id_idx` ON `passkey` (`userId`);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expiresAt` integer NOT NULL,
  `createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);

-- Legacy sessions table (for custom auth)
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `sessions_expires_at_idx` ON `sessions` (`expires_at`);
CREATE INDEX IF NOT EXISTS `sessions_user_id_idx` ON `sessions` (`user_id`);

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `token` text NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);
CREATE INDEX IF NOT EXISTS `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);
CREATE INDEX IF NOT EXISTS `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `token` text NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `email_verification_tokens_token_unique` ON `email_verification_tokens` (`token`);
CREATE INDEX IF NOT EXISTS `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);
CREATE INDEX IF NOT EXISTS `email_verification_tokens_expires_at_idx` ON `email_verification_tokens` (`expires_at`);

-- ============================================
-- USER META & MFA
-- ============================================
CREATE TABLE IF NOT EXISTS `user_meta` (
  `meta_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `meta_key` text NOT NULL,
  `meta_value` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `idx_user_meta_user_id` ON `user_meta` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `user_meta_user_key_unique` ON `user_meta` (`user_id`,`meta_key`);

CREATE TABLE IF NOT EXISTS `oauth_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `provider` text NOT NULL,
  `provider_account_id` text NOT NULL,
  `email` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `oauth_accounts_user_id_idx` ON `oauth_accounts` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `oauth_accounts_provider_account_unique` ON `oauth_accounts` (`provider`,`provider_account_id`);

CREATE TABLE IF NOT EXISTS `user_mfa` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `mfa_enabled` integer DEFAULT false NOT NULL,
  `totp_secret` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_mfa_user_id_unique` ON `user_mfa` (`user_id`);

CREATE TABLE IF NOT EXISTS `user_mfa_backup_codes` (
  `id` text PRIMARY KEY NOT NULL,
  `user_mfa_id` text NOT NULL,
  `code_hash` text NOT NULL,
  `used_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`user_mfa_id`) REFERENCES `user_mfa`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `user_mfa_backup_codes_mfa_id_idx` ON `user_mfa_backup_codes` (`user_mfa_id`);

-- ============================================
-- WORKSPACE META & INVITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `workspace_meta` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `meta_key` text NOT NULL,
  `meta_value` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `workspace_meta_unique` ON `workspace_meta` (`workspace_id`,`meta_key`);

CREATE TABLE IF NOT EXISTS `workspace_invitations` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `email` text NOT NULL,
  `token` text NOT NULL,
  `invited_by_user_id` text,
  `role` text NOT NULL,
  `expires_at` integer NOT NULL,
  `accepted_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `workspace_invitations_token_unique` ON `workspace_invitations` (`token`);
CREATE INDEX IF NOT EXISTS `workspace_invitations_workspace_id_idx` ON `workspace_invitations` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `workspace_invitations_ws_accept_expire_created_idx` ON `workspace_invitations` (`workspace_id`,`accepted_at`,`expires_at`,`created_at`);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS `budget_categories` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `income_source_type` text DEFAULT 'other' NOT NULL,
  `description` text,
  `icon` text DEFAULT 'tag' NOT NULL,
  `color` text DEFAULT 'bg-neutral' NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `budget_categories_workspace_id_idx` ON `budget_categories` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `budget_categories_created_by_user_id_idx` ON `budget_categories` (`created_by_user_id`);

CREATE TABLE IF NOT EXISTS `account_categories` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `is_liability` integer DEFAULT false NOT NULL,
  `is_system` integer DEFAULT false NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `account_categories_workspace_id_idx` ON `account_categories` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `account_categories_created_by_user_id_idx` ON `account_categories` (`created_by_user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `account_categories_workspace_name_unique` ON `account_categories` (`workspace_id`,`name`);

-- ============================================
-- ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `account_class` text DEFAULT 'liquid' NOT NULL,
  `category_id` text,
  `balance` text NOT NULL,
  `initial_balance` text,
  `currency` text NOT NULL,
  `credit_limit` text,
  `is_cash_account` integer DEFAULT false NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `closed_at` integer,
  `closed_by_user_id` text,
  `last_updated` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `deleted_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`category_id`) REFERENCES `account_categories`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `accounts_workspace_id_idx` ON `accounts` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `accounts_ws_status_deleted_idx` ON `accounts` (`workspace_id`,`status`,`deleted_at`);
CREATE INDEX IF NOT EXISTS `accounts_created_by_user_id_idx` ON `accounts` (`created_by_user_id`);
CREATE INDEX IF NOT EXISTS `accounts_category_id_idx` ON `accounts` (`category_id`);
CREATE INDEX IF NOT EXISTS `accounts_closed_by_user_id_idx` ON `accounts` (`closed_by_user_id`);

CREATE TABLE IF NOT EXISTS `account_history` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `balance` text NOT NULL,
  `notes` text,
  `recorded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `account_history_account_id_idx` ON `account_history` (`account_id`);
CREATE INDEX IF NOT EXISTS `account_history_account_recorded_idx` ON `account_history` (`account_id`,`recorded_at`);
CREATE INDEX IF NOT EXISTS `account_history_recorded_at_idx` ON `account_history` (`recorded_at`);

CREATE TABLE IF NOT EXISTS `account_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `snapshot_date` integer NOT NULL,
  `month` integer NOT NULL,
  `year` integer NOT NULL,
  `notes` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `account_snapshots_workspace_id_idx` ON `account_snapshots` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `account_snapshots_created_by_user_id_idx` ON `account_snapshots` (`created_by_user_id`);

CREATE TABLE IF NOT EXISTS `account_snapshot_items` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `account_id` text NOT NULL,
  `balance` text NOT NULL,
  `currency` text NOT NULL,
  FOREIGN KEY (`snapshot_id`) REFERENCES `account_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `account_snapshot_items_snapshot_id_idx` ON `account_snapshot_items` (`snapshot_id`);
CREATE INDEX IF NOT EXISTS `account_snapshot_items_account_id_idx` ON `account_snapshot_items` (`account_id`);

CREATE TABLE IF NOT EXISTS `account_update_reminders` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `account_id` text NOT NULL,
  `frequency` text DEFAULT 'monthly' NOT NULL,
  `last_updated` integer,
  `next_reminder` integer,
  `is_dismissed` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `account_update_reminders_workspace_id_idx` ON `account_update_reminders` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `account_update_reminders_created_by_user_id_idx` ON `account_update_reminders` (`created_by_user_id`);
CREATE INDEX IF NOT EXISTS `account_update_reminders_account_id_idx` ON `account_update_reminders` (`account_id`);
CREATE INDEX IF NOT EXISTS `account_update_reminders_next_reminder_idx` ON `account_update_reminders` (`next_reminder`);

-- ============================================
-- BUDGETS
-- ============================================
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `category_id` text NOT NULL,
  `month` integer NOT NULL,
  `year` integer NOT NULL,
  `budget_amount` text NOT NULL,
  `currency` text NOT NULL,
  `is_closed` integer DEFAULT false NOT NULL,
  `notes` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `budgets_created_by_user_id_idx` ON `budgets` (`created_by_user_id`);
CREATE INDEX IF NOT EXISTS `budgets_ws_month_year_currency_idx` ON `budgets` (`workspace_id`,`month`,`year`,`currency`);
CREATE UNIQUE INDEX IF NOT EXISTS `budgets_unique` ON `budgets` (`workspace_id`,`category_id`,`month`,`year`,`currency`);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `category_id` text,
  `account_id` text NOT NULL,
  `to_account_id` text,
  `type` text NOT NULL,
  `amount` text NOT NULL,
  `currency` text NOT NULL,
  `description` text,
  `transaction_date` integer NOT NULL,
  `updated_by_user_id` text,
  `deleted_by_user_id` text,
  `deleted_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `transactions_workspace_id_idx` ON `transactions` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `transactions_account_id_idx` ON `transactions` (`account_id`);
CREATE INDEX IF NOT EXISTS `transactions_transaction_date_idx` ON `transactions` (`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_category_id_idx` ON `transactions` (`category_id`);
CREATE INDEX IF NOT EXISTS `transactions_ws_type_currency_date_idx` ON `transactions` (`workspace_id`,`type`,`currency`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_ws_cat_type_currency_date_idx` ON `transactions` (`workspace_id`,`category_id`,`type`,`currency`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_ws_user_date_idx` ON `transactions` (`workspace_id`,`created_by_user_id`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_ws_date_idx` ON `transactions` (`workspace_id`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_ws_account_date_idx` ON `transactions` (`workspace_id`,`account_id`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_ws_to_account_date_idx` ON `transactions` (`workspace_id`,`to_account_id`,`transaction_date`);
CREATE INDEX IF NOT EXISTS `transactions_to_account_id_idx` ON `transactions` (`to_account_id`);
CREATE INDEX IF NOT EXISTS `transactions_created_by_user_id_idx` ON `transactions` (`created_by_user_id`);
CREATE INDEX IF NOT EXISTS `transactions_updated_by_user_id_idx` ON `transactions` (`updated_by_user_id`);
CREATE INDEX IF NOT EXISTS `transactions_deleted_by_user_id_idx` ON `transactions` (`deleted_by_user_id`);

-- ============================================
-- RECURRING
-- ============================================
CREATE TABLE IF NOT EXISTS `recurring_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `amount` text NOT NULL,
  `currency` text NOT NULL,
  `category_id` text NOT NULL,
  `account_id` text NOT NULL,
  `day_of_month` integer NOT NULL,
  `frequency` text DEFAULT 'monthly' NOT NULL,
  `interval_count` integer DEFAULT 1 NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text,
  `total_occurrences` integer,
  `is_installment` integer DEFAULT false NOT NULL,
  `installment_label` text,
  `starting_occurrence_number` integer DEFAULT 1 NOT NULL,
  `description` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `recurring_templates_workspace_id_idx` ON `recurring_templates` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `recurring_templates_workspace_id_status_idx` ON `recurring_templates` (`workspace_id`,`status`);
CREATE INDEX IF NOT EXISTS `recurring_templates_workspace_id_account_id_idx` ON `recurring_templates` (`workspace_id`,`account_id`);
CREATE INDEX IF NOT EXISTS `recurring_templates_workspace_id_type_idx` ON `recurring_templates` (`workspace_id`,`type`);
CREATE INDEX IF NOT EXISTS `recurring_templates_category_id_idx` ON `recurring_templates` (`category_id`);

CREATE TABLE IF NOT EXISTS `recurring_occurrences` (
  `id` text PRIMARY KEY NOT NULL,
  `template_id` text NOT NULL,
  `workspace_id` text NOT NULL,
  `due_date` text NOT NULL,
  `occurrence_number` integer NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `transaction_id` text,
  `confirmed_amount` text,
  `skip_reason` text,
  `confirmed_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `recurring_templates`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `recurring_occurrences_transaction_id_unique` ON `recurring_occurrences` (`transaction_id`);
CREATE INDEX IF NOT EXISTS `recurring_occurrences_template_id_idx` ON `recurring_occurrences` (`template_id`);
CREATE INDEX IF NOT EXISTS `recurring_occurrences_workspace_id_status_idx` ON `recurring_occurrences` (`workspace_id`,`status`);
CREATE INDEX IF NOT EXISTS `recurring_occurrences_workspace_id_due_date_idx` ON `recurring_occurrences` (`workspace_id`,`due_date`);
CREATE INDEX IF NOT EXISTS `recurring_occurrences_ws_status_due_date_idx` ON `recurring_occurrences` (`workspace_id`,`status`,`due_date`);
CREATE UNIQUE INDEX IF NOT EXISTS `recurring_occurrences_template_occurrence_unique` ON `recurring_occurrences` (`template_id`,`occurrence_number`);

-- ============================================
-- API KEYS & AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `key_hash` text NOT NULL,
  `key_prefix` text NOT NULL,
  `last_used_at` integer,
  `expires_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `api_keys_workspace_id_idx` ON `api_keys` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `api_keys_user_id_idx` ON `api_keys` (`user_id`);
CREATE INDEX IF NOT EXISTS `api_keys_key_prefix_idx` ON `api_keys` (`key_prefix`);
CREATE INDEX IF NOT EXISTS `api_keys_prefix_deleted_idx` ON `api_keys` (`key_prefix`,`deleted_at`);
CREATE INDEX IF NOT EXISTS `api_keys_ws_user_deleted_idx` ON `api_keys` (`workspace_id`,`user_id`,`deleted_at`);

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL,
  `user_id` text NOT NULL,
  `action` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text,
  `old_value` text,
  `new_value` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `audit_logs_workspace_id_idx` ON `audit_logs` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);
CREATE INDEX IF NOT EXISTS `audit_logs_workspace_created_idx` ON `audit_logs` (`workspace_id`,`created_at`);
CREATE INDEX IF NOT EXISTS `audit_logs_ws_entity_action_idx` ON `audit_logs` (`workspace_id`,`entity_type`,`entity_id`,`action`);

-- Performance pragmas for SQLite
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
