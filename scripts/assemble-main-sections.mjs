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
const outputRoot = path.resolve(rootDir, valueFor('--output') || 'dist');
const toPosix = value => value.split(path.sep).join('/');
const textExtensions = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.webmanifest', '.txt', '.xml', '.svg']);
const excludedFilePattern = /\.(?:bak|backup|old|orig|map|zip)$/i;
const canonicalRoutePattern = /^\/(?:apps|tools|about|contact|capabilities)(?:\/|$)/i;
const errors = [];
const warnings = [];
const processedOutputs = new Set();
const records = [];

const mounts = [
  {
    id: 'tools',
    sourceRoot: path.join(rootDir, 'utilities'),
    entrySource: path.join(rootDir, 'utilities/tools/index.html'),
    entryOutput: path.join(outputRoot, 'tools/index.html'),
    routePrefix: 'tools',
    protectedEntry: false
  },
  {
    id: 'about',
    sourceRoot: path.join(rootDir, 'about'),
    entrySource: path.join(rootDir, 'about/index.html'),
    entryOutput: path.join(outputRoot, 'about/index.html'),
    routePrefix: 'about',
    protectedEntry: false
  },
  {
    id: 'contact',
    sourceRoot: path.join(rootDir, 'contact'),
    entrySource: path.join(rootDir, 'contact/index.html'),
    entryOutput: path.join(outputRoot, 'contact/index.html'),
    routePrefix: 'contact',
    protectedEntry: false
  },
  {
    id: 'capabilities',
    sourceRoot: path.join(rootDir, 'capabilities'),
    entrySource: path.join(rootDir, 'capabilities/index.html'),
    entryOutput: path.join(outputRoot, 'capabilities/index.html'),
    routePrefix: 'capabilities',
    protectedEntry: true
  }
];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function splitReference(reference) {
  const value = String(reference || '').trim();
  const index = value.search(/[?#]/);
  return index < 0
    ? { clean: value, suffix: '' }
    : { clean: value.slice(0, index), suffix: value.slice(index) };
}

function isExternal(reference) {
  return /^(?:https?:)?\/\//i.test(reference)
    || /^(?:data|blob|mailto|tel|javascript):/i.test(reference)
    || reference.startsWith('#');
}

function mapSourceToOutput(mount, sourcePath) {
  const relative = toPosix(path.relative(mount.sourceRoot, sourcePath));
  if (mount.id === 'tools') {
    const toolsRelative = relative.startsWith('tools/') ? relative.slice('tools/'.length) : relative;
    return path.join(outputRoot, 'tools', toolsRelative);
  }
  return path.join(outputRoot, mount.routePrefix, relative);
}

function collectHtmlReferences(content) {
  const references = [];
  const resourceTagPattern = /<(script|link|img|source|video|audio|iframe)\b[^>]*>/gi;
  const attributePattern = /\b(?:src|href|poster)=["']([^"']+)["']/gi;
  for (const tagMatch of content.matchAll(resourceTagPattern)) {
    for (const attributeMatch of tagMatch[0].matchAll(attributePattern)) {
      references.push({ reference: attributeMatch[1], required: true, kind: tagMatch[1].toLowerCase() });
    }
  }
  const anchorPattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  for (const match of content.matchAll(anchorPattern)) references.push({ reference: match[1], required: false, kind: 'anchor' });
  const inlineAssignmentPattern = /\.(?:src|href|poster)\s*=\s*["'`]([^"'`]+)["'`]/gi;
  for (const match of content.matchAll(inlineAssignmentPattern)) references.push({ reference: match[1], required: true, kind: 'dynamic-resource' });
  return references;
}

function collectCssReferences(content) {
  const references = [];
  const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  for (const match of content.matchAll(urlPattern)) references.push({ reference: match[1], required: true, kind: 'css-url' });
  const importPattern = /@import\s+(?:url\()?\s*["']([^"']+)["']/gi;
  for (const match of content.matchAll(importPattern)) references.push({ reference: match[1], required: true, kind: 'css-import' });
  return references;
}

function collectJavaScriptReferences(content) {
  const references = [];
  const patterns = [
    { pattern: /\bimport\s*["'`]([^"'`]+)["'`]/g, kind: 'module-import' },
    { pattern: /\b(?:import|export)\s+[^;\n]*?\bfrom\s*["'`]([^"'`]+)["'`]/g, kind: 'module-import' },
    { pattern: /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g, kind: 'dynamic-import' },
    { pattern: /\bfetch\(\s*["'`]([^"'`]+)["'`]/g, kind: 'fetch' },
    { pattern: /serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/g, kind: 'service-worker' },
    { pattern: /new\s+(?:Shared)?Worker\(\s*["'`]([^"'`]+)["'`]/g, kind: 'worker' },
    { pattern: /\.(?:src|href|poster)\s*=\s*["'`]([^"'`]+)["'`]/g, kind: 'dynamic-resource' }
  ];
  for (const item of patterns) {
    for (const match of content.matchAll(item.pattern)) {
      references.push({ reference: match[1], required: item.kind !== 'fetch' || /\.[a-z0-9]{2,8}(?:[?#]|$)/i.test(match[1]), kind: item.kind });
    }
  }
  return references;
}

function collectJsonReferences(content) {
  const references = [];
  let value;
  try {
    value = JSON.parse(content);
  } catch {
    return references;
  }

  const resourceKeyPattern = /(?:^|_)(?:src|href|url|path|file|filename|asset|assets|icon|icons|manifest|entry|script|scripts|stylesheet|stylesheets|poster|source|sources)$/i;
  const explicitPathPattern = /^(?:\.{0,2}\/|\/)[^\s]+$/;
  const bareResourcePattern = /^[a-z0-9][a-z0-9._-]*\.(?:html?|m?js|css|json|webmanifest|txt|xml|svg|png|jpe?g|webp|gif|ico|mp3|wav|ogg|mp4|webm|vtt|pdf|wasm|glsl|wgsl)(?:[?#].*)?$/;

  const visit = (node, key = '') => {
    if (typeof node === 'string') {
      const candidate = node.trim();
      if (resourceKeyPattern.test(key) && (explicitPathPattern.test(candidate) || bareResourcePattern.test(candidate))) {
        references.push({ reference: candidate, required: true, kind: 'json-resource' });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(item => visit(item, key));
      return;
    }
    if (node && typeof node === 'object') {
      Object.entries(node).forEach(([childKey, childValue]) => visit(childValue, childKey));
    }
  };

  visit(value);
  return references;
}

function collectReferences(sourcePath, content) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === '.html' || extension === '.htm') return collectHtmlReferences(content);
  if (extension === '.css') return collectCssReferences(content);
  if (extension === '.js' || extension === '.mjs') return collectJavaScriptReferences(content);
  if (extension === '.json' || extension === '.webmanifest') return collectJsonReferences(content);
  if (extension === '.svg') return collectHtmlReferences(content);
  return [];
}

async function resolveReference(mount, sourceFile, outputFile, item) {
  const original = String(item.reference || '').trim();
  if (!original || isExternal(original)) return null;
  const { clean, suffix } = splitReference(original);
  if (!clean || clean.includes('${')) return null;
  if (clean === '/' || canonicalRoutePattern.test(clean)) return null;
  if (excludedFilePattern.test(clean)) {
    if (item.required) errors.push(`${mount.id}: prohibited referenced artifact ${clean}`);
    return null;
  }

  let sourceTarget;
  if (clean.startsWith('/')) {
    const relative = clean.replace(/^\/+/, '');
    const allowedRootResource = /^(?:shared|assets|data|help|case-studies)\//i.test(relative)
      || /^(?:runtime-guard\.js|manifest\.webmanifest|favicon\.ico|icon-\d+\.(?:png|svg))$/i.test(relative);
    if (!allowedRootResource) return null;
    sourceTarget = path.join(mount.sourceRoot, relative);
  } else {
    sourceTarget = path.resolve(path.dirname(sourceFile), clean);
  }

  if (!inside(mount.sourceRoot, sourceTarget)) {
    if (item.required) errors.push(`${mount.id}: reference escapes section source ${original}`);
    return null;
  }

  let sourceStats;
  try {
    sourceStats = await stat(sourceTarget);
  } catch {
    if (item.required) errors.push(`${mount.id}: missing ${item.kind} ${original} from ${toPosix(path.relative(rootDir, sourceFile))}`);
    return null;
  }

  if (sourceStats.isDirectory()) {
    const indexSource = path.join(sourceTarget, 'index.html');
    if (!await exists(indexSource)) {
      if (item.required) errors.push(`${mount.id}: directory reference has no index.html ${original}`);
      return null;
    }
    sourceTarget = indexSource;
  }
  if (!(await stat(sourceTarget)).isFile()) return null;

  const outputTarget = mapSourceToOutput(mount, sourceTarget);
  let rewritten;
  if (clean.startsWith('/')) {
    rewritten = `/${toPosix(path.relative(outputRoot, outputTarget))}${suffix}`;
  } else {
    let relative = toPosix(path.relative(path.dirname(outputFile), outputTarget));
    if (!relative.startsWith('.')) relative = `./${relative}`;
    if (sourceStats.isDirectory() && !relative.endsWith('/')) relative += '/';
    rewritten = `${relative}${suffix}`;
  }

  return { sourceTarget, outputTarget, original, rewritten };
}

async function processFile(mount, sourcePath, outputPath, protectedBytes = false) {
  const outputKey = path.resolve(outputPath);
  if (processedOutputs.has(outputKey)) return;
  processedOutputs.add(outputKey);

  if (!await exists(sourcePath)) {
    errors.push(`${mount.id}: missing source ${toPosix(path.relative(rootDir, sourcePath))}`);
    return;
  }
  if (excludedFilePattern.test(sourcePath)) {
    errors.push(`${mount.id}: refused prohibited source ${toPosix(path.relative(rootDir, sourcePath))}`);
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  const extension = path.extname(sourcePath).toLowerCase();
  if (!textExtensions.has(extension)) {
    await cp(sourcePath, outputPath, { force: true });
    records.push({ mount: mount.id, source: toPosix(path.relative(rootDir, sourcePath)), output: toPosix(path.relative(outputRoot, outputPath)), transformed: false });
    return;
  }

  const originalContent = await readFile(sourcePath, 'utf8');
  const references = collectReferences(sourcePath, originalContent);
  const replacements = new Map();
  const dependencies = [];
  for (const item of references) {
    const resolved = await resolveReference(mount, sourcePath, outputPath, item);
    if (!resolved) continue;
    replacements.set(resolved.original, resolved.rewritten);
    dependencies.push(resolved);
  }

  let outputContent = originalContent;
  if (!protectedBytes) {
    for (const [original, rewritten] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
      outputContent = outputContent.split(original).join(rewritten);
    }
  }
  await writeFile(outputPath, outputContent, 'utf8');
  records.push({
    mount: mount.id,
    source: toPosix(path.relative(rootDir, sourcePath)),
    output: toPosix(path.relative(outputRoot, outputPath)),
    transformed: outputContent !== originalContent,
    dependencyCount: dependencies.length
  });

  for (const dependency of dependencies) {
    await processFile(mount, dependency.sourceTarget, dependency.outputTarget, false);
  }
}

for (const mount of mounts) {
  await rm(path.dirname(mount.entryOutput), { recursive: true, force: true });
  await processFile(mount, mount.entrySource, mount.entryOutput, mount.protectedEntry);
  if (!await exists(mount.entryOutput)) errors.push(`${mount.id}: assembled entry is missing`);
  if (mount.protectedEntry) {
    const source = await readFile(mount.entrySource);
    const output = await readFile(mount.entryOutput).catch(() => null);
    if (!output || !source.equals(output)) errors.push('Protected Capabilities page content changed during assembly.');
  }
}

const filesByMount = records.reduce((counts, record) => {
  counts[record.mount] = (counts[record.mount] || 0) + 1;
  return counts;
}, {});
const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: toPosix(path.relative(rootDir, outputRoot)),
  strategy: 'dependency-graph',
  sections: mounts.map(mount => ({
    id: mount.id,
    route: `/${mount.routePrefix}/`,
    fileCount: filesByMount[mount.id] || 0,
    protectedEntry: mount.protectedEntry
  })),
  files: records,
  warnings,
  errors,
  standaloneSectionRedirectsRequired: false,
  capabilitiesSourceModified: false
};
await writeFile(path.join(outputRoot, 'main-sections-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${mounts.length} canonical sections by dependency graph.`);
for (const section of manifest.sections) console.log(`- ${section.route}: ${section.fileCount} file(s)${section.protectedEntry ? ' [protected entry]' : ''}`);
for (const warning of warnings) console.log(`- warning: ${warning}`);

if (errors.length > 0) {
  console.error(`Main section assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
