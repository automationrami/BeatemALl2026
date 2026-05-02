# Beat'Em All — Changelog

All notable changes to the application repository land here. Format adheres loosely to
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Conventional Commits.

Unreleased entries describe work in flight. Released entries correspond to a Vercel production
deployment URL and are dated.

---

## [Unreleased]

Build queue priority pivot 2026-05-02: skip Phone OTP, populate DB with demo data so every model can be tested without auth.

### E2-S1 + E2-S7 — Teams DB-backed (commit `2cfceea`)
- 3 new tables (teams, team_members, team_games) + 2 enums (team_member_role, team_invitation_status) — migration `0002_faulty_korath.sql`
- 3 teams seeded (Sandstorm + Falcon Squad + Desert Dragons); Khaled = Sandstorm captain
- `loadTeamBySlug` query (hybrid DB + mock-data overlay)
- `/api/teams/[slug]` Vercel Function
- Server page `/[locale]/teams/[slug]` rewired to call DB query directly
- `getTeamForSlug` in api-client now async / fetches `/api/teams/[slug]`

### Frontend pages for venues + tournaments + orgs (commit `afa5c2f`)
- `/[locale]/venues` — verified-venues grid (3-col on desktop, single on mobile) with rating/games/price
- `/[locale]/venues/[slug]` — venue detail with hero, supported games + location panels, book + directions CTAs
- `/[locale]/tournaments` — open + upcoming tournament list (sanctioned KEC events get cyan accent)
- `/[locale]/tournaments/[slug]` — gradient-hero detail with prize-pool stat, register + view-bracket CTAs
- `/[locale]/orgs/[slug]` — organization profile with tier pill + verified badge + website + contact
- All 5 pages have 404 not-found pages with Wordmark
- Translations: 50+ new EN + AR keys under `venue.*` / `tournament.*` / `organization.*`
- HomeFeed Quick Actions, Hero, TournamentList rewired to point at new `/tournaments` route

### ORG-1 + venues + tournaments + composed home feed (commit `31a42ba`, deploy `dpl_<latest>`)
- Schema migration `0003_sturdy_vertigo.sql`:
  - organizations + memberships per DOMAIN_MODEL.md §3 (federation/brand/venue/community/personal tiers)
  - venues + venue_games per §6 (Phase-1 lat/lng as numerics; PostGIS deferred)
  - tournaments per §9.1 (organization_id + game_id + status + prize_pool_kwd + sanctioned flag)
