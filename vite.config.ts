/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep third-party code and the mock backend out of the app entry chunk.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react-router|react-dom|[\\/]react[\\/]|scheduler/.test(id)) return 'vendor-react';
            if (/@tanstack|i18next|react-hook-form|zod|@hookform/.test(id)) return 'vendor-libs';
            return 'vendor';
          }
          if (id.includes('/src/services/mock/')) return 'mock-backend';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
