import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.js'],
        include: ['**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'server/prisma/',
                'server/index.js', // Entry point usually excluded from unit tests
                'src/main.js',
                'src/admin.js',
                'vite.config.js',
                'prisma.config.ts'
            ]
        },
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@server': path.resolve(__dirname, './server')
        }
    }
});
