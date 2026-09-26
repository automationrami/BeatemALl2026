CREATE TYPE "public"."ranking_recipient_type" AS ENUM('player', 'team');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"awarded_by_organization_id" uuid NOT NULL,
	"recipient_type" "ranking_recipient_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"placement" integer NOT NULL,
	"season" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_points" ADD CONSTRAINT "ranking_points_awarded_by_organization_id_organizations_id_fk" FOREIGN KEY ("awarded_by_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_points" ADD CONSTRAINT "ranking_points_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_points" ADD CONSTRAINT "ranking_points_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_points_tournament_recipient_idx" ON "ranking_points" USING btree ("tournament_id","recipient_type","recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ranking_points_season_org_idx" ON "ranking_points" USING btree ("season","awarded_by_organization_id","recipient_type");