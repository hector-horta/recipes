import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,mjs,ts}'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text'],
    reportsDirectory: './coverage',
  },
});