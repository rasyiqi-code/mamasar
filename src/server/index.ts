import { Elysia } from 'elysia';
import { jsonResponse } from './context';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { eventsRoutes } from './routes/events';
import { favoritesRoutes } from './routes/favorites';
import { productsRoutes } from './routes/products';
import { promotionsRoutes } from './routes/promotions';
import { systemRoutes } from './routes/system';
import { umkmRoutes } from './routes/umkm';
import { userRoutes } from './routes/user';

/**
 * Unified Elysia API backend mounted under `/api`.
 * Runs natively on Bun (both locally and on Vercel Functions with `bunVersion: "1.x"`)
 * while staying WinterTC-compatible via `app.handle(request)`.
 */
export const app = new Elysia({
  name: 'mamasar-api',
  prefix: '/api',
  aot: typeof Bun !== 'undefined',
})
  .onError(({ code, error }) => {
    if (code === 'PARSE') {
      return jsonResponse({ success: false, message: 'Format data tidak valid.' }, 400);
    }
    if (code === 'NOT_FOUND') {
      return jsonResponse({ success: false, message: 'Endpoint API tidak ditemukan.' }, 404);
    }
    console.error('[Elysia API Error]', code, error);
    return jsonResponse({ success: false, message: 'Terjadi kesalahan server.' }, 500);
  })
  .use(systemRoutes)
  .use(authRoutes)
  .use(productsRoutes)
  .use(umkmRoutes)
  .use(eventsRoutes)
  .use(favoritesRoutes)
  .use(promotionsRoutes)
  .use(userRoutes)
  .use(adminRoutes);

export type App = typeof app;
