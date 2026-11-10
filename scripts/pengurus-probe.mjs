/**
 * Probe runtime untuk uji halaman /pengurus dan endpoint verifikasi via HTTP:
 * 1. setup — buat user pengurus (role dipromosi via SQL), sesi, dan satu
 *    toko orphan pending sebagai bahan verifikasi.
 * 2. teardown — hapus semua baris probe (via pola email/nama toko).
 * Jalankan: set -a && . ./.env && set +a && npx tsx scripts/pengurus-probe.mjs <setup|teardown> <stamp>
 */
import * as db from '../src/lib/db.ts';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/schema.ts';
import { eq, like, or } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

const PROBE_PHONE = '0813999000222';

const mode = process.argv[2];
const stamp = process.argv[3];
if (!['setup', 'teardown'].includes(mode || '') || !stamp) {
  console.error('Pemakaian: pengurus-probe.mjs <setup|teardown> <stamp>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error('DATABASE_URL missing'); process.exit(1); }
const raw = drizzle(neon(databaseUrl), { schema });

if (mode === 'setup') {
  const zones = await db.getAllZones();
  const orphan = await db.createUMKMAndProduct({
    umkmName: `Toko Yatim PR ${stamp}`,
    phone: PROBE_PHONE,
    zoneId: zones[4].id,
    productName: `Peyek RT ${stamp}`,
    price: 8000,
    category: 'Makanan & Minuman',
    imageUrl: 'https://example.com/pr.jpg',
  });
  const user = await db.findOrCreateUserByGoogle({
    googleId: `pengurusprobe-${stamp}`,
    email: `pengurusprobe-${stamp}@example.com`,
    name: 'Pengurus Probe',
  });
  // Promosi manual, persis seperti yang didokumentasikan di DOCS/DATABASE.md.
  await raw.update(schema.users).set({ role: 'pengurus' }).where(eq(schema.users.id, user.id));
  const session = await db.getOrCreateSessionForUser(user.id);
  console.log(JSON.stringify({ orphanUmkmId: orphan.umkmId, session, userId: user.id }));
} else {
  // Hapus toko via nomor WA probe ATAU kepemilikan user probe, lalu user-nya.
  const probeUsers = await raw.select({ id: schema.users.id }).from(schema.users)
    .where(like(schema.users.email, 'pengurusprobe%@example.com'));
  const ids = probeUsers.map((u) => u.id);
  const stores = await raw.select({ id: schema.umkm.id }).from(schema.umkm)
    .where(or(eq(schema.umkm.phone, '62813999000222'), ...ids.map((id) => eq(schema.umkm.user_id, id))));
  for (const s of stores) await raw.delete(schema.umkm).where(eq(schema.umkm.id, s.id)).returning({ id: schema.umkm.id });
  const deletedUsers = [];
  for (const id of ids) {
    const d = await raw.delete(schema.users).where(eq(schema.users.id, id)).returning({ id: schema.users.id });
    deletedUsers.push(...d);
  }
  const leftUsers = await raw.select({ id: schema.users.id }).from(schema.users)
    .where(like(schema.users.email, 'pengurusprobe%@example.com'));
  const leftStores = await raw.select({ id: schema.umkm.id }).from(schema.umkm).where(eq(schema.umkm.phone, '62813999000222'));
  console.log(JSON.stringify({ cleanedStores: stores.length, deletedUsers: deletedUsers.length, leftoverUsers: leftUsers.map((u) => u.id), leftoverStores: leftStores.length }));
  if (leftUsers.length || leftStores.length) process.exit(1);
}
