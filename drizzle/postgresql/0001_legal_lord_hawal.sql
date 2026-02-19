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
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa_backup_codes" ADD CONSTRAINT "user_mfa_backup_codes_user_mfa_id_user_mfa_id_fk" FOREIGN KEY ("user_mfa_id") REFERENCES "public"."user_mfa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_mfa_user_id_idx" ON "user_mfa" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_mfa_backup_codes_mfa_id_idx" ON "user_mfa_backup_codes" USING btree ("user_mfa_id");--> statement-breakpoint
CREATE POLICY "user_mfa_allow_all" ON "user_mfa" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_mfa_backup_codes_allow_all" ON "user_mfa_backup_codes" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);