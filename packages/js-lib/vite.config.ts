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
        core: path.resolve(__dirname, 'src/core/core.ts'),
        media: path.resolve(__dirname, 'src/media/media.ts'),
        helpers: path.resolve(__dirname, 'src/helpers/helpers.tsx'),
        network: path.resolve(__dirname, 'src/network/network.ts'),
        profile: path.resolve(__dirname, 'src/profile/profile.ts'),
        public: path.resolve(__dirname, 'src/public/public.ts'),
        peer: path.resolve(__dirname, 'src/peer/peer.ts'),

        auth: path.resolve(__dirname, 'src/auth/auth.ts'),
      },
      // formats: ['es', 'cjs'], // Output formats are inferred automatically when building with outputs
    },
    rollupOptions: {
      // external: ['axios'],
      // output: [
      //   {
      //     format: 'es',
      //     globals: {
      //       axios: 'axios',
      //     },
      //   },
      //   {
      //     format: 'cjs',
      //     globals: {
      //       axios: 'axios',
      //     },
      //   },
      // ],
    },
  },
});
