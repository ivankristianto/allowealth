CREATE INDEX "asset_history_asset_id_idx" ON "asset_history" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_snapshot_items_snapshot_id_idx" ON "asset_snapshot_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "asset_snapshot_items_asset_id_idx" ON "asset_snapshot_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "assets_ws_status_deleted_idx" ON "assets" USING btree ("workspace_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ws_entity_action_idx" ON "audit_logs" USING btree ("workspace_id","entity_type","entity_id","action");--> statement-breakpoint
CREATE INDEX "budgets_ws_month_year_currency_idx" ON "budgets" USING btree ("workspace_id","month","year","currency");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "users_workspace_id_idx" ON "users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_ws_type_currency_date_idx" ON "transactions" USING btree ("workspace_id","type","currency","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_cat_type_currency_date_idx" ON "transactions" USING btree ("workspace_id","category_id","type","currency","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_user_date_idx" ON "transactions" USING btree ("workspace_id","created_by_user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_to_asset_id_idx" ON "transactions" USING btree ("to_asset_id");--> statement-breakpoint
CREATE POLICY "api_keys_allow_all" ON "api_keys" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "asset_categories_allow_all" ON "asset_categories" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "asset_history_allow_all" ON "asset_history" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "asset_snapshot_items_allow_all" ON "asset_snapshot_items" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "asset_snapshots_allow_all" ON "asset_snapshots" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "asset_update_reminders_allow_all" ON "asset_update_reminders" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "assets_allow_all" ON "assets" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "audit_logs_allow_all" ON "audit_logs" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "budgets_allow_all" ON "budgets" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "budget_categories_allow_all" ON "budget_categories" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "email_verification_tokens_allow_all" ON "email_verification_tokens" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "exchange_rates_allow_all" ON "exchange_rates" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspaces_allow_all" ON "workspaces" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_meta_allow_all" ON "workspace_meta" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_invitations_allow_all" ON "workspace_invitations" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_allow_all" ON "users" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_meta_allow_all" ON "user_meta" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sessions_allow_all" ON "sessions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "password_reset_tokens_allow_all" ON "password_reset_tokens" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "transactions_allow_all" ON "transactions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "oauth_accounts_allow_all" ON "oauth_accounts" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);