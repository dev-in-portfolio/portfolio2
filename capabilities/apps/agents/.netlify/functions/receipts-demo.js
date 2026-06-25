exports.handler = async function(event, context) {
  const runs = [
    { id: "sample_run_001", href: "/apps/agents/assets/sample-runs/sample_run_001.receipts.json" }
  ];
  return { statusCode: 200, headers: { "content-type":"application/json" }, body: JSON.stringify({ runs }) };
};
