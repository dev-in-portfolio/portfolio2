import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const targetsRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/build-targets.registry.json'), 'utf8'));
const appsRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const shouldWrite = process.argv.includes('--write');
const errors = [];
const findings = [];
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: targetsRegistry.schemaVersion,
  summary: {},
  targets: []
};

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function readText(target) {
  try {
    return await readFile(target, 'utf8');
  } catch {
    return null;
  }
}

function detectSourceEntry(indexHtml) {
  const matches = [...String(indexHtml || '').matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  const entries = matches.map(match => match[1]);
  let classification = 'missing-module-entry';
  if (entries.some(entry => /^\/src\/main\.(?:ts|js)$/i.test(entry))) classification = 'vite-root-source-entry';
  else if (entries.some(entry => /^(?:\.\/)?src\/main\.(?:ts|js)$/i.test(entry))) classification = 'relative-source-entry';
  else if (entries.length > 0) classification = 'other-module-entry';
  return { entries, classification };
}

function detectViteConfig(viteConfig) {
  const text = String(viteConfig || '');
  const baseMatch = text.match(/\bbase\s*:\s*["']([^"']+)["']/);
  const outDirMatch = text.match(/\boutDir\s*:\s*["']([^"']+)["']/);
  return {
    base: baseMatch ? baseMatch[1] : null,
    outDir: outDirMatch ? outDirMatch[1] : null
  };
}

if (targetsRegistry.schemaVersion !== 1) errors.push(`Unsupported build-target registry schemaVersion: ${targetsRegistry.schemaVersion}`);
if (!Array.isArray(targetsRegistry.targets)) errors.push('build-targets.registry.json: targets must be an array');

const targets = Array.isArray(targetsRegistry.targets) ? targetsRegistry.targets : [];
if (Number.isInteger(targetsRegistry.expectedTargetCount) && targets.length !== targetsRegistry.expectedTargetCount) {
  errors.push(`Expected ${targetsRegistry.expectedTargetCount} build targets, found ${targets.length}`);
}

const appById = new Map((appsRegistry.applications || []).map(app => [app.id, app]));
const ids = new Set();
const routes = new Set();

for (const target of targets) {
  const label = target.id || '(missing id)';
  if (!target.id || !target.sourcePath || !target.publicRoute || !target.runtimeClass) {
    errors.push(`Invalid build target: ${JSON.stringify(target)}`);
    continue;
  }
  if (ids.has(target.id)) errors.push(`${label}: duplicate build-target id`);
  ids.add(target.id);
  if (routes.has(target.publicRoute)) errors.push(`${label}: duplicate publicRoute ${target.publicRoute}`);
  routes.add(target.publicRoute);

  const app = appById.get(target.id);
  if (!app) {
    errors.push(`${label}: no matching application registry record`);
  } else {
    if (app.sourcePath !== target.sourcePath) errors.push(`${label}: sourcePath differs from apps registry`);
    if (app.href !== target.publicRoute) errors.push(`${label}: publicRoute differs from apps registry href`);
    if (app.buildType !== 'vite-candidate') errors.push(`${label}: matching app is not marked vite-candidate`);
  }

  const sourceRoot = path.join(rootDir, target.sourcePath);
  const targetResult = {
    id: target.id,
    sourcePath: target.sourcePath,
    publicRoute: target.publicRoute,
    runtimeClass: target.runtimeClass,
    requiredFiles: [],
    package: null,
    indexEntry: null,
    vite: null,
    lockfiles: [],
    output: null,
    readiness: 'unknown',
    blockers: [],
    warnings: []
  };

  if (!await exists(sourceRoot)) {
    errors.push(`${label}: source root does not exist (${target.sourcePath})`);
    targetResult.readiness = 'blocked';
    targetResult.blockers.push('missing-source-root');
    report.targets.push(targetResult);
    continue;
  }

  const requiredFiles = target.requiredFiles || targetsRegistry.defaults?.requiredFiles || [];
  for (const relativePath of requiredFiles) {
    const present = await exists(path.join(sourceRoot, relativePath));
    targetResult.requiredFiles.push({ path: relativePath, present });
    if (!present) {
      errors.push(`${label}: missing required build file ${relativePath}`);
      targetResult.blockers.push(`missing:${relativePath}`);
    }
  }

  const packagePath = path.join(sourceRoot, 'package.json');
  const packageText = await readText(packagePath);
  if (packageText !== null) {
    try {
      const packageJson = JSON.parse(packageText);
      const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
      targetResult.package = {
        name: packageJson.name || null,
        private: packageJson.private === true,
        scripts: packageJson.scripts || {},
        hasBuildScript: typeof packageJson.scripts?.build === 'string' && packageJson.scripts.build.trim() !== '',
        hasViteDependency: typeof dependencies.vite === 'string',
        hasTypeScriptDependency: typeof dependencies.typescript === 'string',
        dependencyCount: Object.keys(dependencies).length
      };
      if (!targetResult.package.hasBuildScript) targetResult.blockers.push('missing-build-script');
      if (!targetResult.package.hasViteDependency) targetResult.blockers.push('missing-vite-dependency');
      if (!targetResult.package.hasTypeScriptDependency) targetResult.warnings.push('typescript-not-declared');
    } catch (error) {
      errors.push(`${label}: package.json is invalid JSON (${error.message})`);
      targetResult.blockers.push('invalid-package-json');
    }
  }

  const indexHtml = await readText(path.join(sourceRoot, 'index.html'));
  targetResult.indexEntry = detectSourceEntry(indexHtml);
  if (targetResult.indexEntry.classification === 'vite-root-source-entry') {
    targetResult.warnings.push('raw-index-requires-vite-build-before-nested-deployment');
  } else if (targetResult.indexEntry.classification === 'missing-module-entry') {
    targetResult.warnings.push('no-module-entry-detected');
  }

  const viteConfigText = await readText(path.join(sourceRoot, 'vite.config.ts'));
  targetResult.vite = detectViteConfig(viteConfigText);
  const preferredBase = targetsRegistry.defaults?.preferredViteBase;
  if (preferredBase && targetResult.vite.base !== preferredBase) {
    targetResult.warnings.push(targetResult.vite.base === null ? 'vite-base-not-explicit' : `vite-base-is:${targetResult.vite.base}`);
  }

  const expectedOutDir = targetsRegistry.defaults?.outputDirectory || 'dist';
  if (targetResult.vite.outDir && targetResult.vite.outDir !== expectedOutDir) {
    targetResult.warnings.push(`vite-outdir-is:${targetResult.vite.outDir}`);
  }

  const lockCandidates = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];
  for (const lockfile of lockCandidates) {
    if (await exists(path.join(sourceRoot, lockfile))) targetResult.lockfiles.push(lockfile);
  }
  if (targetResult.lockfiles.length === 0) targetResult.warnings.push('no-local-lockfile');

  const outputDirectory = targetResult.vite.outDir || expectedOutDir;
  const outputIndex = path.join(sourceRoot, outputDirectory, 'index.html');
  targetResult.output = {
    directory: outputDirectory,
    indexPresent: await exists(outputIndex)
  };
  if (!targetResult.output.indexPresent) targetResult.warnings.push('compiled-output-not-present-in-source-tree');

  if (targetResult.blockers.length > 0) targetResult.readiness = 'blocked';
  else if (!targetResult.output.indexPresent) targetResult.readiness = 'build-required';
  else if (targetResult.warnings.length > 0) targetResult.readiness = 'compiled-output-present-with-warnings';
  else targetResult.readiness = 'compiled-output-present';

  for (const blocker of targetResult.blockers) findings.push(`${label}: blocker ${blocker}`);
  for (const warning of targetResult.warnings) findings.push(`${label}: warning ${warning}`);
  report.targets.push(targetResult);
}

