import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registryPath = path.join(rootDir, 'data/source-roots.registry.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const shouldWrite = process.argv.includes('--write');
const errors = [];
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: registry.schemaVersion,
  roots: [],
  sharedFamilies: [],
  backupFiles: []
};

const normalizeRoot = value => value === '.' ? rootDir : path.join(rootDir, value);

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256(target) {
  const content = await readFile(target);
  return createHash('sha256').update(content).digest('hex');
}

async function walk(directory, base = directory) {
  const results = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walk(absolute, base));
    } else if (entry.isFile()) {
      results.push(path.relative(base, absolute).split(path.sep).join('/'));
    }
  }
  return results;
}

if (registry.schemaVersion !== 1) {
  errors.push(`Unsupported source-root registry schemaVersion: ${registry.schemaVersion}`);
}

if (!Array.isArray(registry.roots) || registry.roots.length === 0) {
  errors.push('source-roots.registry.json must contain at least one root');
}

const rootIds = new Set();
const routes = new Set();
for (const root of registry.roots || []) {
  if (!root.id || !root.path || !root.role || !root.route) {
    errors.push(`Invalid root record: ${JSON.stringify(root)}`);
    continue;
  }
  if (rootIds.has(root.id)) errors.push(`Duplicate source-root id: ${root.id}`);
  rootIds.add(root.id);
  if (routes.has(root.route)) errors.push(`Duplicate source-root route: ${root.route}`);
  routes.add(root.route);

  const absoluteRoot = normalizeRoot(root.path);
  const rootResult = {
    id: root.id,
    path: root.path,
    role: root.role,
    route: root.route,
    canonicalStatus: root.canonicalStatus,
    requiredPaths: [],
    optionalPaths: []
  };

  if (!await exists(absoluteRoot)) {
    errors.push(`${root.id}: root path does not exist (${root.path})`);
    rootResult.exists = false;
    report.roots.push(rootResult);
    continue;
  }
  rootResult.exists = true;

  for (const requiredPath of root.requiredPaths || []) {
    const target = path.join(absoluteRoot, requiredPath);
    const present = await exists(target);
    rootResult.requiredPaths.push({ path: requiredPath, present });
    if (!present) errors.push(`${root.id}: missing required path ${requiredPath}`);
  }

  for (const optionalPath of root.optionalPaths || []) {
    const target = path.join(absoluteRoot, optionalPath);
    rootResult.optionalPaths.push({ path: optionalPath, present: await exists(target) });
  }

  report.roots.push(rootResult);
}

console.log('NEXUS copied-root inventory');
console.log(`- Registered roots: ${(registry.roots || []).length}`);
console.log(`- Registered shared families: ${(registry.sharedFamilies || []).length}`);

for (const family of registry.sharedFamilies || []) {
  const copies = [];
  for (const root of registry.roots || []) {
    if (root.path === '.') continue;
    const target = path.join(normalizeRoot(root.path), family);
    if (!await exists(target)) continue;
    copies.push({ root: root.id, path: `${root.path}/${family}`, hash: await sha256(target) });
  }

  if (copies.length === 0) continue;
  const uniqueHashes = [...new Set(copies.map(copy => copy.hash))];
  const state = uniqueHashes.length === 1 ? 'identical' : 'diverged';
  report.sharedFamilies.push({ family, state, uniqueHashCount: uniqueHashes.length, copies });

  console.log(`\n${family}: ${state.toUpperCase()} across ${copies.length} root(s)`);
  for (const copy of copies) console.log(`  - ${copy.root}: ${copy.hash.slice(0, 16)} ${copy.path}`);
}

const backupSuffixes = registry.backupPatterns || [];
for (const root of registry.roots || []) {
  if (root.path === '.') continue;
  const files = await walk(normalizeRoot(root.path));
  for (const relativePath of files) {
    if (backupSuffixes.some(suffix => relativePath.toLowerCase().endsWith(suffix))) {
      report.backupFiles.push(`${root.path}/${relativePath}`);
    }
  }
}
report.backupFiles.sort();

console.log(`\nPublic backup artifacts found: ${report.backupFiles.length}`);
for (const backup of report.backupFiles) console.log(`  - ${backup}`);

if (shouldWrite) {
  const outputDir = path.join(rootDir, 'reports/reforge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'source-root-inventory.json');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`- Wrote ${path.relative(rootDir, outputPath)}`);
}

if (errors.length > 0) {
  console.error(`\nSource-root inventory failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nSource-root inventory passed. Divergence and backup files are reported for migration review but are not automatically deleted.');
