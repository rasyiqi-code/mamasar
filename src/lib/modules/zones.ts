import { asc, eq, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { Zone } from './types';

export async function getAllZones(): Promise<(Zone & { count?: number })[]> {
  const zoneRows = await getDb().select().from(schema.zones).orderBy(asc(schema.zones.name));

  const countRows = await getDb()
    .select({ zone_id: schema.umkm.zone_id, count: sql<number>`count(${schema.products.id})::int` })
    .from(schema.products)
    .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
    .groupBy(schema.umkm.zone_id);

  const countMap = new Map(countRows.map((c) => [c.zone_id, c.count]));

  return zoneRows.map((z) => ({
    ...z,
    count: countMap.get(z.id) ?? 0,
  }));
}
