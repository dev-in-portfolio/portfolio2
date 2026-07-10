import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/deployments.registry.json'), 'utf8'));
const shouldWrite = process.argv.includes('--write');
const errors = [];
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: registry.schemaVersion,
  localDeployments: [],
  configGroups: [],
  functionFamilies: []
};

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256(target) {
  const content = await readFile(target);
  return createHash('sha256').update(content).digest('hex');
}

async function listFiles(directory, base = directory) {
  const results = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFiles(absolute, base));
    } else if (entry.isFile()) {
      results.push(path.relative(base, absolute).split(path.sep).join('/'));
    }
  }
  return results;
}

if (registry.schemaVersion !== 1) errors.push(`Unsupported deployment registry schemaVersion: ${registry.schemaVersion}`);
if (!Array.isArray(registry.localDeployments)) errors.push('localDeployments must be an array');

const ids = new Set();
const routes = new Set();
const configRecords = [];
const functionRoots = [];

for (const deployment of registry.localDeployments || []) {
  if (!deployment.id || !deployment.sourceRoot || !deployment.publicRoute || !deployment.provider || !deployment.status) {
    errors.push(`Invalid deployment record: ${JSON.stringify(deployment)}`);
    continue;
  }
  if (ids.has(deployment.id)) errors.push(`Duplicate deployment id: ${deployment.id}`);
  ids.add(deployment.id);
  if (routes.has(deployment.publicRoute)) errors.push(`Duplicate deployment route: ${deployment.publicRoute}`);
  routes.add(deployment.publicRoute);

  const sourceRoot = deployment.sourceRoot === '.' ? rootDir : path.join(rootDir, deployment.sourceRoot);
  if (!await exists(sourceRoot)) errors.push(`${deployment.id}: source root does not exist (${deployment.sourceRoot})`);

  const result = {
    id: deployment.id,
    sourceRoot: deployment.sourceRoot,
    publicRoute: deployment.publicRoute,
    provider: deployment.provider,
    status: deployment.status,
    configPath: deployment.configPath,
    functionsPath: deployment.functionsPath
  };

  if (deployment.configPath) {
    const configAbsolute = path.join(rootDir, deployment.configPath);
    if (!await exists(configAbsolute)) {
      errors.push(`${deployment.id}: missing config ${deployment.configPath}`);
    } else {
      const content = await readFile(configAbsolute, 'utf8');
      const hash = await sha256(configAbsolute);
      result.configHash = hash;
      configRecords.push({ id: deployment.id, path: deployment.configPath, hash });

      const expected = registry.expectedNetlifyConfig || {};
      const requiredFragments = [
        `publish = \"${expected.publish}\"`,
        `functions = \"${expected.functions}\"`,
        `from = \"${expected.apiRedirectFrom}\"`,
        `to = \"${expected.apiRedirectTo}\"`,
        `status = ${expected.apiRedirectStatus}`
      ];
      for (const fragment of requiredFragments) {
        if (!content.includes(fragment)) errors.push(`${deployment.id}: config missing expected fragment ${fragment}`);
      }
    }
  }

  if (deployment.functionsPath) {
    const functionsAbsolute = path.join(rootDir, deployment.functionsPath);
    if (!await exists(functionsAbsolute)) {
      errors.push(`${deployment.id}: missing functions path ${deployment.functionsPath}`);
    } else {
      const files = await listFiles(functionsAbsolute);
      result.functionFileCount = files.length;
      functionRoots.push({ id: deployment.id, path: deployment.functionsPath, absolute: functionsAbsolute, files });
    }
  }

  report.localDeployments.push(result);
}

const configByHash = new Map();
for (const record of configRecords) {
  if (!configByHash.has(record.hash)) configByHash.set(record.hash, []);
  configByHash.get(record.hash).push(record);
}
for (const [hash, records] of configByHash) {
  report.configGroups.push({ hash, copies: records });
}

const relativeFunctionFiles = new Set(functionRoots.flatMap(root => root.files));
for (const relativePath of [...relativeFunctionFiles].sort()) {
  const copies = [];
  for (const root of functionRoots) {
    if (!root.files.includes(relativePath)) continue;
    const absolute = path.join(root.absolute, relativePath);
    copies.push({ deployment: root.id, path: `${root.path}/${relativePath}`, hash: await sha256(absolute) });
  }
  const uniqueHashes = [...new Set(copies.map(copy => copy.hash))];
  report.functionFamilies.push({
    relativePath,
    state: uniqueHashes.length === 1 ? 'identical' : 'diverged',
    copies
  });
}

console.log('NEXUS deployment-root inventory');
console.log(`- Local deployment records: ${report.localDeployments.length}`);
console.log(`- Netlify-config copies: ${configRecords.length}`);
console.log(`- Unique Netlify-config hashes: ${configByHash.size}`);
for (const group of report.configGroups) {
  console.log(`  - ${group.hash.slice(0, 16)}: ${group.copies.map(copy => copy.id).join(', ')}`);
}

console.log(`- Function roots: ${functionRoots.length}`);
console.log(`- Function families: ${report.functionFamilies.length}`);
for (const family of report.functionFamilies) {
  console.log(`  - ${family.relativePath}: ${family.state.toUpperCase()} across ${family.copies.length} root(s)`);
}

if (shouldWrite) {
  const outputDir = path.join(rootDir, 'reports/reforge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'deployment-inventory.json');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`- Wrote ${path.relative(rootDir, outputPath)}`);
}

if (errors.length > 0) {
  console.error(`\nDeployment inventory failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nDeployment inventory passed. Identical configs and functions remain untouched until canonical-source decisions are documented.');
