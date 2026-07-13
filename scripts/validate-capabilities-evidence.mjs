import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capabilitiesRoot = path.join(root, 'capabilities');
const manifest = JSON.parse(await readFile(path.join(capabilitiesRoot, 'evidence-ledger.json'), 'utf8'));
const errors = [];
const requiredDimensions = ['implementationInspected','automatedValidation','runtimeVerified','deploymentVerified','documented'];
const forbiddenKeys = new Set(['roleAlignment','evidenceIds','fitScore','score','percentage']);

function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function localJsonPath(reference, label) {
  if (!nonEmpty(reference)) { errors.push(`${label} must be a local JSON path.`); return null; }
  const clean = reference.replace(/^\.\//, '');
  const target = path.resolve(capabilitiesRoot, clean);
  const relative = path.relative(capabilitiesRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || path.extname(target) !== '.json') {
    errors.push(`${label} escapes the capabilities directory or is not JSON: ${reference}`);
    return null;
  }
  return target;
}
async function readJsonReference(reference, label) {
  const target = localJsonPath(reference, label);
  if (!target) return null;
  try { return JSON.parse(await readFile(target, 'utf8')); }
  catch (error) { errors.push(`${label} could not be read: ${error.message}`); return null; }
}
function walk(value, location = 'ledger') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${location}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`${location}: obsolete key is not allowed: ${key}`);
    walk(child, `${location}.${key}`);
  }
}

if (manifest.schemaVersion !== 2) errors.push('schemaVersion must be 2.');
if (manifest.ledgerStatus !== 'clean-slate-phase-1') errors.push('ledgerStatus must identify the clean-slate phase.');
if (!Array.isArray(manifest.claimFiles) || !manifest.claimFiles.length) errors.push('claimFiles must be a non-empty array.');
const projects = await readJsonReference(manifest.projectFile, 'projectFile');
const claimGroups = await Promise.all((manifest.claimFiles || []).map((file, index) => readJsonReference(file, `claimFiles[${index}]`)));
const claims = claimGroups.filter(Array.isArray).flat();
const ledger = { ...manifest, projects: Array.isArray(projects) ? projects : [], claims };
walk(ledger);

if (!ledger.projects.length) errors.push('projects must be a non-empty array.');
if (!ledger.claims.length) errors.push('claims must be a non-empty array.');
const projectIds = new Set();
for (const project of ledger.projects) {
  if (!nonEmpty(project.id) || !/^[a-z0-9-]+$/.test(project.id)) errors.push('Every project requires a kebab-case id.');
  if (projectIds.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
  projectIds.add(project.id);
  for (const field of ['name','href','sourceType','reviewStatus','notes']) if (!nonEmpty(project[field])) errors.push(`${project.id || 'project'}: missing ${field}`);
}

const claimIds = new Set();
const publicProjectIds = new Set();
const domains = new Set();
for (const claim of ledger.claims) {
  if (!nonEmpty(claim.id) || !/^[a-z0-9-]+$/.test(claim.id)) errors.push('Every claim requires a kebab-case id.');
  if (claimIds.has(claim.id)) errors.push(`Duplicate claim id: ${claim.id}`);
  claimIds.add(claim.id);
  if (!projectIds.has(claim.projectId)) errors.push(`${claim.id}: unknown projectId ${claim.projectId}`);
  if (!nonEmpty(claim.domain)) errors.push(`${claim.id}: domain is required.`); else domains.add(claim.domain);
  if (!nonEmpty(claim.claim)) errors.push(`${claim.id}: claim text is required.`);
  if (!Array.isArray(claim.sourceFiles) || !claim.sourceFiles.length) errors.push(`${claim.id}: at least one source file is required.`);
  for (const source of claim.sourceFiles || []) {
    if (!nonEmpty(source) || path.isAbsolute(source) || source.split(/[\\/]/).includes('..')) errors.push(`${claim.id}: invalid source path ${source}`);
  }
  if (!claim.evidence || typeof claim.evidence !== 'object') errors.push(`${claim.id}: evidence object is required.`);
  for (const dimension of requiredDimensions) if (typeof claim.evidence?.[dimension] !== 'boolean') errors.push(`${claim.id}: ${dimension} must be boolean.`);
  if (!Array.isArray(claim.limitations)) errors.push(`${claim.id}: limitations must be an array.`);
  if (typeof claim.public !== 'boolean') errors.push(`${claim.id}: public must be boolean.`);
  const substantive = ['implementationInspected','automatedValidation','runtimeVerified','deploymentVerified'].some(key => claim.evidence?.[key]);
  if (claim.public && !substantive) errors.push(`${claim.id}: public claims require substantive evidence beyond documentation.`);
  if (claim.public) publicProjectIds.add(claim.projectId);
}
for (const project of ledger.projects) {
  if (project.reviewStatus === 'queued' && publicProjectIds.has(project.id)) errors.push(`${project.id}: queued projects cannot have public claims.`);
}
if (domains.size < 5) errors.push('The ledger should derive at least five distinct evidence domains.');
if (errors.length) {
  console.error(`Capabilities evidence validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Capabilities evidence validated: ${ledger.projects.length} projects, ${ledger.claims.length} claims, ${publicProjectIds.size} evidence-bearing projects, ${domains.size} derived domains.`);
