# Beat'Em All — Changelog

All notable changes to the application repository land here. Format adheres loosely to
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Conventional Commits.

Unreleased entries describe work in flight. Released entries correspond to a Vercel production
deployment URL and are dated.

---

## [Unreleased]

Build queue priority pivot 2026-05-02: skip Phone OTP, populate DB with demo data so every model can be tested without auth.

### Infra — new Vercel instance `beat-em-all-v2` (2026-09-25)

Fresh, fully isolated production instance alongside the original `beat-em-all` project (which is untouched and still live).

- **Project:** `beat-em-all-v2` (id `prj_Eu2v2QbbUTZK54tslwRpqD7Lf44T`), root `apps/web`, Next.js, Node 24.x.
- **Functions region:** `fra1` (the original project runs functions in `iad1` against a Frankfurt DB). DB round-trip in `/api/health` dropped from ~94–1460 ms to ~3–4 ms.
- **Database:** new Neon free-tier DB `beat-em-all-v2-db` in `fra1` / `eu-central-1`. All 7 migrations (`0000`–`0006`) applied; demo seed loaded (6 games, 5 personas, 5 orgs, 3 teams, 5 venues, 6 tournaments).
- **Live URL:** https://beat-em-all-v2.vercel.app
- **Verified:** `/api/health` → `database.connected:true, region:fra1`; player, team, tournament APIs 200; `/en`, `/ar`, `/en/tournaments`, all 5 venue pages 200; `POST /api/challenges` as Khaled → 201.
- **Git auto-deploy still not wired:** `vercel git connect` fails with "need admin or write access" because the Vercel GitHub App is not installed on the `automationrami` account. Deploy with `vercel deploy --prod` from local.
- Local `.vercel/` and `packages/db/.env` now point at v2. Old link + old DB env backed up to `D:\BeatEmAll\.vercel-backup-beat-em-all-20260925\`.

### TM-2 — Register a team for a tournament, end-to-end (commit `861972c`, deploy `dpl_G3EX5uTu2XnKH9bLEQFY4rAvXtiT`)

Fourth action-bearing vertical slice — and KEC's flagship moment. A persona on a team that plays the tournament's game can register for any `registration_open` tournament; their entry shows up on the tournament detail page; they can withdraw and re-register; the founder can finally answer "yes" to "could SEF run a tournament?".

- **Schema:** new `tournament_registrations` table per DOMAIN_MODEL.md §9.2 + `tournament_registration_status` enum. Unique `(tournament_id, team_id)` index. Two supporting indexes (capacity-count + inbox query). Migration `0006_windy_sunfire.sql`.
- **Domain (`packages/db/src/queries/registration.ts`):**
  - `registerTeamForTournament` validates tournament status === `registration_open`, team plays the tournament's game (intersection check via `team_games`), persona is on the team. Then enters a transaction that takes a per-tournament `pg_advisory_xact_lock(hashtext(tournament_id))` and runs the capacity check + insert atomically — concurrent POSTs for the same tournament serialise; other tournaments stay parallel.
  - **Reactivate-on-rejoin:** a `withdrawn` row is flipped back to `confirmed`/`pending_payment` rather than rejected with a unique-key collision (UX: re-register cleanly without an admin reset).
  - **Disqualification preserved:** explicit guard prevents auto-reactivating disqualified rows; admin verdict stays in place.
  - `withdrawRegistration` runs auth check **before** the idempotent early-return so withdrawn IDs don't leak existence; blocks withdraw on `checked_in` / `disqualified`.
  - `loadRegistrationById` + `listRegistrationsFor{Tournament,Player}` with orphan-FK logging (the FKs are `restrict` so these branches shouldn't fire in production; if they do we want loud signal not silent 404s).
  - Typed `TournamentRegistrationError` class.
- **APIs:**
  - `POST /api/tournaments/[slug]/registrations` — Zod-validated body with optional `teamId`. Distinguishes empty body from invalid JSON (no longer silently coerces malformed JSON to `{}` and registers the wrong team).
  - `GET /api/tournaments/[slug]/registrations` — public list of registered teams.
  - `GET /api/registrations` — current persona's registrations.
  - `GET /api/registrations/[id]` — auth-gated detail. Returns **404 (not 403)** for non-authorised viewers, matching the page's `notFound()` stance to avoid leaking existence.
  - `PATCH /api/registrations/[id]` — `{ action: 'withdraw' }`.
- **UI:**
  - `RegisterTeamButton` on `/[locale]/tournaments/[slug]` with three states: `registration_closed` / `already_registered` / available. POSTs empty `{}` so the server resolves the persona's primary team.
  - **Tournament detail page** now lists registered teams ordered by registration time, with the viewer's own team highlighted in violet. **Logged-out / stale-cookie viewers degrade gracefully** (the page used to 500 because `getCurrentUser()` was unconditional; now wrapped in try/catch).
  - `/[locale]/registrations` inbox + `/[locale]/registrations/[id]` detail with `WithdrawRegistrationButton`. Both `force-dynamic`.
- **Translations:** 32 EN + AR `registration.*` keys.
- **Silent-failure-hunter pass before deploy:** found 16 issues; all P0/P1 fixed:
  - P0: tournament page no longer 500s for logged-out viewers (graceful degrade); disqualified rows can't auto-reactivate; orphan FK lookups now log loudly; invalid JSON in POST → 400 instead of silently registering primary team.
  - P1: withdraw auth-check moved above idempotent return; API detail returns 404 not 403 to match page UX; `seedNumber` rendered only when `> 0` (not just non-null).
  - P2 deferred (per agent classification): persona-switch mid-form silent; `confirm()` not RTL-aware; date rendering not locale-aware in detail page.
- **Verified end-to-end on prod (`gitSha 861972c`):**
  - Omar's "Dupe Test" team (tekken8) → registers for KEC Tekken Trophy → 201, `status: confirmed`.
  - Re-register from same persona → 409 `already_registered`.
  - Khaled (Sandstorm: valorant + eafc, no tekken8) → 400 `game_mismatch` with localised name.
  - Sara → in-progress KEC Spring '26 → 409 `registration_closed`.
  - Fatima (Desert Hawks: valorant + codm, no eafc) → Zain × DXE EAFC Cup → 400 `game_mismatch`.
  - Khaled (Sandstorm plays eafc) → Zain × DXE EAFC Cup → 201 `confirmed`.
  - Garbage POST body → 400 `invalid_json` (P0-5 verified, no silent fallback).
  - Detail as Omar (registrant) → 200; as Sara (not on team) → **404** (existence-leak fix verified).
  - Withdraw + idempotent re-withdraw → 200 both times.
  - Sara withdraws Omar's withdrawn entry → 403 (auth check now runs first, P1-2 verified).
  - Re-register after withdraw → 201 (same registration ID, status flips back to `confirmed` — reactivate-on-rejoin verified).

### E2-S2 — Create a team, end-to-end (commit `ba92f04`, deploy `dpl_CEF6d8vZcp4mE4hybWSR1FBKfU9b`)

Third action-bearing vertical slice. Team-less personas (Ahmad / Omar / Fatima in seeds) can now found their own team, becoming captain in one transactional insert. Unlocks the previously-dead "no team" branches in `BookingModal` + `ChallengeModal`.

- **No schema migration** — `teams`, `team_members`, `team_games` already exist from E2-S1.
- **Domain (`packages/db/src/queries/team.ts`):**
  - `createTeam` validates name (2–60), tag (2–6 uppercase alphanumeric), slug (3–40 lowercase + hyphens, no leading/trailing/consecutive hyphens), country (2–3 letter ISO), and at least one game. Dedupes `gameSlugs` to prevent duplicate `team_games` inserts. Inserts `teams` + `team_members(captain)` + `team_games(primary)` atomically in one transaction.
  - **Race-safety net:** the `teams.slug` unique-index TOCTOU window is closed by translating Postgres `23505` violations into a clean `slug_taken` 409 instead of leaking a 500. (Same pattern as `pg_advisory_xact_lock` in booking, but cheaper here since we already have a unique index doing the work.)
  - `listGamesForCreateTeam` returns the full active-game catalog with the persona's own games sorted first + marked `isPlayed` (UX hint, not enforced — a captain can found a team in a game they don't personally play, which is legitimate per spec).
  - `TeamError` typed class so the route never leaks DB internals.
- **API:** `POST /api/teams` with Zod-validated body. **Stale-persona auth resolution** (cookie pointing at a deleted player row) now returns `401 unauthorized` + "refresh the page" hint instead of leaking a generic 500 with the persona slug in the message. **Zod `invalid_body`** now carries a usable top-level `message` like `"gameSlugs: Array must contain at least 1 element(s)"` so the client doesn't render the literal string `"invalid_body"`.
- **UI:**
  - `/[locale]/teams/new` — Server Component shell that loads the persona's available games, plus a Client `CreateTeamForm` with full field set (name / tag / slug / country / city / bio / games / recruiting). Slug auto-suggests from name until manually edited; tag input force-uppercases; chips show `●` for games the persona already plays.
  - **"Create a team" primary CTA** threaded into both `BookingModal` and `ChallengeModal` no-team branches. Closes the modal and `router.push`-es to `/teams/new`.
- **Translations:** 22 new EN + AR `teamCreate.*` keys, plus `createTeamCta` on the `challenge.*` and `booking.*` namespaces.
- **Silent-failure-hunter pass before deploy:** found 12 issues; all P0/P1 fixed (23505 unique-violation translator, consecutive-hyphen rejection, `gameSlugs` dedupe, Zod-error usable message, stale-persona 401). P2 issues filed (persona-switch mid-form coherent but not communicated; `router.push` cast unguarded; `console.error` not `logError` since helper doesn't exist yet — multi-route gap).
- **Verified end-to-end on prod (`gitSha ba92f04`):**
  - Fatima (no team in seeds) creates Desert Hawks → 201, team `74a1a8ef-...`.
  - Duplicate slug `desert-hawks` from Ahmad → 409 `slug_taken` with friendly message (not raw Postgres error).
  - `slug=a--b` → 400 `invalid_slug` with explicit "no consecutive hyphens" message.
  - `slug=-bad` (leading hyphen) → 400 `invalid_slug`.
  - Lowercase tag `low` → 201, normalised to `LOW` server-side.
  - Empty `gameSlugs` → 400 `invalid_body` message `"gameSlugs: Array must contain at least 1 element(s)"`.
  - Duplicate `gameSlugs: [valorant, valorant, tekken8]` → 201 (deduped to 2 entries).
  - **Full pipeline:** Fatima → create team → `/api/me/team` shows Desert Hawks → Fatima books Pixel House for CODM → 201 booking `8eb64b32-...`. Three previously-disconnected slices now compose end-to-end.

### E4 — Book a venue, end-to-end (commit `a415c3a`, deploy `dpl_3AdBiUXcb2vUpGDbaEDGFCzEqMno`)

Second action-bearing vertical slice. Khaled clicks "Book a slot" on a venue page → picks game / start time / 1-2-3 hr / seats → row in `venue_bookings` → confirmation page renders. Defers payment to E4-S2 (bookings start in `pending_payment` and stay there until Tap is wired up).

- **Schema:** new `venue_bookings` table + `venue_booking_status` enum (`pending_payment` / `confirmed` / `checked_in` / `completed` / `cancelled` / `no_show`) per DOMAIN_MODEL.md §7.6. Two indexes: `(venue, game, start, end)` for overlap scans, `(booker, created)` for the inbox. Migration `0005_plain_mockingbird.sql`.
- **Domain layer (`packages/db/src/queries/booking.ts`):**
  - `createBooking` runs schema validation (min 30min duration, no past dates, seats ≥ 1), checks venue is active+verified, checks the game is in `venue_games` for that venue, then enters a transaction that takes a `pg_advisory_xact_lock(hashtext(venue_id || '|' || game_id))` and re-runs the overlap check + insert atomically. Concurrent POSTs for the same `(venue, game)` slot serialise; other slots stay parallel.
  - `loadBookingById` + auth gate (booker or teammate only).
  - `listBookingsForPlayer(playerId, userId)` — bookings made by user OR for any of their teams.
  - `listVenueSupportedGames(slug)` — feeds the modal's game picker with per-game capacity.
  - `BookingError` typed class so the route never leaks DB internals.
- **APIs:**
  - `POST /api/venues/[slug]/bookings` — Zod-validated body, status mapping by error code (`insert_failed → 500` with generic message, never the DB error).
  - `GET /api/venues/[slug]/bookings` — supported games + capacity for the modal.
  - `GET /api/bookings` — inbox.
  - `GET /api/bookings/[id]` — detail, gated to booker or teammate.
- **UI:**
  - `BookingButton` wires the existing "Book a slot" CTA on `/venues/[slug]` to a new `BookingModal`.
  - `BookingModal` — game picker (intersection of venue's games + persona team's games), `datetime-local` start, 1/2/3 hr radio buttons, seat input clamped to per-game capacity, live price preview ("6 KWD × 3 seats × 2 hr = 36 KWD"). Three-state self-team load (`loading | error | loaded`) so a DB outage doesn't masquerade as "no team".
  - `/[locale]/bookings` inbox + `/[locale]/bookings/[id]` confirmation page. Both `force-dynamic`, locale-aware Asia/Kuwait timezone via `Intl.DateTimeFormat`. Detail page gated server-side (returns notFound() to non-booker non-teammate viewers — doesn't leak existence).
- **Persona-cookie auth proxy** reused. `current_user.loadUserByPersonaSlug` now `ORDER BY teams.slug ASC` so the primary-team default (`teamMemberships[0]`) is stable across deploys.
- **Translations:** 46 new EN + AR `booking.*` keys.
- **Silent-failure-hunter pass before deploy:** found 16 issues; all P0/P1 fixed (auth gate on detail, error masking in `/api/me/team`, oversell race via advisory lock, deterministic team ordering, double-submit guard, min-duration enforcement, seat-input non-rewriting, three-state loading UX). P2 issues filed in BACKLOG (notably: `total_amount_kwd` is `doublePrecision` — must move to `numeric(10,3)` or fils-as-integer before Tap reconciliation lands in E4-S2).
- **Verified end-to-end on prod (`https://beat-em-all.vercel.app`, gitSha `a415c3a`):**
  - Khaled (Sandstorm) creates booking `25072193-afe8-46be-bd8f-226c9138f01e` for 3 Valorant seats at GG Arena → 201, `total_amount_kwd: 36` matches `6 × 3 × 2`.
  - Re-attempt for 2 more seats overlapping (would push to 5/4) → 409 `slot_unavailable`.
  - Re-attempt for 1 more (3+1=4=capacity) → 201.
  - Re-attempt for 1 more after capacity exhausted → 409 `slot_unavailable` with message `"0 VALORANT seat(s) free in that window — you asked for 1."`.
  - Non-overlapping next-day booking → 201.
  - Fatima (no team) tries to book → 403 `no_team`.
  - Past date → 400 `invalid_date_range`.
  - CS2 (not at GG Arena) → 400 `game_not_supported` with localised name.
  - Detail endpoint: Khaled (booker) → 200, Fatima → 403, Sara (different team) → 403. Auth gate works.

