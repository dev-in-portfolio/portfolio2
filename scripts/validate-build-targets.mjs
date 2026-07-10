import { readFile } from 'node:fs/promises';

const readJson = async relativePath => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
const buildRegistry = await readJson('data/build-targets.registry.json');
const appsRegistry = await readJson('data/apps.registry.json');
const errors = [];

if (buildRegistry.schemaVersion !== 1) {
  errors.push(`Unsupported build-target schemaVersion: ${buildRegistry.schemaVersion}`);
}

if (!Array.isArray(buildRegistry.targets)) {
  errors.push('build-targets.registry.json: targets must be an array');
}

const targets = Array.isArray(buildRegistry.targets) ? buildRegistry.targets : [];
if (Number.isInteger(buildRegistry.expectedTargetCount) && targets.length !== buildRegistry.expectedTargetCount) {
  errors.push(`Expected ${buildRegistry.expectedTargetCount} build targets, found ${targets.length}`);
}

const apps = appsRegistry.applications || [];
const appById = new Map(apps.map(app => [app.id, app]));
const viteCandidates = apps.filter(app => app.buildType === 'vite-candidate');
const targetIds = new Set();
const targetRoutes = new Set();

for (const [index, target] of targets.entries()) {
  const label = target?.id || `target[${index}]`;
  for (const field of ['id', 'sourcePath', 'publicRoute', 'runtimeClass']) {
    if (typeof target?.[field] !== 'string' || target[field].trim() === '') {
      errors.push(`${label}: missing or invalid ${field}`);
    }
  }

  if (targetIds.has(target?.id)) errors.push(`${label}: duplicate target id`);
  targetIds.add(target?.id);
  if (targetRoutes.has(target?.publicRoute)) errors.push(`${label}: duplicate publicRoute`);
  targetRoutes.add(target?.publicRoute);

  const app = appById.get(target?.id);
  if (!app) {
    errors.push(`${label}: no matching application registry record`);
    continue;
  }
  if (app.buildType !== 'vite-candidate') errors.push(`${label}: matching app is not vite-candidate`);
  if (app.deploymentType !== 'local-build-candidate') errors.push(`${label}: matching app is not local-build-candidate`);
  if (app.sourcePath !== target.sourcePath) errors.push(`${label}: sourcePath differs from apps registry`);
  if (app.href !== target.publicRoute) errors.push(`${label}: publicRoute differs from apps registry href`);
}

for (const app of viteCandidates) {
  if (!targetIds.has(app.id)) errors.push(`${app.id}: vite-candidate missing from build-target registry`);
}

if (targets.length !== viteCandidates.length) {
  errors.push(`Build-target count ${targets.length} does not match vite-candidate count ${viteCandidates.length}`);
}

const requiredFiles = buildRegistry.defaults?.requiredFiles;
if (!Array.isArray(requiredFiles) || requiredFiles.length === 0) {
  errors.push('build-targets.registry.json: defaults.requiredFiles must be a non-empty array');
}
for (const required of ['package.json', 'index.html', 'src/main.ts', 'tsconfig.json', 'vite.config.ts']) {
  if (!requiredFiles?.includes(required)) errors.push(`build-targets.registry.json: required file policy missing ${required}`);
}

if (buildRegistry.defaults?.outputDirectory !== 'dist') {
  errors.push('build-targets.registry.json: baseline outputDirectory must be dist');
}
if (buildRegistry.defaults?.preferredViteBase !== './') {
  errors.push('build-targets.registry.json: preferredViteBase must be ./ for nested static routes');
}

if (errors.length > 0) {
  console.error(`Build-target validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Build-target validation passed: ${targets.length} targets match ${viteCandidates.length} cataloged Vite candidates.`);
