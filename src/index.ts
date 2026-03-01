import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { intakeRoutes } from './intake.routes';
import { adminRoutes } from './admin.routes';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'Hono Intake',
    routes: ['/api/intake', '/api/intake/records', '/api/intake/quarantine', '/api/admin/quarantine/:id/retry'],
  });
});

app.route('/api/intake', intakeRoutes);
app.route('/api/admin', adminRoutes);

const PORT = Number(process.env.PORT || 8789);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono Intake running on port ${PORT}`);

module.exports = app;
