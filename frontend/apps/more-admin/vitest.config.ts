import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@more/src': path.resolve(__dirname, './src'),
      '@wati/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@wati/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@wati/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,tsx}'],
  },
});
