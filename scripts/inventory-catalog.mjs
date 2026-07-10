import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const legacy = JSON.parse(await readFile(path.join(rootDir, registry.legacySource), 'utf8'));

const flattenLegacy = (groups = []) => groups.flatMap(group =>
  (group.apps || []).map(app => ({
    name: app.name,
    href: app.href,
    category: group.name,
    tags: app.tags || []
  }))
);

const legacyApps = [
  ...flattenLegacy(legacy.categoryData),
  ...flattenLegacy(legacy.extraCategories)
];

const key = app => `${app.name}::${app.href}`;
const legacyKeys = new Set(legacyApps.map(key));
const registryKeys = new Set(registry.applications.map(key));
const missingFromRegistry = legacyApps.filter(app => !registryKeys.has(key(app)));
const extraInRegistry = registry.applications.filter(app => !legacyKeys.has(key(app)));

const localApps = registry.applications.filter(app => app.deploymentType !== 'external');
const missingSourcePaths = [];
for (const app of localApps) {
  try {
    await access(path.join(rootDir, app.sourcePath));
  } catch {
    missingSourcePaths.push({ id: app.id, sourcePath: app.sourcePath });
  }
}

const countBy = (items, selector) => items.reduce((counts, item) => {
  const value = selector(item);
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

console.log('NEXUS application baseline inventory');
console.log(`- Legacy catalog entries: ${legacyApps.length}`);
console.log(`- Canonical registry entries: ${registry.applications.length}`);
console.log(`- Local candidates: ${localApps.length}`);
console.log(`- External candidates: ${registry.applications.length - localApps.length}`);
console.log('- Deployment types:', countBy(registry.applications, app => app.deploymentType));
console.log('- Lifecycle states:', countBy(registry.applications, app => app.lifecycleStatus));
console.log('- Verification states:', countBy(registry.applications, app => app.verification.status));

if (missingFromRegistry.length) {
  console.error('\nLegacy entries missing from canonical registry:');
  for (const app of missingFromRegistry) console.error(`- ${app.name} (${app.href})`);
}

if (extraInRegistry.length) {
  console.error('\nCanonical entries not present in legacy catalog:');
  for (const app of extraInRegistry) console.error(`- ${app.name} (${app.href})`);
}

if (missingSourcePaths.length) {
  console.error('\nLocal source paths not found:');
  for (const app of missingSourcePaths) console.error(`- ${app.id}: ${app.sourcePath}`);
}

if (missingFromRegistry.length || extraInRegistry.length || missingSourcePaths.length) {
  process.exit(1);
}

console.log('\nBaseline inventory passed: legacy catalog and canonical registry match, and all declared local source paths exist.');
