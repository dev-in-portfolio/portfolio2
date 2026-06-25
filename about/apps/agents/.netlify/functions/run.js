const fs = require("fs");
const path = require("path");

const AGENTS_ROOT = path.resolve(__dirname, "..", "..");

function readJson(...segments) {
  const filePath = path.join(AGENTS_ROOT, ...segments);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

exports.handler = async function(event, context) {
  const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
  const map = {
    sample_run_001: ["assets", "sample-runs", "sample_run_001.receipts.json"],
  };

  if (!map[id]) {
    return {
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "unknown_run", id }),
    };
  }

  try {
    const receipts = readJson(...map[id]);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipts),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "failed_to_read_receipts",
        message: String(error),
      }),
    };
  }
};
