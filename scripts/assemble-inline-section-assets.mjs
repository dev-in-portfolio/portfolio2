import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const outputRoot = path.resolve(rootDir, valueFor('--output') || 'dist');
const mounts = [
  { id: 'tools', sourceRoot: path.join(rootDir, 'utilities'), outputEntry: path.join(outputRoot, 'tools/index.html') },
  { id: 'about', sourceRoot: path.join(rootDir, 'about'), outputEntry: path.join(outputRoot, 'about/index.html') },
  { id: 'contact', sourceRoot: path.join(rootDir, 'contact'), outputEntry: path.join(outputRoot, 'contact/index.html') }
];
const rootReferencePattern = /\/(?:assets|shared|data|help|case-studies)\/[^"'`\s)<>]+|\/(?:runtime-guard\.js|manifest\.webmanifest|favicon\.ico|icon-\d+\.(?:png|svg))/gi;
const excludedFilePattern = /\.(?:bak|backup|old|orig|map|zip)(?:[?#]|$)/i;
const records = [];
const errors = [];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function splitReference(reference) {
  const index = reference.search(/[?#]/);
  return index < 0
    ? { clean: reference, suffix: '' }
    : { clean: reference.slice(0, index), suffix: reference.slice(index) };
}

for (const mount of mounts) {
  if (!await exists(mount.outputEntry)) {
    errors.push(`${mount.id}: output entry is missing`);
    continue;
  }

  const original = await readFile(mount.outputEntry, 'utf8');
  const references = [...new Set(original.match(rootReferencePattern) || [])];
  let updated = original;

  for (const reference of references) {
    if (reference.startsWith(`/${mount.id}/`)) continue;
    if (excludedFilePattern.test(reference)) {
      errors.push(`${mount.id}: prohibited inline reference ${reference}`);
      continue;
    }

    const { clean, suffix } = splitReference(reference);
    const relative = clean.replace(/^\/+/, '');
    const source = path.join(mount.sourceRoot, relative);
    if (!await exists(source) || !(await stat(source)).isFile()) continue;

    const output = path.join(outputRoot, mount.id, relative);
    await mkdir(path.dirname(output), { recursive: true });
    await cp(source, output, { force: true });

    const rewritten = `/${mount.id}/${relative}${suffix}`;
    updated = updated.split(reference).join(rewritten);
    records.push({ section: mount.id, source: path.relative(rootDir, source), output: path.relative(outputRoot, output), reference, rewritten });
  }

  if (updated !== original) await writeFile(mount.outputEntry, updated, 'utf8');
}

await writeFile(
  path.join(outputRoot, 'inline-section-assets-manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), records, errors }, null, 2)}\n`,
  'utf8'
);

console.log(`Assembled ${records.length} inline section asset reference(s).`);
for (const record of records) console.log(`- ${record.section}: ${record.reference} -> ${record.rewritten}`);

if (errors.length > 0) {
  console.error(`Inline section asset assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
