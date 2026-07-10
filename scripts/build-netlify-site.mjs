import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputRoot = path.join(rootDir, 'dist');
const generatedFunctionsRoot = path.join(rootDir, 'netlify/functions');
const siteName = process.env.SITE_NAME || process.env.NETLIFY_SITE_NAME || '';
const cached = process.argv.includes('--cached');

const sectionProjects = new Map([
  ['dev-in-portfolio-home', 'home'],
  ['dev-in-portfolio-utilities', 'utilities'],
  ['dev-in-portfolio-about', 'about'],
  ['dev-in-portfolio-contact', 'contact'],
  ['dev-in-portfolio-capabilities', 'capabilities']
]);

const toPosix = value => value.split(path.sep).join('/');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, cwd = rootDir) {
  console.log(`\n> ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function includeSectionFile(source) {
  const relative = toPosix(path.relative(rootDir, source));
  const parts = relative.split('/');
  if (parts.some(part => ['.git', '.netlify', 'node_modules', 'dist', 'netlify'].includes(part))) return false;
  return true;
}

async function buildSection(sourceDirectory) {
  const sourceRoot = path.join(rootDir, sourceDirectory);
  if (!await exists(path.join(sourceRoot, 'index.html'))) {
    throw new Error(`Section entry is missing: ${sourceDirectory}/index.html`);
  }

  if (sourceDirectory === 'capabilities') run(process.execPath, ['scripts/verify-protected-files.mjs']);

  await rm(outputRoot, { recursive: true, force: true });
  await rm(generatedFunctionsRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(sourceRoot, outputRoot, { recursive: true, force: true, filter: includeSectionFile });

  console.log(`Built standalone section project ${siteName} from ${sourceDirectory}/`);
}

async function buildMain() {
  await rm(generatedFunctionsRoot, { recursive: true, force: true });
  await mkdir(path.dirname(generatedFunctionsRoot), { recursive: true });
  await cp(path.join(rootDir, 'apps/netlify/functions'), generatedFunctionsRoot, { recursive: true, force: true });

  const functionFiles = (await readdir(generatedFunctionsRoot)).filter(name => name.endsWith('.js')).sort();
  if (!functionFiles.includes('vortex-market.js')) throw new Error('Generated Netlify functions are missing vortex-market.js.');
  run(process.execPath, ['scripts/test-vortex-market-function.mjs']);

  const buildArgs = ['scripts/build-main-site.mjs'];
  if (cached) buildArgs.push('--skip-install', '--skip-build');
  run(process.execPath, buildArgs);
  console.log(`Generated main functions: ${toPosix(path.relative(rootDir, generatedFunctionsRoot))} (${functionFiles.length} JavaScript files)`);
}

if (!siteName) {
  console.log('SITE_NAME is not set; running the deterministic main-site build for local validation.');
  await buildMain();
} else if (siteName === 'dev-in-portfolio') {
  await buildMain();
} else if (sectionProjects.has(siteName)) {
  await buildSection(sectionProjects.get(siteName));
} else if (siteName === 'dev-in-portfolio-apps') {
  throw new Error('The stale dev-in-portfolio-apps project is intentionally blocked until its dedicated compiled-root migration is completed.');
} else {
  throw new Error(`No explicit build mapping exists for Netlify project ${siteName}. Refusing to publish the wrong repository root.`);
}
