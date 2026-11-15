ALTER TABLE `audit_logs` ADD `actor_token_id` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `actor_token_kind` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `actor_token_name` text;--> statement-breakpoint
CREATE INDEX `audit_logs_actor_token_id_idx` ON `audit_logs` (`actor_token_id`);