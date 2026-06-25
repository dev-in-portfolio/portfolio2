const { query } = require("./_db");
const { ok, bad, options } = require("./_cors");

const RETENTION_DAYS = 7;

async function cleanupOld(clientId) {
  // Best-effort retention cleanup
  await query(
    `DELETE FROM sleepystory_items WHERE client_id = $1 AND created_at < (now() - ($2 || ' days')::interval)`,
    [clientId, String(RETENTION_DAYS)]
  ).catch(() => null);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();

  if (event.httpMethod === "GET") {
    const clientId = (event.queryStringParameters?.client_id || "").trim();
    if (!clientId) return bad(400, "Missing client_id");

    const limitRaw = event.queryStringParameters?.limit || "50";
    const limit = Math.max(1, Math.min(200, parseInt(limitRaw, 10) || 50));

    const rows = await query(
      `SELECT id, payload, created_at FROM sleepystory_items WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [clientId, limit]
    );

    return ok({ ok: true, items: rows.rows });
  }

  if (event.httpMethod !== "POST") return bad(405, "Method not allowed");

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return bad(400, "Invalid JSON");
  }

  const clientId = String(body.client_id || "").trim();
  if (!clientId) return bad(400, "Missing client_id");

  const payload = body.payload ?? null;
  if (!payload) return bad(400, "Missing payload");

  await cleanupOld(clientId);

  const inserted = await query(
    `INSERT INTO sleepystory_items (client_id, payload) VALUES ($1, $2) RETURNING id, created_at`,
    [clientId, payload]
  );

  return ok({ ok: true, id: inserted.rows[0].id, created_at: inserted.rows[0].created_at });
};
