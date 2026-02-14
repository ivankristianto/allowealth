CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_categories_created_by_user_id_idx" ON "asset_categories" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "asset_snapshots_workspace_id_idx" ON "asset_snapshots" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_snapshots_created_by_user_id_idx" ON "asset_snapshots" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "asset_update_reminders_workspace_id_idx" ON "asset_update_reminders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_update_reminders_created_by_user_id_idx" ON "asset_update_reminders" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "asset_update_reminders_asset_id_idx" ON "asset_update_reminders" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "assets_created_by_user_id_idx" ON "assets" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "assets_category_id_idx" ON "assets" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "assets_closed_by_user_id_idx" ON "assets" USING btree ("closed_by_user_id");--> statement-breakpoint
CREATE INDEX "budgets_created_by_user_id_idx" ON "budgets" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "budget_categories_created_by_user_id_idx" ON "budget_categories" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_created_by_user_id_idx" ON "transactions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_updated_by_user_id_idx" ON "transactions" USING btree ("updated_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_deleted_by_user_id_idx" ON "transactions" USING btree ("deleted_by_user_id");