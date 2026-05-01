ALTER TABLE "players" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "players_slug_idx" ON "players" USING btree ("slug");