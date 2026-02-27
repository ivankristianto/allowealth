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
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_template_id_recurring_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_templates_workspace_id_idx" ON "recurring_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurring_templates_workspace_id_status_idx" ON "recurring_templates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "recurring_templates_category_id_idx" ON "recurring_templates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_template_id_idx" ON "recurring_occurrences" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_workspace_id_status_idx" ON "recurring_occurrences" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_workspace_id_due_date_idx" ON "recurring_occurrences" USING btree ("workspace_id","due_date");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_transaction_id_idx" ON "recurring_occurrences" USING btree ("transaction_id");--> statement-breakpoint
CREATE POLICY "recurring_templates_allow_all" ON "recurring_templates" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "recurring_occurrences_allow_all" ON "recurring_occurrences" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
