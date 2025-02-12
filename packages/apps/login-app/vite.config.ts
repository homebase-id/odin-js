import fs from 'fs';

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const hostConfig = {
  host: 'anon.dotyou.cloud',
  port: 5173,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('./anon.dotyou.cloud/private.key'),
      cert: fs.readFileSync('./anon.dotyou.cloud/certificate.crt'),
    },
  },
});
