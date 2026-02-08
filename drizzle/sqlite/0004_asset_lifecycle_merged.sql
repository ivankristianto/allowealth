ALTER TABLE `assets` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `closed_at` integer;--> statement-breakpoint
ALTER TABLE `assets` ADD `closed_by_user_id` text REFERENCES users(id);