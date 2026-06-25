function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-gemini-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(bodyObj),
  };
}

function ok(bodyObj = {}) {
  return json(200, { ok: true, ...bodyObj });
}

function bad(statusCode, message, extra = {}) {
  return json(statusCode, { ok: false, error: message, ...extra });
}

function preflight(bodyObj = {}) {
  return ok({ method: "OPTIONS", ...bodyObj });
}

const options = preflight;

module.exports = { corsHeaders, json, ok, bad, options, preflight };
