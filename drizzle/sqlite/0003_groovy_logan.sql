DROP INDEX `budgets_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_unique` ON `budgets` (`workspace_id`,`category_id`,`month`,`year`,`currency`);