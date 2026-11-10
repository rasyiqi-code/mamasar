/**
 * Smoke test untuk src/lib/db.ts (Drizzle) terhadap DATABASE_URL.
 * Menjalankan seluruh fungsi baca dan siklus tulis (user → session →
 * UMKM → produk → kas), lalu membersihkan semua data probe di akhir.
 * Jalankan: set -a && . ./.env && set +a && npx tsx scripts/db-smoke.mjs
 */
import * as db from '../src/lib/db.ts';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/schema.ts';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

let pass = 0;
let fail = 0;
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.log(`FAIL  ${label} ${extra}`); }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error('DATABASE_URL missing'); process.exit(1); }
const raw = drizzle(neon(databaseUrl), { schema });

// ---------- READ PATHS ----------
const zones = await db.getAllZones();
check('getAllZones: 27 zones', zones.length === 27, `got ${zones.length}`);
check('getAllZones: count filled', zones.every((z) => typeof z.count === 'number'));

const allU = await db.getAllUMKM();
check('getAllUMKM: rows', allU.length > 0, `got ${allU.length}`);
check('getAllUMKM: product_count number', allU.every((u) => typeof u.product_count === 'number'));
check('getAllUMKM: sample_images array', Array.isArray(allU[0].sample_images));

const zoneSlug = zones[0].slug;
const filtered = await db.getAllUMKM({ zoneSlug });
check(`getAllUMKM zoneSlug=${zoneSlug}`, filtered.length <= allU.length && filtered.every((u) => u.zone_slug === zoneSlug));

const searched = await db.getAllUMKM({ search: allU[0].name.slice(0, 4) });
check('getAllUMKM search', searched.length > 0, `got ${searched.length}`);

const byId = await db.getUMKMById(1);
check('getUMKMById(1)', !!byId && Array.isArray(byId.products));
check('getUMKMById("abc") → undefined', (await db.getUMKMById('abc')) === undefined);

const products = await db.getProducts();
check('getProducts: rows', products.length > 0, `got ${products.length}`);
const p0 = products[0];
check('getProducts: created_at ISO string', typeof p0.created_at === 'string' && !isNaN(Date.parse(p0.created_at)), JSON.stringify(p0.created_at));
check('getProducts: zone_id number', typeof p0.zone_id === 'number');
check('getProducts: umkm_name string', typeof p0.umkm_name === 'string');

const byCat = await db.getProducts({ category: p0.category });
check(`getProducts category=${p0.category}`, byCat.length > 0 && byCat.every((p) => p.category === p0.category));
const byZone = await db.getProducts({ zoneSlug: p0.zone_slug });
check(`getProducts zoneSlug=${p0.zone_slug}`, byZone.every((p) => p.zone_slug === p0.zone_slug));
const bySearch = await db.getProducts({ search: p0.name.slice(0, 5) });
check('getProducts search', bySearch.length > 0);
const byPrice = await db.getProducts({ minPrice: p0.price, maxPrice: p0.price });
check('getProducts min/max price', byPrice.length > 0 && byPrice.every((x) => x.price === p0.price));
const asc = await db.getProducts({ sort: 'price_asc' });
check('getProducts sort price_asc', asc.length > 1 && asc[0].price <= asc[asc.length - 1].price);
const descP = await db.getProducts({ sort: 'price_desc' });
check('getProducts sort price_desc', descP.length > 1 && descP[0].price >= descP[descP.length - 1].price);

const bySlug = await db.getProductBySlug(p0.slug);
check('getProductBySlug', !!bySlug && bySlug.slug === p0.slug);
check('getProductBySlug unknown → undefined', (await db.getProductBySlug('tidak-ada-xyz')) === undefined);

const articles = await db.getArticles();
check('getArticles', articles.length > 0 && typeof articles[0].created_at === 'string');
check('getArticleBySlug', !!(await db.getArticleBySlug(articles[0].slug)));