### E6 — Challenge a team, end-to-end (commit `ece1982`)

First **action-bearing** vertical slice. Khaled's Sandstorm can challenge Sara's Falcon Squad for a Valorant match, Sara can accept (atomically creating a `matches` row) or reject or counter-propose. The first feature where users actually click and **do** something with real DB writes.

- Schema migration: `challenges` + `challenge_negotiations` + `matches` tables. `challenge_status_enum` (pending/negotiating/accepted/rejected/expired/cancelled/booked), `match_type_enum`, `match_status_enum`. 7-day default expiry on challenges via `now() + interval '7 days'`. Matches FK back to challenges with `onDelete:'set null'` so deleting a challenge doesn't cascade-kill its match.
- Domain layer in `packages/db/src/queries/challenge.ts`:
  - `createChallenge` — validates challenger captain on team, validates intersection of supported games, inserts pending row.
  - `acceptChallenge` — **transactional**: inserts `matches` row + flips challenge to accepted with `matchId` + `acceptedAt` in one txn. Idempotent fast-path (re-accept returns the existing matchId rather than erroring).
  - `rejectChallenge`, `counterChallenge` (writes a negotiation row, sets status to `negotiating`).
  - `intersectionGamesBetweenTeams` — used both by API and modal to disable submission when no shared game.
  - `loadChallengeById`, `loadChallengeNegotiations`, `listChallengesForPlayer(direction)`.
  - Typed `ChallengeError` class with discriminated `code` field — server logs the full error, the API leaks only the `message`.
