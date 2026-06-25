const fs = require("fs");
const path = require("path");

function loadPacks() {
  // repo root at runtime is the function bundle dir; we walk up to project root
  const root = path.join(__dirname, "..", "..");
  const packsPath = path.join(root, "site", "agents", "assets", "data", "packs.json");
  const raw = fs.readFileSync(packsPath, "utf-8");
  return JSON.parse(raw);
}

exports.handler = async function(event, context) {
  try {
    const packs = loadPacks().map(p => ({
      slug: p.slug,
      name: p.name,
      file: `/agents/assets/packs/${p.slug}.agentpack.zip`,
      extra: (p.slug === "pack-z") ? { image: "/apps/agents/assets/packs/no-soup-for-you.png" } : undefined
    }));
    return { statusCode: 200, headers: { "content-type":"application/json" }, body: JSON.stringify({ packs }) };
  } catch (e) {
    return { statusCode: 500, headers: { "content-type":"application/json" }, body: JSON.stringify({ error: "failed_to_load_packs", message: String(e) }) };
  }
};
