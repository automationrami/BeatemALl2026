# Beat'Em All — Backlog

> Epic-level + story-level progress tracker. **Read this at the start of every Claude Code session** alongside `CLAUDE.md`. Updates land in the same PR as the story they describe.
>
> **Status legend:** ✅ shipped · 🟡 in progress · 🔵 next (queued, scoped) · 🔴 not started · ⚪ deferred (post-MVP)

---

## Where we are right now (2026-05-02)

**Live URL:** https://beat-em-all.vercel.app
**Stack:** Vercel-native — Vercel Functions + Vercel Postgres (Neon, fra1) + Drizzle ORM + Auth.js v5 + Vercel Blob (planned)
**Build phase:** E1 (Player Identity) — story 1 shipped, story 2 next
**Deploy method:** `vercel deploy --prod` from local (no auto-deploy on git push — see `~/.claude/projects/D--BeatEmAll/memory/github-accounts.md` for the why)

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
| E2-S0 | Team profile public page (S-E2-01) — frontend-only mock | ✅ shipped pre-pivot, mock-data backed |
| E2-S1 | DB tables: teams, team_members, team_games, team_invitations | 🔴 |
| E2-S2 | Create team API + onboarding (S-E2-02) | 🔴 |
| E2-S3 | Invite player flow + invitation acceptance | 🔴 |
| E2-S4 | Roles + role transitions (captain transfer) | 🔴 |
| E2-S5 | Team management dashboard (S-E2-03) | 🔴 |
| E2-S6 | Disband team flow | 🔴 |
| E2-S7 | Replace `/teams/[slug]` mock with DB read | 🔴 |

---

## Epic ORG-1 — Organization Core (multi-tenant root)

Source: `Beatemall/docs/epics/ORG-1-organization-core.md`. Depends on E1.

| Story | Title | Status |
|---|---|---|
| ORG-1-S1 | DB tables: organizations, memberships | 🔴 |
| ORG-1-S2 | Seed KEC as Organization #1 + Beat'Em All admin org | 🔴 |
| ORG-1-S3 | Public org profile + directory (S-ORG-01, S-ORG-02) | 🔴 |
| ORG-1-S4 | Org admin dashboard (S-ORG-03) | 🔴 |
| ORG-1-S5 | Member invite + role mgmt (S-ORG-04) | 🔴 |

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

Source: `Beatemall/docs/epics/E3-venue-onboarding.md`. Status: 🔴.

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

Source: `Beatemall/docs/epics/TM-*.md`. KEC's primary need per `MVP_SCOPE.md` Path-A. Status: 🔴.

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

> **Priority pivot 2026-05-02:** Founder asked to skip Phone OTP for now and build demo accounts so every model can be tested without auth. Order below reflects that — auth deferred until the data layer is fully populated.

1. **E1-S0.5** *(new story — added 2026-05-02)* — Demo seed for `users` + `players` + `games` + `player_games`. 5 persona rows (Khaled, Sara, Ahmad, Omar, Fatima) so every authenticated-viewer page can be poked with real DB data without sign-in. Idempotent script under `packages/db/src/seed/`.
2. **E1-S6** — Replace `/players/[slug]` mock-data with real `/api/players/[slug]` DB read. Frontend `PlayerProfileBySlug` wired to fetch from API.
3. **E2-S1 + E2-S7** — Teams tables (`teams`, `team_members`, `team_games`) + seed (Sandstorm, Falcon Squad, Desert Dragons) + `/api/teams/[slug]` + frontend wiring.
4. **ORG-1-S1 + S2** — `organizations` + `memberships` tables + seed KEC as Organization #1.
5. **TM tables + seed** — `tournaments`, `tournament_registrations`, `prize_pools` + seed KEC's spring/summer/tekken/mobile-showdown tournaments.
6. **E3 venue tables + seed** — `venues` + amenities + seed (GG Arena, Pixel House, ARC Esports, Q-Mark, DXE Fuel).
7. **`/api/home`** composed read — replaces `getHomeFeed()` mock with real DB-backed accessor.
8. **E1-S2** *(deferred)* — Phone OTP via Auth.js v5 + Unifonic. Lands once data layer is fully exercised.

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
