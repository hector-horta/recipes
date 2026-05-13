import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, path.resolve(__dirname, '../'), '');
    var apiHost = env.VITE_API_URL || 'http://localhost:5001';
    return {
        plugins: [
            react(),
            {
                name: 'dynamic-csp',
                transformIndexHtml: function (html) {
                    return html.replace(/__CSP_CONNECT_SRC__/g, apiHost);
                }
            }
        ],
        server: {
            host: '0.0.0.0',
            allowedHosts: true,
            proxy: {
                '/api/': {
                    target: 'http://backend:5001',
                    changeOrigin: true
                },
                '/public/recipes/': {
                    target: 'http://backend:5001',
                    changeOrigin: true
                }
            }
        },
        optimizeDeps: {
            include: ['react', 'react-dom'],
        },
        resolve: {
            dedupe: ['react', 'react-dom'],
            alias: {
                'react': path.resolve(__dirname, 'node_modules/react'),
                'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            },
        },
        envDir: '../',
        test: {
            environment: 'happy-dom',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
        },
    };
});
