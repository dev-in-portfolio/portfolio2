const fs = require("fs");
const path = require("path");

const AGENTS_ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_BASE = "/apps/agents";

function loadPacks() {
  const packsPath = path.join(AGENTS_ROOT, "assets", "data", "packs.json");
  return JSON.parse(fs.readFileSync(packsPath, "utf-8"));
}

exports.handler = async function(event, context) {
  try {
    const packs = loadPacks().map((pack) => ({
      slug: pack.slug,
      name: pack.name,
      file: `${PUBLIC_BASE}/assets/packs/${pack.slug}.agentpack.zip`,
      extra:
        pack.slug === "pack-z"
          ? { image: `${PUBLIC_BASE}/assets/packs/no-soup-for-you.png` }
          : undefined,
    }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packs }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "failed_to_load_packs",
        message: String(error),
      }),
    };
  }
};
