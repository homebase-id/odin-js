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
      name: 'odin-js',
      fileName: `odin-js`,
    },
    rollupOptions: {
      external: ['axios'],
      output: [
        {
          format: 'es',
          inlineDynamicImports: false,
          preserveModules: true, // otherwise everything is bundled into one file blocking tree shaking of the named exports, but only works for ES modules

          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            axios: 'axios',
          },
        },
        {
          name: 'odin-js-umd',
          format: 'umd',
          inlineDynamicImports: true,
          preserveModules: false,

          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            axios: 'axios',
          },
        },
      ],
    },
  },
});
