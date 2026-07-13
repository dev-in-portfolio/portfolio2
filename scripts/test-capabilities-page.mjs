import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capabilities = path.join(root, 'capabilities');
const [html, script, css, manifestText] = await Promise.all([
  readFile(path.join(capabilities, 'index.html'), 'utf8'),
  readFile(path.join(capabilities, 'capabilities.js'), 'utf8'),
  readFile(path.join(capabilities, 'capabilities.css'), 'utf8'),
  readFile(path.join(capabilities, 'evidence-ledger.json'), 'utf8')
]);
const manifest = JSON.parse(manifestText);
const errors = [];
const dimensions = Object.keys(manifest.verificationDimensions || {});
const requiredIds = ['summary-grid', 'search', 'domain-filter', 'evidence-filter', 'result-count', 'evidence-groups'];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
  if (!script.includes(`'${id}'`) && !script.includes(`"${id}"`)) errors.push(`capabilities.js does not reference #${id}`);
}
for (const dimension of dimensions) {
  if (!script.includes(`${dimension}:`)) errors.push(`capabilities.js is missing the ${dimension} evidence label.`);
  if (!html.includes(`value="${dimension}"`)) errors.push(`index.html is missing the ${dimension} filter option.`);
}
if (!html.includes('<noscript>')) errors.push('index.html needs a no-JavaScript failure message.');
if (!html.includes('rel="preload" href="./evidence-ledger.json"')) errors.push('index.html should preload the ledger manifest.');
if (!script.includes('function safeHref')) errors.push('capabilities.js must sanitize ledger-controlled links.');
if (!script.includes('validateLoadedLedger')) errors.push('capabilities.js must validate loaded ledger structure before rendering.');
if (!script.includes('<div class="domain-title">')) errors.push('Domain headings should use valid flow-content markup.');
if (!css.includes('@media (max-width: 620px)')) errors.push('Mobile layout rules are missing.');
if (!css.includes('@media (prefers-reduced-motion: reduce)')) errors.push('Reduced-motion handling is missing.');
if (/\b(?:fitScore|roleAlignment|percentage)\b/.test(manifestText)) errors.push('The ledger manifest contains obsolete score or role fields.');

if (errors.length) {
  console.error(`Capabilities page contract tests failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Capabilities page contract tests passed: ${dimensions.length} verification dimensions and ${requiredIds.length} required controls.`);
