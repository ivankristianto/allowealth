ALTER TABLE `transactions` ADD `updated_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `deleted_by_user_id` text REFERENCES users(id);