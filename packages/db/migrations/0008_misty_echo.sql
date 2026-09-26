CREATE TYPE "public"."voucher_kind" AS ENUM('unlimited', 'stored_value');--> statement-breakpoint
CREATE TYPE "public"."voucher_purpose" AS ENUM('booking', 'tournament_entry');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"redeemed_by_user_id" uuid NOT NULL,
	"purpose" "voucher_purpose" NOT NULL,
	"booking_id" uuid,
	"registration_id" uuid,
	"amount_kwd" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"issuer_organization_id" uuid NOT NULL,
	"issued_by_user_id" uuid,
	"kind" "voucher_kind" NOT NULL,
	"value_kwd" double precision,
	"balance_kwd" double precision,
	"currency" text DEFAULT 'KWD' NOT NULL,
	"team_id" uuid,
	"venue_id" uuid,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"status" "voucher_status" DEFAULT 'active' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_redeemed_by_user_id_users_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_booking_id_venue_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."venue_bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_issuer_organization_id_organizations_id_fk" FOREIGN KEY ("issuer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voucher_redemptions_voucher_idx" ON "voucher_redemptions" USING btree ("voucher_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "voucher_redemptions_booking_idx" ON "voucher_redemptions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voucher_redemptions_registration_idx" ON "voucher_redemptions" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_code_idx" ON "vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_team_idx" ON "vouchers" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_issuer_idx" ON "vouchers" USING btree ("issuer_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_lower_idx" ON "teams" USING btree (lower("name"));