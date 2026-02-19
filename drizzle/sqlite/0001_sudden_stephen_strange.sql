CREATE TABLE `user_mfa` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mfa_enabled` integer DEFAULT false NOT NULL,
	`totp_secret` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_mfa_user_id_unique` ON `user_mfa` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_mfa_user_id_idx` ON `user_mfa` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_mfa_backup_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_mfa_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_mfa_id`) REFERENCES `user_mfa`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_mfa_backup_codes_mfa_id_idx` ON `user_mfa_backup_codes` (`user_mfa_id`);