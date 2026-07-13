import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const repoRoot = path.resolve(valueFor('--repo-root') || defaultRepoRoot);
const capabilitiesRoot = path.resolve(valueFor('--root') || path.join(repoRoot, 'capabilities'));
const manifest = JSON.parse(await readFile(path.join(capabilitiesRoot, 'evidence-ledger.json'), 'utf8'));
const errors = [];
const requiredDimensions = ['implementationInspected', 'automatedValidation', 'runtimeVerified', 'deploymentVerified', 'documented'];
const substantiveDimensions = requiredDimensions.filter(dimension => dimension !== 'documented');
const forbiddenKeys = new Set(['roleAlignment', 'evidenceIds', 'fitScore', 'score', 'percentage']);
const allowedReviewStatuses = new Set(['reviewed', 'partial-review', 'documentation-review', 'queued']);
const allowedSourceTypes = new Set([
  'repository-source',
  'public-repository',
  'public-repository-and-deployment',
  'private-repository-and-deployment',
  'private-repository-profile'
]);
const projectKeys = new Set(['id', 'name', 'href', 'sourceType', 'reviewStatus', 'notes']);
const claimKeys = new Set(['id', 'projectId', 'domain', 'claim', 'sourceFiles', 'evidence', 'limitations', 'public']);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
function localJsonPath(reference, label) {
  if (!nonEmpty(reference)) {
    errors.push(`${label} must be a local JSON path.`);
    return null;
  }
  const clean = reference.replace(/^\.\//, '');
  const target = path.resolve(capabilitiesRoot, clean);
  if (!inside(capabilitiesRoot, target) || path.extname(target) !== '.json') {
    errors.push(`${label} escapes the capabilities directory or is not JSON: ${reference}`);
    return null;
  }
  return target;
}
async function readJsonReference(reference, label) {
  const target = localJsonPath(reference, label);
  if (!target) return null;
  try {
    return JSON.parse(await readFile(target, 'utf8'));
  } catch (error) {
    errors.push(`${label} could not be read: ${error.message}`);
    return null;
  }
}
function walk(value, location = 'ledger') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${location}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`${location}: obsolete key is not allowed: ${key}`);
    walk(child, `${location}.${key}`);
  }
}
function validateExactKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label}: unexpected key ${key}`);
  }
}
function validatePublicHref(value, label) {
  if (!nonEmpty(value)) return;
  if (value.startsWith('/')) {
    if (value.startsWith('//') || value.includes('\\') || value.split('/').includes('..')) {
      errors.push(`${label}: invalid local href ${value}`);
    }
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) errors.push(`${label}: href must use safe HTTPS or a root-relative path: ${value}`);
  } catch {
    errors.push(`${label}: invalid href ${value}`);
  }
}
async function validateSourceUrl(value, claimId) {
  if (!nonEmpty(value)) {
    errors.push(`${claimId}: source URL must be a non-empty string.`);
    return;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${claimId}: invalid source URL ${value}`);
    return;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.search) {
    errors.push(`${claimId}: source URL must be a clean HTTPS github.com URL: ${value}`);
    return;
  }
  const segments = url.pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
  if (segments.length < 2) {
    errors.push(`${claimId}: GitHub source URL must identify a repository: ${value}`);
    return;
  }
  if (segments.length === 2) return;
  const [owner, repo, kind, branch, ...sourceSegments] = segments;
  if (!['blob', 'tree'].includes(kind) || !branch || sourceSegments.length === 0) {
    errors.push(`${claimId}: GitHub source URL must use /blob/<branch>/<file> or /tree/<branch>/<directory>: ${value}`);
    return;
  }
  if (owner !== 'dev-in-portfolio' || repo !== 'portfolio2' || branch !== 'main') return;
  const sourcePath = sourceSegments.join('/');
  const target = path.resolve(repoRoot, sourcePath);
  if (!inside(repoRoot, target)) {
    errors.push(`${claimId}: source URL escapes the repository: ${value}`);
    return;
  }
  try {
    const sourceStat = await stat(target);
    if (sourceStat.isDirectory() && kind !== 'tree') errors.push(`${claimId}: repository directory must use /tree/, not /blob/: ${value}`);
    if (sourceStat.isFile() && kind !== 'blob') errors.push(`${claimId}: repository file must use /blob/, not /tree/: ${value}`);
  } catch {
    errors.push(`${claimId}: referenced Portfolio 2 source does not exist: ${sourcePath}`);
  }
}

