import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'homebase-ui',
      fileName: `homebase-ui`,
    },
    rollupOptions: {
      external: ['@tanstack/react-query', 'react'],
      output: {
        globals: {
          react: 'react',
          '@tanstack/react-query': '@tanstack/react-query',
        },
      },
    },
  },
});
