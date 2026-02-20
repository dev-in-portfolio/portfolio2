const fs = require("fs");
const path = require("path");

function readJson(rel) {
  const root = path.join(__dirname, "..", "..");
  const p = path.join(root, "site", rel);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

exports.handler = async function(event, context) {
  const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
  const map = {
    "sample_run_001": "agents/assets/sample-runs/sample_run_001.receipts.json"
  };
  if (!map[id]) {
    return { statusCode: 404, headers: { "content-type":"application/json" }, body: JSON.stringify({ error: "unknown_run", id }) };
  }
  try {
    const receipts = readJson(map[id]);
    return { statusCode: 200, headers: { "content-type":"application/json" }, body: JSON.stringify(receipts) };
  } catch (e) {
    return { statusCode: 500, headers: { "content-type":"application/json" }, body: JSON.stringify({ error: "failed_to_read_receipts", message: String(e) }) };
  }
};