if (manifest.schemaVersion !== 2) errors.push('schemaVersion must be 2.');
if (manifest.ledgerStatus !== 'clean-slate-phase-1') errors.push('ledgerStatus must identify the clean-slate phase.');
if (!nonEmpty(manifest.reviewedOn) || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.reviewedOn)) errors.push('reviewedOn must use YYYY-MM-DD.');
if (!Array.isArray(manifest.claimFiles) || !manifest.claimFiles.length) errors.push('claimFiles must be a non-empty array.');
if (new Set(manifest.claimFiles || []).size !== (manifest.claimFiles || []).length) errors.push('claimFiles must not contain duplicates.');
const projects = await readJsonReference(manifest.projectFile, 'projectFile');
const claimGroups = await Promise.all((manifest.claimFiles || []).map((file, index) => readJsonReference(file, `claimFiles[${index}]`)));
const claims = claimGroups.filter(Array.isArray).flat();
const ledger = { ...manifest, projects: Array.isArray(projects) ? projects : [], claims };
walk(ledger);

if (!ledger.projects.length) errors.push('projects must be a non-empty array.');
if (!ledger.claims.length) errors.push('claims must be a non-empty array.');
const projectIds = new Set();
for (const project of ledger.projects) {
  validateExactKeys(project, projectKeys, project.id || 'project');
  if (!nonEmpty(project.id) || !/^[a-z0-9-]+$/.test(project.id)) errors.push('Every project requires a kebab-case id.');
  if (projectIds.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
  projectIds.add(project.id);
  for (const field of ['name', 'href', 'sourceType', 'reviewStatus', 'notes']) {
    if (!nonEmpty(project[field])) errors.push(`${project.id || 'project'}: missing ${field}`);
  }
  if (!allowedSourceTypes.has(project.sourceType)) errors.push(`${project.id}: unsupported sourceType ${project.sourceType}`);
  if (!allowedReviewStatuses.has(project.reviewStatus)) errors.push(`${project.id}: unsupported reviewStatus ${project.reviewStatus}`);
  validatePublicHref(project.href, project.id);
}

const claimIds = new Set();
const publicProjectIds = new Set();
const domains = new Set();
for (const claim of ledger.claims) {
  validateExactKeys(claim, claimKeys, claim.id || 'claim');
  if (!nonEmpty(claim.id) || !/^[a-z0-9-]+$/.test(claim.id)) errors.push('Every claim requires a kebab-case id.');
  if (claimIds.has(claim.id)) errors.push(`Duplicate claim id: ${claim.id}`);
  claimIds.add(claim.id);
  if (!projectIds.has(claim.projectId)) errors.push(`${claim.id}: unknown projectId ${claim.projectId}`);
  if (!nonEmpty(claim.domain)) errors.push(`${claim.id}: domain is required.`); else domains.add(claim.domain);
  if (!nonEmpty(claim.claim)) errors.push(`${claim.id}: claim text is required.`);
  if (!Array.isArray(claim.sourceFiles) || !claim.sourceFiles.length) errors.push(`${claim.id}: at least one source URL is required.`);
  if (new Set(claim.sourceFiles || []).size !== (claim.sourceFiles || []).length) errors.push(`${claim.id}: source URLs must be unique.`);
  for (const source of claim.sourceFiles || []) await validateSourceUrl(source, claim.id);
  if (!claim.evidence || typeof claim.evidence !== 'object' || Array.isArray(claim.evidence)) {
    errors.push(`${claim.id}: evidence object is required.`);
  } else {
    validateExactKeys(claim.evidence, new Set(requiredDimensions), `${claim.id}.evidence`);
  }
  for (const dimension of requiredDimensions) {
    if (typeof claim.evidence?.[dimension] !== 'boolean') errors.push(`${claim.id}: ${dimension} must be boolean.`);
  }
  if (!Array.isArray(claim.limitations)) errors.push(`${claim.id}: limitations must be an array.`);
  for (const limitation of claim.limitations || []) {
    if (!nonEmpty(limitation)) errors.push(`${claim.id}: limitations must contain non-empty strings.`);
  }
  if (typeof claim.public !== 'boolean') errors.push(`${claim.id}: public must be boolean.`);
  const substantive = substantiveDimensions.some(key => claim.evidence?.[key]);
  if (claim.public && !substantive) errors.push(`${claim.id}: public claims require substantive evidence beyond documentation.`);
  if (claim.public) publicProjectIds.add(claim.projectId);
}
for (const project of ledger.projects) {
  if (['queued', 'documentation-review'].includes(project.reviewStatus) && publicProjectIds.has(project.id)) {
    errors.push(`${project.id}: ${project.reviewStatus} projects cannot have public claims.`);
  }
  if (project.reviewStatus === 'reviewed' && !publicProjectIds.has(project.id)) {
    errors.push(`${project.id}: reviewed projects require at least one public claim or a less-complete review status.`);
  }
}
if (domains.size < 5) errors.push('The ledger should derive at least five distinct evidence domains.');
if (errors.length) {
  console.error(`Capabilities evidence validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Capabilities evidence validated: ${ledger.projects.length} projects, ${ledger.claims.length} claims, ${publicProjectIds.size} evidence-bearing projects, ${domains.size} derived domains.`);
