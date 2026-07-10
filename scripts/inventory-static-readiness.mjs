import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const appsRoot = path.join(rootDir, 'apps');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/static-targets.registry.json'), 'utf8'));
const shouldWrite = process.argv.includes('--write');
const errors = [];
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: registry.schemaVersion,
  summary: {},
  targets: []
};

const toPosix = value => value.split(path.sep).join('/');
const localDataExtension = /\.(?:json|txt|csv|tsv|xml|glsl|wgsl|wasm|svg|png|jpe?g|webp|gif|ico|mp3|wav|ogg|mp4|webm|vtt|pdf)(?:[?#]|$)/i;

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
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute, base));
    else if (entry.isFile()) files.push(toPosix(path.relative(base, absolute)));
  }
  return files;
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

function isLocalModuleSpecifier(reference) {
  const clean = cleanReference(reference);
  return clean.startsWith('./') || clean.startsWith('../') || clean.startsWith('/');
}

function collectHtmlResources(html) {
  const references = [];
  const externalScriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi;
  for (const match of html.matchAll(externalScriptPattern)) references.push({ reference: match[1], kind: 'script' });

  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const tagPattern = /<(link|img|source|video|audio|iframe)\b[^>]*>/gi;
  const attributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;
  for (const tagMatch of withoutScripts.matchAll(tagPattern)) {
    const kind = tagMatch[1].toLowerCase();
    for (const attributeMatch of tagMatch[0].matchAll(attributePattern)) {
      references.push({ reference: attributeMatch[1], kind });
    }
  }
  return references;
}

function collectCssUrls(css) {
  const references = [];
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  for (const match of css.matchAll(pattern)) references.push(match[1].trim());
  return references;
}

function collectJavaScriptReferences(js) {
  const files = [];
  const endpoints = [];
  const workers = [];

  const serviceWorkerPattern = /serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(serviceWorkerPattern)) {
    workers.push({ reference: match[1], kind: 'service-worker' });
  }

  const workerPattern = /new\s+(?:Shared)?Worker\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(workerPattern)) {
    workers.push({ reference: match[1], kind: 'worker' });
  }

  const importPattern = /(?:\bimport\s*(?:\([^)]*\)|[^;]*?\bfrom\s*)|\bexport\s+[^;]*?\bfrom\s*)["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(importPattern)) {
    if (isLocalModuleSpecifier(match[1])) files.push({ reference: match[1], kind: 'module-import' });
  }

  const fetchPattern = /\bfetch\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of js.matchAll(fetchPattern)) {
    const reference = match[1];
    if (isRuntimeEndpoint(reference) || isExternal(reference)) {
      endpoints.push(reference);
    } else if (localDataExtension.test(reference)) {
      files.push({ reference, kind: 'fetch-file' });
    } else {
      endpoints.push(reference);
    }
  }

  return { files, endpoints, workers };
}

function resolveSourceReference(baseFile, reference) {
  const clean = cleanReference(reference);
  if (!clean || clean.startsWith('#') || clean.startsWith('data:') || clean.startsWith('blob:') || isExternal(clean) || clean.includes('${')) {
    return null;
  }
  if (clean.startsWith('/')) return path.join(appsRoot, clean.replace(/^\/+/, ''));
  return path.resolve(path.dirname(baseFile), clean);
}

async function addResource(result, seenResources, baseFile, reference, kind, discoveredFrom) {
  if (kind === 'module-import' && !isLocalModuleSpecifier(reference)) return null;
  const source = resolveSourceReference(baseFile, reference);
  if (!source) return null;
  const key = path.resolve(source);
  if (seenResources.has(key)) return source;
  seenResources.add(key);
  const present = await exists(source);
  const record = {
    reference,
    kind,
    sourcePath: toPosix(path.relative(rootDir, source)),
    present,
    discoveredFrom
  };
  result.resources.push(record);
  if (!present) errors.push(`${result.id}: missing ${kind} ${reference} -> ${record.sourcePath}`);
  return present ? source : null;
}

if (registry.schemaVersion !== 1) errors.push(`Unsupported static-target registry schemaVersion: ${registry.schemaVersion}`);
if (!Array.isArray(registry.targets)) errors.push('static-targets.registry.json: targets must be an array');

