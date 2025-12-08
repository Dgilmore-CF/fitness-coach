import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, parseJWT } from './middleware/auth';
import authRoutes from './routes/auth';
import programRoutes from './routes/programs';
import workoutRoutes from './routes/workouts';
import exerciseRoutes from './routes/exercises';
import analyticsRoutes from './routes/analytics';
import nutritionRoutes from './routes/nutrition';
import healthRoutes from './routes/health';
import { serveStatic } from './middleware/static';

const app = new Hono();

// CORS middleware
app.use('/*', cors());

// API routes
app.route('/api/auth', authRoutes);
app.use('/api/*', authMiddleware);
app.route('/api/programs', programRoutes);
app.route('/api/workouts', workoutRoutes);
app.route('/api/exercises', exerciseRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/nutrition', nutritionRoutes);
app.route('/api/health', healthRoutes);

// Serve static frontend
app.get('/*', serveStatic);

export default app;
