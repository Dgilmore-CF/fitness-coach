import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration.
 *
 * Separate from vite.config.js so unit tests can run without requiring
 * the frontend dev-server setup. Tests live in `tests/unit/`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
      '@core': path.resolve(__dirname, 'frontend/src/core'),
      '@utils': path.resolve(__dirname, 'frontend/src/utils'),
      '@ui': path.resolve(__dirname, 'frontend/src/ui'),
      '@backend': path.resolve(__dirname, 'src')
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['frontend/src/**/*.js', 'src/**/*.js'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/frontend-dist/**']
    }
  }
});
