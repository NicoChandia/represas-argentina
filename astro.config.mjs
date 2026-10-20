// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Cambiá "site" por la URL final cuando publiques en Vercel (la usa el sitemap y las etiquetas canonical).
export default defineConfig({
  site: 'https://represas-argentina.vercel.app',
  integrations: [react(), sitemap()],
});