const counts = report.targets.reduce((summary, target) => {
  summary[target.readiness] = (summary[target.readiness] || 0) + 1;
  return summary;
}, {});
report.summary = {
  expectedTargets: targetsRegistry.expectedTargetCount,
  registeredTargets: targets.length,
  readinessCounts: counts,
  blockerCount: report.targets.reduce((total, target) => total + target.blockers.length, 0),
  warningCount: report.targets.reduce((total, target) => total + target.warnings.length, 0)
};

console.log('NEXUS compiled-application build-readiness inventory');
console.log(`- Registered targets: ${report.summary.registeredTargets}`);
console.log(`- Readiness: ${JSON.stringify(report.summary.readinessCounts)}`);
console.log(`- Structural blockers: ${report.summary.blockerCount}`);
console.log(`- Findings: ${report.summary.warningCount}`);
for (const target of report.targets) {
  console.log(`\n${target.id}: ${target.readiness}`);
  console.log(`  entry: ${target.indexEntry?.classification || 'unknown'} ${JSON.stringify(target.indexEntry?.entries || [])}`);
  console.log(`  vite base: ${target.vite?.base ?? '(implicit)'}`);
  console.log(`  output: ${target.output?.directory || '(unknown)'}; source-tree index: ${target.output?.indexPresent === true ? 'yes' : 'no'}`);
  console.log(`  lockfiles: ${target.lockfiles.length ? target.lockfiles.join(', ') : 'none'}`);
  for (const blocker of target.blockers) console.log(`  BLOCKER: ${blocker}`);
  for (const warning of target.warnings) console.log(`  finding: ${warning}`);
}

if (shouldWrite) {
  const outputDir = path.join(rootDir, 'reports/reforge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'build-readiness.json');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${path.relative(rootDir, outputPath)}`);
}

if (findings.length > 0) {
  console.log(`\nReadiness findings recorded: ${findings.length}. Clean-build verification and deployment assembly are the promotion gates.`);
}

if (errors.length > 0) {
  console.error(`\nBuild-readiness inventory failed with ${errors.length} structural error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nBuild-readiness structural inventory passed. Vite source entry paths are not production output; no application is promoted until clean build and deployed-route verification pass.');
