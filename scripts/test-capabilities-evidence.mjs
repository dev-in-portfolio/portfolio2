import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(root, 'scripts', 'validate-capabilities-evidence.mjs');
const source = path.join(root, 'capabilities');
const failures = [];

async function readJson(target, name) {
  return JSON.parse(await readFile(path.join(target, name), 'utf8'));
}
async function writeJson(target, name, value) {
  await writeFile(path.join(target, name), `${JSON.stringify(value)}\n`, 'utf8');
}
function runValidator(target) {
  return spawnSync(process.execPath, [validator, '--root', target, '--repo-root', root], { encoding: 'utf8' });
}
async function runCase(name, mutate, expectedSuccess, expectedText = '') {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'capabilities-evidence-'));
  const target = path.join(temp, 'capabilities');
  try {
    await cp(source, target, { recursive: true });
    if (mutate) await mutate(target);
    const result = runValidator(target);
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    if ((result.status === 0) !== expectedSuccess) failures.push(`${name}: expected ${expectedSuccess ? 'success' : 'failure'}, received ${result.status}\n${output}`);
    if (expectedText && !output.includes(expectedText)) failures.push(`${name}: output did not include ${expectedText}\n${output}`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await runCase('baseline', null, true, 'Capabilities evidence validated');
await runCase('queued public project', async target => {
  const projects = await readJson(target, 'evidence-projects.json');
  projects.find(project => project.id === 'alibi').reviewStatus = 'queued';
  await writeJson(target, 'evidence-projects.json', projects);
}, false, 'queued projects cannot have public claims');
await runCase('documentation-only public claim', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  Object.assign(claims[0].evidence, { implementationInspected: false, automatedValidation: false, runtimeVerified: false, deploymentVerified: false, documented: true });
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'public claims require substantive evidence');
await runCase('unsafe project href', async target => {
  const projects = await readJson(target, 'evidence-projects.json');
  projects[0].href = 'javascript:alert(1)';
  await writeJson(target, 'evidence-projects.json', projects);
}, false, 'href must use safe HTTPS');
await runCase('unsafe source URL', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  claims[0].sourceFiles[0] = 'javascript:alert(1)';
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'source URL must be a clean HTTPS github.com URL');
await runCase('duplicate claim id', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  claims.push(structuredClone(claims[0]));
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'Duplicate claim id');
await runCase('obsolete fit score', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  claims[0].fitScore = 99;
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'obsolete key is not allowed: fitScore');
await runCase('missing local source', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  claims[0].sourceFiles[0] = 'https://github.com/dev-in-portfolio/portfolio2/blob/main/does/not/exist.js';
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'referenced Portfolio 2 source does not exist');
await runCase('wrong evidence key', async target => {
  const claims = await readJson(target, 'evidence-claims-core.json');
  claims[0].evidence.unreviewed = true;
  await writeJson(target, 'evidence-claims-core.json', claims);
}, false, 'unexpected key unreviewed');
await runCase('manifest traversal', async target => {
  const manifest = await readJson(target, 'evidence-ledger.json');
  manifest.projectFile = '../package.json';
  await writeJson(target, 'evidence-ledger.json', manifest);
}, false, 'escapes the capabilities directory');
await runCase('directory uses blob URL', async target => {
  const claims = await readJson(target, 'evidence-claims-systems.json');
  claims.find(claim => claim.id === 'helios-webgpu').sourceFiles.push('https://github.com/dev-in-portfolio/portfolio2/blob/main/apps/apps/helios/src/renderer');
  await writeJson(target, 'evidence-claims-systems.json', claims);
}, false, 'repository directory must use /tree/');

if (failures.length) {
  console.error(`Capabilities evidence negative tests failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Capabilities evidence negative tests passed: 11 scenarios.');
