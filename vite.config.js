import { defineConfig } from 'vite';
import path from 'path';

/**
 * Vite configuration for the AI Fitness Coach frontend refactor.
 *
 * Architecture:
 * - Source lives in `frontend/` (modular code being migrated from `public/app.js`)
 * - Dev server runs on :3000 and proxies `/api/*` to wrangler on :8787
 * - Production builds to `frontend-dist/` with hashed asset names
 * - `build-frontend.js` combines the Vite output with the legacy `public/app.js`
 *   until the migration is complete, then drops the legacy path entirely.
 */
export default defineConfig({
  root: 'frontend',
  publicDir: 'public',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
      '@css': path.resolve(__dirname, 'frontend/css'),
      '@ui': path.resolve(__dirname, 'frontend/src/ui'),
      '@core': path.resolve(__dirname, 'frontend/src/core'),
      '@utils': path.resolve(__dirname, 'frontend/src/utils'),
      '@screens': path.resolve(__dirname, 'frontend/src/screens'),
      '@features': path.resolve(__dirname, 'frontend/src/features'),
      '@services': path.resolve(__dirname, 'frontend/src/services')
    }
  },

  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
    include: ['../tests/unit/**/*.test.js']
  }
});
