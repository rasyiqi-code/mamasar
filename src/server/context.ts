import { resolveUser } from '../lib/neon-auth';
import { jsonError } from '../lib/security';

export type ParsedBody = Record<string, unknown> | undefined | null;

/** Build a JSON Web Response with optional status and extra headers. */
export function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
  });
}

/** Build a 302 redirect Response. */
export function redirectResponse(location: string, status = 302, extraHeaders?: Headers): Response {
  const headers = extraHeaders ? new Headers(extraHeaders) : new Headers();
  headers.set('Location', location);
  return new Response(null, { status, headers });
}

/** Read and trim a string field from parsed Elysia body (JSON or FormData). */
export function strField(body: ParsedBody, key: string): string {
  if (!body || typeof body !== 'object') return '';
  const val = body[key];
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  return '';
}

/** Read an optional File upload from parsed Elysia multipart body. */
export function fileField(body: ParsedBody, key: string): File | null {
  if (!body || typeof body !== 'object') return null;
  const val = body[key];
  if (typeof File !== 'undefined' && val instanceof File) return val;
  return null;
}

/** Resolve authenticated user from request cookies (local session or Neon Auth). */
export async function resolveRequestUser(request: Request) {
  return await resolveUser(request);
}

export { jsonError };
