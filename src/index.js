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

// Non-API requests fall through to Cloudflare Static Assets (configured in
// wrangler.toml via the [assets] binding).
// When running under `wrangler dev`, the platform automatically forwards
// non-matching requests to the assets directory.

export default app;
