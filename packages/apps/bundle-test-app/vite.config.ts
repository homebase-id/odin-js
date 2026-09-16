import fs from 'fs';

import { defineConfig } from 'vite';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3008,
};

// A stand-alone third-party origin (not served under an identity), so it lives at the root.
// JSX is compiled by Vite's built-in esbuild; this demo does not need @vitejs/plugin-react.
// https://vitejs.dev/config/
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('../../../dev-dotyou-cloud.key'),
      cert: fs.readFileSync('../../../dev-dotyou-cloud.crt'),
    },
  },
  preview: { ...hostConfig },
});
