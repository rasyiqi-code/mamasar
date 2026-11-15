import { and, asc, desc, eq, getTableColumns, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp, slugify } from '../utils';
import type { EventItem, EventOrderItem } from './types';

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

export async function createEventOrder(data: {
  eventId: number;
  umkmId?: number | null;
  type: 'consumption' | 'stall';
  senderName: string;
  senderPhone: string;
  itemDescription: string;
  quantityOrSlots?: string;
}): Promise<{ id: number }> {
  const cleanPhone = formatPhoneForWhatsApp(data.senderPhone);
  const [row] = await getDb()
    .insert(schema.eventOrders)
    .values({
      event_id: data.eventId,
      umkm_id: data.umkmId ?? null,
      type: data.type,
      sender_name: data.senderName.trim(),
      sender_phone: cleanPhone,
      item_description: data.itemDescription.trim(),
      quantity_or_slots: data.quantityOrSlots?.trim() || null,
      status: 'pending',
    })
    .returning({ id: schema.eventOrders.id });
  return row;
}

export async function getEventOrders(options?: { eventId?: number }): Promise<EventOrderItem[]> {
  const query = getDb()
    .select({
      ...getTableColumns(schema.eventOrders),
      event_title: schema.events.title,
      zone_id: schema.events.zone_id,
      umkm_name: schema.umkm.name,
    })
    .from(schema.eventOrders)
    .innerJoin(schema.events, eq(schema.eventOrders.event_id, schema.events.id))
    .leftJoin(schema.umkm, eq(schema.eventOrders.umkm_id, schema.umkm.id));

  const rows = await (options?.eventId ? query.where(eq(schema.eventOrders.event_id, options.eventId)) : query)
    .orderBy(desc(schema.eventOrders.created_at), desc(schema.eventOrders.id));

  return rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    event_title: r.event_title,
    zone_id: r.zone_id,
    umkm_id: r.umkm_id,
    umkm_name: r.umkm_name,
    type: r.type === 'stall' ? 'stall' : 'consumption',
    sender_name: r.sender_name,
    sender_phone: r.sender_phone,
    item_description: r.item_description,
    quantity_or_slots: r.quantity_or_slots ?? undefined,
    status: (r.status as EventOrderItem['status']) || 'pending',
    created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  }));
}

export async function getEventOrderById(orderId: number): Promise<{ id: number; event_id: number; zone_id: number } | undefined> {
  const [row] = await getDb()
    .select({
      id: schema.eventOrders.id,
      event_id: schema.eventOrders.event_id,
      zone_id: schema.events.zone_id,
    })
    .from(schema.eventOrders)
    .innerJoin(schema.events, eq(schema.eventOrders.event_id, schema.events.id))
    .where(eq(schema.eventOrders.id, orderId))
    .limit(1);
  return row;
}

export async function getEventById(eventId: number): Promise<EventItem | undefined> {
  const [row] = await eventSelect().where(eq(schema.events.id, eventId));
  return row ? toEventItem(row) : undefined;
}

export async function updateEventOrderStatus(
  orderId: number,
  status: 'accepted' | 'rejected'
): Promise<boolean> {
  const rows = await getDb()
    .update(schema.eventOrders)
    .set({ status })
    .where(eq(schema.eventOrders.id, orderId))
    .returning({ id: schema.eventOrders.id });
  return rows.length > 0;
}
