// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

const isVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
export default defineConfig({
  srcDir: './src/client',
  output: 'server',
  adapter: isVercel ? vercel() : node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: isVercel ? ['elysia', 'memoirist', 'exact-mirror', 'cookie'] : [],
      external: ['fast-decode-uri-component'],
    },
  },
});
