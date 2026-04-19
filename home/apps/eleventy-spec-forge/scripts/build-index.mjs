import fs from "fs/promises";
import path from "path";

const specsPath = path.join("src", "_data", "specs.json");
const raw = await fs.readFile(specsPath, "utf-8");
const specs = JSON.parse(raw);

const index = specs.map((spec) => ({
  id: spec.id,
  title: spec.title,
  tags: spec.tags || [],
  status: spec.status,
  excerpt: spec.overview.slice(0, 160),
}));

await fs.writeFile(path.join("src", "_data", "spec-index.json"), JSON.stringify(index, null, 2));
