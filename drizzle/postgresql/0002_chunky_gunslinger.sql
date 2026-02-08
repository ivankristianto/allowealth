ALTER TABLE "budgets" DROP CONSTRAINT "budgets_unique";--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_unique" UNIQUE("workspace_id","category_id","month","year","currency");