// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://yeraybenito.vercel.app';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
    }),
  ],
});
