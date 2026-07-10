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
const rootReferencePattern = /(?<![A-Za-z0-9_./-])\/(?:assets|shared|data|help|case-studies)\/[^"'`\s)<>]+|(?<![A-Za-z0-9_./-])\/(?:runtime-guard\.js|manifest\.webmanifest|favicon\.ico|icon-\d+\.(?:png|svg))/gi;
const excludedFilePattern = /\.(?:bak|backup|old|orig|map|zip)(?:[?#]|$)/i;
const excludedDirectoryNames = new Set(['.git', '.netlify', 'node_modules', 'dist', 'archive', 'source_backups', 'private', 'reports']);
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

function includeContent(source) {
  const parts = source.split(path.sep);
  if (parts.some(part => excludedDirectoryNames.has(part))) return false;
  return !excludedFilePattern.test(source);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceRootReference(content, reference, rewritten) {
  const pattern = new RegExp(`(?<![A-Za-z0-9_./-])${escapeRegExp(reference)}`, 'g');
  return content.replace(pattern, rewritten);
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
    updated = replaceRootReference(updated, reference, rewritten);
    records.push({ section: mount.id, source: path.relative(rootDir, source), output: path.relative(outputRoot, output), reference, rewritten });
  }

  if (mount.id === 'tools') {
    for (const directoryName of ['data', 'docs']) {
      const source = path.join(mount.sourceRoot, directoryName);
      const output = path.join(outputRoot, 'tools', directoryName);
      if (!await exists(source)) continue;
      await mkdir(path.dirname(output), { recursive: true });
      await cp(source, output, { recursive: true, force: true, filter: includeContent });
      records.push({ section: 'tools', source: path.relative(rootDir, source), output: path.relative(outputRoot, output), reference: `${directoryName}/**`, rewritten: `/tools/${directoryName}/**` });
    }

    const docsListSource = path.join(mount.sourceRoot, 'assets/docs-list.json');
    const docsListOutput = path.join(outputRoot, 'tools/assets/docs-list.json');
    if (await exists(docsListSource)) {
      await mkdir(path.dirname(docsListOutput), { recursive: true });
      await cp(docsListSource, docsListOutput, { force: true });
      records.push({ section: 'tools', source: path.relative(rootDir, docsListSource), output: path.relative(outputRoot, docsListOutput), reference: '../assets/docs-list.json', rewritten: './assets/docs-list.json' });
    } else {
      errors.push('tools: missing utilities/assets/docs-list.json');
    }

    updated = updated
      .replace(/\.\.\/assets\//g, './assets/')
      .replace(/\.\.\/data\//g, './data/')
      .replace(/\.\.\/docs\//g, './docs/');
  }

  if (updated !== original) await writeFile(mount.outputEntry, updated, 'utf8');
}

await writeFile(
  path.join(outputRoot, 'inline-section-assets-manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), records, errors }, null, 2)}\n`,
  'utf8'
);

console.log(`Assembled ${records.length} inline section asset/content reference(s).`);
for (const record of records) console.log(`- ${record.section}: ${record.reference} -> ${record.rewritten}`);

if (errors.length > 0) {
  console.error(`Inline section asset assembly failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
