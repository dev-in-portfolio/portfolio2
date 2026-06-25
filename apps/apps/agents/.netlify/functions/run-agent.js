const PUBLIC_BASE = "/apps/agents";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {}

  const agentSlug = body.agentSlug || body.slug || "";
  const runId = "sample_run_001";

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      agentSlug,
      runId,
      receiptsHref: `${PUBLIC_BASE}/runs/${runId}.html`,
      receiptsJson: `/api/run?id=${runId}`,
    }),
  };
};
