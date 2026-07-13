import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const outputRoot = path.resolve(root, valueFor('--output') || 'dist');
const scope = valueFor('--scope') || 'main';
const canonical = path.join(root, 'shared/ambient-motion.js');
const mappings = scope === 'apps'
  ? [
      { id: 'apps', source: path.join(root, 'apps/shared/ambient-motion.js'), destination: path.join(outputRoot, 'shared/ambient-motion.js') }
    ]
  : [
      { id: 'apps', source: path.join(root, 'apps/shared/ambient-motion.js'), destination: path.join(outputRoot, 'shared/ambient-motion.js') },
      { id: 'about', source: path.join(root, 'about/shared/ambient-motion.js'), destination: path.join(outputRoot, 'about/shared/ambient-motion.js') },
      { id: 'contact', source: path.join(root, 'contact/shared/ambient-motion.js'), destination: path.join(outputRoot, 'contact/shared/ambient-motion.js') },
      { id: 'tools', source: path.join(root, 'utilities/shared/ambient-motion.js'), destination: path.join(outputRoot, 'tools/shared/ambient-motion.js') },
      { id: 'capabilities', source: path.join(root, 'capabilities/shared/ambient-motion.js'), destination: path.join(outputRoot, 'capabilities/shared/ambient-motion.js') }
    ];

const exists = async target => {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
};
const digest = content => createHash('sha256').update(content).digest('hex');
const canonicalContent = await readFile(canonical);
const canonicalSha256 = digest(canonicalContent);
const records = [];
const errors = [];

for (const mapping of mappings) {
  if (!await exists(mapping.source)) {
    errors.push(`${mapping.id}: missing source ${path.relative(root, mapping.source)}`);
    continue;
  }
  const sourceContent = await readFile(mapping.source);
  const sourceSha256 = digest(sourceContent);
  if (sourceSha256 !== canonicalSha256) {
    errors.push(`${mapping.id}: ambient motion source diverges from shared/ambient-motion.js`);
    continue;
  }
  await mkdir(path.dirname(mapping.destination), { recursive: true });
  await cp(mapping.source, mapping.destination, { force: true });
  const outputContent = await readFile(mapping.destination);
  const outputSha256 = digest(outputContent);
  if (outputSha256 !== canonicalSha256) {
    errors.push(`${mapping.id}: copied output hash does not match canonical source`);
    continue;
  }
  records.push({
    id: mapping.id,
    source: path.relative(root, mapping.source).split(path.sep).join('/'),
    output: path.relative(outputRoot, mapping.destination).split(path.sep).join('/'),
    bytes: outputContent.length,
    sha256: outputSha256
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  scope,
  outputRoot: path.relative(root, outputRoot).split(path.sep).join('/'),
  canonicalSource: 'shared/ambient-motion.js',
  canonicalSha256,
  records,
  errors
};
await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, 'ambient-motion-assets-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Ambient motion assets: ${records.length}/${mappings.length} copied for ${scope} deployment.`);
for (const record of records) console.log(`- ${record.id}: ${record.source} -> ${record.output}`);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
