import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server/index.ts';

describe('Elysia backend (/api)', () => {
  it('returns runtime and framework metadata from GET /api/health', async () => {
    const res = await app.handle(new Request('http://localhost/api/health'));
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      framework: string;
      runtime: string;
    };
    assert.equal(body.success, true);
    assert.equal(body.framework, 'elysia');
    assert.ok(body.runtime.length > 0);
  });

  it('returns 404 JSON for unknown /api routes', async () => {
    const res = await app.handle(new Request('http://localhost/api/does-not-exist'));
    assert.equal(res.status, 404);
    const body = (await res.json()) as { success: boolean; message: string };
    assert.equal(body.success, false);
  });

  it('returns 400 JSON when JSON body fails parsing', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      })
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { success: boolean };
    assert.equal(body.success, false);
  });

  it('allows guest POST /api/favorites/toggle without DB write', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 42 }),
      })
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; syncedWithAccount: boolean };
    assert.equal(body.success, true);
    assert.equal(body.syncedWithAccount, false);
  });

  it('returns empty products array on GET /api/favorites/list with no ids', async () => {
    const res = await app.handle(new Request('http://localhost/api/favorites/list?ids='));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; products: unknown[] };
    assert.equal(body.success, true);
    assert.deepEqual(body.products, []);
  });

  it('guards protected mutation routes when unauthenticated', async () => {
    const prodRes = await app.handle(
      new Request('http://localhost/api/products', { method: 'POST', body: new FormData() })
    );
    assert.equal(prodRes.status, 401);

    const cronRes = await app.handle(
      new Request('http://localhost/api/cron/expire-promotions', { method: 'POST' })
    );
    assert.equal(cronRes.status, 401);

    const articleGetRes = await app.handle(
      new Request('http://localhost/api/admin/articles')
    );
    assert.equal(articleGetRes.status, 403);

    const articlePostRes = await app.handle(
      new Request('http://localhost/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', title: 'Test', summary: 'Test' }),
      })
    );
    assert.equal(articlePostRes.status, 403);

    const exportRes = await app.handle(new Request('http://localhost/api/user/export'));
    assert.equal(exportRes.status, 401);

    const logoPostRes = await app.handle(
      new Request('http://localhost/api/umkm/logo', { method: 'POST', body: new FormData() })
    );
    assert.equal(logoPostRes.status, 401);

    const logoDeleteRes = await app.handle(
      new Request('http://localhost/api/umkm/logo', { method: 'DELETE' })
    );
    assert.equal(logoDeleteRes.status, 401);

    const cashbookExportRes = await app.handle(
      new Request('http://localhost/api/user/cashbook/export')
    );
    assert.equal(cashbookExportRes.status, 401);

    const adminArticlesGetRes = await app.handle(
      new Request('http://localhost/api/admin/articles')
    );
    assert.equal(adminArticlesGetRes.status, 403);

    const adminArticlesPostRes = await app.handle(
      new Request('http://localhost/api/admin/articles', { method: 'POST', body: new FormData() })
    );
    assert.equal(adminArticlesPostRes.status, 403);

    const adminArticlesDeleteRes = await app.handle(
      new Request('http://localhost/api/admin/articles/999', { method: 'DELETE' })
    );
    assert.equal(adminArticlesDeleteRes.status, 403);

    const eventPostRes = await app.handle(
      new Request('http://localhost/api/events', { method: 'POST', body: new FormData() })
    );
    assert.equal(eventPostRes.status, 401);

    const favClearRes = await app.handle(
      new Request('http://localhost/api/favorites/clear', { method: 'POST' })
    );
    assert.equal(favClearRes.status, 200);
    const favClearBody = (await favClearRes.json()) as { success: boolean; cleared: boolean };
    assert.equal(favClearBody.success, true);
  });
});
