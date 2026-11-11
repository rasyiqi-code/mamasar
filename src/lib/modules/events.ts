import { and, asc, eq, getTableColumns, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp, slugify } from '../utils';
import type { EventItem } from './types';

type EventRow = typeof schema.events.$inferSelect & { zone_name: string; zone_slug: string };

function toEventItem(row: EventRow): EventItem {
  return {
    id: row.id,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    title: row.title,
    slug: row.slug,
    organizer: row.organizer,
    event_date: row.event_date.toISOString(),
    time_description: row.time_description,
    location_name: row.location_name,
    location_address: row.location_address ?? undefined,
    estimated_attendance: row.estimated_attendance ?? 0,
    consumption_needed: row.consumption_needed ?? undefined,
    allow_stalls: row.allow_stalls ?? 1,
    coordinator_name: row.coordinator_name ?? undefined,
    coordinator_phone: row.coordinator_phone,
    created_at: row.created_at!.toISOString(),
  };
}

function eventSelect() {
  return getDb()
    .select({
      ...getTableColumns(schema.events),
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.events)
    .innerJoin(schema.zones, eq(schema.events.zone_id, schema.zones.id));
}

export async function getEvents(options?: { zoneSlug?: string }): Promise<EventItem[]> {
  const conditions: SQL[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  const rows = await eventSelect()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(schema.events.event_date), asc(schema.events.id));
  return rows.map(toEventItem);
}

export async function getEventBySlug(slug: string): Promise<EventItem | undefined> {
  const [row] = await eventSelect().where(eq(schema.events.slug, slug));
  return row ? toEventItem(row) : undefined;
}

export interface EventInput {
  title: string;
  organizer: string;
  zoneId: number;
  eventDate: Date;
  timeDescription: string;
  locationName: string;
  locationAddress?: string;
  estimatedAttendance: number;
  consumptionNeeded?: string;
  allowStalls: boolean;
  coordinatorName?: string;
  coordinatorPhone: string;
}

export async function createEvent(data: EventInput): Promise<{ id: number; slug: string }> {
  const cleanPhone = formatPhoneForWhatsApp(data.coordinatorPhone);
  const uniqueSlug = `${slugify(data.title)}-${Date.now().toString(36)}`;

  const [row] = await getDb()
    .insert(schema.events)
    .values({
      zone_id: data.zoneId,
      title: data.title,
      slug: uniqueSlug,
      organizer: data.organizer,
      event_date: data.eventDate,
      time_description: data.timeDescription,
      location_name: data.locationName,
      location_address: data.locationAddress || '',
      estimated_attendance: data.estimatedAttendance,
      consumption_needed: data.consumptionNeeded || '',
      allow_stalls: data.allowStalls ? 1 : 0,
      coordinator_name: data.coordinatorName || '',
      coordinator_phone: cleanPhone,
    })
    .returning({ id: schema.events.id });

  return { id: row.id, slug: uniqueSlug };
}

export async function updateEvent(eventId: number, data: EventInput): Promise<boolean> {
  const cleanPhone = formatPhoneForWhatsApp(data.coordinatorPhone);

  const rows = await getDb()
    .update(schema.events)
    .set({
      zone_id: data.zoneId,
      title: data.title,
      organizer: data.organizer,
      event_date: data.eventDate,
      time_description: data.timeDescription,
      location_name: data.locationName,
      location_address: data.locationAddress || '',
      estimated_attendance: data.estimatedAttendance,
      consumption_needed: data.consumptionNeeded || '',
      allow_stalls: data.allowStalls ? 1 : 0,
      coordinator_name: data.coordinatorName || '',
      coordinator_phone: cleanPhone,
    })
    .where(eq(schema.events.id, eventId))
    .returning({ id: schema.events.id });
  return rows.length > 0;
}

export async function deleteEvent(eventId: number): Promise<boolean> {
  const rows = await getDb()
    .delete(schema.events)
    .where(eq(schema.events.id, eventId))
    .returning({ id: schema.events.id });
  return rows.length > 0;
}
