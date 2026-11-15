import crypto from 'node:crypto';
import { Elysia } from 'elysia';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { expireStalePromotions, isPCNU } from '../../lib/db';
import {
  getEnv,
  getNeonAuthInfo,
  getNeonS3Client,
  getNeonSql,
  invokeNeonFunction,
  sealRealtimeQuery,
} from '../../lib/neon';
import { isSafeOutboundUrl } from '../../lib/security';
import { jsonError, jsonResponse, resolveRequestUser } from '../context';

async function isCronAuthorized(request: Request): Promise<boolean> {
  const cronSecret = getEnv('CRON_SECRET');
  const authHeader = request.headers.get('authorization') || '';
  if (cronSecret && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const expected = Buffer.from(cronSecret);
    const actual = Buffer.from(token);
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      return true;
    }
  }

  const user = await resolveRequestUser(request);
  return isPCNU(user);
}

async function handleExpirePromotions(request: Request): Promise<Response> {
  if (!(await isCronAuthorized(request))) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }
  const result = await expireStalePromotions();
  return jsonResponse({ success: true, ...result }, 200);
}

export const systemRoutes = new Elysia({ name: 'routes:system' })
  .get('/health', () =>
    jsonResponse({
      success: true,
      runtime: typeof Bun !== 'undefined' ? `bun/${Bun.version}` : `node/${process.version}`,
      framework: 'elysia',
      timestamp: new Date().toISOString(),
    })
  )
  .get('/cron/expire-promotions', ({ request }) => handleExpirePromotions(request))
  .post('/cron/expire-promotions', ({ request }) => handleExpirePromotions(request))
  .get('/neon/services', async ({ request }) => {
    const user = await resolveRequestUser(request);
    if (!user) {
      return jsonError(401, 'Akses ditolak. Silakan masuk terlebih dahulu.');
    }
    if (!isPCNU(user)) {
      return jsonError(403, 'Akses diagnostik khusus Admin PCNU.');
    }

    const report: Record<string, any> = {
      timestamp: new Date().toISOString(),
      runtime: typeof Bun !== 'undefined' ? `bun/${Bun.version}` : `node/${process.version}`,
      services: {},
    };

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

    try {
      const authInfo = getNeonAuthInfo();
      if (!authInfo.jwksUrl || !(await isSafeOutboundUrl(authInfo.jwksUrl))) {
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
  });
