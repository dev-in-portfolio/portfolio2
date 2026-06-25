const { ok, bad, options } = require("./_cors");

/**
 * POST body: { prompt: string, model?: string }
 * Header: x-gemini-key: <BYO key>
 *
 * This is intentionally BYO-key so you never store a provider key server-side.
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();
  if (event.httpMethod !== "POST") return bad(405, "Method not allowed");

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return bad(400, "Invalid JSON");
  }

  const prompt = String(payload.prompt || "").trim();
  if (!prompt) return bad(400, "Missing prompt");

  const key = event.headers["x-gemini-key"] || event.headers["X-Gemini-Key"];
  if (!key) {
    return bad(401, "Missing x-gemini-key header (BYO key required)");
  }

  const model = payload.model || "gemini-1.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return bad(res.status, "Gemini request failed", { provider: data });
    }

    // Normalize to a simple shape for front-end convenience
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
      "";

    return ok({ ok: true, text, raw: data });
  } catch (err) {
    return bad(500, "Fetch failed", { detail: String(err?.message || err) });
  }
};
