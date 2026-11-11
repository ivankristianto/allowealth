PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_value` text,
	`new_value` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- The migrator runs in a transaction, where PRAGMA foreign_keys=OFF is ignored. Seeds run with
-- foreign keys off, so a row may point at a missing workspace or user: keep the row, null the link.
INSERT INTO `__new_audit_logs`("id", "workspace_id", "user_id", "action", "entity_type", "entity_id", "old_value", "new_value", "created_at") SELECT "id", CASE WHEN EXISTS (SELECT 1 FROM `workspaces` w WHERE w."id" = a."workspace_id") THEN a."workspace_id" END, CASE WHEN EXISTS (SELECT 1 FROM `users` u WHERE u."id" = a."user_id") THEN a."user_id" END, "action", "entity_type", "entity_id", "old_value", "new_value", "created_at" FROM `audit_logs` a;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_id_idx` ON `audit_logs` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_created_idx` ON `audit_logs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_ws_entity_action_idx` ON `audit_logs` (`workspace_id`,`entity_type`,`entity_id`,`action`);