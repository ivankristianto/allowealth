PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
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
INSERT INTO `__new_users`("id", "workspace_id", "email", "password_hash", "avatar_url", "name", "role", "email_verified_at", "deleted_at", "created_at", "updated_at") SELECT "id", "workspace_id", "email", "password_hash", "avatar_url", "name", "role", "email_verified_at", "deleted_at", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_workspace_id_idx` ON `users` (`workspace_id`);