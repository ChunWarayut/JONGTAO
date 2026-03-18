import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html'),
                scanner: resolve(__dirname, 'scanner.html')
            }
        }
    }
});
