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
import { teams } from '../schema/teams';
import { teamMembers } from '../schema/team_members';
import { teamGames } from '../schema/team_games';
import { GAME_SEEDS } from './games';
import { PERSONA_SEEDS } from './personas';
import { TEAM_SEEDS } from './teams';

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('Set POSTGRES_URL_NON_POOLING (preferred) or POSTGRES_URL.');
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Seeding ${redactUrl(url)}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql, {
    schema: { games, users, players, playerGames, teams, teamMembers, teamGames },
  });

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

    // ---- 3. Teams (teams + team_members + team_games) ----
    // Pull persona slug → player_id map for member linking.
    const playerRows = await db.select({ id: players.id, slug: players.slug }).from(players);
    const playerIdBySlug = new Map(playerRows.map((p) => [p.slug, p.id]));

    for (const t of TEAM_SEEDS) {
      // 3a. team — upsert on slug
      const [teamRow] = await db
        .insert(teams)
        .values(t.team)
        .onConflictDoUpdate({
          target: teams.slug,
          set: {
            name: t.team.name,
            tag: t.team.tag,
            countryCode: t.team.countryCode,
            city: t.team.city ?? null,
            bio: t.team.bio ?? null,
            logoUrl: t.team.logoUrl ?? null,
            coverImageUrl: t.team.coverImageUrl ?? null,
            isPublic: t.team.isPublic ?? true,
            isRecruiting: t.team.isRecruiting ?? false,
            foundedAt: t.team.foundedAt ?? null,
            updatedAt: drizzleSql`now()`,
          },
        })
        .returning({ id: teams.id });

      if (!teamRow) throw new Error(`[seed] team upsert returned no row for ${t.team.slug}`);

      // 3b. team_games — wipe + reinsert
      await db.delete(teamGames).where(eq(teamGames.teamId, teamRow.id));
      for (let i = 0; i < t.gameSlugs.length; i++) {
        const slug = t.gameSlugs[i];
        if (!slug) continue;
        const gameId = gameIdBySlug.get(slug);
        if (!gameId) {
          // eslint-disable-next-line no-console
          console.warn(`[seed] No game row for "${slug}" — skipping for team ${t.team.slug}`);
          continue;
        }
        await db.insert(teamGames).values({
          teamId: teamRow.id,
          gameId,
          isPrimary: i === 0,
        });
      }

      // 3c. team_members — wipe + reinsert
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamRow.id));
      for (const m of t.members) {
        const playerId = playerIdBySlug.get(m.personaSlug);
        if (!playerId) {
          // eslint-disable-next-line no-console
          console.warn(
            `[seed] No player row for "${m.personaSlug}" — skipping team_members insert for ${t.team.slug}`,
          );
          continue;
        }
        await db.insert(teamMembers).values({
          teamId: teamRow.id,
          playerId,
          role: m.role,
          inGameRole: m.inGameRole ?? null,
          invitationStatus: 'accepted',
        });
      }

      // eslint-disable-next-line no-console
      console.log(
        `[seed] ✓ ${t.team.slug} (${t.team.name}) — ${t.gameSlugs.length} games, ${t.members.length} members`,
      );
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
