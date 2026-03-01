import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cacheRoutes } from './cache.routes';
import { adminRoutes } from './admin.routes';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'Hono Capsule Cache',
    routes: ['/api/cache/:namespace/:key', '/api/admin/cleanup'],
  });
});

app.route('/api/cache', cacheRoutes);
app.route('/api/admin', adminRoutes);

const PORT = Number(process.env.PORT || 8788);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono Capsule Cache running on port ${PORT}`);

module.exports = app;
