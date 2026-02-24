// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

import icon from 'astro-icon';

export default defineConfig({
  site: 'https://leconceptdelapreuve.jeromeabel.net',

  build: {
    inlineStylesheets: 'always',
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@scripts': '/src/scripts'
      }
    }
  },

  adapter: netlify(),
  integrations: [icon()]
});