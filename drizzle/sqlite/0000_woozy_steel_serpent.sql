CREATE TABLE `api_keys` (
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
--> statement-breakpoint
CREATE INDEX `api_keys_workspace_id_idx` ON `api_keys` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `api_keys_user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_key_prefix_idx` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE TABLE `asset_categories` (
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
--> statement-breakpoint
CREATE INDEX `asset_categories_workspace_id_idx` ON `asset_categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_categories_created_by_user_id_idx` ON `asset_categories` (`created_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_categories_workspace_name_unique` ON `asset_categories` (`workspace_id`,`name`);--> statement-breakpoint
CREATE TABLE `asset_history` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`balance` text NOT NULL,
	`notes` text,
	`recorded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_history_asset_id_idx` ON `asset_history` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_history_asset_recorded_idx` ON `asset_history` (`asset_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `asset_snapshot_items` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`balance` text NOT NULL,
	`currency` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `asset_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `asset_snapshot_items_snapshot_id_idx` ON `asset_snapshot_items` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `asset_snapshot_items_asset_id_idx` ON `asset_snapshot_items` (`asset_id`);--> statement-breakpoint
CREATE TABLE `asset_snapshots` (
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
--> statement-breakpoint
CREATE INDEX `asset_snapshots_workspace_id_idx` ON `asset_snapshots` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_snapshots_created_by_user_id_idx` ON `asset_snapshots` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `asset_update_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`last_updated` integer,
	`next_reminder` integer,
	`is_dismissed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_update_reminders_workspace_id_idx` ON `asset_update_reminders` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_update_reminders_created_by_user_id_idx` ON `asset_update_reminders` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `asset_update_reminders_asset_id_idx` ON `asset_update_reminders` (`asset_id`);--> statement-breakpoint
CREATE TABLE `assets` (
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
	FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `assets_workspace_id_idx` ON `assets` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `assets_ws_status_deleted_idx` ON `assets` (`workspace_id`,`status`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `assets_created_by_user_id_idx` ON `assets` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `assets_category_id_idx` ON `assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `assets_closed_by_user_id_idx` ON `assets` (`closed_by_user_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
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
--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_id_idx` ON `audit_logs` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_ws_entity_action_idx` ON `audit_logs` (`workspace_id`,`entity_type`,`entity_id`,`action`);--> statement-breakpoint
CREATE TABLE `budgets` (
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
--> statement-breakpoint
CREATE INDEX `budgets_created_by_user_id_idx` ON `budgets` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `budgets_ws_month_year_currency_idx` ON `budgets` (`workspace_id`,`month`,`year`,`currency`);--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_unique` ON `budgets` (`workspace_id`,`category_id`,`month`,`year`,`currency`);--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`icon` text DEFAULT 'tag' NOT NULL,
	`color` text DEFAULT 'bg-neutral' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_categories_workspace_id_idx` ON `budget_categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `budget_categories_created_by_user_id_idx` ON `budget_categories` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_tokens_token_unique` ON `email_verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_expires_at_idx` ON `email_verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text NOT NULL,
	`rate` text NOT NULL,
	`effective_date` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`meta_key` text NOT NULL,
	`meta_value` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_meta_unique` ON `workspace_meta` (`workspace_id`,`meta_key`);--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitations_token_unique` ON `workspace_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_workspace_id_idx` ON `workspace_invitations` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `users` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_workspace_id_idx` ON `users` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `user_meta` (
	`meta_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`meta_key` text NOT NULL,
	`meta_value` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_meta_user_id` ON `user_meta` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_meta_user_key_unique` ON `user_meta` (`user_id`,`meta_key`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_token_idx` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`category_id` text,
	`asset_id` text NOT NULL,
	`to_asset_id` text,
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
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_workspace_id_idx` ON `transactions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `transactions_asset_id_idx` ON `transactions` (`asset_id`);--> statement-breakpoint
CREATE INDEX `transactions_transaction_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_category_id_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_ws_type_currency_date_idx` ON `transactions` (`workspace_id`,`type`,`currency`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_ws_cat_type_currency_date_idx` ON `transactions` (`workspace_id`,`category_id`,`type`,`currency`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_ws_user_date_idx` ON `transactions` (`workspace_id`,`created_by_user_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_to_asset_id_idx` ON `transactions` (`to_asset_id`);--> statement-breakpoint
CREATE INDEX `transactions_created_by_user_id_idx` ON `transactions` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_updated_by_user_id_idx` ON `transactions` (`updated_by_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_deleted_by_user_id_idx` ON `transactions` (`deleted_by_user_id`);--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_id_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_accounts_provider_account_unique` ON `oauth_accounts` (`provider`,`provider_account_id`);