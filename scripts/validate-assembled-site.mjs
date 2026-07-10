import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const outputRoot = path.resolve(rootDir, valueFor('--output') || 'dist');
const appsRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const errors = [];
const warnings = [];

const toPosix = value => value.split(path.sep).join('/');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function readJson(target, label) {
  if (!await exists(target)) {
    errors.push(`Missing ${label}: ${toPosix(path.relative(rootDir, target))}`);
    return null;
  }
  try {
    return JSON.parse(await readFile(target, 'utf8'));
  } catch (error) {
    errors.push(`Invalid ${label}: ${error.message}`);
    return null;
  }
}

async function walk(directory, base = directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute, base));
    else if (entry.isFile()) files.push(toPosix(path.relative(base, absolute)));
  }
  return files;
}

const compiledManifest = await readJson(path.join(outputRoot, 'compiled-apps-manifest.json'), 'compiled app manifest');
const staticManifest = await readJson(path.join(outputRoot, 'static-apps-manifest.json'), 'static app manifest');
const localApps = (appsRegistry.applications || []).filter(app => app.deploymentType !== 'external');

if (!await exists(path.join(outputRoot, 'apps/index.html'))) errors.push('Apps console entry is missing from assembled output.');

for (const app of localApps) {
  const routePath = app.href.replace(/^\/+|\/+$/g, '');
  const entry = path.join(outputRoot, routePath, 'index.html');
  if (!await exists(entry)) errors.push(`${app.id}: assembled route entry is missing at ${app.href}`);
}

if (compiledManifest) {
  if (compiledManifest.applicationCount !== 8) errors.push(`Compiled manifest expected 8 apps, found ${compiledManifest.applicationCount}`);
  for (const app of compiledManifest.applications || []) {
    if (app.compiledOutputResult !== 'passed') errors.push(`${app.id}: compiled output result is ${app.compiledOutputResult}`);
    if (app.dependenciesResolved !== true) errors.push(`${app.id}: compiled dependencies are unresolved`);
    for (const dependency of app.dependencyResults || []) {
      if (dependency.present !== true) errors.push(`${app.id}: missing compiled shell dependency ${dependency.reference}`);
    }
  }
}

if (staticManifest) {
  if (staticManifest.applicationCount !== 12) errors.push(`Static manifest expected 12 apps, found ${staticManifest.applicationCount}`);
  for (const app of staticManifest.applications || []) {
    if (app.dependenciesResolved !== true) errors.push(`${app.id}: static dependencies are unresolved`);
    for (const dependency of app.dependencyResults || []) {
      if (dependency.present !== true) errors.push(`${app.id}: missing static dependency ${dependency.reference}`);
    }
  }
}

const files = await walk(outputRoot);
const prohibitedPatterns = [
  /(^|\/)node_modules\//i,
  /(^|\/)source_backups\//i,
  /(^|\/)private\//i,
  /(^|\/)reports\//i,
  /\.(?:bak|backup|old|orig|map)$/i,
  /\/src\/main\.tsx?$/i
];
for (const file of files) {
  if (prohibitedPatterns.some(pattern => pattern.test(file))) errors.push(`Prohibited deployment artifact: ${file}`);
}

const totalBytes = (await Promise.all(files.map(async file => (await stat(path.join(outputRoot, file))).size)))
  .reduce((sum, size) => sum + size, 0);
if (totalBytes > 50 * 1024 * 1024) warnings.push(`Assembled local site exceeds 50 MiB: ${totalBytes} bytes`);

console.log('NEXUS assembled-site validation');
console.log(`- local routes expected: ${localApps.length}`);
console.log(`- output files: ${files.length}`);
console.log(`- output bytes: ${totalBytes}`);
for (const warning of warnings) console.log(`- warning: ${warning}`);

if (errors.length > 0) {
  console.error(`Assembled-site validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Assembled-site validation passed: all 20 local app routes and declared dependencies are present.');
