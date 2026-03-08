ALTER TABLE `recurring_templates` ADD `frequency` text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_templates` ADD `interval_count` integer DEFAULT 1 NOT NULL;