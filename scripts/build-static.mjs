import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "public");
const dst = path.join(root, "dist");

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
fs.cpSync(src, dst, { recursive: true });

console.log("Static build complete:", { from: "public", to: "dist" });
