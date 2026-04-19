import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

const specsDir = path.join("src", "specs");
const files = await fs.readdir(specsDir);
const specs = [];

for (const file of files) {
  if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
  const raw = await fs.readFile(path.join(specsDir, file), "utf-8");
  const spec = yaml.load(raw);
  
  spec.id = spec.id || path.basename(file, path.extname(file));
  spec.status = spec.status || "draft";
  spec.owner = spec.owner || "platform";
  spec.updated_at = spec.updated_at || new Date().toISOString().split("T")[0];
  
  specs.push(spec);
}

await fs.writeFile(path.join("src", "_data", "specs.json"), JSON.stringify(specs, null, 2));
