// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Served by GitHub Pages from the user-site repo (MhmdYarahmadi.github.io), so at
  // the domain root. If the site ever moves into a subfolder (a repo with
  // another name), set base to that folder, e.g. '/portfolio-website/'.
  site: 'https://mhmdyarahmadi.github.io',
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