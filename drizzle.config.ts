import { defineConfig } from 'drizzle-kit';

/**
 * Schema lives in src/lib/schema.ts and mirrors the DDL created by
 * scripts/migrate-neon.js. DATABASE_URL must be exported in the shell
 * (e.g. `set -a && . ./.env && set +a`) before running drizzle-kit.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
