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
const copiedDependencies = new Map();
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
  dependencyStrategy: 'resolve-root-and-external-relative-references',
  applicationCount: 0,
  sharedDependencies: [],
  applications: []
};

const toPosix = value => value.split(path.sep).join('/');
const localFileExtension = /\.(?:js|mjs|css|json|txt|csv|tsv|xml|glsl|wgsl|wasm|svg|png|jpe?g|webp|gif|ico|mp3|wav|ogg|mp4|webm|vtt|pdf|webmanifest)(?:[?#]|$)/i;

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

function isRuntimeEndpoint(reference) {
  const clean = cleanReference(reference);
  return clean.startsWith('/api/') || clean.startsWith('/.netlify/functions/') || clean.startsWith('api/');
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function collectHtmlReferences(html) {
  const references = [];
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) references.push({ reference: match[1], kind: 'script' });

  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const tagPattern = /<(link|img|source|video|audio|iframe)\b[^>]*>/gi;
  const attributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;
  for (const tagMatch of withoutScripts.matchAll(tagPattern)) {
    const kind = tagMatch[1].toLowerCase();
    for (const attributeMatch of tagMatch[0].matchAll(attributePattern)) {
      references.push({ reference: attributeMatch[1], kind });
    }
  }

  const inlineWorkerPattern = /serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of html.matchAll(inlineWorkerPattern)) references.push({ reference: match[1], kind: 'service-worker' });
  return references;
}

function collectCssReferences(css) {
  const references = [];
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  for (const match of css.matchAll(pattern)) references.push({ reference: match[1].trim(), kind: 'css-url' });
  return references;
}

function collectJavaScriptReferences(js) {
  const references = [];

  const serviceWorkerPattern = /serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(serviceWorkerPattern)) references.push({ reference: match[1], kind: 'service-worker' });

  const workerPattern = /new\s+(?:Shared)?Worker\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(workerPattern)) references.push({ reference: match[1], kind: 'worker' });

  const importPattern = /(?:\bimport\s*(?:\([^)]*\)|[^;]*?\bfrom\s*)|\bexport\s+[^;]*?\bfrom\s*)["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(importPattern)) references.push({ reference: match[1], kind: 'module-import' });

  const fetchPattern = /\bfetch\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(fetchPattern)) {
    const reference = match[1];
    if (!isExternal(reference) && !isRuntimeEndpoint(reference) && localFileExtension.test(reference)) {
      references.push({ reference, kind: 'fetch-file' });
    }
  }

  return references;
}

function resolveReference(sourceBaseFile, destinationBaseFile, reference) {
  const clean = cleanReference(reference);
  if (!clean || clean.startsWith('#') || clean.startsWith('data:') || clean.startsWith('blob:') || isExternal(clean) || clean.includes('${')) return null;

  if (clean.startsWith('/')) {
    const relative = clean.replace(/^\/+/, '');
    return {
      clean,
      source: path.join(appsRoot, relative),
      destination: path.join(outputRoot, relative),
      scope: 'root-absolute'
    };
  }

  return {
    clean,
    source: path.resolve(path.dirname(sourceBaseFile), clean),
    destination: path.resolve(path.dirname(destinationBaseFile), clean),
    scope: 'relative'
  };
}

