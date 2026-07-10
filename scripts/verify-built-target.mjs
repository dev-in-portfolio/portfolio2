import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

const id = valueFor('--id');
const sourcePath = valueFor('--source');
const publicRoute = valueFor('--route');
const errors = [];
const warnings = [];

if (!id || !sourcePath || !publicRoute) {
  console.error('Usage: node scripts/verify-built-target.mjs --id <id> --source <sourcePath> --route <publicRoute>');
  process.exit(2);
}

const sourceRoot = path.join(rootDir, sourcePath);
const distRoot = path.join(sourceRoot, 'dist');
const indexPath = path.join(distRoot, 'index.html');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!await exists(indexPath)) {
  errors.push(`Missing compiled entry: ${path.relative(rootDir, indexPath)}`);
}

let html = '';
if (errors.length === 0) html = await readFile(indexPath, 'utf8');

if (/\bsrc=["'][^"']*\/src\//i.test(html) || /\bsrc=["'][^"']*\.tsx?[?#"']/i.test(html)) {
  errors.push('Compiled index still references TypeScript source files.');
}

const assetReferences = [];
const rootAbsoluteReferences = [];
const externalAssemblyReferences = [];
const compiledOwnedReferences = [];
const referencePattern = /\b(?:src|href)=["']([^"']+)["']/gi;
for (const match of html.matchAll(referencePattern)) {
  const reference = match[1].trim();
  if (!reference || reference.startsWith('#') || reference.startsWith('data:') || reference.startsWith('blob:')) continue;
  if (/^(?:https?:)?\/\//i.test(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference)) continue;
  assetReferences.push(reference);

  const clean = reference.split(/[?#]/, 1)[0];
  if (clean.startsWith('/')) {
    rootAbsoluteReferences.push(reference);
    continue;
  }

  const resolved = path.resolve(distRoot, clean);
  const relativeToDist = path.relative(distRoot, resolved);
  if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
    externalAssemblyReferences.push(reference);
    continue;
  }

  compiledOwnedReferences.push(reference);
  if (!await exists(resolved)) errors.push(`Compiled-owned asset reference is missing: ${reference}`);
}

const scriptReferences = assetReferences.filter(reference => /\.m?js(?:[?#]|$)/i.test(reference));
const stylesheetReferences = assetReferences.filter(reference => /\.css(?:[?#]|$)/i.test(reference));
if (scriptReferences.length === 0) warnings.push('No compiled JavaScript reference detected in dist/index.html.');
if (rootAbsoluteReferences.length > 0) {
  warnings.push(`Root-absolute site-shell references require assembled-route verification: ${rootAbsoluteReferences.join(', ')}`);
}
if (externalAssemblyReferences.length > 0) {
  warnings.push(`References outside dist require deployment assembly: ${externalAssemblyReferences.join(', ')}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  id,
  sourcePath,
  publicRoute,
  distPath: path.relative(rootDir, distRoot).split(path.sep).join('/'),
  indexPresent: await exists(indexPath),
  assetReferenceCount: assetReferences.length,
  compiledOwnedReferences,
  rootAbsoluteReferences,
  externalAssemblyReferences,
  scriptReferences,
  stylesheetReferences,
  errors,
  warnings,
  result: errors.length === 0 ? 'passed' : 'failed'
};

const reportDir = path.join(rootDir, 'reports/reforge/builds');
await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, `${id}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`${id}: ${report.result}`);
console.log(`- route: ${publicRoute}`);
console.log(`- compiled-owned assets: ${compiledOwnedReferences.length}`);
console.log(`- site-shell references: ${rootAbsoluteReferences.length + externalAssemblyReferences.length}`);
for (const warning of warnings) console.log(`- warning: ${warning}`);
for (const error of errors) console.error(`- error: ${error}`);

if (errors.length > 0) process.exit(1);
