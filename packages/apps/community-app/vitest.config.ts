import { defineConfig } from 'vitest/config';

// Tests need none of vite.config.ts: no plugins or dev certificates.
export default defineConfig({ test: { environment: 'node' } });