async function copyDependency(appId, appSourceRoot, sourceBaseFile, destinationBaseFile, item, seen) {
  const resolved = resolveReference(sourceBaseFile, destinationBaseFile, item.reference);
  if (!resolved) return null;

  if (!inside(outputRoot, resolved.destination)) {
    errors.push(`${appId}: dependency escapes output ${item.reference} -> ${toPosix(path.relative(rootDir, resolved.destination))}`);
    return null;
  }

  const key = `${path.resolve(resolved.source)}=>${path.resolve(resolved.destination)}`;
  if (seen.has(key)) return copiedDependencies.get(key) || null;
  seen.add(key);

  if (!await exists(resolved.source)) {
    errors.push(`${appId}: missing ${item.kind} ${item.reference} -> ${toPosix(path.relative(rootDir, resolved.source))}`);
    return null;
  }

  const sourceStats = await stat(resolved.source);
  if (!sourceStats.isFile()) {
    errors.push(`${appId}: dependency is not a file ${item.reference} -> ${toPosix(path.relative(rootDir, resolved.source))}`);
    return null;
  }

  const sourceInsideApp = inside(appSourceRoot, resolved.source);
  const destinationPresent = await exists(resolved.destination);
  if (!sourceInsideApp || !destinationPresent) {
    if (!shouldInclude(resolved.source)) {
      errors.push(`${appId}: referenced dependency is excluded by deployment policy ${item.reference}`);
      return null;
    }
    await mkdir(path.dirname(resolved.destination), { recursive: true });
    await cp(resolved.source, resolved.destination, { force: true });
  }

  const dependencyKey = path.resolve(resolved.destination);
  let record = copiedDependencies.get(dependencyKey);
  if (!record) {
    record = {
      sourcePath: toPosix(path.relative(rootDir, resolved.source)),
      outputPath: toPosix(path.relative(rootDir, resolved.destination)),
      publicReference: item.reference,
      scope: resolved.scope,
      kinds: [item.kind],
      requestedBy: [appId],
      bytes: sourceStats.size,
      sha256: await hashFile(resolved.destination)
    };
    copiedDependencies.set(dependencyKey, record);
  } else {
    if (!record.requestedBy.includes(appId)) record.requestedBy.push(appId);
    if (!record.kinds.includes(item.kind)) record.kinds.push(item.kind);
  }

  const extension = path.extname(resolved.source).toLowerCase();
  let nested = [];
  if (extension === '.css') nested = collectCssReferences(await readFile(resolved.source, 'utf8'));
  if (extension === '.js' || extension === '.mjs') nested = collectJavaScriptReferences(await readFile(resolved.source, 'utf8'));
  for (const nestedItem of nested) {
    await copyDependency(appId, appSourceRoot, resolved.source, resolved.destination, nestedItem, seen);
  }

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
  const references = collectHtmlReferences(html);
  const dependencyResults = [];
  const seen = new Set();
  for (const item of references) {
    const resolved = resolveReference(sourceEntry, destinationEntry, item.reference);
    if (!resolved) continue;
    const sourceInsideApp = inside(source, resolved.source);
    const record = await copyDependency(target.id, source, sourceEntry, destinationEntry, item, seen);
    dependencyResults.push({
      reference: item.reference,
      kind: item.kind,
      scope: resolved.scope,
      sourceInsideApp,
      sourcePath: toPosix(path.relative(rootDir, resolved.source)),
      outputPath: toPosix(path.relative(rootDir, resolved.destination)),
      present: Boolean(record) && await exists(resolved.destination)
    });
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
    dependencyResults,
    externalDependencyCount: dependencyResults.filter(result => !result.sourceInsideApp).length,
    dependenciesResolved: dependencyResults.every(result => result.present)
  });
}

manifest.applicationCount = manifest.applications.length;
if (manifest.applicationCount !== registry.expectedTargetCount) {
  errors.push(`Assembled ${manifest.applicationCount} static applications; expected ${registry.expectedTargetCount}`);
}
manifest.sharedDependencies = [...copiedDependencies.values()].sort((a, b) => a.outputPath.localeCompare(b.outputPath));

const manifestPath = path.join(outputRoot, 'static-apps-manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${manifest.applicationCount} static applications into ${toPosix(path.relative(rootDir, outputRoot))}`);
console.log(`- resolved shared dependencies: ${manifest.sharedDependencies.length}`);
for (const app of manifest.applications) {
  console.log(`- ${app.id}: ${app.publicRoute} (${app.fileCount} files, ${app.totalBytes} bytes, external dependencies: ${app.externalDependencyCount}, resolved: ${app.dependenciesResolved ? 'yes' : 'no'})`);
}

if (errors.length > 0) {
  console.error(`Static assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Static assembly manifest: ${toPosix(path.relative(rootDir, manifestPath))}`);
