import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const shouldClean = args.includes('--clean');
const outputArgument = valueFor('--output') || 'dist';
const outputRoot = path.resolve(rootDir, outputArgument);
const buildRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/build-targets.registry.json'), 'utf8'));
const errors = [];
const copiedShellFiles = new Map();
const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: path.relative(rootDir, outputRoot).split(path.sep).join('/'),
  shell: {
    sourceRoot: 'apps',
    landingPage: 'apps/index.html',
    dependencyStrategy: 'referenced-files-only',
    files: []
  },
  applicationCount: 0,
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

function isExternalReference(reference) {
  return /^(?:https?:)?\/\//i.test(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference);
}

function cleanReference(reference) {
  return reference.split(/[?#]/, 1)[0].trim();
}

function collectLandingDependencies(html) {
  const references = new Set();
  const resourceTagPattern = /<(?:script|link|img|source|video|audio|iframe)\b[^>]*>/gi;
  const resourceAttributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;
  for (const tagMatch of html.matchAll(resourceTagPattern)) {
    for (const attributeMatch of tagMatch[0].matchAll(resourceAttributePattern)) {
      references.add(attributeMatch[1].trim());
    }
  }

  const fetchLiteralPattern = /\bfetch\(\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(fetchLiteralPattern)) references.add(match[1].trim());

  return [...references].filter(reference => {
    if (!reference || reference.startsWith('#') || reference.startsWith('data:') || reference.startsWith('blob:')) return false;
    return !isExternalReference(reference);
  });
}

async function copyFileOnce(source, destination, reason, publicReference) {
  const destinationKey = path.resolve(destination);
  if (copiedShellFiles.has(destinationKey)) return copiedShellFiles.get(destinationKey);

  if (!await exists(source)) {
    errors.push(`Missing shell dependency for ${reason}: ${path.relative(rootDir, source)} (${publicReference})`);
    return null;
  }

  const sourceStats = await stat(source);
  if (!sourceStats.isFile()) {
    errors.push(`Shell dependency is not a file for ${reason}: ${path.relative(rootDir, source)}`);
    return null;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
  const record = {
    sourcePath: toPosix(path.relative(rootDir, source)),
    outputPath: toPosix(path.relative(rootDir, destination)),
    publicReference,
    reason,
    bytes: sourceStats.size,
    sha256: await hashFile(destination)
  };
  copiedShellFiles.set(destinationKey, record);
  return record;
}

async function copyLandingDependency(appsSourceRoot, reference) {
  const clean = cleanReference(reference);
  if (!clean) return null;

  if (clean.startsWith('/')) {
    const relative = clean.replace(/^\/+/, '');
    return copyFileOnce(
      path.join(appsSourceRoot, relative),
      path.join(outputRoot, relative),
      'apps-landing-root-dependency',
      reference
    );
  }

  return copyFileOnce(
    path.resolve(appsSourceRoot, clean),
    path.resolve(outputRoot, 'apps', clean),
    'apps-landing-relative-dependency',
    reference
  );
}

async function copyCompiledShellDependency(appsSourceRoot, appDestination, reference, type, appId) {
  const clean = cleanReference(reference);
  if (!clean) return null;

  let outputPath;
  if (type === 'root-shell') {
    outputPath = path.join(outputRoot, clean.replace(/^\/+/, ''));
  } else {
    outputPath = path.resolve(appDestination, clean);
    const relativeToOutput = path.relative(outputRoot, outputPath);
    if (relativeToOutput.startsWith('..') || path.isAbsolute(relativeToOutput)) {
      errors.push(`${appId}: dependency escapes assembled output ${reference}`);
      return null;
    }
  }

  const outputRelative = path.relative(outputRoot, outputPath);
  const sourcePath = path.join(appsSourceRoot, outputRelative);
  return copyFileOnce(sourcePath, outputPath, `${appId}-${type}`, reference);
}

if (shouldClean) await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const appsSourceRoot = path.join(rootDir, 'apps');
const appsLandingSource = path.join(appsSourceRoot, 'index.html');
const appsLandingOutput = path.join(outputRoot, 'apps/index.html');
if (!await exists(appsLandingSource)) {
  errors.push('Missing Apps landing page: apps/index.html');
} else {
  await mkdir(path.dirname(appsLandingOutput), { recursive: true });
  await cp(appsLandingSource, appsLandingOutput, { force: true });
  const landingHtml = await readFile(appsLandingSource, 'utf8');
  const landingDependencies = collectLandingDependencies(landingHtml);
  manifest.shell.landingDependencyCount = landingDependencies.length;
  for (const reference of landingDependencies) await copyLandingDependency(appsSourceRoot, reference);
}

for (const target of buildRegistry.targets || []) {
  const sourceDist = path.join(rootDir, target.sourcePath, 'dist');
  const routePath = target.publicRoute.replace(/^\/+|\/+$/g, '');
  const destination = path.join(outputRoot, routePath);
  const sourceIndex = path.join(sourceDist, 'index.html');

  if (!await exists(sourceIndex)) {
    errors.push(`${target.id}: compiled source index is missing at ${path.relative(rootDir, sourceIndex)}`);
    continue;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(sourceDist, destination, { recursive: true, force: true });

  const destinationIndex = path.join(destination, 'index.html');
  if (!await exists(destinationIndex)) {
    errors.push(`${target.id}: assembled route is missing index.html at ${target.publicRoute}`);
    continue;
  }

  const files = await walkFiles(destination);
  const bytes = await Promise.all(files.map(async relative => (await stat(path.join(destination, relative))).size));
  const buildReportPath = path.join(rootDir, 'reports/reforge/builds', `${target.id}.json`);
  let buildReport = null;
  if (await exists(buildReportPath)) buildReport = JSON.parse(await readFile(buildReportPath, 'utf8'));

  if (buildReport?.result !== 'passed') errors.push(`${target.id}: compiled output report is not passed`);
  if ((buildReport?.misbasedCompiledReferences || []).length > 0) {
    errors.push(`${target.id}: compiled output still contains root-absolute owned assets`);
  }

  const dependencyResults = [];
  for (const reference of buildReport?.rootAbsoluteReferences || []) {
    const record = await copyCompiledShellDependency(appsSourceRoot, destination, reference, 'root-shell', target.id);
    const clean = cleanReference(reference);
    const resolved = path.join(outputRoot, clean.replace(/^\/+/, ''));
    const present = await exists(resolved);
    dependencyResults.push({
      reference,
      resolvedPath: toPosix(path.relative(rootDir, resolved)),
      sourcePath: record?.sourcePath || null,
      present,
      type: 'root-shell'
    });
    if (!present) errors.push(`${target.id}: missing assembled root dependency ${reference}`);
  }

  for (const reference of buildReport?.externalAssemblyReferences || []) {
    const record = await copyCompiledShellDependency(appsSourceRoot, destination, reference, 'relative-shell', target.id);
    const resolved = path.resolve(destination, cleanReference(reference));
    const relativeToOutput = path.relative(outputRoot, resolved);
    const insideOutput = !(relativeToOutput.startsWith('..') || path.isAbsolute(relativeToOutput));
    const present = insideOutput && await exists(resolved);
    dependencyResults.push({
      reference,
      resolvedPath: toPosix(path.relative(rootDir, resolved)),
      sourcePath: record?.sourcePath || null,
      present,
      type: 'relative-shell'
    });
    if (insideOutput && !present) errors.push(`${target.id}: missing assembled relative dependency ${reference}`);
  }

  manifest.applications.push({
    id: target.id,
    publicRoute: target.publicRoute,
    sourcePath: target.sourcePath,
    assembledPath: toPosix(path.relative(rootDir, destination)),
    fileCount: files.length,
    totalBytes: bytes.reduce((sum, value) => sum + value, 0),
    indexSha256: await hashFile(destinationIndex),
    compiledOutputResult: buildReport?.result || 'report-not-found',
    dependencyResults,
    dependenciesResolved: dependencyResults.every(item => item.present)
  });
}

manifest.applicationCount = manifest.applications.length;
if (manifest.applicationCount !== buildRegistry.expectedTargetCount) {
  errors.push(`Assembled ${manifest.applicationCount} applications; expected ${buildRegistry.expectedTargetCount}`);
}

manifest.shell.files = [...copiedShellFiles.values()].sort((a, b) => a.outputPath.localeCompare(b.outputPath));
manifest.shell.fileCount = manifest.shell.files.length;
manifest.shell.totalBytes = manifest.shell.files.reduce((sum, file) => sum + file.bytes, 0);

const manifestPath = path.join(outputRoot, 'compiled-apps-manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${manifest.applicationCount} compiled applications into ${path.relative(rootDir, outputRoot)}`);
console.log(`- referenced shell files: ${manifest.shell.fileCount} (${manifest.shell.totalBytes} bytes)`);
for (const app of manifest.applications) {
  console.log(`- ${app.id}: ${app.publicRoute} (${app.fileCount} files, ${app.totalBytes} bytes, dependencies resolved: ${app.dependenciesResolved ? 'yes' : 'no'})`);
}

if (errors.length > 0) {
  console.error(`Assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Assembly manifest: ${path.relative(rootDir, manifestPath)}`);
