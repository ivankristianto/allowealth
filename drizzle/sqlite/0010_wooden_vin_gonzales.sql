CREATE INDEX `api_keys_user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `asset_categories_workspace_id_idx` ON `asset_categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_categories_created_by_user_id_idx` ON `asset_categories` (`created_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_categories_workspace_name_unique` ON `asset_categories` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `asset_snapshots_workspace_id_idx` ON `asset_snapshots` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_snapshots_created_by_user_id_idx` ON `asset_snapshots` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `asset_update_reminders_workspace_id_idx` ON `asset_update_reminders` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `asset_update_reminders_created_by_user_id_idx` ON `asset_update_reminders` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `asset_update_reminders_asset_id_idx` ON `asset_update_reminders` (`asset_id`);--> statement-breakpoint
CREATE INDEX `assets_created_by_user_id_idx` ON `assets` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `assets_category_id_idx` ON `assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `assets_closed_by_user_id_idx` ON `assets` (`closed_by_user_id`);--> statement-breakpoint
CREATE INDEX `budgets_created_by_user_id_idx` ON `budgets` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `budget_categories_workspace_id_idx` ON `budget_categories` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `budget_categories_created_by_user_id_idx` ON `budget_categories` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_created_by_user_id_idx` ON `transactions` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_updated_by_user_id_idx` ON `transactions` (`updated_by_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_deleted_by_user_id_idx` ON `transactions` (`deleted_by_user_id`);