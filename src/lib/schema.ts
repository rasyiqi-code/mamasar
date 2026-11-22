import { sql } from 'drizzle-orm';
import { pgTable, index, uniqueIndex, varchar, text, integer, timestamp, date, serial } from 'drizzle-orm/pg-core';

/**
 * Drizzle mirror of the Neon PostgreSQL tables created by
 * scripts/migrate-neon.js. Property names match the database columns
 * (snake_case) so selected rows keep the field names the app already
 * uses. Keep this file in sync when the DDL in migrate-neon.js changes.
 */

export const zones = pgTable('zones', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  google_id: varchar('google_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar_url: text('avatar_url'),
  role: varchar('role', { length: 20 })
    .$type<'pcnu' | 'mwcnu' | 'ranting' | 'warga'>()
    .notNull()
    .default('warga'),
  agent_status: varchar('agent_status', { length: 20 })
    .$type<'none' | 'pending' | 'pending_mwcnu' | 'active' | 'rejected'>()
    .notNull()
    .default('none'),
  assigned_zone_id: integer('assigned_zone_id').references(() => zones.id),
  agent_ranting: varchar('agent_ranting', { length: 255 }),
  agent_org: varchar('agent_org', { length: 255 }),
  agent_phone: varchar('agent_phone', { length: 50 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('idx_sessions_user').on(t.user_id),
    index('idx_sessions_expires').on(t.expires_at),
  ]
);

export const umkm = pgTable(
  'umkm',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    created_by_user_id: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique(),
    logo_url: text('logo_url'),
    phone: varchar('phone', { length: 50 }).notNull(),
    zone_id: integer('zone_id')
      .notNull()
      .references(() => zones.id),
    ranting: varchar('ranting', { length: 255 }),
    is_verified: integer('is_verified').default(0),
    verified_by_user_id: integer('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    verified_at: timestamp('verified_at', { withTimezone: true }),
    verification_note: text('verification_note'),
    address: text('address'),
    nib: varchar('nib', { length: 100 }),
    halal_cert: varchar('halal_cert', { length: 100 }),
    pirt: varchar('pirt', { length: 100 }),
    bpom: varchar('bpom', { length: 100 }),
    other_legalities: text('other_legalities'),
    maps_url: text('maps_url'),
    qris_image_url: text('qris_image_url'),
    order_modes: text('order_modes').default('ready_stock'),
    daily_capacity: varchar('daily_capacity', { length: 100 }),
    order_lead_time_days: integer('order_lead_time_days').default(1),
    delivery_coverage: varchar('delivery_coverage', { length: 50 }).default('local_village'),
    max_bulk_order: integer('max_bulk_order'),
    shelf_life_notes: varchar('shelf_life_notes', { length: 150 }),
    verification_status: varchar('verification_status', { length: 30 }).default('unverified'),
    verification_submitted_at: timestamp('verification_submitted_at', { withTimezone: true }),
    bump_credits: integer('bump_credits').default(3),
    claimed_at: timestamp('claimed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_umkm_user_id')
      .on(t.user_id)
      .where(sql`${t.user_id} IS NOT NULL`),
    index('idx_umkm_zone').on(t.zone_id),
  ]
);

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    umkm_id: integer('umkm_id')
      .notNull()
      .references(() => umkm.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    price: integer('price').notNull(),
    original_price: integer('original_price'),
    category: varchar('category', { length: 100 }).notNull(),
    image_url: text('image_url').notNull(),
    gallery_images: text('gallery_images'),
    description: text('description'),
    views: integer('views').default(0),
    is_sold_out: integer('is_sold_out').default(0),
    stock_status: varchar('stock_status', { length: 50 }).default('ready'),
    production_capacity: varchar('production_capacity', { length: 255 }),
    order_lead_time_days: integer('order_lead_time_days').default(0),
    min_order: integer('min_order').default(1),
    max_order: integer('max_order'),
    delivery_coverage: varchar('delivery_coverage', { length: 50 }).default('all_sumenep'),
    shelf_life_notes: varchar('shelf_life_notes', { length: 150 }),
    shopee_url: text('shopee_url'),
    is_featured: integer('is_featured').default(0),
    featured_until: timestamp('featured_until', { withTimezone: true }),
    bumped_at: timestamp('bumped_at', { withTimezone: true }).defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_products_umkm').on(t.umkm_id),
    index('idx_products_category').on(t.category),
    index('idx_products_bumped').on(t.bumped_at.desc(), t.created_at.desc()),
    index('idx_products_featured').on(t.is_featured, t.featured_until),
  ]
);

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  category: varchar('category', { length: 100 }).notNull(),
  image_url: text('image_url').notNull(),
  summary: text('summary').notNull(),
  content: text('content'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const caseStudies = pgTable('case_studies', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  channel_name: varchar('channel_name', { length: 100 }).notNull(),
  tag: varchar('tag', { length: 100 }).notNull(),
  duration: varchar('duration', { length: 50 }).notNull().default('15 Menit'),
  video_url: text('video_url').notNull(),
  thumbnail_url: text('thumbnail_url').notNull(),
  practice_summary: text('practice_summary'),
  opportunity_summary: text('opportunity_summary'),
  sort_order: integer('sort_order').default(0),
  is_active: integer('is_active').default(1),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  zone_id: integer('zone_id')
    .notNull()
    .references(() => zones.id),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  organizer: varchar('organizer', { length: 255 }).notNull(),
  event_date: timestamp('event_date', { withTimezone: true }).notNull(),
  time_description: varchar('time_description', { length: 255 }).notNull(),
  location_name: varchar('location_name', { length: 255 }).notNull(),
  location_address: text('location_address'),
  estimated_attendance: integer('estimated_attendance').default(0),
  consumption_needed: text('consumption_needed'),
  allow_stalls: integer('allow_stalls').default(1),
  coordinator_name: varchar('coordinator_name', { length: 255 }),
  coordinator_phone: varchar('coordinator_phone', { length: 50 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const cashbook = pgTable(
  'cashbook',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    umkm_id: integer('umkm_id').references(() => umkm.id, { onDelete: 'cascade' }),
    reference_type: varchar('reference_type', { length: 30 }),
    reference_id: integer('reference_id'),
    title: varchar('title', { length: 255 }).notNull(),
    amount: integer('amount').notNull(),
    type: varchar('type', { length: 20 })
      .$type<'income' | 'expense'>()
      .notNull()
      .default('income'),
    category: varchar('category', { length: 100 }).default('Penjualan'),
    notes: text('notes'),
    transaction_date: date('transaction_date').default(sql`CURRENT_DATE`),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_cashbook_user').on(t.user_id, t.transaction_date.desc()),
    index('idx_cashbook_umkm').on(t.umkm_id, t.transaction_date.desc()),
  ]
);

export const favorites = pgTable(
  'favorites',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    product_id: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_favorites_user').on(t.user_id),
    uniqueIndex('idx_favorites_user_product').on(t.user_id, t.product_id),
  ]
);

export const adPromotions = pgTable(
  'ad_promotions',
  {
    id: serial('id').primaryKey(),
    umkm_id: integer('umkm_id')
      .notNull()
      .references(() => umkm.id, { onDelete: 'cascade' }),
    product_id: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(), // 'featured_7d' | 'featured_14d' | 'featured_30d' | 'bump_pack_5' | 'bump_pack_12'
    amount: integer('amount').notNull(),
    payment_method: varchar('payment_method', { length: 50 }).notNull().default('qris_manual'),
    proof_image_url: text('proof_image_url'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'active' | 'rejected' | 'expired'
    notes: text('notes'),
    starts_at: timestamp('starts_at', { withTimezone: true }),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    reviewed_by_user_id: integer('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_ad_promotions_umkm').on(t.umkm_id),
    index('idx_ad_promotions_status').on(t.status),
  ]
);

export const bumpLedger = pgTable(
  'bump_ledger',
  {
    id: serial('id').primaryKey(),
    umkm_id: integer('umkm_id')
      .notNull()
      .references(() => umkm.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(), // 'purchase' | 'bump' | 'welcome_bonus' | 'admin_adjust'
    reference_id: integer('reference_id'),
    balance_after: integer('balance_after').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_bump_ledger_umkm').on(t.umkm_id, t.created_at.desc())]
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    actor_user_id: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 80 }).notNull(),
    target_type: varchar('target_type', { length: 40 }).notNull(),
    target_id: integer('target_id'),
    metadata_json: text('metadata_json'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_audit_log_actor').on(t.actor_user_id, t.created_at.desc())]
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    link: varchar('link', { length: 255 }),
    is_read: integer('is_read').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_notifications_user').on(t.user_id, t.is_read, t.created_at.desc())]
);

export const eventOrders = pgTable(
  'event_orders',
  {
    id: serial('id').primaryKey(),
    event_id: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    umkm_id: integer('umkm_id').references(() => umkm.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 20 }).notNull().default('consumption'),
    sender_name: varchar('sender_name', { length: 255 }).notNull(),
    sender_phone: varchar('sender_phone', { length: 50 }).notNull(),
    item_description: text('item_description').notNull(),
    quantity_or_slots: varchar('quantity_or_slots', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_event_orders_event').on(t.event_id, t.created_at.desc())]
);
