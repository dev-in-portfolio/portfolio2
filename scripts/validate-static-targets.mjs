import { readFile } from 'node:fs/promises';

const readJson = async relativePath => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
const staticRegistry = await readJson('data/static-targets.registry.json');
const appsRegistry = await readJson('data/apps.registry.json');
const errors = [];

if (staticRegistry.schemaVersion !== 1) errors.push(`Unsupported static-target schemaVersion: ${staticRegistry.schemaVersion}`);
if (!Array.isArray(staticRegistry.targets)) errors.push('static-targets.registry.json: targets must be an array');

const targets = Array.isArray(staticRegistry.targets) ? staticRegistry.targets : [];
if (Number.isInteger(staticRegistry.expectedTargetCount) && targets.length !== staticRegistry.expectedTargetCount) {
  errors.push(`Expected ${staticRegistry.expectedTargetCount} static targets, found ${targets.length}`);
}

const apps = appsRegistry.applications || [];
const appById = new Map(apps.map(app => [app.id, app]));
const staticApps = apps.filter(app => app.buildType === 'static' && app.deploymentType === 'local-static');
const targetIds = new Set();
const targetRoutes = new Set();

for (const [index, target] of targets.entries()) {
  const label = target?.id || `target[${index}]`;
  for (const field of ['id', 'sourcePath', 'publicRoute', 'entryFile', 'runtimeClass']) {
    if (typeof target?.[field] !== 'string' || target[field].trim() === '') errors.push(`${label}: missing or invalid ${field}`);
  }
  if (targetIds.has(target?.id)) errors.push(`${label}: duplicate static-target id`);
  targetIds.add(target?.id);
  if (targetRoutes.has(target?.publicRoute)) errors.push(`${label}: duplicate publicRoute`);
  targetRoutes.add(target?.publicRoute);
  if (target.entryFile !== 'index.html') errors.push(`${label}: foundation static entryFile must be index.html`);

  const app = appById.get(target?.id);
  if (!app) {
    errors.push(`${label}: no matching application registry record`);
    continue;
  }
  if (app.buildType !== 'static') errors.push(`${label}: matching app is not static`);
  if (app.deploymentType !== 'local-static') errors.push(`${label}: matching app is not local-static`);
  if (app.sourcePath !== target.sourcePath) errors.push(`${label}: sourcePath differs from apps registry`);
  if (app.href !== target.publicRoute) errors.push(`${label}: publicRoute differs from apps registry href`);
}

for (const app of staticApps) {
  if (!targetIds.has(app.id)) errors.push(`${app.id}: local static app missing from static-target registry`);
}
if (targets.length !== staticApps.length) {
  errors.push(`Static-target count ${targets.length} does not match cataloged local-static count ${staticApps.length}`);
}

if (errors.length > 0) {
  console.error(`Static-target validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Static-target validation passed: ${targets.length} targets match ${staticApps.length} cataloged local static applications.`);
