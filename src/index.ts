import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { admin } from './admin';
import { proxy } from './proxy';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'Hono Gatekeeper',
    routes: ['/api/admin/keys', '/api/proxy/*'],
  });
});

app.route('/api/admin', admin);
app.route('/api', proxy);

const PORT = Number(process.env.PORT || 8787);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono Gatekeeper running on port ${PORT}`);

module.exports = app;
