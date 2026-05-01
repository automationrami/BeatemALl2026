/** Organization queries — public read for the org profile page. */

import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { organizations, type OrganizationRow } from '../schema/organizations';

export async function loadOrganizationBySlug(slug: string): Promise<OrganizationRow | null> {
  const db = getDb();
  const rows = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  const row = rows[0];
  if (!row || !row.isPublic) return null;
  return row;
}
