exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "content-type":"application/json" }, body: JSON.stringify({ error: "method_not_allowed" }) };
  }
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch(e) {}
  const agentSlug = body.agentSlug || body.slug || "";
  // Demo mapping: any demo-capable agent routes to sample run
  const runId = "sample_run_001";
  return {
    statusCode: 200,
    headers: { "content-type":"application/json" },
    body: JSON.stringify({
      ok: true,
      agentSlug,
      runId,
      receiptsHref: `/agents/runs/${runId}.html`,
      receiptsJson: `/api/run?id=${runId}`
    })
  };
};
