import { readFile } from 'node:fs/promises';

const readJson = async relativePath => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
const appsRegistry = await readJson('data/apps.registry.json');
const healthRegistry = await readJson('data/external-health.registry.json');
const errors = [];

if (healthRegistry.schemaVersion !== 1) {
  errors.push(`Unsupported external-health schemaVersion: ${healthRegistry.schemaVersion}`);
}
if (healthRegistry.snapshotStatus !== 'endpoint-health-passed') {
  errors.push('external-health.registry.json: snapshotStatus must be endpoint-health-passed');
}
if (typeof healthRegistry.checkedAt !== 'string' || Number.isNaN(Date.parse(healthRegistry.checkedAt))) {
  errors.push('external-health.registry.json: checkedAt must be an ISO date');
}
if (typeof healthRegistry.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(healthRegistry.sourceCommit)) {
  errors.push('external-health.registry.json: sourceCommit must be a full Git SHA');
}
if (!Number.isInteger(healthRegistry.workflow?.runId)) {
  errors.push('external-health.registry.json: workflow.runId must be an integer');
}
if (!Number.isInteger(healthRegistry.artifact?.id)) {
  errors.push('external-health.registry.json: artifact.id must be an integer');
}
if (healthRegistry.artifact?.name !== 'reforge-external-health') {
  errors.push('external-health.registry.json: artifact.name must be reforge-external-health');
}
if (typeof healthRegistry.artifact?.digest !== 'string' || !healthRegistry.artifact.digest.startsWith('sha256:')) {
  errors.push('external-health.registry.json: artifact.digest must be a SHA-256 digest');
}

const externalApps = (appsRegistry.applications || []).filter(app => app.deploymentType === 'external');
const externalIds = new Set(externalApps.map(app => app.id));
const results = Array.isArray(healthRegistry.results) ? healthRegistry.results : [];
const resultIds = new Set();

if (results.length !== externalApps.length) {
  errors.push(`External health result count ${results.length} does not match external app count ${externalApps.length}`);
}

for (const result of results) {
  const label = result?.id || '(missing external health id)';
  if (resultIds.has(result?.id)) errors.push(`${label}: duplicate external health result`);
  resultIds.add(result?.id);
  if (!externalIds.has(result?.id)) errors.push(`${label}: health result has no matching external app`);
  if (result.status !== 200) errors.push(`${label}: endpoint status must be 200 in a passed snapshot`);
  if (result.health !== 'healthy-response') errors.push(`${label}: health must be healthy-response`);
  if (!Number.isInteger(result.attempts) || result.attempts < 1 || result.attempts > healthRegistry.summary?.maxAttempts) {
    errors.push(`${label}: invalid attempts count`);
  }
  if (typeof result.recoveredAfterRetry !== 'boolean') errors.push(`${label}: recoveredAfterRetry must be boolean`);
  if (result.recoveredAfterRetry !== (result.attempts > 1)) {
    errors.push(`${label}: recoveredAfterRetry must match attempts > 1`);
  }
  if (typeof result.title !== 'string' || result.title.trim() === '') errors.push(`${label}: HTML title is required`);
}

for (const id of externalIds) {
  if (!resultIds.has(id)) errors.push(`${id}: external app missing from health snapshot`);
}

const summary = healthRegistry.summary || {};
if (summary.expectedTargets !== externalApps.length) errors.push('external-health.registry.json: expectedTargets mismatch');
if (summary.checkedTargets !== results.length) errors.push('external-health.registry.json: checkedTargets mismatch');
if (summary.healthyCount !== results.filter(result => result.health === 'healthy-response').length) {
  errors.push('external-health.registry.json: healthyCount mismatch');
}
if (summary.recoveredAfterRetryCount !== results.filter(result => result.recoveredAfterRetry).length) {
  errors.push('external-health.registry.json: recoveredAfterRetryCount mismatch');
}
if (summary.unhealthyCount !== 0) errors.push('external-health.registry.json: passed snapshot must have unhealthyCount 0');

if (errors.length > 0) {
  console.error(`External-health validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `External-health validation passed: ${results.length}/${externalApps.length} endpoints returned healthy HTML responses; ` +
  `${summary.recoveredAfterRetryCount} recovered after retry. Feature verification remains separate.`
);
