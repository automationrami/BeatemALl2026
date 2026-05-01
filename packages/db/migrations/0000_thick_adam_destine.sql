CREATE TYPE "public"."linked_account_provider" AS ENUM('steam', 'riot', 'psn', 'xbox', 'epic');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."proficiency_level" AS ENUM('casual', 'intermediate', 'advanced', 'competitive', 'pro');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"category" text NOT NULL,
	"team_size_default" integer NOT NULL,
	"team_size_min" integer NOT NULL,
	"team_size_max" integer NOT NULL,
	"default_match_format" text DEFAULT 'bo3' NOT NULL,
	"default_duration_minutes" integer DEFAULT 60 NOT NULL,
	"icon_url" text,
	"cover_image_url" text,
	"supports_in_game_id" boolean DEFAULT true NOT NULL,
	"in_game_id_label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"launched_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"city" text,
	"date_of_birth" date,
	"civil_id_verified_at" timestamp with time zone,
	"civil_id_provider" text,
	"bio" text,
	"timezone" text DEFAULT 'Asia/Kuwait' NOT NULL,
	"preferred_position" text,
	"is_open_to_team_invites" boolean DEFAULT true NOT NULL,
	"is_profile_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"in_game_id" text,
	"in_game_rank" text,
	"proficiency_level" "proficiency_level" DEFAULT 'intermediate' NOT NULL,
	"years_playing" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_games" ADD CONSTRAINT "player_games_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_games" ADD CONSTRAINT "player_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "games_slug_idx" ON "games" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "players_user_id_idx" ON "players" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_games_player_id_game_id_idx" ON "player_games" USING btree ("player_id","game_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_number_idx" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email") WHERE "users"."email" IS NOT NULL;