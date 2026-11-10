/**
 * Uji fungsional avatar: upload ke Neon Object Storage → simpan key ke DB
 * → resolveAvatarUrl mengembalikan URL presigned yang bisa di-fetch.
 * Membersihkan diri di akhir.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/schema.ts';
import * as db from '../src/lib/db.ts';
import { saveAccountAvatar, resolveAvatarUrl } from '../src/lib/storage.ts';
import { eq } from 'drizzle-orm';
import { getNeonS3Client } from '../src/lib/neon.ts';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.log(`FAIL  ${label} ${extra}`); }
};

if (!getNeonS3Client()) {
  console.log('SKIP: kredensial Neon Object Storage tidak dikonfigurasi');
  process.exit(0);
}

// 1. Buat PNG 1x1 piksel valid
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// 2. Upload sebagai avatar
const stored = await saveAccountAvatar({
  imageBase64: `data:image/png;base64,${png.toString('base64')}`,
  userId: 'probe-avatar',
});
check('upload mengembalikan key (bukan URL)', !stored.startsWith('http') && stored.startsWith('avatars/'), JSON.stringify(stored));

// 3. Simpan ke user di DB
const stamp = Date.now().toString(36);
const user = await db.findOrCreateUserByGoogle({ googleId: `probe-av-${stamp}`, email: `probe-av-${stamp}@example.com`, name: 'Avatar Probe' });
await db.updateUserProfile(user.id, { avatarUrl: stored });
const session = await db.getOrCreateSessionForUser(user.id);
const fromDb = await db.getUserFromSession(session);
check('key tersimpan di avatar_url', fromDb?.avatar_url === stored, JSON.stringify(fromDb?.avatar_url));

// 4. Resolve key → URL presigned, dan URL itu benar-benar bisa di-fetch
const resolved = await resolveAvatarUrl(fromDb?.avatar_url);
check('resolve → URL https', !!resolved && resolved.startsWith('https://'), JSON.stringify(resolved?.slice(0, 60)));
const imgRes = await fetch(resolved);
check('URL presigned bisa di-fetch (200)', imgRes.status === 200, `status ${imgRes.status}`);
check('content-type image/png', (imgRes.headers.get('content-type') || '').includes('image/png'), imgRes.headers.get('content-type') || '');

// 5. URL eksternal & path lokal diteruskan apa adanya; kosong → null
check('URL http diteruskan', (await resolveAvatarUrl('https://lh3.googleusercontent.com/x')) === 'https://lh3.googleusercontent.com/x');
check('path lokal diteruskan', (await resolveAvatarUrl('/uploads/avatars/x.jpg')) === '/uploads/avatars/x.jpg');
check('kosong → null', (await resolveAvatarUrl(null)) === null && (await resolveAvatarUrl('')) === null);

// 6. Cleanup: hapus user (DB) + objek S3
const s3 = getNeonS3Client();
await s3.send(new DeleteObjectCommand({ Bucket: 'assets', Key: stored }));
await drizzle(neon(process.env.DATABASE_URL), { schema }).delete(schema.users).where(eq(schema.users.id, user.id));
check('cleanup user terhapus', (await db.getUserFromSession(session)) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