for (const target of registry.targets || []) {
  const appRoot = path.join(rootDir, target.sourcePath);
  const entryPath = path.join(appRoot, target.entryFile);
  const result = {
    id: target.id,
    sourcePath: target.sourcePath,
    publicRoute: target.publicRoute,
    runtimeClass: target.runtimeClass,
    entryPresent: false,
    title: null,
    resourceCount: 0,
    resources: [],
    serviceWorkers: [],
    runtimeEndpoints: [],
    inspectedScripts: [],
    fileCount: 0,
    totalBytes: 0,
    largestFile: null,
    backupFiles: [],
    sourceMapFiles: [],
    warnings: [],
    readiness: 'unknown'
  };

  if (!await exists(entryPath)) {
    errors.push(`${target.id}: missing entry ${target.sourcePath}/${target.entryFile}`);
    result.readiness = 'blocked';
    report.targets.push(result);
    continue;
  }
  result.entryPresent = true;

  const html = await readFile(entryPath, 'utf8');
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  result.title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;
  if (!result.title) result.warnings.push('missing-title');

  const seenResources = new Set();
  const scriptSources = [];
  const htmlResources = collectHtmlResources(html);
  for (const item of htmlResources) {
    const source = await addResource(result, seenResources, entryPath, item.reference, item.kind, target.entryFile);
    if (!source) continue;

    if (item.kind === 'script' && /\.m?js$/i.test(cleanReference(item.reference))) scriptSources.push(source);
    if (item.kind === 'link' && /\.css$/i.test(cleanReference(item.reference))) {
      const css = await readFile(source, 'utf8');
      for (const cssReference of collectCssUrls(css)) {
        await addResource(
          result,
          seenResources,
          source,
          cssReference,
          'css-url',
          toPosix(path.relative(appRoot, source))
        );
      }
    }
  }

  for (const scriptSource of scriptSources) {
    const js = await readFile(scriptSource, 'utf8');
    const discoveredFrom = toPosix(path.relative(appRoot, scriptSource));
    result.inspectedScripts.push(discoveredFrom);
    const references = collectJavaScriptReferences(js);

    for (const worker of references.workers) {
      const source = await addResource(result, seenResources, scriptSource, worker.reference, worker.kind, discoveredFrom);
      result.serviceWorkers.push({
        reference: worker.reference,
        kind: worker.kind,
        sourcePath: source ? toPosix(path.relative(rootDir, source)) : null,
        present: Boolean(source),
        discoveredFrom
      });
    }

    for (const file of references.files) {
      await addResource(result, seenResources, scriptSource, file.reference, file.kind, discoveredFrom);
    }

    for (const endpoint of references.endpoints) {
      if (!result.runtimeEndpoints.includes(endpoint)) result.runtimeEndpoints.push(endpoint);
    }
  }

  const files = await walkFiles(appRoot);
  result.fileCount = files.length;
  for (const relative of files) {
    const absolute = path.join(appRoot, relative);
    const details = await stat(absolute);
    result.totalBytes += details.size;
    if (!result.largestFile || details.size > result.largestFile.bytes) {
      result.largestFile = { path: relative, bytes: details.size };
    }
    if (/\.(?:bak|backup|old|orig)$/i.test(relative)) result.backupFiles.push(relative);
    if (/\.map$/i.test(relative)) result.sourceMapFiles.push(relative);
  }

  result.resourceCount = result.resources.length;
  if (result.backupFiles.length > 0) result.warnings.push(`backup-files:${result.backupFiles.length}`);
  if (result.sourceMapFiles.length > 0) result.warnings.push(`source-maps:${result.sourceMapFiles.length}`);
  if (result.fileCount === 1) result.warnings.push('single-file-application');
  if (result.largestFile?.bytes > 1_000_000) result.warnings.push(`monolithic-file:${result.largestFile.path}`);
  if (result.runtimeEndpoints.length > 0) result.warnings.push(`runtime-endpoints:${result.runtimeEndpoints.length}`);
  result.readiness = result.warnings.length > 0 ? 'static-candidate-with-warnings' : 'static-candidate';
  report.targets.push(result);
}

const counts = report.targets.reduce((summary, target) => {
  summary[target.readiness] = (summary[target.readiness] || 0) + 1;
  return summary;
}, {});
report.summary = {
  expectedTargets: registry.expectedTargetCount,
  checkedTargets: report.targets.length,
  readinessCounts: counts,
  totalFiles: report.targets.reduce((sum, target) => sum + target.fileCount, 0),
  totalBytes: report.targets.reduce((sum, target) => sum + target.totalBytes, 0),
  totalResources: report.targets.reduce((sum, target) => sum + target.resourceCount, 0),
  totalWorkers: report.targets.reduce((sum, target) => sum + target.serviceWorkers.length, 0),
  totalRuntimeEndpoints: report.targets.reduce((sum, target) => sum + target.runtimeEndpoints.length, 0),
  totalWarnings: report.targets.reduce((sum, target) => sum + target.warnings.length, 0)
};

console.log('NEXUS local static application readiness');
console.log(`- Targets: ${report.summary.checkedTargets}`);
console.log(`- Readiness: ${JSON.stringify(report.summary.readinessCounts)}`);
console.log(`- Files inventoried: ${report.summary.totalFiles}`);
console.log(`- Source bytes: ${report.summary.totalBytes}`);
console.log(`- Local resources checked: ${report.summary.totalResources}`);
console.log(`- Workers found: ${report.summary.totalWorkers}`);
console.log(`- Runtime endpoints found: ${report.summary.totalRuntimeEndpoints}`);
for (const target of report.targets) {
  console.log(`\n${target.id}: ${target.readiness}`);
  console.log(`  title: ${target.title || 'none'}`);
  console.log(`  files: ${target.fileCount}; bytes: ${target.totalBytes}; resources: ${target.resourceCount}`);
  console.log(`  inspected scripts: ${target.inspectedScripts.length}; workers: ${target.serviceWorkers.length}; endpoints: ${target.runtimeEndpoints.length}`);
  if (target.largestFile) console.log(`  largest: ${target.largestFile.path} (${target.largestFile.bytes} bytes)`);
  for (const warning of target.warnings) console.log(`  warning: ${warning}`);
}

if (shouldWrite) {
  const outputDir = path.join(rootDir, 'reports/reforge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'static-readiness.json');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${toPosix(path.relative(rootDir, outputPath))}`);
}

if (errors.length > 0) {
  console.error(`\nStatic readiness failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nStatic readiness structural inventory passed. Browser behavior, API correctness, persistence, and accessibility remain separate verification gates.');
