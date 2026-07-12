import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const coverageRoot = path.join(rootDir, 'apps/apps/coverage-compass');
const reportingRoot = path.join(coverageRoot, 'src/reporting');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!await exists(path.join(coverageRoot, 'build-metadata.json'))) {
  console.log('Coverage Compass production artifact is not present; no static compatibility validation needed.');
  process.exit(0);
}

const requiredModules = ['readiness.js', 'snapshot.js'];
for (const file of requiredModules) {
  const source = path.join(reportingRoot, file);
  if (!await exists(source)) throw new Error(`Coverage Compass reporting module is missing: src/reporting/${file}`);
}

const expectedReferences = [
  {
    file: 'src/browser/runtime.js',
    references: ['../reporting/readiness.js', '../reporting/snapshot.js']
  },
  {
    file: 'src/engine/calculate.js',
    references: ['../reporting/snapshot.js']
  },
  {
    file: 'src/engine/overrides.js',
    references: ['../reporting/snapshot.js']
  },
  {
    file: 'service-worker.js',
    references: ['./src/reporting/readiness.js', './src/reporting/snapshot.js']
  }
];

for (const item of expectedReferences) {
  const target = path.join(coverageRoot, item.file);
  if (!await exists(target)) throw new Error(`Coverage Compass compatibility target is missing: ${item.file}`);
  const content = await readFile(target, 'utf8');
  if (content.includes('../reports/') || content.includes('./src/reports/')) {
    throw new Error(`${item.file}: obsolete reports path remains in the production artifact`);
  }
  for (const reference of item.references) {
    if (!content.includes(reference)) throw new Error(`${item.file}: canonical reporting reference is missing: ${reference}`);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  application: 'coverage-compass',
  compatibilityMode: 'canonical-reporting-modules',
  reason: 'Coverage Compass runtime modules live in a deployment-safe reporting directory and require no build-time duplication.',
  sourceModules: requiredModules.map((file) => `src/reporting/${file}`),
  validatedFiles: expectedReferences.map((item) => item.file),
  rewrittenFiles: []
};
await writeFile(path.join(coverageRoot, '.portfolio-build-compat.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('Coverage Compass static compatibility validation complete.');
console.log(`- reporting modules: ${manifest.sourceModules.join(', ')}`);
console.log(`- validated references: ${manifest.validatedFiles.join(', ')}`);
