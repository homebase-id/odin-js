import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config.cjs';

// The card page the apps ship; scripts/inline-card.mjs then folds the output into one card.html
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: [{ find: /^\.\/DriveImage$/, replacement: '/src/cards/embed/NoDriveImage.tsx' }],
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          ...tailwindConfig,
          // the desktop pages size themselves with vh units, which the card never may
          content: [
            './src/cards/**/*.{ts,tsx}',
            '!./src/cards/**/*Page.tsx',
            '!./src/cards/Card{Home,Embed}.tsx',
            '../../common/common-app/src/ui/Icons/**/*.{ts,tsx}',
          ],
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: 'dist-card',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: 'card.html',
      output: { inlineDynamicImports: true },
    },
  },
});
