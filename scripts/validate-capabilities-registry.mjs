import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registryPath = path.join(rootDir, 'capabilities/capabilities.registry.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

const errors = [];
const allowedStatuses = new Set([
  'verified-current',
  'current-profile',
  'current-catalog-pending',
  'current-repository'
]);

if (registry.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) {
  errors.push('capabilities must be a non-empty array');
}
if (!Array.isArray(registry.evidence) || registry.evidence.length === 0) {
  errors.push('evidence must be a non-empty array');
}

const evidenceIds = new Set();
for (const item of registry.evidence || []) {
  if (!item.id) errors.push('evidence entry missing id');
  else if (evidenceIds.has(item.id)) errors.push(`duplicate evidence id: ${item.id}`);
  else evidenceIds.add(item.id);

  if (!item.name) errors.push(`${item.id || 'unknown evidence'} missing name`);
  if (!item.href) errors.push(`${item.id || 'unknown evidence'} missing href`);
  if (!allowedStatuses.has(item.status)) errors.push(`${item.id || 'unknown evidence'} has invalid status: ${item.status}`);
  if (item.status === 'verified-current' && !item.verifiedOn) {
    errors.push(`${item.id || 'unknown evidence'} is verified-current but missing verifiedOn`);
  }
}

const capabilityIds = new Set();
const referenced = new Set();
for (const capability of registry.capabilities || []) {
  if (!capability.id) errors.push('capability entry missing id');
  else if (capabilityIds.has(capability.id)) errors.push(`duplicate capability id: ${capability.id}`);
  else capabilityIds.add(capability.id);

  if (!capability.title) errors.push(`${capability.id || 'unknown capability'} missing title`);
  if (!capability.outcome) errors.push(`${capability.id || 'unknown capability'} missing outcome`);
  if (!Array.isArray(capability.evidenceIds) || capability.evidenceIds.length === 0) {
    errors.push(`${capability.id || 'unknown capability'} must reference evidence`);
    continue;
  }

  const localIds = new Set();
  for (const evidenceId of capability.evidenceIds) {
    if (localIds.has(evidenceId)) errors.push(`${capability.id} repeats evidence id: ${evidenceId}`);
    localIds.add(evidenceId);
    referenced.add(evidenceId);
    if (!evidenceIds.has(evidenceId)) errors.push(`${capability.id} references missing evidence id: ${evidenceId}`);
  }
}

for (const evidenceId of evidenceIds) {
  if (!referenced.has(evidenceId)) errors.push(`orphan evidence record is not mapped to any capability: ${evidenceId}`);
}

if (errors.length) {
  console.error(`Capabilities registry validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Capabilities registry valid: ${registry.capabilities.length} capability groups, ${registry.evidence.length} evidence records, ${referenced.size} referenced projects.`);
