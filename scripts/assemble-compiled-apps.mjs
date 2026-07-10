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
const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: path.relative(rootDir, outputRoot).split(path.sep).join('/'),
  shell: {
    sourceRoot: 'apps',
    landingPage: 'apps/index.html',
    sharedPath: 'shared',
    assetsPath: 'assets'
  },
  applicationCount: 0,
  applications: []
};

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

async function copyRequired(source, destination, label) {
  if (!await exists(source)) {
    errors.push(`Missing ${label}: ${path.relative(rootDir, source)}`);
    return false;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
  return true;
}

if (shouldClean) await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const appsSourceRoot = path.join(rootDir, 'apps');
await copyRequired(path.join(appsSourceRoot, 'index.html'), path.join(outputRoot, 'apps/index.html'), 'Apps landing page');
await copyRequired(path.join(appsSourceRoot, 'shared'), path.join(outputRoot, 'shared'), 'Apps shared shell');
await copyRequired(path.join(appsSourceRoot, 'assets'), path.join(outputRoot, 'assets'), 'Apps asset shell');

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
  if (await exists(buildReportPath)) {
    buildReport = JSON.parse(await readFile(buildReportPath, 'utf8'));
  }

  if (buildReport?.result !== 'passed') {
    errors.push(`${target.id}: compiled output report is not passed`);
  }
  if ((buildReport?.misbasedCompiledReferences || []).length > 0) {
    errors.push(`${target.id}: compiled output still contains root-absolute owned assets`);
  }

  const dependencyResults = [];
  for (const reference of buildReport?.rootAbsoluteReferences || []) {
    const clean = reference.split(/[?#]/, 1)[0];
    const resolved = path.join(outputRoot, clean.replace(/^\/+/, ''));
    const present = await exists(resolved);
    dependencyResults.push({ reference, resolvedPath: path.relative(rootDir, resolved).split(path.sep).join('/'), present, type: 'root-shell' });
    if (!present) errors.push(`${target.id}: missing assembled root dependency ${reference}`);
  }
  for (const reference of buildReport?.externalAssemblyReferences || []) {
    const clean = reference.split(/[?#]/, 1)[0];
    const resolved = path.resolve(destination, clean);
    const relativeToOutput = path.relative(outputRoot, resolved);
    const insideOutput = !(relativeToOutput.startsWith('..') || path.isAbsolute(relativeToOutput));
    const present = insideOutput && await exists(resolved);
    dependencyResults.push({ reference, resolvedPath: path.relative(rootDir, resolved).split(path.sep).join('/'), present, type: 'relative-shell' });
    if (!insideOutput) errors.push(`${target.id}: dependency escapes assembled output ${reference}`);
    else if (!present) errors.push(`${target.id}: missing assembled relative dependency ${reference}`);
  }

  manifest.applications.push({
    id: target.id,
    publicRoute: target.publicRoute,
    sourcePath: target.sourcePath,
    assembledPath: path.relative(rootDir, destination).split(path.sep).join('/'),
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

const shellFiles = [];
for (const relative of ['apps/index.html', 'shared', 'assets']) {
  const target = path.join(outputRoot, relative);
  if (await exists(target)) {
    const details = await stat(target);
    if (details.isDirectory()) shellFiles.push(...(await walkFiles(target)).map(file => `${relative}/${file}`));
    else shellFiles.push(relative);
  }
}
manifest.shell.fileCount = shellFiles.length;

const manifestPath = path.join(outputRoot, 'compiled-apps-manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${manifest.applicationCount} compiled applications into ${path.relative(rootDir, outputRoot)}`);
console.log(`- shell files: ${manifest.shell.fileCount}`);
for (const app of manifest.applications) {
  console.log(`- ${app.id}: ${app.publicRoute} (${app.fileCount} files, ${app.totalBytes} bytes, dependencies resolved: ${app.dependenciesResolved ? 'yes' : 'no'})`);
}

if (errors.length > 0) {
  console.error(`Assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Assembly manifest: ${path.relative(rootDir, manifestPath)}`);
