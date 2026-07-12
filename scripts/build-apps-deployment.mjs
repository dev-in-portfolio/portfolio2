import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputRoot = path.join(rootDir, 'apps/dist');
const buildRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/build-targets.registry.json'), 'utf8'));
const staticRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/static-targets.registry.json'), 'utf8'));
const skipInstall = process.argv.includes('--skip-install');
const skipBuild = process.argv.includes('--skip-build');
const canonicalRoutesTag = '<script src="/shared/nexus-canonical-routes.js?v=1" defer></script>';

const toPosix = value => value.split(path.sep).join('/');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  const display = [command, ...args].join(' ');
  console.log(`\n> ${display}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${display} exited with status ${result.status}`);
}

async function copyRequired(source, destination, label) {
  if (!await exists(source)) throw new Error(`Missing ${label}: ${toPosix(path.relative(rootDir, source))}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

async function walkHtml(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(absolute);
  }
  return files;
}

function withCanonicalRoutes(html) {
  if (html.includes('nexus-canonical-routes.js')) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  ${canonicalRoutesTag}\n</head>`);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `  ${canonicalRoutesTag}\n</body>`);
  return `${html}\n${canonicalRoutesTag}\n`;
}

function withAppsBase(html) {
  if (/<base\b/i.test(html)) return html;
  return html.replace(/<head(\s[^>]*)?>/i, match => `${match}\n  <base href="/apps/">`);
}

console.log('NEXUS deterministic Apps deployment build');
console.log(`- output: ${toPosix(path.relative(rootDir, outputRoot))}`);
console.log(`- compiled applications: ${buildRegistry.targets.length}`);
console.log(`- static applications preserved: ${staticRegistry.targets.length}`);
console.log(`- dependency install: ${skipInstall ? 'skipped' : 'enabled'}`);
console.log(`- compilation: ${skipBuild ? 'skipped' : 'enabled'}`);

run(process.execPath, ['scripts/verify-protected-files.mjs']);
await rm(outputRoot, { recursive: true, force: true });

for (const target of buildRegistry.targets) {
  const appRoot = path.join(rootDir, target.sourcePath);
  if (!skipInstall) {
    run('npm', ['install', '--no-package-lock', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appRoot });
  }
  if (!skipBuild) run('npm', ['run', 'build'], { cwd: appRoot });
  run(process.execPath, [
    'scripts/verify-built-target.mjs',
    '--id', target.id,
    '--source', target.sourcePath,
    '--route', target.publicRoute
  ]);
}

run(process.execPath, ['scripts/assemble-compiled-apps.mjs', '--clean', '--output', 'apps/dist']);
run(process.execPath, ['scripts/prepare-static-app-compat.mjs']);
run(process.execPath, ['scripts/assemble-static-apps.mjs', '--output', 'apps/dist']);

await copyRequired(
  path.join(rootDir, 'apps/shared/nexus-canonical-routes.js'),
  path.join(outputRoot, 'shared/nexus-canonical-routes.js'),
  'canonical route guard'
);

let injectedPageCount = 0;
for (const htmlPath of await walkHtml(outputRoot)) {
  const relative = toPosix(path.relative(outputRoot, htmlPath));
  if (relative === 'apps/coverage-compass/index.html') continue;
  const html = await readFile(htmlPath, 'utf8');
  const updated = withCanonicalRoutes(html);
  if (updated !== html) {
    await writeFile(htmlPath, updated, 'utf8');
    injectedPageCount += 1;
  }
}

const appsConsolePath = path.join(outputRoot, 'apps/index.html');
if (!await exists(appsConsolePath)) throw new Error('Assembled Apps console is missing.');
const appsConsole = await readFile(appsConsolePath, 'utf8');
await writeFile(path.join(outputRoot, 'index.html'), withAppsBase(appsConsole), 'utf8');

run(process.execPath, ['scripts/validate-assembled-site.mjs', '--output', 'apps/dist']);

await copyRequired(path.join(rootDir, 'apps/_redirects'), path.join(outputRoot, '_redirects'), 'Apps redirect rules');
await copyRequired(path.join(rootDir, 'apps/_headers'), path.join(outputRoot, '_headers'), 'Apps header rules');

const manifest = {
  generatedAt: new Date().toISOString(),
  deploymentRoot: 'apps',
  outputRoot: 'apps/dist',
  rootEntry: 'index.html',
  canonicalConsoleEntry: 'apps/index.html',
  rootEntryBase: '/apps/',
  compiledApplications: buildRegistry.targets.length,
  staticApplications: staticRegistry.targets.length,
  deferredApplications: ['coverage-compass'],
  compatibilityAdapters: ['coverage-compass-report-modules'],
  functionsDirectory: 'apps/netlify/functions',
  canonicalRouteOrigin: 'https://dev-in-portfolio.netlify.app',
  canonicalRouteGuard: 'shared/nexus-canonical-routes.js',
  canonicalRoutePagesInjected: injectedPageCount,
  capabilitiesSourceIncluded: false,
  assemblyValidated: true
};
await writeFile(path.join(outputRoot, 'nexus-apps-deployment-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('\nNEXUS Apps deployment build complete.');
console.log(`- root console alias: ${await exists(path.join(outputRoot, 'index.html')) ? 'present' : 'missing'}`);
console.log(`- canonical /apps/ console: ${await exists(appsConsolePath) ? 'present' : 'missing'}`);
console.log(`- canonical route guard injected: ${injectedPageCount} page(s)`);
console.log('- Coverage Compass: preserved through the report-module compatibility adapter');
console.log('- Capabilities source: excluded');
