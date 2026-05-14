import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../../'), '');
  const apiHost = env.VITE_API_URL || 'http://localhost:5001';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3001,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiHost,
          changeOrigin: true
        }
      }
    },
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom'],
      alias: {
        '@wati/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
        '@wati/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
        '@wati/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src/index.ts'),
      },
    },
    envDir: '../../../',
  };
});
