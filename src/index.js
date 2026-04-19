import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth';
import programRoutes from './routes/programs';
import workoutRoutes from './routes/workouts';
import exerciseRoutes from './routes/exercises';
import analyticsRoutes from './routes/analytics';
import nutritionRoutes from './routes/nutrition';
import healthRoutes from './routes/health';
import achievementsRoutes from './routes/achievements';
import aiRoutes from './routes/ai';
import reportsRoutes from './routes/reports';
import exportsRoutes from './routes/exports';

const app = new Hono();

// Global error handler (Hono v4 handles errors thrown from async handlers)
app.onError(errorHandler);

// CORS for API routes
app.use('/api/*', cors());

// Authentication on API routes (except /api/auth/*)
app.route('/api/auth', authRoutes);
app.use('/api/*', authMiddleware);

// API routes
app.route('/api/programs', programRoutes);
app.route('/api/workouts', workoutRoutes);
app.route('/api/exercises', exerciseRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/nutrition', nutritionRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/achievements', achievementsRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/exports', exportsRoutes);

// Non-API requests fall through to Cloudflare Static Assets. With the
// [assets] binding configured in wrangler.toml, Cloudflare serves assets
// first and only calls the Worker for API paths. This explicit fallback
// guarantees correct behavior if the platform ever delivers a non-API
// request to the Worker (e.g. during `wrangler dev` or if routing
// settings change).
app.all('*', async (c) => {
  // Block /api/* from falling through — unmatched API routes should 404.
  const url = new URL(c.req.url);
  if (url.pathname.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }
  // Let Static Assets serve the request (SPA fallback is handled by the
  // `not_found_handling = "single-page-application"` setting).
  if (c.env?.ASSETS && typeof c.env.ASSETS.fetch === 'function') {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not found', 404);
});

export default app;
