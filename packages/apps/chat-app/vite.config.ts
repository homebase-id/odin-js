import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3003,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // splitVendorChunkPlugin()
  ],
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
  base: '/apps/chat',
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
    },
  },
});
