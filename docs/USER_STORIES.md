# Beat'Em All — Pilot user stories (end-to-end)

> Written 2026-09-26 for the pilot launch. Each story has acceptance criteria (AC) and is
> proven by at least one end-to-end test that starts from a **brand-new account**, not a seeded
> persona. Story IDs map to the canonical epics in `../Beatemall/docs/epics/` (in brackets).
> Status and results live in the UAT report; this file is the contract.

Conventions: "captain" means captain or co-captain unless stated. Money is KWD. Every screen works
in English and Arabic, desktop and phone.

---

## 1. Player (P)

| ID | Story | Acceptance criteria |
|---|---|---|
| P-01 [E1 US-1.1] | As a new player I sign up with my phone number. | Enter a GCC number → a 6-digit code is sent (shown on screen in pilot mode until SMS is live) → wrong code refused, 5 tries max, code expires in 10 min → correct code signs me in. |
| P-02 [E1 US-1.2] | As a new player I complete my profile before using the app. | Name, username (unique, URL-safe), country, city, at least one game → I land on Home as myself. Until done, every screen sends me back to finish my profile. |
| P-03 [E1] | As a player I sign out and sign back in with the same number. | Sign out ends the session; signing in again with the same number returns the same profile, no duplicate. |
| P-04 [E1 US-1.4] | As a player I edit my profile. | Change name, bio, city, games, "open to team invites"; changes show on my public profile. |
| P-05 [E1 US-1.5] | As anyone I view a player's public profile. | Profile shows name, city, games, teams. |
| P-06 [E2 US-2.3] | As a player I accept or decline a team invitation. | Invitations appear in my notifications and on my profile page; accept → I'm on the roster as starter; decline → invitation gone, captain notified. |
| P-07 [E2 US-2.6] | As a player I leave a team. | I'm off the roster; a captain can't leave while they're the only captain (must transfer first). |
| P-08 [P-1] | As a player I see my notifications. | Bell in the top bar with unread count; list shows newest first with links; opening marks them read. |
| P-09 [P-4] | As a player I use the app in Arabic. | Language switch keeps me on the same page, right-to-left layout, no English leftovers. |

## 2. Team captain (T)

| ID | Story | Acceptance criteria |
|---|---|---|
| T-01 [E2 US-2.1] | As a player I create a team and become its captain. | Unique name and URL, tag, country, games. |
| T-02 [E2 US-2.2] | As a captain I invite players by username. | Invitee notified; pending invites listed on the team page; I can cancel one; can't invite someone already on the team or not open to invites. |
| T-03 [E2 US-2.4] | As a captain I manage my roster. | Promote a member to co-captain or demote; remove a member (they're notified). |
| T-04 [E2 US-2.5] | As a captain I transfer captaincy. | New captain has full rights; I become co-captain. |
| T-05 [E2 US-2.7] | As a captain I edit or disband my team. | Edit bio, city, recruiting flag; disbanding removes it from lists and ends open entries. |
| T-06 [E6] | As a captain I challenge a team and agree terms. | Challenge → counter (max 5) → accept → match created; both captains notified at each step. |
| T-07 [E4 US-4.1/4.4] | As a captain I book a venue slot. | Only inside the venue's opening hours, within seat capacity; pay now with a voucher or hold as pending. |
| T-08 [E4 US-4.6] | As a captain I cancel a booking. | Allowed until the venue's cancellation window; a voucher payment goes back to the voucher; venue notified. |
| T-09 [TM-2] | As a captain I register for a tournament, pay the entry and withdraw. | Eligibility (game, roster size, open registration); entry fee payable by voucher; withdrawal refunds. |

## 3. Venue owner (V)

| ID | Story | Acceptance criteria |
|---|---|---|
| V-01 [E3 US-3.1] | As a venue owner I register my venue. | From a new account: business name, venue name, city, address, contact phone, games with seat counts, hourly price per seat, opening hours, cancellation window → application submitted, status "Under review", Beat'Em All notified. |
| V-02 [E3 US-3.3] | As a venue owner I see my application status. | "Under review", "Live" or "Rejected" with the reason. Not bookable until approved. |
| V-03 [E3 US-3.2] | As a venue owner I edit my venue. | Details, price, games and seats, opening hours, cancellation window, "accepting bookings" switch. Changes apply to new bookings. |
| V-04 [E3 US-3.6] | As a venue owner I see my bookings dashboard. | Upcoming and past bookings, today's list, totals: bookings, seat-hours, confirmed revenue. |
| V-05 [E4 US-4.7] | As a venue owner I check a team in, and mark it completed or a no-show. | Status changes are shown to the team. |
| V-06 [E4] | As a venue owner I cancel a booking with a reason. | Team notified; voucher payment refunded. |
| V-07 [vouchers] | As a venue owner I issue vouchers valid at my venue. | Already built (round 2). |

## 4. Tournament manager (M)

| ID | Story | Acceptance criteria |
|---|---|---|
| M-01 [ORG-1] | As an organiser I apply for an organisation account. | From a new account: organisation name, type (community or brand), country, contact → "Under review"; after approval I'm its owner. |
| M-02 [TM-1 US-TM1.1] | As an organiser I create a tournament. | Name, game, format (single elimination), team size, max teams, entry fee, prize pool, start date, description, rules → saved as a draft visible only to my organisation. |
| M-03 [TM-1] | As an organiser I publish and open registration, then close it. | Draft → registration open (public, teams can enter) → registration closed. |
| M-04 [TM-2 US-TM2.8] | As an organiser I manage entries. | See every entry with status and payment; disqualify with a reason or reinstate; teams notified. |
| M-05 [TM-2 US-TM2.9] | As an organiser I check teams in. | Mark confirmed teams checked in; only checked-in teams are seeded (or all confirmed if nobody was checked in). |
| M-06 [TM-3 US-TM3.1] | As an organiser I generate the bracket and start the event. | Single elimination, seeds by check-in order or random, byes for non-power-of-two fields; round-1 matches created; teams notified; public bracket on the tournament page. |
| M-07 [TM-4 US-TM4.3] | As an organiser I record match results. | Score for each side; winner advances automatically; next match created when both teams are known. |
| M-08 [TM-4 / FED-1] | As an organiser I complete the tournament. | Final standings (1st, 2nd, 3rd–4th); federation events with ranking points award them automatically; teams notified. |
| M-09 [TM-1] | As an organiser I cancel a tournament. | Entries withdrawn with voucher refunds; teams notified. |

## 5. Beat'Em All operations (A)

| ID | Story | Acceptance criteria |
|---|---|---|
| A-01 [ORG-1 / E3 verification] | As Beat'Em All staff I review applications. | Queue of pending venues and organisations; approve (goes live, applicant notified) or reject with a reason. |
| A-02 | As Beat'Em All staff I see the platform at a glance. | Counts of players, teams, venues, organisations, bookings, tournaments. |

---

## Out of this pilot (needs a provider or a later phase)

Real SMS delivery of codes (Unifonic credentials), card payments and split payments (Tap), push /
SMS / WhatsApp / email notifications, double elimination and round robin, team-reported match
results with disputes, civil ID verification, geo search.
