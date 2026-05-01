/**
 * Demo seed runner — populates DB with the 5 personas + game catalog.
 *
 * Idempotent: every insert uses `ON CONFLICT DO UPDATE` keyed on a unique column so
 * re-running the script is safe and updates fields that have drifted from seed source.
 *
 * Run with: `pnpm --filter @beat-em-all/db db:seed`
 *
 * Required env: `POSTGRES_URL_NON_POOLING` (uses unpooled to avoid PgBouncer-mode quirks
 * on multi-statement transactions).
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import postgres from 'postgres';
import { games } from '../schema/games';
import { users } from '../schema/users';
import { players } from '../schema/players';
import { playerGames } from '../schema/player_games';
import { GAME_SEEDS } from './games';
import { PERSONA_SEEDS } from './personas';

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('Set POSTGRES_URL_NON_POOLING (preferred) or POSTGRES_URL.');
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Seeding ${redactUrl(url)}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql, { schema: { games, users, players, playerGames } });

  try {
    // ---- 1. Game catalog ----
    // eslint-disable-next-line no-console
    console.log(`[seed] Upserting ${GAME_SEEDS.length} games`);
    for (const g of GAME_SEEDS) {
      await db
        .insert(games)
        .values(g)
        .onConflictDoUpdate({
          target: games.slug,
          set: {
            name: g.name,
            publisher: g.publisher,
            category: g.category,
            teamSizeDefault: g.teamSizeDefault,
            teamSizeMin: g.teamSizeMin,
            teamSizeMax: g.teamSizeMax,
            defaultMatchFormat: g.defaultMatchFormat ?? 'bo3',
            defaultDurationMinutes: g.defaultDurationMinutes ?? 60,
            supportsInGameId: g.supportsInGameId ?? true,
            inGameIdLabel: g.inGameIdLabel ?? null,
            isActive: g.isActive ?? true,
            updatedAt: drizzleSql`now()`,
          },
        });
    }

    // Pull the games map back so we have ids for FK inserts below.
    const gameRows = await db.select().from(games);
    const gameIdBySlug = new Map(gameRows.map((g) => [g.slug, g.id]));

    // ---- 2. Personas (users + players + player_games) ----
    for (const seed of PERSONA_SEEDS) {
      // 2a. user — upsert on phone_number
      const [userRow] = await db
        .insert(users)
        .values({ ...seed.user, phoneNumber: seed.phoneNumber })
        .onConflictDoUpdate({
          target: users.phoneNumber,
          set: {
            email: seed.user.email ?? null,
            displayName: seed.user.displayName,
            avatarUrl: seed.user.avatarUrl ?? null,
            locale: seed.user.locale ?? 'en',
            phoneVerifiedAt: seed.user.phoneVerifiedAt ?? null,
            updatedAt: drizzleSql`now()`,
          },
        })
        .returning({ id: users.id });

      if (!userRow) throw new Error(`[seed] user upsert returned no row for ${seed.slug}`);

      // 2b. player — upsert on user_id (1:1 unique)
      const { gameSlugs, inGameIds, inGameRanks, ...playerFields } = seed.player;
      const [playerRow] = await db
        .insert(players)
        .values({
          ...playerFields,
          userId: userRow.id,
          slug: seed.slug,
        })
        .onConflictDoUpdate({
          target: players.userId,
          set: {
            slug: seed.slug,
            countryCode: playerFields.countryCode,
            city: playerFields.city ?? null,
            bio: playerFields.bio ?? null,
            timezone: playerFields.timezone ?? 'Asia/Kuwait',
            civilIdVerifiedAt: playerFields.civilIdVerifiedAt ?? null,
            civilIdProvider: playerFields.civilIdProvider ?? null,
            isOpenToTeamInvites: playerFields.isOpenToTeamInvites ?? true,
            isProfilePublic: playerFields.isProfilePublic ?? true,
            updatedAt: drizzleSql`now()`,
          },
        })
        .returning({ id: players.id });

      if (!playerRow) throw new Error(`[seed] player upsert returned no row for ${seed.slug}`);

      // 2c. player_games — wipe + reinsert for this player so we don't accumulate stale rows
      await db.delete(playerGames).where(eq(playerGames.playerId, playerRow.id));
      for (let i = 0; i < gameSlugs.length; i++) {
        const slug = gameSlugs[i];
        if (!slug) continue;
        const gameId = gameIdBySlug.get(slug);
        if (!gameId) {
          // eslint-disable-next-line no-console
          console.warn(`[seed] No game row for slug "${slug}" — skipping for ${seed.slug}`);
          continue;
        }
        await db.insert(playerGames).values({
          playerId: playerRow.id,
          gameId,
          inGameId: inGameIds?.[i] ?? null,
          inGameRank: inGameRanks?.[i] ?? null,
          proficiencyLevel: 'competitive',
        });
      }

      // eslint-disable-next-line no-console
      console.log(`[seed] ✓ ${seed.slug} (${seed.user.displayName}) — ${gameSlugs.length} games`);
    }

    // eslint-disable-next-line no-console
    console.log('[seed] Done.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<unparseable URL>';
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exit(1);
});
