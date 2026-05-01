# Beat'Em All — Backlog

> Epic-level + story-level progress tracker. **Read this at the start of every Claude Code session** alongside `CLAUDE.md`. Updates land in the same PR as the story they describe.
>
> **Status legend:** ✅ shipped · 🟡 in progress · 🔵 next (queued, scoped) · 🔴 not started · ⚪ deferred (post-MVP)

---

## Where we are right now (2026-05-02)

**Live URL:** https://beat-em-all.vercel.app
**Stack:** Vercel-native — Vercel Functions + Vercel Postgres (Neon, fra1) + Drizzle ORM + Auth.js v5 (deferred) + Vercel Blob (planned)
**Build phase:** Full data layer (read paths) for E1 + E2 + ORG-1 + venues + tournaments shipped without auth. Auth (E1-S2) deferred per founder directive.
**Deploy method:** `vercel deploy --prod` from local (no auto-deploy on git push — see `~/.claude/projects/D--BeatEmAll/memory/github-accounts.md` for the why)

**What works end-to-end (2026-05-02):**
- `GET /api/health` — app + DB status
- `GET /api/players/[slug]` — DB-backed Khaled / Sara / Ahmad / Omar / Fatima
- `GET /api/teams/[slug]` — DB-backed Sandstorm / Falcon Squad / Desert Dragons
- `GET /api/orgs/[slug]` — DB-backed KEC / Beat'Em All / Zain / venue orgs
- `GET /api/venues/[slug]` — DB-backed GG Arena, Pixel House, ARC, Q-Mark, DXE Fuel
- `GET /api/tournaments/[slug]` — DB-backed 6 KEC + community tournaments
- `GET /api/home?personaId=<slug>` — composed Home Feed payload (real DB sections + mock fallback for hero upcomingMatch + recent activity)
- Frontend `/[locale]/players/[slug]`, `/[locale]/teams/[slug]`, `/[locale]` (Home Feed) all wired to real DB

---

## Epic E1 — Player Identity, Profile & Account Linking

Source: `Beatemall/docs/epics/E1-player-identity.md`. MVP target.

| Story | Title | Status | Verification |
|---|---|---|---|
| **E1-S1** | DB scaffold + Vercel Postgres provisioning | ✅ | `curl https://beat-em-all.vercel.app/api/health` returns `database.connected:true` |
| **E1-S0.5** *(demo-seeds-first pivot)* | Demo seed: 5 persona users + players + games + per-persona player_games | ✅ | 5 users / 5 players / 6 games / 4 player_games rows in Neon |
| **E1-S6** | Public player profile API (replaces mock) | ✅ | `curl https://beat-em-all.vercel.app/api/players/khaled-al-mutairi` returns DB-backed PlayerProfile |
| E1-S2 | Phone OTP send/verify Functions (Auth.js v5 + Unifonic) — **deferred** | ⚪ deferred | `POST /api/auth/otp/send` + `POST /api/auth/otp/verify` returns session cookie |
| E1-S3 | Profile creation API + onboarding wiring | 🔴 | `GET /api/me` + `PATCH /api/me` round-trips |
| E1-S4 | Avatar upload via Vercel Blob | 🔴 | Upload + `users.avatar_url` reflects new blob URL |
| E1-S5 | Civil ID verification flow (manual review at MVP) | 🔴 | Upload + admin review queue + `players.civil_id_verified_at` set |
| E1-S7 | Account linking — Steam OpenID | 🔴 | Link Steam → `linked_accounts` row + rank visible on profile |
| E1-S8 | Account linking — Riot RSO | ⚪ | Riot RSO requires app approval; deferred until that's secured |
| E1-S9 | Privacy + notification preferences | 🔴 | `PATCH /api/me/preferences` |
| E1-S10 | Delete account (7-day grace) | 🔴 | `DELETE /api/me` flips `users.deleted_at`, GC job hard-deletes after 7d |

**E1 acceptance:** A user signs up via phone OTP, completes onboarding wizard end-to-end, sees their public profile at `/players/[slug]`, can link a Steam account, and can verify their Civil ID for KEC eligibility.

---

## Epic E2 — Team Formation & Management

Source: `Beatemall/docs/epics/E2-team-formation.md`. Depends on E1 (real users).

