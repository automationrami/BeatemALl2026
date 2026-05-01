CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'organizer', 'moderator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."organization_tier" AS ENUM('federation', 'brand', 'venue', 'community', 'personal');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'gsl', 'league', 'custom');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cancellation_policy" AS ENUM('flexible', 'moderate', 'strict');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tier" "organization_tier" NOT NULL,
	"country_code" text NOT NULL,
	"description" text,
	"logo_url" text,
	"cover_image_url" text,
	"website_url" text,
	"contact_email" text,
	"contact_phone" text,
	"accent_color" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"format" "tournament_format" DEFAULT 'single_elimination' NOT NULL,
	"match_format" text DEFAULT 'bo3' NOT NULL,
	"team_size" integer DEFAULT 5 NOT NULL,
	"min_teams" integer DEFAULT 4 NOT NULL,
	"max_teams" integer DEFAULT 32 NOT NULL,
	"seeding_strategy" text DEFAULT 'manual' NOT NULL,
	"entry_fee_kwd" double precision DEFAULT 0 NOT NULL,
	"entry_fee_per_team_or_player" text DEFAULT 'team' NOT NULL,
	"is_official_sanctioned" boolean DEFAULT false NOT NULL,
	"awards_ranking_points" boolean DEFAULT false NOT NULL,
	"is_online_only" boolean DEFAULT false NOT NULL,
	"starts_in_label" text,
	"registration_label" text,
	"prize_pool_kwd" double precision DEFAULT 0 NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"eligibility_rules" jsonb,
	"rules_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"country_code" text NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"google_maps_place_id" text,
	"phone_number" text,
	"email" text,
	"cover_image_url" text,
	"total_seats" integer DEFAULT 0 NOT NULL,
	"pc_seats" integer DEFAULT 0 NOT NULL,
	"console_seats" integer DEFAULT 0 NOT NULL,
	"mobile_seats" integer DEFAULT 0 NOT NULL,
	"private_rooms_count" integer DEFAULT 0 NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"default_hourly_rate_kwd" double precision DEFAULT 0 NOT NULL,
	"cancellation_policy" "cancellation_policy" DEFAULT 'moderate' NOT NULL,
	"cancellation_window_hours" integer DEFAULT 24 NOT NULL,
	"rating" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"seats_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_games" ADD CONSTRAINT "venue_games_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_games" ADD CONSTRAINT "venue_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_id_organization_id_idx" ON "memberships" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_slug_idx" ON "tournaments" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "venues_slug_idx" ON "venues" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "venue_games_venue_id_game_id_idx" ON "venue_games" USING btree ("venue_id","game_id");