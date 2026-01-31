import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { activationRoutes } from './routes/activation';
import { sessionRoutes } from './routes/session';
import { ocrRoutes } from './routes/ocr';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Echo API',
    version: '0.1.0',
    status: 'ok',
  });
});

// API routes
app.route('/api/activation', activationRoutes);
app.route('/api/session', sessionRoutes);
app.route('/api/ocr', ocrRoutes);

// Start server
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

console.log(`Echo server starting on http://${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
