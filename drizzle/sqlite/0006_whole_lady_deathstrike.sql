CREATE INDEX `account_history_recorded_at_idx` ON `account_history` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `account_update_reminders_next_reminder_idx` ON `account_update_reminders` (`next_reminder`);--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_created_idx` ON `audit_logs` (`workspace_id`,`created_at`);