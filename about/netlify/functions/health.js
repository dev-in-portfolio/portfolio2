const { ok, options } = require("./_cors");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();

  return ok({
    ok: true,
    service: "portfolio-backend",
    time: new Date().toISOString(),
  });
};