| Story | Title | Status |
|---|---|---|
| E2-S0 | Team profile public page (S-E2-01) — frontend mock | ✅ shipped pre-pivot |
| **E2-S1** | DB tables: teams, team_members, team_games | ✅ Migration `0002_faulty_korath.sql` applied; 3 teams seeded |
| **E2-S7** | Replace `/teams/[slug]` mock with DB read | ✅ `curl https://beat-em-all.vercel.app/api/teams/sandstorm` returns DB-backed Team |
| E2-S2 | Create team API + onboarding (S-E2-02) | 🔴 (post-auth) |
| E2-S3 | Invite player flow + invitation acceptance | 🔴 (post-auth) |
| E2-S4 | Roles + role transitions (captain transfer) | 🔴 (post-auth) |
| E2-S5 | Team management dashboard (S-E2-03) | 🔴 (post-auth) |
| E2-S6 | Disband team flow | 🔴 (post-auth) |

---

## Epic ORG-1 — Organization Core (multi-tenant root)

Source: `Beatemall/docs/epics/ORG-1-organization-core.md`. Depends on E1.

| Story | Title | Status |
|---|---|---|
| **ORG-1-S1** | DB tables: organizations, memberships | ✅ Migration `0003_sturdy_vertigo.sql` |
| **ORG-1-S2** | Seed KEC as Organization #1 + Beat'Em All admin org | ✅ 5 orgs seeded; KEC verified |
| **ORG-1-S3** *(partial — public profile API only, frontend dir post-auth)* | Public org profile + directory | 🟡 `/api/orgs/[slug]` works; frontend `/orgs/[slug]` page post-auth |
| ORG-1-S4 | Org admin dashboard (S-ORG-03) | 🔴 (post-auth) |
| ORG-1-S5 | Member invite + role mgmt (S-ORG-04) | 🔴 (post-auth) |

---

## Epic ORG-2 — Tier capabilities

Federation / Brand / Venue / Community / Personal capability gating. Status: 🔴.

---

## Epic FED-1 — Federation features (KEC essentials)

Source: `Beatemall/docs/epics/FED-1-federation-features.md`. Depends on ORG-1.

Sanctioned-tournament designation, Civil-ID requirement enforcement, ranking points engine, federation reporting. Status: 🔴.

---

## Epic FED-2 — Federation reporting & compliance

Status: 🔴. Depends on FED-1.

---

## Epic E3 — Venue Onboarding & Listing

Source: `Beatemall/docs/epics/E3-venue-onboarding.md`.

| Story | Title | Status |
|---|---|---|
| **E3-S1** | DB tables: venues, venue_games | ✅ Migration `0003_sturdy_vertigo.sql` |
| **E3-S2** | Seed 5 venues (KW + KSA) | ✅ |
| **E3-S3** | `/api/venues/[slug]` public read | ✅ |
| E3-S4 | Venue verification queue (S-E3-05, P-3) | 🔴 (post-auth) |
| E3-S5 | Venue onboarding wizard (S-E3-03) | 🔴 (post-auth) |
| E3-S6 | Venue owner dashboard (S-E3-04) | 🔴 (post-auth) |
| E3-S7 | Frontend pages `/venues` + `/venues/[slug]` | 🔵 next |

---

## Epic E4 — Booking, Payment & Cancellation

Source: `Beatemall/docs/epics/E4-booking-payment.md`. Tap Payments dependency. Status: 🔴.

---

## Epic E5 — Discovery & Geo-Matching

Source: `Beatemall/docs/epics/E5-discovery-geo.md`. PostGIS extension required.

| Story | Title | Status |
|---|---|---|
| E5-S0 | Home Feed (S-E5-04) — frontend-only mock | ✅ shipped pre-pivot |
| E5-S1 | Enable PostGIS extension on Neon, add geo_location columns | 🔴 |
| E5-S2 | Discover Teams API + UI (S-E5-01) | 🔴 |
| E5-S3 | Discover Tournaments API + UI (S-E5-02) | 🔴 |
| E5-S4 | Global Search (S-E5-03) | 🔴 |
| E5-S5 | Replace Home Feed mock-data with real /api/home reads | 🔴 |

---

## Epic E6 — Challenge, Negotiation & Match Lifecycle

Source: `Beatemall/docs/epics/E6-challenge-negotiation.md`. Status: 🔴.

---

## Epic TM-1...TM-7 — Tournament Management

Source: `Beatemall/docs/epics/TM-*.md`. KEC's primary need per `MVP_SCOPE.md` Path-A.