- Persona-as-current-user pattern (auth proxy until E1-S2 lands):
  - `bx-current-persona` cookie carries the active persona slug.
  - `packages/db/src/queries/current_user.ts` exports pure `loadUserByPersonaSlug(slug)` (zero `next/headers` import → keeps DB package framework-agnostic).
  - `apps/web/src/lib/current-user.ts` is the bridge: reads the cookie via `next/headers` and calls into the pure query. Marked `'server-only'`.
  - `PersonaSwitcher` writes the cookie + `router.refresh()` on change so the server picks up the new identity immediately.
- Vercel Functions:
  - `GET /api/challenges?direction=incoming|outgoing|all`
  - `POST /api/challenges` — Zod-validated body (`challengedTeamSlug`, `gameSlug`, `format`, `dateRangeStart`, `dateRangeEnd`, optional `proposedVenueSlug` + `message`).
  - `GET /api/challenges/[id]`
  - `PATCH /api/challenges/[id]` — discriminated-union body (`{ action: "accept" | "reject" | "counter", ... }`).
  - `GET /api/me/team` — lightweight endpoint the modal hits for the games-intersection check.
- UI:
  - Team profile gains a **"Challenge"** button → opens `ChallengeModal` (game / format / date-range / venue / message). Date-range pickers default to tomorrow → next week, locale-aware. Client-side guards for past dates and inverted ranges so users get instant feedback rather than a server 400.
  - `/challenges` inbox with **Incoming / Outgoing / All** tabs, defaulting to **All** so the founder lands on a tab that surfaces the just-sent challenge regardless of which side they're on.
  - `/challenges/[id]` detail with status pill, BO format, locale-aware date range (Asia/Kuwait via `Intl.DateTimeFormat`), proposal panel, accept/reject/counter actions for the challenged team, accepted-match notice, and full negotiation history.
- Translations: 50+ new EN + AR keys under `challenge.*` (modalTitle, fieldGame, statusPending, errorNoSharedGames, etc.).
- Mock fix: Sara now plays both `valorant` and `codm` so she can captain Falcon Squad against Sandstorm.
- Verified end-to-end on prod (deploy `dpl_BupihsreMTG5QAfe4SzvyT2KqoRY`):
  - Khaled creates challenge `2721b6ab-903a-4085-8ce6-f78ed92178e2` from Sandstorm → Falcon Squad.
  - Sara accepts → `matchId 27bc628d-72f2-4b96-9ae7-cb0a21dafc5f` written, status flips pending→accepted.
  - Re-accept is idempotent (returns same matchId, no error).
  - 403 Forbidden when Khaled tries to accept his own challenge.
  - Reject path works.
  - Browser screenshot of the detail page renders correctly with the lime "Challenge accepted. Match scheduled" notice.

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
