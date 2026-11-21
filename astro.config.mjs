// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Served at the domain root by Caddy on the VPS. If the site ever moves into
  // a subfolder, set base to that folder, e.g. '/portfolio-website/'.
  site: 'https://mohammadyarahmadi.ir',
  base: '/',
  integrations: [react()],
  // The site is one page now (src/pages/index.astro). The old pages send
  // anyone with an old link to the matching place on it.
  redirects: {
    '/journey': '/',
    '/projects': '/#rov',
    '/projects/rov': '/#rov',
  },
  vite: {
    build: {
      // three.js is ~620 KB minified (160 KB gzip). It is only ever loaded
      // through a dynamic import for the ROV dive, so the default 500 KB
      // warning is expected noise.
      chunkSizeWarningLimit: 700,
    },
  },
});