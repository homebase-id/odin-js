import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3002,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('../../../dev-dotyou-cloud.key'),
      cert: fs.readFileSync('../../../dev-dotyou-cloud.crt'),
    },
    fs: {
      // One level up, and the repo root's node_modules: the reader's fonts (Inter, KaTeX) are
      // hoisted there, and their files are fetched by url, not imported
      allow: ['..', '../../../node_modules'],
    },
  },
  preview: { ...hostConfig },
  base: '/apps/feed',
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
      onLog(level, log, handler) {
        if (
          log.cause &&
          (log.cause as any)?.message === `Can't resolve original location of error.`
        ) {
          return;
        }
        handler(level, log);
      },
      output: {
        // manualChunks(id) {
        //   if (
        //     id.includes('lucide-react') ||
        //     id.includes('@radix-ui') ||
        //     id.includes('react-remove-scroll') ||
        //     id.includes('react-style-singleton') ||
        //     id.includes('rich-text-editor') ||
        //     id.includes('@floating-ui') ||
        //     id.includes('rich-text-editor')
        //   ) {
        //     return 'rich-text-editor';
        //   }
        // },
      },
    },
  },
});