- Seeds:
  - 5 organizations (KEC = Organization #1, Beat'Em All admin, Zain Kuwait, GG Arena Holdings, DXE Fuel)
  - 5 venues (GG Arena Salmiya, Pixel House Hawally, ARC Esports Kuwait City, Q-Mark Farwaniya, DXE Fuel Riyadh)
  - 6 tournaments (KEC Spring '26 in_progress, KEC Summer Series, KEC Tekken Trophy, KEC Mobile Showdown, Zain×DXE EAFC Cup, Hawally Hornets Open)
- Server-only queries: `loadOrganizationBySlug`, `listVenues`/`loadVenueBySlug`, `listSurfaceableTournaments`/`loadTournamentBySlug`, `loadHomeFeed(personaId)`
- Public Vercel Functions: `/api/orgs/[slug]`, `/api/venues/[slug]`, `/api/tournaments/[slug]`, `/api/home?personaId=<slug>`
- HomeFeed component now fetches `/api/home` instead of calling sync mock; skeleton + error states preserved
- All endpoints verified on prod with curl

### E1-S0.5 — Demo seed shipped (commit `32c900a`)
- `packages/db/src/seed/games.ts` — 6 games (cs2, valorant, lol, eafc, codm, tekken8)
- `packages/db/src/seed/personas.ts` — 5 personas (Khaled, Sara, Ahmad, Omar, Fatima)
- `packages/db/src/seed/index.ts` — idempotent runner with `ON CONFLICT DO UPDATE`
- New `players.slug` column (migration `0001_wandering_ego.sql`) for `/players/[slug]` routing
- New scripts: `db:seed`, `db:inspect`
- Verified: 5 users, 5 players, 6 games, 4 player_games rows in Neon

### E1-S6 — Player profile API DB-backed (commit `ea99922`, deploy `dpl_EbBqhVrvMTEJ3cEpYHAuQeUE42ya`)
- `packages/db/src/queries/player.ts` — `loadPlayerProfileBySlug()` server-only query, hybrid (DB core + mock-data fallback for not-yet-modelled fields like pentagon, stats, recent matches, achievements)
- `packages/db` exports `./queries` subpath; `server-only` import enforces server-side usage
- `apps/web/src/app/api/players/[slug]/route.ts` — first DB-backed Vercel Function, returns canonical PlayerProfile JSON, 404 for unknown slugs
- Server page `/[locale]/players/[slug]/page.tsx` calls the DB query directly (zero HTTP roundtrip), passes profile down as prop
- `packages/api-client/src/player.ts` — `getPlayerProfileForSlug` now async, fetches `/api/players/[slug]` for client-side consumers
- Verified prod: `curl https://beat-em-all.vercel.app/api/players/khaled-al-mutairi` returns full DB-backed profile

---

## [0.1.0] — 2026-05-02 — E1-S1 shipped + Vercel-native pivot

**Production deploy:** `dpl_B4HYdok2UVw3ah98jgk8LHUW1gYr` → https://beat-em-all.vercel.app

### Added

- **`packages/db`** — Drizzle ORM schema for `users`, `players`, `player_games`, `games`
  matching DOMAIN_MODEL.md §2 + §5. Lazy-singleton DB client built on `postgres`
  (porsager) with `prepare:false` for PgBouncer-compatible pooling. Standalone
  `src/migrate.ts` runner using `POSTGRES_URL_NON_POOLING`. drizzle-kit config + `db:generate`
  / `db:migrate` / `db:studio` scripts. First migration `0000_thick_adam_destine.sql`
  applied against the new Neon database in fra1.
- **`apps/web/src/app/api/health/route.ts`** — first Vercel Function. Pings DB, returns app
  + DB status with latency, region, git SHA. Gracefully degrades when `POSTGRES_URL` is
  unset so builds before Postgres provisioning still pass.
- **`.env.example`** — template for local Postgres + Auth + Blob + Unifonic env vars.
- **`turbo.json`** — env passthrough for `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`,
  `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `UNIFONIC_*`. New `db:generate` / `db:migrate`
  task definitions.
- **Vercel Postgres (Neon) `beat-em-all-prod`** — Frankfurt region (closest free-tier to
  Kuwait), connected to the Vercel project; auto-injects `POSTGRES_URL`,
  `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` into all environments.

### Changed

- **Stack pivot to Vercel-native** — every Supabase-locked decision in `Beatemall/docs/TECH_STACK.md`
  is superseded:
  - Backend runtime: Supabase Edge Functions → **Vercel Functions** (Node + Edge)
  - Database: Supabase Postgres + RLS → **Vercel Postgres / Neon** + Drizzle
  - Migrations: Supabase CLI → **drizzle-kit + db:migrate runner**
  - Auth: Supabase Auth → **Auth.js v5** + Unifonic credentials provider
  - Storage: Supabase Storage → **Vercel Blob**
  - Realtime: Supabase Realtime → **Vercel Edge Functions + SSE** when needed
  - Phase plan: Phase 1 = localhost / Phase 9 = backend → **each epic ships DB +
    Functions + frontend in one PR**.
- **`app/CLAUDE.md`** + **`Beatemall/docs/TECH_STACK.md`** rewritten to lock the new stack.
  Phase-1 localhost-only restriction explicitly lifted.

### Verified

- `pnpm typecheck` — 11 packages clean
- `apps/web lint` — clean
- Localhost: `curl http://localhost:3000/api/health` returns degraded with clear error
  pre-DB; ok with serverTime post-DB
- Production: `curl https://beat-em-all.vercel.app/api/health` →
  `{"status":"ok","database":{"connected":true,"serverTime":"2026-05-01T21:52:24Z"},"region":"iad1","gitSha":"08f8785","latencyMs":985}`

### Known gaps / followups

- **Auto-deploy on `git push` does not work yet.** Vercel project is linked to local repo
  via Vercel CLI only. The Vercel ↔ GitHub App is installed on `ramiabujaber` but our git
  push target is `automationrami/BeatemALl2026`. Workaround: deploys are manual via
  `vercel deploy --prod` after every commit. See
  `~/.claude/projects/D--BeatEmAll/memory/github-accounts.md` for the full picture and
  the work needed to fix it (install Vercel App on `automationrami` properly).
- **PostGIS extension not yet enabled** on Neon — required for E5 (geographic discovery).
  Defer until the first E5 story.
- **`apps/web` lint exits 0 only because eslint config exists there**; other packages have
  no `eslint.config.js` and their `lint` scripts fail with "config not found". Pre-existing
  workspace bug, not blocking but worth fixing in a config-cleanup pass.

---

## [0.0.4] — 2026-05-01 — E5-S0 Home Feed (mock-data, pre-pivot)

**Production deploy:** `dpl_ER7Vb7aioXpyvdBRUtSQFuvyP8Tz` → first live Vercel deploy at
https://beat-em-all.vercel.app/en (after Root Directory + Framework fix on the original
clone deploy)

### Added

- Home Feed (S-E5-04) at `/[locale]` — full bento layout per
  `Beatemall/docs/page-specs/HOME_FEED.md`: greeting strip, 5-variant gradient hero,
  Recommended Teams rail, Quick Actions, Tournaments + Nearby Venues split, Recent Activity.
  All persona-aware via Zustand store; works EN + AR with Tailwind logical properties.
- `packages/types/{geo,home,tournament,venue}.ts` + `packages/types/src/home.ts` —
  composed shapes for the Home Feed API contract (Phase-1 mock, Phase-9 stable).
- `packages/utils/geo.ts` — `haversineKm` + `formatDistanceKm` with Vitest coverage
  (KW cities + Riyadh round-trips).
- `packages/mock-data/{tournaments,venues,recent-activity,persona-context,geo-points}.ts`
  — 6 tournaments, 5 venues, recent-activity per persona team, persona viewer-mode
  resolver.
- `packages/api-client/home.ts` — single composed accessor `getHomeFeed(personaId)`
  wrapping mock-data with deterministic filtering + capping per spec.
- `packages/i18n` — `home.*` namespace expanded with ~50 keys EN/AR.

### Verified

- 4 personas (Khaled active, Sara solo, Fatima incomplete) + AR locale — all empty/active
  states render per spec.
- 28/28 unit tests pass (auth-schemas + geo).

---

## [0.0.3] — 2026-04-30 — E2-S0 Team Profile (mock-data)

Page S-E2-01 at `/teams/[slug]` per `Beatemall/docs/page-specs/TEAM_PROFILE.md`.
3 mock teams (Sandstorm, Falcon Squad, Desert Dragons). 404 page for unknown slug.

---

## [0.0.2] — 2026-04-29 — E1-S0 Player Profile + sign-in mocks

- Mock phone-OTP sign-in flow (`/sign-in`, `/verify`, `/auth/callback`).
- Mock onboarding wizard (game-selection step only — full wizard deferred).
- Player Profile (S-E1-07) at `/players/[slug]` with the signature pentagon stat viz.
- Hydration-flicker fix on Zustand-persist signed-in pages.

---

## [0.0.1] — 2026-04-25 — Phase-1 monorepo scaffold

Initial Turborepo + pnpm scaffold:
- `apps/web` (Next.js 16.2 + Turbopack), `apps/admin` placeholder
- `packages/`: `ui`, `design-tokens`, `types`, `mock-data`, `api-client`, `i18n`, `utils`,
  `config`
- Brand tokens (Space Grotesk + JetBrains Mono + IBM Plex Sans Arabic + Inter), dark-mode
  bento primitives, EN/AR i18n via next-intl, Zustand persona-switcher
  (Khaled / Sara / Ahmad / Omar / Fatima), Husky + lint-staged + commitlint, Vitest, Biome.

---

**End of CHANGELOG.md.** Append, don't rewrite.
