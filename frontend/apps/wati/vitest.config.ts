import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-i18next', 'react-router-dom'],
    alias: {
      'react$': path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom$': path.resolve(__dirname, '../../../node_modules/react-dom'),
      '@': path.resolve(__dirname, './src'),
      '@wati/src': path.resolve(__dirname, './src'),
      '@wati/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@wati/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@wati/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,tsx}'],
    server: {
      deps: {
        inline: [/@wati\/.*/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
};
