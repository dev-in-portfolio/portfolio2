// netlify/functions/appdata.js
// Generic per-app anonymous persistence (local-first).
// POST { app, clientId, payload } -> upsert
// GET  ?app=...&clientId=...       -> latest payload
const { query } = require('./_db');
const { ok, bad, corsHeaders, preflight } = require('./_cors');

function asText(v, max=200){
  v = (v ?? '').toString().trim();
  if(!v) return '';
  return v.length > max ? v.slice(0, max) : v;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const method = event.httpMethod || 'GET';

  try{
    if(method === 'GET'){
      const qs = event.queryStringParameters || {};
      const app = asText(qs.app, 120);
      const clientId = asText(qs.clientId, 200);

      if(!app || !clientId) return bad('Missing app/clientId');

      const rows = await query(
        `select app, client_id as "clientId", payload, updated_at as "updatedAt"
         from nexus_appdata
         where app=$1 and client_id=$2
         limit 1`,
        [app, clientId]
      );

      if(!rows.length){
        return ok({ app, clientId, payload: null, updatedAt: null });
      }
      return ok(rows[0]);
    }

    if(method === 'POST'){
      const body = JSON.parse(event.body || '{}');
      const app = asText(body.app, 120);
      const clientId = asText(body.clientId, 200);
      const payload = body.payload ?? {};

      if(!app || !clientId) return bad('Missing app/clientId');

      // Basic guard: keep payload reasonable
      const json = JSON.stringify(payload);
      if(json.length > 1_500_000) return bad('Payload too large');

      const rows = await query(
        `insert into nexus_appdata(app, client_id, payload, updated_at)
         values ($1,$2,$3::jsonb, now())
         on conflict (app, client_id)
         do update set payload=excluded.payload, updated_at=now()
         returning app, client_id as "clientId", updated_at as "updatedAt"`,
        [app, clientId, json]
      );

      return ok({ ok:true, ...rows[0] });
    }

    return {
      statusCode: 405,
      headers: { ...corsHeaders(), 'content-type':'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }catch(err){
    console.error('[appdata] error', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(), 'content-type':'application/json' },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};