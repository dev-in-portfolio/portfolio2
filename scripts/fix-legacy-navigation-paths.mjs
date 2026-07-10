import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const roots = ['home', 'apps', 'about', 'contact', 'utilities', 'capabilities'];
const allowedExtensions = new Set(['.js', '.mjs', '.html', '.json']);
const skippedDirectories = new Set([
  '.git', '.github', '.netlify', 'node_modules', 'dist', 'archive',
  'source_backups', 'reports', 'private'
]);
const replacements = new Map([
  ['https://dev-in-portfolio-home.netlify.app/', 'https://dev-in-portfolio.netlify.app/'],
  ['https://dev-in-portfolio-apps.netlify.app/', 'https://dev-in-portfolio.netlify.app/apps/'],
  ['https://dev-in-portfolio-utilities.netlify.app/', 'https://dev-in-portfolio.netlify.app/tools/'],
  ['https://dev-in-portfolio-capabilities.netlify.app/', 'https://dev-in-portfolio.netlify.app/capabilities/'],
  ['https://dev-in-portfolio-about.netlify.app/', 'https://dev-in-portfolio.netlify.app/about/'],
  ['https://dev-in-portfolio-contact.netlify.app/', 'https://dev-in-portfolio.netlify.app/contact/']
]);

const toPosix = value => value.split(path.sep).join('/');
const changed = [];
let scanned = 0;
let replacementsApplied = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.(?:bak|backup|old|orig|map)$/i.test(entry.name)) continue;
    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const relative = toPosix(path.relative(rootDir, absolute));
    if (relative === 'capabilities/index.html') continue;
    if (relative.endsWith('/nexus-canonical-routes.js')) continue;
    if (relative.includes('/coverage-compass/')) continue;

    scanned += 1;
    const original = await readFile(absolute, 'utf8');
    let updated = original;
    let fileReplacementCount = 0;
    for (const [legacy, canonical] of replacements) {
      const pieces = updated.split(legacy);
      if (pieces.length > 1) {
        fileReplacementCount += pieces.length - 1;
        updated = pieces.join(canonical);
      }
    }

    if (updated !== original) {
      await writeFile(absolute, updated, 'utf8');
      replacementsApplied += fileReplacementCount;
      changed.push({ path: relative, replacements: fileReplacementCount });
    }
  }
}

for (const root of roots) {
  const absolute = path.join(rootDir, root);
  try {
    if ((await stat(absolute)).isDirectory()) await walk(absolute);
  } catch {
    // Missing optional root: nothing to migrate.
  }
}

console.log(`Scanned ${scanned} active source files.`);
console.log(`Updated ${changed.length} files with ${replacementsApplied} canonical route replacements.`);
for (const file of changed) console.log(`- ${file.path}: ${file.replacements}`);
