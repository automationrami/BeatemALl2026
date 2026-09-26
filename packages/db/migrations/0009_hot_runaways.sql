CREATE TYPE "public"."round_status" AS ENUM('pending', 'ready', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'push', 'email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"bracket_type" "tournament_format" NOT NULL,
	"total_rounds" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seed_data" jsonb NOT NULL,
	"bracket_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"winner_team_id" uuid,
	"is_draw" boolean DEFAULT false NOT NULL,
	"home_team_score" integer NOT NULL,
	"away_team_score" integer NOT NULL,
	"reported_by_team_id" uuid,
	"reported_by_user_id" uuid,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_by_team_id" uuid,
	"confirmed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bracket_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"round_label" text NOT NULL,
	"is_losers_bracket" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "round_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tournament_round_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "bracket_slot" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "opens_at_time" time DEFAULT '12:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "closes_at_time" time DEFAULT '02:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "is_open_24h" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "accepts_walk_ins" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "review_notes" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_reported_by_team_id_teams_id_fk" FOREIGN KEY ("reported_by_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmed_by_team_id_teams_id_fk" FOREIGN KEY ("confirmed_by_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_otps_phone_idx" ON "auth_otps" USING btree ("phone_number","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "brackets_tournament_idx" ON "brackets" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "match_results_match_idx" ON "match_results" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_results_winner_idx" ON "match_results" USING btree ("winner_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_rounds_bracket_round_idx" ON "tournament_rounds" USING btree ("bracket_id","round_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
