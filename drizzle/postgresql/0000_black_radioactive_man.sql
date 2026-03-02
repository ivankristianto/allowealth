CREATE TABLE "account_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_liability" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_history" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"balance" text NOT NULL,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_snapshot_items" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"account_id" text NOT NULL,
	"balance" text NOT NULL,
	"currency" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshot_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_update_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"last_updated" timestamp,
	"next_reminder" timestamp,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_update_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"account_class" text DEFAULT 'liquid' NOT NULL,
	"category_id" text,
	"balance" text NOT NULL,
	"initial_balance" text,
	"currency" text NOT NULL,
	"credit_limit" text,
	"is_cash_account" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"closed_at" timestamp,
	"closed_by_user_id" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"budget_amount" text NOT NULL,
	"currency" text NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_unique" UNIQUE("workspace_id","category_id","month","year","currency")
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'tag' NOT NULL,
	"color" text DEFAULT 'bg-neutral' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"meta_key" text NOT NULL,
	"meta_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_meta_unique" UNIQUE("workspace_id","meta_key")
);
--> statement-breakpoint
ALTER TABLE "workspace_meta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" text,
	"role" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"email" text NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email_verified_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_meta" (
	"meta_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meta_key" text NOT NULL,
	"meta_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_meta_user_key_unique" UNIQUE("user_id","meta_key")
);
--> statement-breakpoint
ALTER TABLE "user_meta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"category_id" text,
	"account_id" text NOT NULL,
	"to_account_id" text,
	"type" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"description" text,
	"transaction_date" timestamp NOT NULL,
	"updated_by_user_id" text,
	"deleted_by_user_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"category_id" text NOT NULL,
	"account_id" text NOT NULL,
	"day_of_month" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"total_occurrences" integer,
	"is_installment" boolean DEFAULT false NOT NULL,
	"installment_label" text,
	"starting_occurrence_number" integer DEFAULT 1 NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_templates_installment_requires_total_occurrences" CHECK (NOT "recurring_templates"."is_installment" OR "recurring_templates"."total_occurrences" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "recurring_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"due_date" text NOT NULL,
	"occurrence_number" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"confirmed_amount" text,
	"skip_reason" text,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_occurrences_transaction_id_unique" UNIQUE("transaction_id"),
	CONSTRAINT "recurring_occurrences_template_occurrence_unique" UNIQUE("template_id","occurrence_number")
);
--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_account_unique" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "oauth_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_mfa" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_mfa_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_mfa" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_mfa_backup_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_mfa_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_mfa_backup_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_history" ADD CONSTRAINT "account_history_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshot_items" ADD CONSTRAINT "account_snapshot_items_snapshot_id_account_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."account_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshot_items" ADD CONSTRAINT "account_snapshot_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_update_reminders" ADD CONSTRAINT "account_update_reminders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_update_reminders" ADD CONSTRAINT "account_update_reminders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_update_reminders" ADD CONSTRAINT "account_update_reminders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_category_id_account_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."account_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_meta" ADD CONSTRAINT "workspace_meta_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meta" ADD CONSTRAINT "user_meta_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_template_id_recurring_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa_backup_codes" ADD CONSTRAINT "user_mfa_backup_codes_user_mfa_id_user_mfa_id_fk" FOREIGN KEY ("user_mfa_id") REFERENCES "public"."user_mfa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_categories_workspace_id_idx" ON "account_categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "account_categories_created_by_user_id_idx" ON "account_categories" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_categories_workspace_name_unique" ON "account_categories" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "account_history_recorded_at_idx" ON "account_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "account_history_account_id_idx" ON "account_history" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_history_account_recorded_idx" ON "account_history" USING btree ("account_id","recorded_at");--> statement-breakpoint
CREATE INDEX "account_snapshot_items_snapshot_id_idx" ON "account_snapshot_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "account_snapshot_items_account_id_idx" ON "account_snapshot_items" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_snapshots_workspace_id_idx" ON "account_snapshots" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "account_snapshots_created_by_user_id_idx" ON "account_snapshots" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "account_update_reminders_workspace_id_idx" ON "account_update_reminders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "account_update_reminders_created_by_user_id_idx" ON "account_update_reminders" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "account_update_reminders_account_id_idx" ON "account_update_reminders" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_update_reminders_next_reminder_idx" ON "account_update_reminders" USING btree ("next_reminder");--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_idx" ON "accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "accounts_created_by_user_id_idx" ON "accounts" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "accounts_category_id_idx" ON "accounts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "accounts_closed_by_user_id_idx" ON "accounts" USING btree ("closed_by_user_id");--> statement-breakpoint
CREATE INDEX "accounts_ws_status_deleted_idx" ON "accounts" USING btree ("workspace_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_keys_prefix_deleted_idx" ON "api_keys" USING btree ("key_prefix","deleted_at");--> statement-breakpoint
CREATE INDEX "api_keys_ws_user_deleted_idx" ON "api_keys" USING btree ("workspace_id","user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ws_entity_action_idx" ON "audit_logs" USING btree ("workspace_id","entity_type","entity_id","action");--> statement-breakpoint
CREATE INDEX "budgets_created_by_user_id_idx" ON "budgets" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "budgets_ws_month_year_currency_idx" ON "budgets" USING btree ("workspace_id","month","year","currency");--> statement-breakpoint
CREATE INDEX "budget_categories_workspace_id_idx" ON "budget_categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "budget_categories_created_by_user_id_idx" ON "budget_categories" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_invitations_ws_accept_expire_created_idx" ON "workspace_invitations" USING btree ("workspace_id","accepted_at","expires_at","created_at");--> statement-breakpoint
CREATE INDEX "users_workspace_id_idx" ON "users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_user_meta_user_id" ON "user_meta" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "transactions_workspace_id_idx" ON "transactions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_transaction_date_idx" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_ws_type_currency_date_idx" ON "transactions" USING btree ("workspace_id","type","currency","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_cat_type_currency_date_idx" ON "transactions" USING btree ("workspace_id","category_id","type","currency","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_user_date_idx" ON "transactions" USING btree ("workspace_id","created_by_user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_date_idx" ON "transactions" USING btree ("workspace_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_account_date_idx" ON "transactions" USING btree ("workspace_id","account_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_ws_to_account_date_idx" ON "transactions" USING btree ("workspace_id","to_account_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_created_by_user_id_idx" ON "transactions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_updated_by_user_id_idx" ON "transactions" USING btree ("updated_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_deleted_by_user_id_idx" ON "transactions" USING btree ("deleted_by_user_id");--> statement-breakpoint
CREATE INDEX "transactions_to_account_id_idx" ON "transactions" USING btree ("to_account_id");--> statement-breakpoint
CREATE INDEX "recurring_templates_workspace_id_idx" ON "recurring_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurring_templates_workspace_id_status_idx" ON "recurring_templates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "recurring_templates_category_id_idx" ON "recurring_templates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_template_id_idx" ON "recurring_occurrences" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_workspace_id_status_idx" ON "recurring_occurrences" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_workspace_id_due_date_idx" ON "recurring_occurrences" USING btree ("workspace_id","due_date");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_ws_status_due_date_idx" ON "recurring_occurrences" USING btree ("workspace_id","status","due_date");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_mfa_backup_codes_mfa_id_idx" ON "user_mfa_backup_codes" USING btree ("user_mfa_id");--> statement-breakpoint
CREATE POLICY "account_categories_allow_all" ON "account_categories" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "account_history_allow_all" ON "account_history" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "account_snapshot_items_allow_all" ON "account_snapshot_items" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "account_snapshots_allow_all" ON "account_snapshots" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "account_update_reminders_allow_all" ON "account_update_reminders" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "accounts_allow_all" ON "accounts" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "api_keys_allow_all" ON "api_keys" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "audit_logs_allow_all" ON "audit_logs" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "budgets_allow_all" ON "budgets" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "budget_categories_allow_all" ON "budget_categories" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "email_verification_tokens_allow_all" ON "email_verification_tokens" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspaces_allow_all" ON "workspaces" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_meta_allow_all" ON "workspace_meta" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_invitations_allow_all" ON "workspace_invitations" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_allow_all" ON "users" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_meta_allow_all" ON "user_meta" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sessions_allow_all" ON "sessions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "password_reset_tokens_allow_all" ON "password_reset_tokens" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "transactions_allow_all" ON "transactions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "recurring_templates_allow_all" ON "recurring_templates" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "recurring_occurrences_allow_all" ON "recurring_occurrences" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "oauth_accounts_allow_all" ON "oauth_accounts" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_mfa_allow_all" ON "user_mfa" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_mfa_backup_codes_allow_all" ON "user_mfa_backup_codes" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);