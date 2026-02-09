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
ALTER TABLE "assets" DROP CONSTRAINT "assets_closed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;