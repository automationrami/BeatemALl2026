/**
 * Organization memberships + demo vouchers.
 *
 * Memberships give the organiser personas something to manage: Ahmad runs KEC, Omar owns
 * DXE Fuel (and its Riyadh venue), Fatima runs Zain Kuwait's esports sponsorship.
 *
 * Vouchers cover the two kinds and every scope so the payment flow can be exercised
 * without Tap Payments. `PILOT-UNLIMITED` pays any booking or entry fee, any number of
 * times, for the length of the pilot.
 */

export type MembershipSeed = {
  personaSlug: string;
  organizationSlug: string;
  role: 'owner' | 'admin' | 'organizer' | 'moderator' | 'viewer';
};

export const MEMBERSHIP_SEEDS: MembershipSeed[] = [
  { personaSlug: 'ahmad-al-rashed', organizationSlug: 'kec', role: 'admin' },
  { personaSlug: 'omar-al-saud', organizationSlug: 'dxe-fuel-org', role: 'owner' },
  { personaSlug: 'fatima-al-mansour', organizationSlug: 'zain-kuwait', role: 'admin' },
];

export type VoucherSeed = {
  code: string;
  issuerSlug: string;
  kind: 'unlimited' | 'stored_value';
  valueKwd: number | null;
  teamSlug: string | null;
  venueSlug: string | null;
  maxRedemptions: number | null;
  expiresAt: string | null;
  note: string;
};

export const VOUCHER_SEEDS: VoucherSeed[] = [
  {
    code: 'PILOT-UNLIMITED',
    issuerSlug: 'beat-em-all-admin',
    kind: 'unlimited',
    valueKwd: null,
    teamSlug: null,
    venueSlug: null,
    maxRedemptions: null,
    expiresAt: '2027-03-31T20:59:59Z',
    note: 'Pilot voucher: book as much as you want until payments go live.',
  },
  {
    code: 'KEC-SANDSTORM',
    issuerSlug: 'kec',
    kind: 'unlimited',
    valueKwd: null,
    teamSlug: 'sandstorm',
    venueSlug: null,
    maxRedemptions: null,
    expiresAt: '2026-12-31T20:59:59Z',
    note: "KEC Spring '26 champions: venue time and entries on us.",
  },
  {
    code: 'ZAIN-FALCON-50',
    issuerSlug: 'zain-kuwait',
    kind: 'stored_value',
    valueKwd: 50,
    teamSlug: 'falcon-squad',
    venueSlug: null,
    maxRedemptions: null,
    expiresAt: '2026-12-31T20:59:59Z',
    note: 'Zain Kuwait team support: KWD 50 of practice time.',
  },
  {
    code: 'DXE-FUEL-25',
    issuerSlug: 'dxe-fuel-org',
    kind: 'stored_value',
    valueKwd: 25,
    teamSlug: null,
    venueSlug: 'dxe-fuel-riyadh',
    maxRedemptions: 5,
    expiresAt: '2026-12-31T20:59:59Z',
    note: 'Opening offer at DXE Fuel Riyadh.',
  },
];
