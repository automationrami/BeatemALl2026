// Removes ONLY test data. Test data is:
//   - accounts with phone numbers in the reserved test range +965 40xx xxxx (and their OTP rows)
//   - organisations named 'UAT %' (venues, tournaments, vouchers, rankings under them)
//   - teams with slug 'uat-%'; challenges/bookings tagged 'UAT '; vouchers 'UAT-%'
//   - Sandstorm's entry in the Zain cup (made only by tests)
//   - notifications that mention UAT, and demo-persona roster changes made by tests (see below)
// Voucher balances are recomputed from remaining redemptions afterwards.
// Run from packages/db:  node cleanup-e2e.tmp.mjs [--dry]
import 'dotenv/config';
import postgres from 'postgres';

const dry = process.argv.includes('--dry');
const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, { prepare: false, max: 1 });
const ids = (rows) => rows.map((r) => r.id);
try {
  const users = ids(await sql`select id from users where phone_number like '+96540%'`);
  const players = ids(await sql`select id from players where user_id = any(${users})`);
  const orgs = ids(await sql`select id from organizations where name like 'UAT %'`);
  const teams = ids(await sql`select id from teams where slug like 'uat-%'`);
  const tournaments = ids(await sql`select id from tournaments where organization_id = any(${orgs}) or name like 'UAT %'`);
  const venues = ids(await sql`select id from venues where organization_id = any(${orgs}) or name like 'UAT %'`);
  const challenges = ids(await sql`
    select id from challenges where message like 'UAT %'
      or id in (select challenge_id from challenge_negotiations where message like 'UAT %')
      or challenger_team_id = any(${teams}) or challenged_team_id = any(${teams})`);
  const bookings = ids(await sql`
    select id from venue_bookings where notes like 'UAT %' or booked_by_team_id = any(${teams})
      or venue_id = any(${venues}) or booked_by_user_id = any(${users})`);
  const registrations = ids(await sql`
    select r.id from tournament_registrations r join tournaments t on t.id = r.tournament_id join teams tm on tm.id = r.team_id
    where r.team_id = any(${teams}) or r.tournament_id = any(${tournaments}) or r.registered_by_user_id = any(${users})
       or (t.slug = 'zain-dxe-eafc-cup' and tm.slug = 'sandstorm')`);
  const counts = {
    users: users.length, orgs: orgs.length, teams: teams.length, tournaments: tournaments.length, venues: venues.length,
    challenges: challenges.length, bookings: bookings.length, registrations: registrations.length,
    vouchers: (await sql`select count(*)::int n from vouchers where code like 'UAT-%' or issuer_organization_id = any(${orgs})`)[0].n,
    notifications: (await sql`select count(*)::int n from notifications where recipient_user_id = any(${users}) or data::text ilike '%uat%' or title ilike '%uat%'`)[0].n,
  };
  console.log(dry ? 'DRY' : 'DELETE', JSON.stringify(counts));
  if (!dry) {
    await sql.begin(async (tx) => {
      await tx`delete from notifications where recipient_user_id = any(${users}) or data::text ilike '%uat%' or title ilike '%uat%'`;
      await tx`delete from ranking_points where tournament_id = any(${tournaments})`;
      await tx`delete from matches where challenge_id = any(${challenges}) or tournament_id = any(${tournaments}) or home_team_id = any(${teams}) or away_team_id = any(${teams})`;
      await tx`delete from challenges where id = any(${challenges})`;
      await tx`delete from venue_bookings where id = any(${bookings})`;
      await tx`delete from tournament_registrations where id = any(${registrations})`;
      await tx`delete from tournaments where id = any(${tournaments})`;
      await tx`delete from vouchers where code like 'UAT-%' or issuer_organization_id = any(${orgs})`;
      await tx`delete from voucher_redemptions where redeemed_by_user_id = any(${users})`;
      await tx`delete from venues where id = any(${venues})`;
      await tx`delete from teams where id = any(${teams})`;
      await tx`delete from organizations where id = any(${orgs})`;
      await tx`delete from auth_otps where phone_number like '+96540%'`;
      await tx`delete from users where id = any(${users})`;
      // Tests invite/promote demo personas on demo teams; put seeded rosters back.
      await tx`delete from team_members tm using teams t where t.id = tm.team_id and t.slug in ('sandstorm','falcon-squad','desert-dragons')
                 and tm.player_id not in (select id from players where slug in ('khaled-al-mutairi','sara-al-awadhi'))`;
      await tx`update vouchers v set
          redemption_count = (select count(*) from voucher_redemptions r where r.voucher_id = v.id),
          balance_kwd = case when v.kind = 'stored_value'
            then v.value_kwd - coalesce((select sum(amount_kwd) from voucher_redemptions r where r.voucher_id = v.id), 0)
            else null end,
          updated_at = now()`;
    });
    console.log('cleanup done');
  }
} finally {
  await sql.end({ timeout: 5 });
}
