CREATE TYPE "public"."venue_booking_status" AS ENUM('pending_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"booked_by_user_id" uuid NOT NULL,
	"booked_by_team_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"seats_count" integer NOT NULL,
	"total_amount_kwd" double precision NOT NULL,
	"currency" text DEFAULT 'KWD' NOT NULL,
	"status" "venue_booking_status" DEFAULT 'pending_payment' NOT NULL,
	"notes" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_booked_by_user_id_users_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_booked_by_team_id_teams_id_fk" FOREIGN KEY ("booked_by_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_bookings_venue_game_time_idx" ON "venue_bookings" USING btree ("venue_id","game_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_bookings_booker_idx" ON "venue_bookings" USING btree ("booked_by_user_id","created_at");