import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputRoot = path.join(rootDir, 'dist');
const buildRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/build-targets.registry.json'), 'utf8'));
const skipInstall = process.argv.includes('--skip-install');
const skipBuild = process.argv.includes('--skip-build');

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

console.log('NEXUS deterministic main-site build');
console.log(`- output: ${toPosix(path.relative(rootDir, outputRoot))}`);
console.log(`- compiled targets: ${buildRegistry.targets.length}`);
console.log(`- dependency install: ${skipInstall ? 'skipped' : 'enabled'}`);
console.log(`- compilation: ${skipBuild ? 'skipped' : 'enabled'}`);

run(process.execPath, ['scripts/verify-protected-files.mjs']);
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await copyRequired(path.join(rootDir, 'index.html'), path.join(outputRoot, 'index.html'), 'root NEXUS entry');

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

run(process.execPath, ['scripts/assemble-compiled-apps.mjs', '--output', 'dist']);
run(process.execPath, ['scripts/prepare-static-app-compat.mjs']);
run(process.execPath, ['scripts/assemble-static-apps.mjs', '--output', 'dist']);
run(process.execPath, ['scripts/assemble-main-sections.mjs', '--output', 'dist']);
run(process.execPath, ['scripts/assemble-inline-section-assets.mjs', '--output', 'dist']);
run(process.execPath, ['scripts/validate-assembled-site.mjs', '--output', 'dist']);

await copyRequired(path.join(rootDir, 'config/netlify/main-redirects'), path.join(outputRoot, '_redirects'), 'main redirect rules');
await copyRequired(path.join(rootDir, 'apps/_headers'), path.join(outputRoot, '_headers'), 'Apps header rules');
run(process.execPath, ['scripts/validate-production-site.mjs', '--output', 'dist']);

const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: 'dist',
  rootEntry: 'index.html',
  localApplications: {
    compiled: buildRegistry.targets.length,
    static: JSON.parse(await readFile(path.join(rootDir, 'data/static-targets.registry.json'), 'utf8')).targets.length
  },
  bundledSections: [
    { route: '/tools/', source: 'utilities/tools' },
    { route: '/about/', source: 'about' },
    { route: '/contact/', source: 'contact' },
    { route: '/capabilities/', source: 'capabilities', protected: true }
  ],
  compatibilityAdapters: ['coverage-compass-report-modules'],
  functionsDirectory: 'netlify/functions',
  assemblyValidated: true,
  productionValidated: true,
  capabilitiesSourceModified: false
};
await writeFile(path.join(outputRoot, 'nexus-build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('\nNEXUS main-site build complete.');
console.log(`- root entry: ${await exists(path.join(outputRoot, 'index.html')) ? 'present' : 'missing'}`);
console.log(`- Apps console: ${await exists(path.join(outputRoot, 'apps/index.html')) ? 'present' : 'missing'}`);
console.log('- canonical sections: /tools/, /about/, /contact/, /capabilities/');
console.log(`- build manifest: ${toPosix(path.relative(rootDir, path.join(outputRoot, 'nexus-build-manifest.json')))}`);
