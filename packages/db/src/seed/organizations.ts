/**
 * Organization seeds.
 *
 * KEC = `Organization #1` per DOMAIN_MODEL.md §3.1. Beat'Em All has its own admin
 * Organization too (used for venue verification, dispute resolution). Brand-tier orgs
 * (Zain Kuwait) seeded as dummies; Venue-tier orgs (DXE Fuel, GG Arena, etc.) seeded
 * so each venue has an org owner.
 */

import type { OrganizationInsert } from '../schema/organizations';

export type OrgSeed = Omit<OrganizationInsert, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export const ORGANIZATION_SEEDS: OrgSeed[] = [
  {
    slug: 'kec',
    name: 'Kuwait Esports Club',
    tier: 'federation',
    countryCode: 'KW',
    description:
      'The state-recognized esports federation of Kuwait. Sanctions tournaments, awards official ranking points, runs national-team selection. Operates under Law 87/2017.',
    accentColor: '#22D3EE',
    websiteUrl: 'https://kec.org.kw',
    contactEmail: 'info@kec.org.kw',
    verificationStatus: 'verified',
    verifiedAt: new Date('2026-04-15T12:00:00Z'),
    isPublic: true,
  },
  {
    slug: 'beat-em-all-admin',
    name: "Beat'Em All",
    tier: 'community',
    countryCode: 'KW',
    description:
      'Platform admin organization. Owns venue verification, dispute resolution, audit log review.',
    accentColor: '#8B5CF6',
    verificationStatus: 'verified',
    verifiedAt: new Date('2026-04-15T12:00:00Z'),
    isPublic: false,
  },
  {
    slug: 'zain-kuwait',
    name: 'Zain Kuwait',
    tier: 'brand',
    countryCode: 'KW',
    description: "Kuwait's leading telco. Sponsors prize pools across the GCC.",
    accentColor: '#A78BFA',
    websiteUrl: 'https://www.zain.com',
    verificationStatus: 'verified',
    verifiedAt: new Date('2026-04-18T10:00:00Z'),
    isPublic: true,
  },
  {
    slug: 'gg-arena-org',
    name: 'GG Arena Holdings',
    tier: 'venue',
    countryCode: 'KW',
    accentColor: '#FB7185',
    verificationStatus: 'verified',
    verifiedAt: new Date('2026-04-20T10:00:00Z'),
    isPublic: true,
  },
  {
    slug: 'dxe-fuel-org',
    name: 'DXE Fuel',
    tier: 'venue',
    countryCode: 'KSA',
    accentColor: '#BEF264',
    verificationStatus: 'verified',
    verifiedAt: new Date('2026-04-20T10:00:00Z'),
    isPublic: true,
  },
];
