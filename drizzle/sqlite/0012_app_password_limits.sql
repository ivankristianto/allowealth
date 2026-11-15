ALTER TABLE `transactions` ADD `created_by_token_id` text;--> statement-breakpoint
CREATE INDEX `transactions_created_by_token_id_idx` ON `transactions` (`created_by_token_id`);--> statement-breakpoint
ALTER TABLE `mcp_app_passwords` ADD `limits` text DEFAULT '{}' NOT NULL;