const events = await db.getEvents();
check('getEvents', events.length > 0, `got ${events.length}`);
check('getEvents: event_date ISO string', typeof events[0].event_date === 'string' && !isNaN(Date.parse(events[0].event_date)), JSON.stringify(events[0].event_date));
check('getEvents: zone_name present', typeof events[0].zone_name === 'string');
const evFiltered = await db.getEvents({ zoneSlug: events[0].zone_slug });
check('getEvents zone filter', evFiltered.every((e) => e.zone_slug === events[0].zone_slug));
check('getEventBySlug', !!(await db.getEventBySlug(events[0].slug)));

// ---------- WRITE LIFECYCLE ----------
const stamp = Date.now().toString(36);
const gUser = await db.findOrCreateUserByGoogle({ googleId: `probe-${stamp}`, email: `probe-${stamp}@example.com`, name: 'Probe User' });
check('findOrCreateUserByGoogle create', gUser.id > 0);
check('findOrCreateUserByGoogle created_at ISO', typeof gUser.created_at === 'string');

const gUser2 = await db.findOrCreateUserByGoogle({ googleId: `probe-${stamp}`, email: `probe-${stamp}@example.com`, name: 'Probe Renamed' });
check('findOrCreateUserByGoogle reuse by google_id', gUser2.id === gUser.id && gUser2.name === 'Probe Renamed');

const sid = await db.getOrCreateSessionForUser(gUser.id);
const sid2 = await db.getOrCreateSessionForUser(gUser.id);
check('getOrCreateSessionForUser reuses', sid === sid2);

const ufs = await db.getUserFromSession(sid);
check('getUserFromSession', !!ufs && ufs.id === gUser.id && ufs.name === 'Probe Renamed');
check('getUserFromSession no umkm yet', ufs && ufs.umkm === undefined);
check('getUserFromSession bad id → null', (await db.getUserFromSession('sess_nope')) === null);

// expired session handling + purge
const expiredId = `sess_expired_${stamp}`;
await raw.insert(schema.sessions).values({ id: expiredId, user_id: gUser.id, expires_at: new Date(Date.now() - 1000) });
const purged = await db.purgeExpiredSessions();
check('purgeExpiredSessions removed expired', purged >= 1, `purged ${purged}`);
check('getUserFromSession expired → null', (await db.getUserFromSession(expiredId)) === null);

await db.updateUserProfile(gUser.id, { name: 'Probe Updated' });
const ufs2 = await db.getUserFromSession(sid);
check('updateUserProfile', ufs2?.name === 'Probe Updated');

const umkmId = await db.createUMKMForUser(gUser.id, { name: 'Toko Probe', phone: '081234567890', zoneId: zones[0].id, address: 'Jl. Probe' });
check('createUMKMForUser', umkmId > 0);
const umkmId2 = await db.createUMKMForUser(gUser.id, { name: 'Toko Probe 2', phone: '089876543210', zoneId: zones[1].id, address: 'Jl. Probe 2' });
check('createUMKMForUser updates existing', umkmId2 === umkmId);

const store = await db.getUMKMByUserId(gUser.id);
check('getUMKMByUserId', !!store && store.id === umkmId && store.name === 'Toko Probe 2' && Array.isArray(store.products));
check('createUMKMForUser → is_verified 0 (menunggu)', store?.is_verified === 0, JSON.stringify(store?.is_verified));

const added = await db.addProductToUMKM(umkmId, { name: 'Produk Probe', price: 12345, category: 'Makanan', imageUrl: 'https://example.com/x.jpg' });
check('addProductToUMKM', added.productId > 0 && added.slug.includes('produk-probe'));
const newProd = await db.getProductBySlug(added.slug);
check('new product visible + defaults', !!newProd && newProd.umkm_name === 'Toko Probe 2' && newProd.views === 0 && newProd.is_sold_out === 0);

check('bumpProduct', await db.bumpProduct(added.productId, umkmId));
check('bumpProduct wrong umkm → false', (await db.bumpProduct(added.productId, umkmId + 99999)) === false);
const afterBump = await db.getProductBySlug(added.slug);
check('bumped_at ISO after bump', typeof afterBump?.bumped_at === 'string' && afterBump.bumped_at.length > 0, JSON.stringify(afterBump?.bumped_at));

