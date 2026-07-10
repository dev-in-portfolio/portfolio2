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
const errors = [];
const warnings = [];
const legacyHostPattern = /https?:\/\/dev-in-portfolio-(?:home|apps|utilities|capabilities|about|contact)\.netlify\.app/gi;
const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.txt', '.xml']);
const toPosix = value => value.split(path.sep).join('/');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const requiredEntries = [
  'index.html',
  'apps/index.html',
  'tools/index.html',
  'about/index.html',
  'contact/index.html',
  'capabilities/index.html'
];
for (const relative of requiredEntries) {
  if (!await exists(path.join(outputRoot, relative))) errors.push(`Missing production entry: ${relative}`);
}

const redirectPath = path.join(outputRoot, '_redirects');
if (!await exists(redirectPath)) {
  errors.push('Missing production _redirects file.');
} else {
  const redirects = await readFile(redirectPath, 'utf8');
  const matches = redirects.match(legacyHostPattern) || [];
  if (matches.length > 0) errors.push(`Production redirects still reference legacy standalone sites (${matches.length} match(es)).`);
}

const permittedLegacyMapFile = 'shared/nexus-canonical-routes.js';
for (const file of await walk(outputRoot)) {
  const relative = toPosix(path.relative(outputRoot, file));
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  if (relative === permittedLegacyMapFile) continue;
  const content = await readFile(file, 'utf8');
  const matches = content.match(legacyHostPattern) || [];
  if (matches.length > 0) errors.push(`${relative}: contains ${matches.length} legacy standalone URL(s)`);
}

const protectedSource = await readFile(path.join(rootDir, 'capabilities/index.html'));
const protectedOutput = await readFile(path.join(outputRoot, 'capabilities/index.html')).catch(() => null);
if (!protectedOutput || !protectedSource.equals(protectedOutput)) {
  errors.push('Capabilities page differs from the protected source file.');
}

const coverageSource = await readFile(path.join(rootDir, 'apps/apps/coverage-compass/index.html'));
const coverageOutput = await readFile(path.join(outputRoot, 'apps/coverage-compass/index.html')).catch(() => null);
if (!coverageOutput || !coverageSource.equals(coverageOutput)) {
  errors.push('Coverage Compass differs from its deferred source file.');
}

const sectionManifestPath = path.join(outputRoot, 'main-sections-manifest.json');
if (!await exists(sectionManifestPath)) errors.push('Missing main section assembly manifest.');

const files = await walk(outputRoot);
const totalBytes = (await Promise.all(files.map(async file => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
if (totalBytes > 75 * 1024 * 1024) warnings.push(`Production site exceeds 75 MiB: ${totalBytes} bytes`);

console.log('NEXUS exact production-site validation');
console.log(`- required route entries: ${requiredEntries.length}`);
console.log(`- files: ${files.length}`);
console.log(`- bytes: ${totalBytes}`);
console.log('- protected Capabilities source: byte-identical');
console.log('- deferred Coverage Compass source: byte-identical');
for (const warning of warnings) console.log(`- warning: ${warning}`);

if (errors.length > 0) {
  console.error(`Production-site validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production-site validation passed: canonical sections are local, protected boundaries are preserved, and no legacy section redirects remain.');
