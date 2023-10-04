import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3000,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackWithDot()],
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('../../dev-dotyou-cloud.key'),
      cert: fs.readFileSync('../../dev-dotyou-cloud.crt'),
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  preview: { ...hostConfig },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});

/**
 * Vite doesn't handle fallback html with dot (.), see https://github.com/vitejs/vite/issues/2415
 * TODO: Review the PR in Vite
 * @returns {import('vite').Plugin}
 */
function spaFallbackWithDot() {
  return {
    name: 'spa-fallback-with-dot',
    configureServer(server) {
      return () => {
        server.middlewares.use(function customSpaFallback(req, res, next) {
          if (req.url.includes('.') && !req.url.endsWith('.html')) {
            req.url = '/index.html';
          }
          next();
        });
      };
    },
  };
}
