import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      entryRoot: './src',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        core: path.resolve(__dirname, 'src/core/core.ts'),
        helpers: path.resolve(__dirname, 'src/helpers/helpers.tsx'),
        owner: path.resolve(__dirname, 'src/owner/owner.ts'),
        profile: path.resolve(__dirname, 'src/profile/profile.ts'),
        public: path.resolve(__dirname, 'src/public/public.ts'),
        transit: path.resolve(__dirname, 'src/transit/transit.ts'),

        auth: path.resolve(__dirname, 'src/auth/auth.ts'),
      },
      // formats: ['es', 'cjs'], // Output formats are inferred automatically when building with outputs
    },
    rollupOptions: {
      external: ['axios'],
      output: [
        {
          format: 'es',
          globals: {
            axios: 'axios',
          },
        },
        {
          format: 'cjs',
          globals: {
            axios: 'axios',
          },
        },
      ],
    },
  },
});
