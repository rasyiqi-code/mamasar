import type { APIRoute } from 'astro';
import { app } from '../../../server';

/**
 * Single Astro catch-all gateway delegating all `/api/*` requests to Elysia (`src/server`).
 */
export const ALL: APIRoute = ({ request }) => app.handle(request);
