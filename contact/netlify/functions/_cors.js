function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-gemini-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

function ok(bodyObj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(bodyObj),
  };
}

function bad(statusCode, message, extra = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify({ ok: false, error: message, ...extra }),
  };
}

function options() {
  return {
    statusCode: 204,
    headers: corsHeaders(),
    body: "",
  };
}

module.exports = { corsHeaders, ok, bad, options };
