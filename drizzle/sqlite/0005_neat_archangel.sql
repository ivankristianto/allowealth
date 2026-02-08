PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
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
INSERT INTO `__new_assets`("id", "workspace_id", "created_by_user_id", "name", "type", "category_id", "balance", "initial_balance", "currency", "credit_limit", "is_cash_account", "status", "closed_at", "closed_by_user_id", "last_updated", "deleted_at", "created_at", "updated_at") SELECT "id", "workspace_id", "created_by_user_id", "name", "type", "category_id", "balance", "initial_balance", "currency", "credit_limit", "is_cash_account", "status", "closed_at", "closed_by_user_id", "last_updated", "deleted_at", "created_at", "updated_at" FROM `assets`;--> statement-breakpoint
DROP TABLE `assets`;--> statement-breakpoint
ALTER TABLE `__new_assets` RENAME TO `assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;