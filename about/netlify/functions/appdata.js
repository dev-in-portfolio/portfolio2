// netlify/functions/appdata.js
// Generic per-app anonymous persistence (local-first).
// POST { app, clientId, payload } -> upsert
// GET  ?app=...&clientId=...       -> latest payload
const { query } = require('./_db');
const { ok, bad, preflight } = require('./_cors');

function asText(v, max=200){
  v = (v ?? '').toString().trim();
  if(!v) return '';
  return v.length > max ? v.slice(0, max) : v;
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') {
    return preflight({ app: null, clientId: null, payload: null, updatedAt: null });
  }

  try{
    if(method === 'GET'){
      const qs = event.queryStringParameters || {};
      const app = asText(qs.app, 120);
      const clientId = asText(qs.clientId, 200);

      if(!app || !clientId) return bad(400, 'Missing app/clientId');

      const result = await query(
        `select app, client_id as "clientId", payload, updated_at as "updatedAt"
         from nexus_appdata
         where app=$1 and client_id=$2
         limit 1`,
        [app, clientId]
      );
      const rows = result.rows || [];

      if(!rows.length){
        return ok({ method, app, clientId, payload: null, updatedAt: null });
      }
      return ok({ method, ...rows[0] });
    }

    if(method === 'POST'){
      const body = JSON.parse(event.body || '{}');
      const app = asText(body.app, 120);
      const clientId = asText(body.clientId, 200);
      const payload = body.payload ?? {};

      if(!app || !clientId) return bad(400, 'Missing app/clientId');

      // Basic guard: keep payload reasonable
      const json = JSON.stringify(payload);
      if(json.length > 1_500_000) return bad(413, 'Payload too large');

      const result = await query(
        `insert into nexus_appdata(app, client_id, payload, updated_at)
         values ($1,$2,$3::jsonb, now())
         on conflict (app, client_id)
         do update set payload=excluded.payload, updated_at=now()
         returning app, client_id as "clientId", payload, updated_at as "updatedAt"`,
        [app, clientId, json]
      );
      const rows = result.rows || [];

      return ok({ method, ...rows[0] });
    }

    return bad(405, 'Method not allowed', { method });
  }catch(err){
    console.error('[appdata] error', err);
    return bad(500, 'Server error', { method });
  }
};
