import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const coverageRoot = path.join(rootDir, 'apps/apps/coverage-compass');
const sourceReports = path.join(coverageRoot, 'src/reports');
const compatibleReports = path.join(coverageRoot, 'src/report-modules');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!await exists(path.join(coverageRoot, 'build-metadata.json'))) {
  console.log('Coverage Compass production artifact is not present; no static compatibility adaptation needed.');
  process.exit(0);
}

for (const file of ['readiness.js', 'snapshot.js']) {
  const source = path.join(sourceReports, file);
  if (!await exists(source)) throw new Error(`Coverage Compass compatibility source is missing: src/reports/${file}`);
  await mkdir(compatibleReports, { recursive: true });
  await cp(source, path.join(compatibleReports, file), { force: true });
}

const rewrites = [
  {
    file: 'src/browser/runtime.js',
    replacements: [
      ["../reports/readiness.js", "../report-modules/readiness.js"],
      ["../reports/snapshot.js", "../report-modules/snapshot.js"]
    ]
  },
  {
    file: 'src/engine/calculate.js',
    replacements: [["../reports/snapshot.js", "../report-modules/snapshot.js"]]
  },
  {
    file: 'src/engine/overrides.js',
    replacements: [["../reports/snapshot.js", "../report-modules/snapshot.js"]]
  },
  {
    file: 'service-worker.js',
    replacements: [
      ["./src/reports/readiness.js", "./src/report-modules/readiness.js"],
      ["./src/reports/snapshot.js", "./src/report-modules/snapshot.js"]
    ]
  }
];

const changed = [];
for (const item of rewrites) {
  const target = path.join(coverageRoot, item.file);
  if (!await exists(target)) throw new Error(`Coverage Compass compatibility target is missing: ${item.file}`);
  const original = await readFile(target, 'utf8');
  let updated = original;
  for (const [from, to] of item.replacements) {
    if (updated.includes(from)) updated = updated.split(from).join(to);
    else if (!updated.includes(to)) throw new Error(`${item.file}: expected compatibility reference not found: ${from}`);
  }
  if (updated !== original) {
    await writeFile(target, updated, 'utf8');
    changed.push(item.file);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  application: 'coverage-compass',
  reason: 'The portfolio deployment excludes repository-generated reports directories; Coverage Compass uses src/reports for required runtime modules.',
  sourceModules: ['src/reports/readiness.js', 'src/reports/snapshot.js'],
  compatibleModules: ['src/report-modules/readiness.js', 'src/report-modules/snapshot.js'],
  rewrittenFiles: changed
};
await writeFile(path.join(coverageRoot, '.portfolio-build-compat.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('Coverage Compass static compatibility adaptation complete.');
console.log(`- copied modules: ${manifest.compatibleModules.join(', ')}`);
console.log(`- rewritten files: ${changed.join(', ') || 'already compatible'}`);
