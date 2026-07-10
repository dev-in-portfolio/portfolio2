import { readFile } from 'node:fs/promises';

const registryPath = new URL('../data/apps.registry.json', import.meta.url);
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const errors = [];

const allowedLifecycleStatuses = new Set([
  'pending-review',
  'verified-active',
  'active-with-limitations',
  'experimental',
  'external',
  'archived',
  'quarantined'
]);

const allowedDeploymentTypes = new Set([
  'local-static',
  'local-build-candidate',
  'bundled',
  'external'
]);

const allowedVerificationStatuses = new Set([
  'pending',
  'in-progress',
  'passed',
  'passed-with-limitations',
  'failed',
  'not-applicable'
]);

if (registry.schemaVersion !== 1) {
  errors.push(`Unsupported apps registry schemaVersion: ${registry.schemaVersion}`);
}

if (!Array.isArray(registry.applications)) {
  errors.push('applications must be an array');
}

const applications = Array.isArray(registry.applications) ? registry.applications : [];

if (Number.isInteger(registry.expectedApplicationCount) && applications.length !== registry.expectedApplicationCount) {
  errors.push(`Expected ${registry.expectedApplicationCount} applications, found ${applications.length}`);
}

const ids = new Set();
const hrefs = new Set();

for (const [index, app] of applications.entries()) {
  const label = app?.name || app?.id || `application[${index}]`;

  for (const field of ['id', 'name', 'category', 'href', 'deploymentType', 'buildType', 'lifecycleStatus']) {
    if (typeof app?.[field] !== 'string' || app[field].trim() === '') {
      errors.push(`${label}: missing or invalid ${field}`);
    }
  }

  if (typeof app?.id === 'string') {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.id)) {
      errors.push(`${label}: id must use lowercase kebab-case`);
    }
    if (ids.has(app.id)) errors.push(`${label}: duplicate id ${app.id}`);
    ids.add(app.id);
  }

  if (typeof app?.href === 'string') {
    if (!(app.href.startsWith('/') || app.href.startsWith('https://'))) {
      errors.push(`${label}: href must be root-relative or HTTPS`);
    }
    if (hrefs.has(app.href)) errors.push(`${label}: duplicate href ${app.href}`);
    hrefs.add(app.href);
  }

  if (!allowedLifecycleStatuses.has(app?.lifecycleStatus)) {
    errors.push(`${label}: unsupported lifecycleStatus ${app?.lifecycleStatus}`);
  }

  if (!allowedDeploymentTypes.has(app?.deploymentType)) {
    errors.push(`${label}: unsupported deploymentType ${app?.deploymentType}`);
  }

  if (!allowedVerificationStatuses.has(app?.verification?.status)) {
    errors.push(`${label}: unsupported or missing verification.status`);
  }

  if (app?.deploymentType === 'external') {
    if (!app.href?.startsWith('https://')) errors.push(`${label}: external applications require an HTTPS href`);
    if (app.sourcePath !== null) errors.push(`${label}: baseline external application sourcePath must be null`);
  } else if (typeof app?.sourcePath !== 'string' || app.sourcePath.trim() === '') {
    errors.push(`${label}: local applications require sourcePath`);
  }

  if (!Array.isArray(app?.legacyTags)) {
    errors.push(`${label}: legacyTags must be an array`);
  }
}

if (errors.length > 0) {
  console.error(`Registry validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Registry validation passed: ${applications.length} applications, ${ids.size} unique IDs, ${hrefs.size} unique routes.`);
