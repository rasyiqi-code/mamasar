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
    .$type<'superadmin' | 'pengurus' | 'petugas' | 'warga'>()
    .notNull()
    .default('warga'),
  agent_status: varchar('agent_status', { length: 20 })
    .$type<'none' | 'pending' | 'active' | 'rejected'>()
    .notNull()
    .default('none'),
  assigned_zone_id: integer('assigned_zone_id').references(() => zones.id),
  agent_org: varchar('agent_org', { length: 255 }),
  agent_phone: varchar('agent_phone', { length: 50 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const umkm = pgTable('umkm', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  created_by_user_id: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  zone_id: integer('zone_id')
    .notNull()
    .references(() => zones.id),
  is_verified: integer('is_verified').default(1),
  address: text('address'),
  claimed_at: timestamp('claimed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  umkm_id: integer('umkm_id')
    .notNull()
    .references(() => umkm.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  price: integer('price').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  image_url: text('image_url').notNull(),
  description: text('description'),
  views: integer('views').default(0),
  is_sold_out: integer('is_sold_out').default(0),
  shopee_url: text('shopee_url'),
  bumped_at: timestamp('bumped_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

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
  (t) => [index('idx_cashbook_user').on(t.user_id, t.transaction_date.desc())]
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
