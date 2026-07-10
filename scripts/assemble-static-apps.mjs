import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const appsRoot = path.join(rootDir, 'apps');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const outputRoot = path.resolve(rootDir, valueFor('--output') || 'dist');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/static-targets.registry.json'), 'utf8'));
const errors = [];
const copiedRootDependencies = new Map();
const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: path.relative(rootDir, outputRoot).split(path.sep).join('/'),
  exclusionPolicy: [
    'node_modules',
    'dist',
    '.git',
    'private',
    'source_backups',
    'tests',
    'reports',
    '*.bak',
    '*.backup',
    '*.old',
    '*.orig',
    '*.map'
  ],
  applicationCount: 0,
  rootDependencies: [],
  applications: []
};

const toPosix = value => value.split(path.sep).join('/');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(directory, base = directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute, base));
    else if (entry.isFile()) files.push(path.relative(base, absolute));
  }
  return files;
}

async function hashFile(target) {
  const content = await readFile(target);
  return createHash('sha256').update(content).digest('hex');
}

function shouldInclude(source) {
  const relative = toPosix(path.relative(rootDir, source));
  const parts = relative.split('/');
  if (parts.some(part => ['node_modules', 'dist', '.git', 'private', 'source_backups', 'tests', 'reports'].includes(part))) return false;
  if (/\.(?:bak|backup|old|orig|map)$/i.test(relative)) return false;
  return true;
}

function isExternal(reference) {
  return /^(?:https?:)?\/\//i.test(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference);
}

function cleanReference(reference) {
  return String(reference || '').split(/[?#]/, 1)[0].trim();
}

function collectRootReferences(html) {
  const references = new Set();
  const externalScriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi;
  for (const match of html.matchAll(externalScriptPattern)) {
    if (match[1].startsWith('/')) references.add(match[1]);
  }

  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const tagPattern = /<(?:link|img|source|video|audio|iframe)\b[^>]*>/gi;
  const attributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;
  for (const tagMatch of withoutScripts.matchAll(tagPattern)) {
    for (const attributeMatch of tagMatch[0].matchAll(attributePattern)) {
      if (attributeMatch[1].startsWith('/')) references.add(attributeMatch[1]);
    }
  }

  const workerPattern = /serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of html.matchAll(workerPattern)) {
    if (match[1].startsWith('/')) references.add(match[1]);
  }
  return [...references].filter(reference => !isExternal(reference));
}

async function copyRootDependency(reference, appId) {
  const clean = cleanReference(reference);
  if (!clean || !clean.startsWith('/')) return null;
  const relative = clean.replace(/^\/+/, '');
  const source = path.join(appsRoot, relative);
  const destination = path.join(outputRoot, relative);
  const key = path.resolve(destination);
  if (copiedRootDependencies.has(key)) return copiedRootDependencies.get(key);

  if (!await exists(source)) {
    errors.push(`${appId}: missing root dependency ${reference} -> ${toPosix(path.relative(rootDir, source))}`);
    return null;
  }
  const details = await stat(source);
  if (!details.isFile()) {
    errors.push(`${appId}: root dependency is not a file ${reference}`);
    return null;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
  const record = {
    reference,
    requestedBy: [appId],
    sourcePath: toPosix(path.relative(rootDir, source)),
    outputPath: toPosix(path.relative(rootDir, destination)),
    bytes: details.size,
    sha256: await hashFile(destination)
  };
  copiedRootDependencies.set(key, record);
  return record;
}

await mkdir(outputRoot, { recursive: true });

for (const target of registry.targets || []) {
  const source = path.join(rootDir, target.sourcePath);
  const routePath = target.publicRoute.replace(/^\/+|\/+$/g, '');
  const destination = path.join(outputRoot, routePath);
  const sourceEntry = path.join(source, target.entryFile);

  if (!await exists(sourceEntry)) {
    errors.push(`${target.id}: missing source entry ${toPosix(path.relative(rootDir, sourceEntry))}`);
    continue;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true, filter: shouldInclude });

  const destinationEntry = path.join(destination, target.entryFile);
  if (!await exists(destinationEntry)) {
    errors.push(`${target.id}: assembled entry missing at ${target.publicRoute}`);
    continue;
  }

  const html = await readFile(sourceEntry, 'utf8');
  const rootReferences = collectRootReferences(html);
  const rootDependencyResults = [];
  for (const reference of rootReferences) {
    const record = await copyRootDependency(reference, target.id);
    if (record && !record.requestedBy.includes(target.id)) record.requestedBy.push(target.id);
    rootDependencyResults.push({ reference, present: Boolean(record) });
  }

  const files = await walkFiles(destination);
  const fileStats = await Promise.all(files.map(async relative => {
    const details = await stat(path.join(destination, relative));
    return { path: toPosix(relative), bytes: details.size };
  }));
  const largestFile = fileStats.reduce((largest, file) => !largest || file.bytes > largest.bytes ? file : largest, null);

  manifest.applications.push({
    id: target.id,
    publicRoute: target.publicRoute,
    sourcePath: target.sourcePath,
    assembledPath: toPosix(path.relative(rootDir, destination)),
    entrySha256: await hashFile(destinationEntry),
    fileCount: files.length,
    totalBytes: fileStats.reduce((sum, file) => sum + file.bytes, 0),
    largestFile,
    rootDependencyResults,
    dependenciesResolved: rootDependencyResults.every(result => result.present)
  });
}

manifest.applicationCount = manifest.applications.length;
if (manifest.applicationCount !== registry.expectedTargetCount) {
  errors.push(`Assembled ${manifest.applicationCount} static applications; expected ${registry.expectedTargetCount}`);
}
manifest.rootDependencies = [...copiedRootDependencies.values()].sort((a, b) => a.outputPath.localeCompare(b.outputPath));

const manifestPath = path.join(outputRoot, 'static-apps-manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${manifest.applicationCount} static applications into ${toPosix(path.relative(rootDir, outputRoot))}`);
console.log(`- root shell dependencies: ${manifest.rootDependencies.length}`);
for (const app of manifest.applications) {
  console.log(`- ${app.id}: ${app.publicRoute} (${app.fileCount} files, ${app.totalBytes} bytes, dependencies resolved: ${app.dependenciesResolved ? 'yes' : 'no'})`);
}

if (errors.length > 0) {
  console.error(`Static assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Static assembly manifest: ${toPosix(path.relative(rootDir, manifestPath))}`);
