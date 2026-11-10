import type { APIRoute } from 'astro';
import { getNeonSql, getNeonS3Client, invokeNeonFunction, sealRealtimeQuery, getNeonAuthInfo } from '../../../lib/neon';
import { getUserFromSession } from '../../../lib/db';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export const GET: APIRoute = async ({ cookies }) => {
  // Diagnostic endpoint: only reachable by logged-in members.
  // Public exposure leaks infrastructure topology (versions, endpoints, keys).
  const sessionCookie = cookies.get('mamasar_session')?.value;
  const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Akses ditolak. Silakan masuk terlebih dahulu.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    services: {},
  };

  // 1. Test Neon Postgres
  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT 
        (SELECT count(*) FROM zones) as zones,
        (SELECT count(*) FROM umkm) as umkm,
        (SELECT count(*) FROM products) as products,
        (SELECT count(*) FROM articles) as articles,
        (SELECT count(*) FROM events) as events,
        version();
    `;
    report.services.postgres = {
      status: 'connected',
      version: rows[0].version?.split(' ')[0] + ' ' + rows[0].version?.split(' ')[1],
      stats: {
        zones: Number(rows[0].zones),
        umkm: Number(rows[0].umkm),
        products: Number(rows[0].products),
        articles: Number(rows[0].articles),
        events: Number(rows[0].events),
      },
    };
  } catch (err: any) {
    report.services.postgres = { status: 'error', message: err.message };
  }

  // 2. Test Neon Object Storage (S3)
  try {
    const s3 = getNeonS3Client();
    if (!s3) {
      report.services.object_storage = { status: 'unconfigured' };
    } else {
      const listRes = await s3.send(new ListObjectsV2Command({ Bucket: 'assets', MaxKeys: 5 }));
      report.services.object_storage = {
        status: 'connected',
        bucket: 'assets',
        objectCount: listRes.KeyCount || 0,
      };
    }
  } catch (err: any) {
    report.services.object_storage = { status: 'error', message: err.message };
  }

  // 3. Test Neon Functions
  try {
    const functionResponse = await invokeNeonFunction('hello');
    report.services.functions = {
      status: 'healthy',
      functionName: 'hello',
      response: functionResponse.trim(),
    };
  } catch (err: any) {
    report.services.functions = { status: 'error', message: err.message };
  }

  // 4. Test Neon Auth (JWKS)
  try {
    const authInfo = getNeonAuthInfo();
    if (!authInfo.jwksUrl) {
      report.services.auth = { status: 'unconfigured' };
    } else {
      const jwksRes = await fetch(authInfo.jwksUrl);
      const jwksData = await jwksRes.json();
      report.services.auth = {
        status: jwksRes.ok ? 'healthy' : 'failed',
        keyCount: jwksData.keys?.length || 0,
      };
    }
  } catch (err: any) {
    report.services.auth = { status: 'error', message: err.message };
  }

  // 5. Test Neon Realtime
  try {
    const sealed = await sealRealtimeQuery('SELECT id, name, price FROM products LIMIT 3');
    report.services.realtime = {
      status: 'healthy',
      sealedQueryFingerprint: sealed.queryFingerprint,
      expiresAt: new Date(sealed.expiresAt).toISOString(),
    };
  } catch (err: any) {
    report.services.realtime = { status: 'error', message: err.message };
  }

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
