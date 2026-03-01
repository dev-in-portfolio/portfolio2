require("dotenv").config();
const express = require("express");
const path = require("path");
const { security, rateLimit } = require("./middleware/security");
const angleRoutes = require("./apps/angle/routes");
const { getPool } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

security(app);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));
app.use(angleRoutes);

app.get("/", (req, res) => {
  res.render("index", { title: "Angle" });
});

app.get("/history", async (req, res) => {
  const userKey = req.headers["x-user-key"];
  if (!userKey) {
    return res.render("history", { title: "Angle History", runs: [], error: "Missing user key.", page: 1, hasNext: false });
  }
  try {
    const pool = getPool();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      "SELECT id, input, classification, created_at FROM angle_runs WHERE user_key = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userKey, limit, offset]
    );
    const hasNext = rows.length === limit;
    return res.render("history", { title: "Angle History", runs: rows, error: null, page, hasNext });
  } catch (err) {
    return res.render("history", { title: "Angle History", runs: [], error: "Could not load history.", page: 1, hasNext: false });
  }
});

app.get("/run/:id", async (req, res) => {
  const userKey = req.headers["x-user-key"];
  if (!userKey) {
    return res.render("run", { title: "Angle Run", run: null, error: "Missing user key." });
  }
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, input, classification, outputs, created_at FROM angle_runs WHERE id = $1 AND user_key = $2",
      [req.params.id, userKey]
    );
    if (!rows.length) {
      return res.render("run", { title: "Angle Run", run: null, error: "Run not found." });
    }
    return res.render("run", { title: "Angle Run", run: rows[0], error: null });
  } catch (err) {
    return res.render("run", { title: "Angle Run", run: null, error: "Could not load run." });
  }
});

app.get("/health", async (req, res) => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`Angle running on http://localhost:${PORT}`);
});

module.exports = app;
