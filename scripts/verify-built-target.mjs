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

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function isExternalReference(reference) {
  return /^(?:https?:)?\/\//i.test(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference);
}

function cleanReference(reference) {
  return String(reference || '').split(/[?#]/, 1)[0].trim();
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
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
const compiledOwnedReferences = [];
const misbasedCompiledReferences = [];
const rootAbsoluteReferences = [];
const externalAssemblyReferences = [];
const moduleImportReferences = [];
const dynamicResourceReferences = [];
const resourceTagPattern = /<(?:script|link|img|source|video|audio|iframe)\b[^>]*>/gi;
const resourceAttributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;

async function classifyReference(reference, baseDirectory, origin, options = {}) {
  const trimmed = String(reference || '').trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return;
  if (isExternalReference(trimmed)) return;

  const clean = cleanReference(trimmed);
  const isCss = /\.css$/i.test(clean);
  if (options.moduleImport && isCss) {
    errors.push(`Stylesheet was emitted as a JavaScript module import from ${origin}: ${trimmed}`);
    return;
  }

  if (clean.startsWith('/')) {
    const compiledCandidate = path.join(distRoot, clean.replace(/^\/+/, ''));
    if (await exists(compiledCandidate)) {
      addUnique(misbasedCompiledReferences, trimmed);
      errors.push(`Compiled-owned asset is root-absolute and will escape the nested route: ${trimmed}`);
    } else {
      addUnique(rootAbsoluteReferences, trimmed);
    }
    return;
  }

  const resolved = path.resolve(baseDirectory, clean);
  if (!isInside(distRoot, resolved)) {
    addUnique(externalAssemblyReferences, trimmed);
    return;
  }

  addUnique(compiledOwnedReferences, trimmed);
  if (!await exists(resolved)) errors.push(`Compiled-owned asset reference is missing from ${origin}: ${trimmed}`);
}

for (const tagMatch of html.matchAll(resourceTagPattern)) {
  const tag = tagMatch[0];
  for (const attributeMatch of tag.matchAll(resourceAttributePattern)) {
    const reference = attributeMatch[1].trim();
    assetReferences.push(reference);
    await classifyReference(reference, distRoot, 'dist/index.html');
  }
}

const dynamicAssignmentPattern = /\.(?:src|href|poster)\s*=\s*["'`]([^"'`]+)["'`]/gi;
for (const match of html.matchAll(dynamicAssignmentPattern)) {
  const reference = match[1].trim();
  addUnique(dynamicResourceReferences, reference);
  await classifyReference(reference, distRoot, 'inline HTML resource assignment');
}

const scriptReferences = assetReferences.filter(reference => /\.m?js(?:[?#]|$)/i.test(reference));
const stylesheetReferences = assetReferences.filter(reference => /\.css(?:[?#]|$)/i.test(reference));

for (const scriptReference of scriptReferences) {
  const clean = cleanReference(scriptReference);
  if (!clean || clean.startsWith('/') || isExternalReference(clean)) continue;
  const scriptPath = path.resolve(distRoot, clean);
  if (!isInside(distRoot, scriptPath) || !await exists(scriptPath)) continue;

  const code = await readFile(scriptPath, 'utf8');
  const importPatterns = [
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\b(?:import|export)\s+[^;\n]*?\bfrom\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g
  ];
  for (const pattern of importPatterns) {
    for (const match of code.matchAll(pattern)) {
      const reference = match[1].trim();
      addUnique(moduleImportReferences, reference);
      await classifyReference(reference, path.dirname(scriptPath), path.relative(distRoot, scriptPath), { moduleImport: true });
    }
  }

  for (const match of code.matchAll(dynamicAssignmentPattern)) {
    const reference = match[1].trim();
    addUnique(dynamicResourceReferences, reference);
    await classifyReference(reference, path.dirname(scriptPath), path.relative(distRoot, scriptPath));
  }
}

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
  misbasedCompiledReferences,
  rootAbsoluteReferences,
  externalAssemblyReferences,
  moduleImportReferences,
  dynamicResourceReferences,
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
console.log(`- misbased compiled assets: ${misbasedCompiledReferences.length}`);
console.log(`- module imports inspected: ${moduleImportReferences.length}`);
console.log(`- dynamic resources inspected: ${dynamicResourceReferences.length}`);
console.log(`- site-shell references: ${rootAbsoluteReferences.length + externalAssemblyReferences.length}`);
for (const warning of warnings) console.log(`- warning: ${warning}`);
for (const error of errors) console.error(`- error: ${error}`);

if (errors.length > 0) process.exit(1);
