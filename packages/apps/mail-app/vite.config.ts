import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3004,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('../../../dev-dotyou-cloud.key'),
      cert: fs.readFileSync('../../../dev-dotyou-cloud.crt'),
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  preview: { ...hostConfig },
  base: '/apps/mail',
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
