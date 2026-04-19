import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

const patchesDir = path.join("src", "patches");
const files = await fs.readdir(patchesDir);

const required = ["slug", "title", "tags", "risk"];
const validRisk = new Set(["low", "medium", "high"]);
const validEnvironments = new Set(["production", "staging", "development", "all"]);

const seen = new Set();
const errors = [];

for (const file of files) {
  if (!file.endsWith(".md")) continue;
  const raw = await fs.readFile(path.join(patchesDir, file), "utf-8");
  const match = raw.match(/---([\s\S]*?)---/);
  if (!match) {
    errors.push(`${file}: missing front matter`);
    continue;
  }
  
  try {
    const front = match[1];
    const data = yaml.load(front);

    required.forEach((field) => {
      if (!data[field]) errors.push(`${file}: missing ${field}`);
    });

    const slug = data.slug;
    if (slug && seen.has(slug)) errors.push(`${file}: duplicate slug ${slug}`);
    if (slug) seen.add(slug);

    if (data.tags && !Array.isArray(data.tags)) {
      errors.push(`${file}: tags must be an array`);
    }

    if (data.risk && !validRisk.has(data.risk)) {
      errors.push(`${file}: invalid risk ${data.risk}`);
    }

    if (data.applies_to && !Array.isArray(data.applies_to)) {
      errors.push(`${file}: applies_to must be an array`);
    }

    if (data.environment && !validEnvironments.has(data.environment)) {
      errors.push(`${file}: invalid environment ${data.environment}`);
    }

    if (data.version_range && typeof data.version_range !== "string") {
      errors.push(`${file}: version_range must be a string`);
    }

    if (data.confidence !== undefined && (typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 100)) {
      errors.push(`${file}: confidence must be a number between 0 and 100`);
    }

    if (!raw.includes("```patch") && !raw.includes("```bash") && !raw.includes("```sh")) {
      errors.push(`${file}: missing patch or bash code block`);
    }
  } catch (error) {
    errors.push(`${file}: invalid front matter YAML: ${error.message}`);
  }
}

if (errors.length) {
  console.error("Validation failed:\n" + errors.join("\n"));
  process.exit(1);
}

console.log("Patch validation passed.");
