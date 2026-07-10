import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/protected-files.json'), 'utf8'));
const errors = [];

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

for (const protectedFile of registry.files || []) {
  const absolutePath = path.join(rootDir, protectedFile.path);
  let content;
  try {
    content = await readFile(absolutePath);
  } catch (error) {
    errors.push(`${protectedFile.path}: cannot read protected file (${error.code || error.message})`);
    continue;
  }

  const actualSha = gitBlobSha(content);
  if (actualSha !== protectedFile.gitBlobSha) {
    errors.push(`${protectedFile.path}: protected hash changed; expected ${protectedFile.gitBlobSha}, received ${actualSha}`);
  } else {
    console.log(`Protected file unchanged: ${protectedFile.path} (${actualSha})`);
  }
}

if (errors.length > 0) {
  console.error(`Protected-file verification failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  console.error('During the foundation pass, any compatibility-only change to a protected file must be separately documented and explicitly approved.');
  process.exit(1);
}

console.log(`Protected-file verification passed for ${(registry.files || []).length} file(s).`);
