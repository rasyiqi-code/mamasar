import { neon } from '@neondatabase/serverless';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createRealtime, rawSql } from '@neon/realtime/server';

/**
 * Universally retrieves environment variables across Astro runtime (import.meta.env)
 * and standalone Node scripts / CLI (process.env).
 */
export function getEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

/**
 * 1. Neon Postgres Client
 */
export function getNeonSql() {
  const url = getEnv('DATABASE_URL');
  if (!url) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return neon(url);
}

/**
 * 2. Neon Object Storage (S3-compatible) Client
 */
export function getNeonS3Client() {
  const endpoint = getEnv('AWS_ENDPOINT_URL_S3');
  const accessKeyId = getEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY');
  const region = getEnv('AWS_REGION') || 'ap-southeast-1';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

/**
 * Returns a presigned GET URL for an object in the "assets" bucket.
 */
export async function getNeonPresignedUrl(key: string, expiresIn: number = 604800): Promise<string> {
  const s3 = getNeonS3Client();
  if (!s3) {
    throw new Error('Neon Object Storage credentials are not configured.');
  }
  return await getSignedUrl(s3, new GetObjectCommand({ Bucket: 'assets', Key: key }), { expiresIn });
}

/**
 * Uploads a buffer or file to Neon Object Storage bucket "assets"
 * Returns a presigned public URL of the object (default 7 days).
 */
export async function uploadToNeonStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const s3 = getNeonS3Client();
  if (!s3) {
    throw new Error('Neon Object Storage credentials are not configured.');
  }

  const bucket = 'assets';
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return await getNeonPresignedUrl(fileName);
}

/**
 * 3. Neon Functions Invoker
 */
export async function invokeNeonFunction(name: string = 'hello'): Promise<string> {
  const branchId = getEnv('NEON_BRANCH_ID');
  const suffix = getEnv('NEON_FUNCTION_HOST_SUFFIX');
  if (!branchId || !suffix) {
    throw new Error('Neon Functions host is not configured (NEON_BRANCH_ID / NEON_FUNCTION_HOST_SUFFIX).');
  }

  // Clean host URL
  const functionUrl = `https://${branchId}-${name}${suffix.startsWith('.') ? suffix : '.' + suffix}/`;

  const res = await fetch(functionUrl);
  if (!res.ok) {
    throw new Error(`Neon Function ${name} failed with status ${res.status}: ${res.statusText}`);
  }
  return await res.text();
}

/**
 * 4. Neon Realtime Live Query Sealer
 */
export async function sealRealtimeQuery(querySql: string, params: any[] = []): Promise<any> {
  const secret = getEnv('NEON_REALTIME_SECRET');
  if (!secret) {
    throw new Error('NEON_REALTIME_SECRET is not configured.');
  }

  const realtime = createRealtime({
    secret,
    db: 'neondb',
  });

  return await realtime.seal({
    query: rawSql(querySql, params),
  });
}

/**
 * 5. Neon Auth Information
 */
export function getNeonAuthInfo() {
  return {
    baseUrl: getEnv('NEON_AUTH_BASE_URL') || null,
    jwksUrl: getEnv('NEON_AUTH_JWKS_URL') || null,
  };
}
