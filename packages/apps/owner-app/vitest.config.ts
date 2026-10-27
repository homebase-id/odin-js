import { defineConfig } from 'vitest/config';

// Tests need none of vite.config.ts: no plugins, dev certificates or PWA.
export default defineConfig({ test: { environment: 'node' } });
