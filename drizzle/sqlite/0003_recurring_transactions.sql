CREATE TABLE `recurring_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text NOT NULL,
	`category_id` text NOT NULL,
	`account_id` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`total_occurrences` integer,
	`is_installment` integer DEFAULT false NOT NULL,
	`installment_label` text,
	`starting_occurrence_number` integer DEFAULT 1 NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recurring_templates_workspace_id_idx` ON `recurring_templates` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `recurring_templates_workspace_id_status_idx` ON `recurring_templates` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_templates_category_id_idx` ON `recurring_templates` (`category_id`);--> statement-breakpoint
CREATE TABLE `recurring_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`due_date` text NOT NULL,
	`occurrence_number` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	`confirmed_amount` text,
	`skip_reason` text,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `recurring_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `recurring_occurrences_transaction_id_unique` UNIQUE(`transaction_id`),
	CONSTRAINT `recurring_occurrences_template_occurrence_unique` UNIQUE(`template_id`,`occurrence_number`)
);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_template_id_idx` ON `recurring_occurrences` (`template_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_workspace_id_status_idx` ON `recurring_occurrences` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_workspace_id_due_date_idx` ON `recurring_occurrences` (`workspace_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_transaction_id_idx` ON `recurring_occurrences` (`transaction_id`);