| Story | Title | Status |
|---|---|---|
| **TM-S1** | DB table: tournaments | ✅ Migration `0003_sturdy_vertigo.sql` |
| **TM-S2** | Seed 6 tournaments (4 KEC sanctioned + Zain×DXE + Hawally Hornets) | ✅ |
| **TM-S3** | `/api/tournaments/[slug]` public read | ✅ |
| TM-1 | Tournament creation wizard (S-TM-06) | 🔴 (post-auth) |
| TM-2 | Registration + check-in (S-TM-02 + S-TM-04) | 🔴 (post-auth) |
| TM-3 | Bracketing engine (S-TM-09 + S-TM-03) | 🔴 |
| TM-4 | Match lifecycle, results, disputes | 🔴 |
| TM-5 | Prizes + payouts | 🔴 (depends on P-2) |
| TM-6 | Live ops + admin console | 🔴 |
| TM-7 | Analytics + post-tournament reports | 🔴 |
| Frontend | `/tournaments` + `/tournaments/[slug]` | 🔵 next |

---

## Epic P-1...P-4 — Cross-cutting platform

| Epic | Status |
|---|---|
| P-1 Notifications (Resend / Unifonic / push) | 🔴 |
| P-2 Payments infrastructure (Tap) | 🔴 |
| P-3 Admin console | 🔴 |
| P-4 i18n + RTL | ✅ shipped — bilingual EN/AR with logical properties throughout |

---

## Frontend screens shipped (mock-data, pre-pivot)

| Screen ID | Route | Status | Page-spec |
|---|---|---|---|
| S-E1-01 | `/sign-in` (phone OTP step) | ✅ mock | TBD |
| S-E1-02 | `/verify` | ✅ mock | TBD |
| S-E1-03 | `/onboarding` (game-selection only — full 7-step wizard pending) | 🟡 partial | TBD |
| S-E1-04 | `/auth/callback` | ✅ stub | — |
| S-E1-07 | `/players/[slug]` | ✅ | `Beatemall/docs/page-specs/PLAYER_PROFILE.md` |
| S-E2-01 | `/teams/[slug]` | ✅ | `Beatemall/docs/page-specs/TEAM_PROFILE.md` |
| S-E5-04 | `/` (Home Feed) | ✅ | `Beatemall/docs/page-specs/HOME_FEED.md` |

---

## Active backlog — what to ship next (prioritized)

**Phase 1 read-path data layer is COMPLETE.** Players, teams, orgs, venues, tournaments, and the composed Home Feed all serve real DB data on prod. Founder can poke every model without auth.

Next priorities:

1. **Frontend pages for venues + tournaments** — currently the APIs exist but there's no page at `/venues/[slug]` or `/tournaments/[slug]`. Mirror the Player Profile + Team Profile pattern (server page calls `loadVenueBySlug` / `loadTournamentBySlug` → passes to client renderer).
2. **Persona switcher → URL routing wiring** — when persona changes, route the user to a "view as Khaled" Home Feed instead of just changing the API query param. Already partially works.
3. **E1-S2** Phone OTP via Auth.js v5 + Unifonic. **The "demo seeds first" pivot is complete; auth is now the highest-leverage next thing.**
4. **E1-S3** Profile creation API + onboarding wiring (depends on E1-S2).
5. **TM-1** Tournament creation wizard (S-TM-06) — KEC's headline use-case (depends on E1-S2 + ORG-1-S4).
6. **PostGIS + E5** — enable `postgis` extension on Neon, add `players.geo_location` + `teams.geo_location` + `venues.geo_location` columns, build `/api/discover/teams` and `/api/discover/tournaments`.

---

## Definition of Done (every story)

A story is shipped when:

1. DB migration exists in `packages/db/migrations/` (if it touches schema).
2. Vercel Function endpoints exist under `apps/web/src/app/api/**/route.ts`.
3. `packages/api-client/<module>.ts` calls real endpoints (mock-data fallback removed).
4. Frontend wired to consume real data.
5. EN + AR copy in `packages/i18n/`.
6. Skeleton + empty + error states designed (not stubs).
7. `pnpm typecheck` clean across the monorepo; `apps/web lint` clean.
8. Conventional Commit with story tag: `feat(E1-S2): ...`.
9. Deployed to prod (`vercel deploy --prod`) and `/api/health` plus story-specific verification confirmed manually.
10. CHANGELOG entry added.
11. BACKLOG.md row flipped to ✅.

---

**End of BACKLOG.md.** When in doubt about what's next, this file plus `~/.claude/projects/D--BeatEmAll/memory/MEMORY.md` are the canonical answer.