const t1 = await db.toggleProductStock(added.productId, umkmId);
const t2 = await db.toggleProductStock(added.productId, umkmId);
check('toggleProductStock flips', t1.success && t1.is_sold_out === 1 && t2.success && t2.is_sold_out === 0, JSON.stringify([t1, t2]));

const v1 = await db.incrementProductViews(added.slug);
const prodAfterView = await db.getProductBySlug(added.slug);
check('incrementProductViews', v1.success && prodAfterView?.views === 1, JSON.stringify(prodAfterView?.views));
check('incrementProductViews unknown slug', (await db.incrementProductViews('nope-xyz')).success === false);

const cb = await db.addCashbookEntry(gUser.id, { title: 'Penjualan Probe', amount: 50000, type: 'income' });
check('addCashbookEntry', cb.id > 0 && cb.type === 'income' && /^\d{4}-\d{2}-\d{2}$/.test(cb.transaction_date), JSON.stringify(cb.transaction_date));
const cb2 = await db.addCashbookEntry(gUser.id, { title: 'Modal Probe', amount: 10000, type: 'expense', transactionDate: '2026-01-05' });
const entries = await db.getCashbookEntries(gUser.id);
check('getCashbookEntries', entries.length === 2 && entries[0].id === cb.id && entries[1].id === cb2.id, JSON.stringify(entries.map((e) => e.transaction_date)));
check('getCashbookEntries transaction_date string', entries.every((e) => typeof e.transaction_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.transaction_date)));
const summary = await db.getCashbookSummary(gUser.id);
check('getCashbookSummary', summary.totalIncome === 50000 && summary.totalExpense === 10000 && summary.balance === 40000, JSON.stringify(summary));
check('deleteCashbookEntry', await db.deleteCashbookEntry(cb2.id, gUser.id));
check('deleteCashbookEntry wrong user → false', (await db.deleteCashbookEntry(cb.id, gUser.id + 99999)) === false);

const cp = await db.createUMKMAndProduct({ umkmName: 'Toko Lepas', phone: '0812000111222', zoneId: zones[2].id, productName: 'Produk Lepas', price: 999, category: 'Lainnya', imageUrl: 'https://example.com/y.jpg' });
check('createUMKMAndProduct', cp.productId > 0);
const umkmLepasRow = await raw.select().from(schema.umkm).where(eq(schema.umkm.name, 'Toko Lepas'));
check('createUMKMAndProduct → is_verified 0 (menunggu)', umkmLepasRow[0]?.is_verified === 0, JSON.stringify(umkmLepasRow[0]?.is_verified));
check('deleteProduct', await db.deleteProduct(cp.productId));

// ---------- CLEANUP ----------
check('deleteProduct own product', await db.deleteProduct(added.productId, umkmId));
await db.deleteSession(sid);
check('getUserFromSession after delete → null', (await db.getUserFromSession(sid)) === null);
await raw.delete(schema.umkm).where(eq(schema.umkm.id, umkmId));
const umkmLepas = await raw.select().from(schema.umkm).where(eq(schema.umkm.name, 'Toko Lepas'));
if (umkmLepas.length) await raw.delete(schema.umkm).where(eq(schema.umkm.id, umkmLepas[0].id));
await raw.delete(schema.users).where(eq(schema.users.id, gUser.id)); // cascades sessions + cashbook

const finalUsers = await raw.select({ id: schema.users.id }).from(schema.users);
check('cleanup: no probe users left', finalUsers.every((u) => u.id !== gUser.id));
const finalUmkm = await raw.select({ id: schema.umkm.id, name: schema.umkm.name }).from(schema.umkm);
check('cleanup: no probe umkm left', finalUmkm.every((u) => u.name !== 'Toko Probe 2' && u.name !== 'Toko Lepas'), JSON.stringify(finalUmkm.filter((u) => u.name?.includes('Probe') || u.name?.includes('Lepas'))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
