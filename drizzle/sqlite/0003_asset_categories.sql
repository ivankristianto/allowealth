CREATE TABLE `asset_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_liability` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_categories_user_name_unique` ON `asset_categories` (`user_id`,`name`);
--> statement-breakpoint
CREATE INDEX `asset_categories_user_id_idx` ON `asset_categories` (`user_id`);
