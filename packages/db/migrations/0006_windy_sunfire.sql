CREATE TYPE "public"."tournament_registration_status" AS ENUM('pending_payment', 'confirmed', 'checked_in', 'disqualified', 'withdrawn');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"registered_by_user_id" uuid NOT NULL,
	"seed_number" integer,
	"status" "tournament_registration_status" DEFAULT 'confirmed' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"disqualification_reason" text,
	"final_placement" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_registrations_tournament_id_team_id_idx" ON "tournament_registrations" USING btree ("tournament_id","team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registrations_tournament_status_idx" ON "tournament_registrations" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registrations_registered_by_idx" ON "tournament_registrations" USING btree ("registered_by_user_id","created_at");