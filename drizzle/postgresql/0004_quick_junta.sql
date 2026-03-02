CREATE INDEX "api_keys_prefix_deleted_idx" ON "api_keys" USING btree ("key_prefix","deleted_at");--> statement-breakpoint
CREATE INDEX "api_keys_ws_user_deleted_idx" ON "api_keys" USING btree ("workspace_id","user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "workspace_invitations_ws_accept_expire_created_idx" ON "workspace_invitations" USING btree ("workspace_id","accepted_at","expires_at","created_at");--> statement-breakpoint
CREATE INDEX "transactions_ws_date_idx" ON "transactions" USING btree ("workspace_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_account_date_idx" ON "transactions" USING btree ("workspace_id","account_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_to_account_date_idx" ON "transactions" USING btree ("workspace_id","to_account_id","transaction_date");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_ws_status_due_date_idx" ON "recurring_occurrences" USING btree ("workspace_id","status","due_date");