import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3000,
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
      // The repo root: hoisted node_modules hold the reader's fonts (Source Serif, KaTeX)
      allow: ['../../..'],
    },
  },
  preview: { ...hostConfig },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      // output: {
      //   manualChunks(id) {
      //     if (
      //       id.includes('lucide-react') ||
      //       id.includes('@radix-ui') ||
      //       id.includes('react-remove-scroll') ||
      //       id.includes('react-style-singleton') ||
      //       id.includes('rich-text-editor') ||
      //       id.includes('@floating-ui') ||
      //       id.includes('rich-text-editor')
      //     ) {
      //       return 'rich-text-editor';
      //     }
      //   },
      // },
    },
  },
});
