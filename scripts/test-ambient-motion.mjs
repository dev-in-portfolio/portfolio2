import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copies = [
  'shared/ambient-motion.js',
  'apps/shared/ambient-motion.js',
  'about/shared/ambient-motion.js',
  'contact/shared/ambient-motion.js',
  'utilities/shared/ambient-motion.js'
];
const errors = [];
const digest = value => createHash('sha256').update(value).digest('hex');
const contents = await Promise.all(copies.map(file => readFile(path.join(root, file), 'utf8')));
if (new Set(contents.map(digest)).size !== 1) errors.push('Ambient motion copies have diverged.');
const engine = contents[0];
for (const token of ['circuit', 'constellation', 'drift', 'ripple', 'grid-reveal']) {
  if (!engine.includes(`'${token}'`)) errors.push(`Ambient engine is missing ${token} mode.`);
}
for (const safeguard of ['prefers-reduced-motion', 'IntersectionObserver', 'visibilitychange', 'ResizeObserver', 'devicePixelRatio']) {
  if (!engine.includes(safeguard)) errors.push(`Ambient engine is missing ${safeguard} safeguard.`);
}
if (!engine.includes('pointer-events: none')) errors.push('Ambient layers must never capture pointer input.');
if (!engine.includes('MutationObserver')) errors.push('Grid reveal must observe dynamically rendered utility cards.');
if (!engine.includes('nexus:contact-success')) errors.push('Contact success ripple hook is missing.');
if (!engine.includes('position: fixed') || !engine.includes('document.body.appendChild(ripple)')) errors.push('Contact ripples must render as viewport-fixed feedback for actions outside the hero.');
if (!engine.includes("mount('ripple', document.body)")) errors.push('Contact ripple must mount across the full contact page.');
if (!engine.includes('--nx-reveal-delay') || engine.includes('calc(min(var(--nx-reveal-order')) errors.push('Grid reveal must use a compatibility-safe computed delay.');
if (engine.includes("path === '/'")) errors.push('Home must not auto-mount a new ambient effect.');

const loaders = [
  ['apps/runtime-guard.js', 'data-nx-ambient-loader', "'apps'", "mount('circuit'"],
  ['about/runtime-guard.js', 'ambient-motion.js', "'about'", "mount('drift'"],
  ['contact/runtime-guard.js', 'ambient-motion.js', "'contact'", "mount('ripple'"],
  ['utilities/runtime-guard.js', 'ambient-motion.js', "'tools'", "mount('grid-reveal'"],
  ['capabilities/capabilities.js', '/shared/ambient-motion.js', "'capabilities'", "mount('constellation'"]
];
for (const [file, asset, marker, mountContract] of loaders) {
  const source = await readFile(path.join(root, file), 'utf8');
  if (!source.includes(asset) || !source.includes(marker) || !source.includes(mountContract)) errors.push(`${file} is missing its ambient loader contract.`);
}
const appsLoader = await readFile(path.join(root, 'apps/runtime-guard.js'), 'utf8');
if (!appsLoader.includes("document.body?.dataset.app !== 'apps'")) errors.push('Apps loader must support its standalone root deployment.');

if (errors.length) {
  console.error(`Ambient motion tests failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Ambient motion tests passed: five modes, synchronized deploy-root copies, lifecycle and accessibility safeguards.');
