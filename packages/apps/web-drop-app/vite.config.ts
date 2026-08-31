import fs from 'fs';

import { defineConfig } from 'vite';

const hostConfig = {
  host: 'dev.dotyou.cloud',
  port: 3007,
};

// https://vitejs.dev/config/
export default defineConfig({
  base: '/apps/web-drop',
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('../../../dev-dotyou-cloud.key'),
      cert: fs.readFileSync('../../../dev-dotyou-cloud.crt'),
    },
  },
});
