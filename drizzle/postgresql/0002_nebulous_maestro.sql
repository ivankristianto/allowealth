ALTER TABLE "assets" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "closed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;