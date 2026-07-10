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

const excludedDirectoryNames = new Set([
  '.git', '.github', '.netlify', 'node_modules', 'dist', 'netlify',
  'archive', 'source_backups', 'tests', 'reports', 'private'
]);
const excludedFilePattern = /\.(?:bak|backup|old|orig|map|zip)$/i;
const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.txt', '.xml']);

const sections = [
  { id: 'about', sourceRoot: 'about', outputPath: 'about', entry: 'index.html' },
  { id: 'contact', sourceRoot: 'contact', outputPath: 'contact', entry: 'index.html' },
  { id: 'capabilities', sourceRoot: 'capabilities', outputPath: 'capabilities', entry: 'index.html', protected: true }
];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function includeSectionFile(sourceRoot, absolute) {
  const relative = toPosix(path.relative(sourceRoot, absolute));
  const parts = relative.split('/');
  if (parts.some(part => excludedDirectoryNames.has(part))) return false;
  if (parts[0] === 'apps' || parts[0] === 'tools') return false;
  if (excludedFilePattern.test(relative)) return false;
  return true;
}

async function copySectionTree(sourceRoot, destinationRoot) {
  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(path.dirname(destinationRoot), { recursive: true });
  await cp(sourceRoot, destinationRoot, {
    recursive: true,
    force: true,
    filter: absolute => includeSectionFile(sourceRoot, absolute)
  });
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

function rewriteRouteLocalReferences(content, route) {
  const prefix = `/${route}`;
  const replacements = [
    [/(["'(=:\s])\/shared\//g, `$1${prefix}/shared/`],
    [/(["'(=:\s])\/assets\//g, `$1${prefix}/assets/`],
    [/(["'(=:\s])\/runtime-guard\.js/g, `$1${prefix}/runtime-guard.js`],
    [/url\(\/shared\//g, `url(${prefix}/shared/`],
    [/url\(\/assets\//g, `url(${prefix}/assets/`]
  ];
  let updated = content;
  for (const [pattern, replacement] of replacements) updated = updated.replace(pattern, replacement);
  return updated;
}

async function rewriteTextTree(destinationRoot, route) {
  let changed = 0;
  for (const file of await walk(destinationRoot)) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const original = await readFile(file, 'utf8');
    const updated = rewriteRouteLocalReferences(original, route);
    if (updated !== original) {
      await writeFile(file, updated, 'utf8');
      changed += 1;
    }
  }
  return changed;
}

async function assembleTools() {
  const utilitiesRoot = path.join(rootDir, 'utilities');
  const toolsSource = path.join(utilitiesRoot, 'tools');
  const destination = path.join(outputRoot, 'tools');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });

  const siblingNames = ['shared', 'assets', 'data', 'help', 'case-studies'];
  for (const name of siblingNames) {
    const source = path.join(utilitiesRoot, name);
    if (await exists(source)) await cp(source, path.join(destination, name), { recursive: true, force: true });
  }
  for (const name of ['runtime-guard.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.ico']) {
    const source = path.join(utilitiesRoot, name);
    if (await exists(source)) await cp(source, path.join(destination, name), { force: true });
  }

  await cp(toolsSource, destination, { recursive: true, force: true });

  let changed = 0;
  const toolSourceFiles = await walk(toolsSource);
  for (const sourceFile of toolSourceFiles) {
    if (!textExtensions.has(path.extname(sourceFile).toLowerCase())) continue;
    const relative = path.relative(toolsSource, sourceFile);
    const destinationFile = path.join(destination, relative);
    if (!await exists(destinationFile)) continue;
    const original = await readFile(destinationFile, 'utf8');
    let updated = original.replace(/\.\.\//g, './');
    updated = rewriteRouteLocalReferences(updated, 'tools');
    if (updated !== original) {
      await writeFile(destinationFile, updated, 'utf8');
      changed += 1;
    }
  }

  if (!await exists(path.join(destination, 'index.html'))) throw new Error('Tools section entry is missing after assembly.');
  return { id: 'tools', outputPath: 'tools', rewrittenFiles: changed };
}

async function mergeHomeDependencies() {
  const homeRoot = path.join(rootDir, 'home');
  const merged = [];
  for (const name of ['assets', 'shared']) {
    const source = path.join(homeRoot, name);
    const destination = path.join(outputRoot, name);
    if (!await exists(source)) continue;
    await mkdir(destination, { recursive: true });
    await cp(source, destination, { recursive: true, force: false, errorOnExist: false });
    merged.push(name);
  }
  for (const name of ['runtime-guard.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.ico']) {
    const source = path.join(homeRoot, name);
    const destination = path.join(outputRoot, name);
    if (await exists(source) && !await exists(destination)) {
      await cp(source, destination, { force: false });
      merged.push(name);
    }
  }
  return merged;
}

await mkdir(outputRoot, { recursive: true });
const results = [];
results.push(await assembleTools());

for (const section of sections) {
  const sourceRoot = path.join(rootDir, section.sourceRoot);
  const destinationRoot = path.join(outputRoot, section.outputPath);
  if (!await exists(path.join(sourceRoot, section.entry))) throw new Error(`${section.id}: source entry is missing.`);
  await copySectionTree(sourceRoot, destinationRoot);
  const rewrittenFiles = await rewriteTextTree(destinationRoot, section.outputPath);
  const assembledEntry = path.join(destinationRoot, section.entry);
  if (!await exists(assembledEntry)) throw new Error(`${section.id}: assembled entry is missing.`);
  if (section.protected) {
    const source = await readFile(path.join(sourceRoot, section.entry));
    const assembled = await readFile(assembledEntry);
    if (!source.equals(assembled)) throw new Error('Protected Capabilities page content changed during assembly.');
  }
  results.push({ id: section.id, outputPath: section.outputPath, rewrittenFiles, protected: Boolean(section.protected) });
}

const homeDependencies = await mergeHomeDependencies();
const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: toPosix(path.relative(rootDir, outputRoot)),
  sections: results,
  homeDependenciesMergedWithoutOverwrite: homeDependencies,
  standaloneSectionRedirectsRequired: false,
  capabilitiesSourceModified: false
};
await writeFile(path.join(outputRoot, 'main-sections-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Assembled ${results.length} canonical main-site sections into ${manifest.outputRoot}.`);
for (const result of results) console.log(`- /${result.outputPath}/ (${result.rewrittenFiles} route-local reference file(s) adjusted)`);
console.log(`- Home dependencies merged without overwriting canonical Apps assets: ${homeDependencies.join(', ') || 'none'}`);
