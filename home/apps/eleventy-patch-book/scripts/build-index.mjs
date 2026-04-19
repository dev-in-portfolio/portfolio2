import fs from "fs/promises";
import path from "path";

const patchesDir = path.join("src", "patches");
const files = await fs.readdir(patchesDir);

const index = [];

for (const file of files) {
  if (!file.endsWith(".md")) continue;
  const raw = await fs.readFile(path.join(patchesDir, file), "utf-8");
  const match = raw.match(/---([\s\S]*?)---/);
  if (!match) continue;
  const front = match[1];
  const data = {};
  front.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return;
    const value = rest.join(":").trim();
    data[key.trim()] = value;
  });

  const slug = data.slug?.replace(/"/g, "");
  const title = data.title?.replace(/"/g, "");
  const tags = data.tags ? JSON.parse(data.tags.replace(/'/g, '"')) : [];
  const risk = data.risk?.replace(/"/g, "");
  const body = raw.replace(/---[\s\S]*?---/, "").trim();
  index.push({
    slug,
    title,
    tags,
    risk,
    excerpt: body.slice(0, 160),
  });
}

await fs.writeFile(path.join("src", "_data", "patch-index.json"), JSON.stringify(index, null, 2));
