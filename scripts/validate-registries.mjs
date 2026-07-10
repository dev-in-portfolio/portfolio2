import { readFile } from 'node:fs/promises';

const readJson = async relativePath => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8'));

const appsRegistry = await readJson('data/apps.registry.json');
const sourceRootsRegistry = await readJson('data/source-roots.registry.json');
const deploymentsRegistry = await readJson('data/deployments.registry.json');
const migrationDecisions = await readJson('data/migration-decisions.json');
const errors = [];

const allowedLifecycleStatuses = new Set([
  'pending-review',
  'verified-active',
  'active-with-limitations',
  'experimental',
  'external',
  'archived',
  'quarantined'
]);

const allowedDeploymentTypes = new Set([
  'local-static',
  'local-build-candidate',
  'bundled',
  'external'
]);

const allowedVerificationStatuses = new Set([
  'pending',
  'in-progress',
  'passed',
  'passed-with-limitations',
  'failed',
  'not-applicable'
]);

const allowedRootStatuses = new Set([
  'current-entry',
  'undecided',
  'active-section-source',
  'protected-unchanged'
]);

const allowedMigrationDecisions = new Set([
  'template-extraction-candidate',
  'manual-review-required'
]);

function validateAppsRegistry() {
  const registry = appsRegistry;
  if (registry.schemaVersion !== 1) errors.push(`Unsupported apps registry schemaVersion: ${registry.schemaVersion}`);
  if (!Array.isArray(registry.applications)) errors.push('apps.registry.json: applications must be an array');

  const applications = Array.isArray(registry.applications) ? registry.applications : [];
  if (Number.isInteger(registry.expectedApplicationCount) && applications.length !== registry.expectedApplicationCount) {
    errors.push(`apps.registry.json: expected ${registry.expectedApplicationCount} applications, found ${applications.length}`);
  }

  const ids = new Set();
  const hrefs = new Set();
  const canonicalAppRoot = migrationDecisions?.sourceAuthority?.activeApplicationSource?.path;

  for (const [index, app] of applications.entries()) {
    const label = app?.name || app?.id || `application[${index}]`;
    for (const field of ['id', 'name', 'category', 'href', 'deploymentType', 'buildType', 'lifecycleStatus']) {
      if (typeof app?.[field] !== 'string' || app[field].trim() === '') errors.push(`${label}: missing or invalid ${field}`);
    }

    if (typeof app?.id === 'string') {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.id)) errors.push(`${label}: id must use lowercase kebab-case`);
      if (ids.has(app.id)) errors.push(`${label}: duplicate id ${app.id}`);
      ids.add(app.id);
    }

    if (typeof app?.href === 'string') {
      if (!(app.href.startsWith('/') || app.href.startsWith('https://'))) errors.push(`${label}: href must be root-relative or HTTPS`);
      if (hrefs.has(app.href)) errors.push(`${label}: duplicate href ${app.href}`);
      hrefs.add(app.href);
    }

    if (!allowedLifecycleStatuses.has(app?.lifecycleStatus)) errors.push(`${label}: unsupported lifecycleStatus ${app?.lifecycleStatus}`);
    if (!allowedDeploymentTypes.has(app?.deploymentType)) errors.push(`${label}: unsupported deploymentType ${app?.deploymentType}`);
    if (!allowedVerificationStatuses.has(app?.verification?.status)) errors.push(`${label}: unsupported or missing verification.status`);

    if (app?.deploymentType === 'external') {
      if (!app.href?.startsWith('https://')) errors.push(`${label}: external applications require an HTTPS href`);
      if (app.sourcePath !== null) errors.push(`${label}: baseline external application sourcePath must be null`);
    } else {
      if (typeof app?.sourcePath !== 'string' || app.sourcePath.trim() === '') {
        errors.push(`${label}: local applications require sourcePath`);
      } else if (canonicalAppRoot && !app.sourcePath.startsWith(`${canonicalAppRoot}/`)) {
        errors.push(`${label}: local sourcePath must remain beneath canonical app root ${canonicalAppRoot}`);
      }
    }

    if (!Array.isArray(app?.legacyTags)) errors.push(`${label}: legacyTags must be an array`);
  }

  return { applicationCount: applications.length, appIds: ids, appRoutes: hrefs };
}

function validateSourceRootsRegistry() {
  const registry = sourceRootsRegistry;
  if (registry.schemaVersion !== 1) errors.push(`Unsupported source-roots registry schemaVersion: ${registry.schemaVersion}`);
  if (!Array.isArray(registry.roots)) errors.push('source-roots.registry.json: roots must be an array');

  const ids = new Set();
  const routes = new Set();
  for (const [index, root] of (registry.roots || []).entries()) {
    const label = root?.id || `root[${index}]`;
    for (const field of ['id', 'path', 'role', 'route', 'canonicalStatus']) {
      if (typeof root?.[field] !== 'string' || root[field].trim() === '') errors.push(`${label}: missing or invalid ${field}`);
    }
    if (ids.has(root?.id)) errors.push(`${label}: duplicate root id ${root?.id}`);
    ids.add(root?.id);
    if (routes.has(root?.route)) errors.push(`${label}: duplicate root route ${root?.route}`);
    routes.add(root?.route);
    if (!allowedRootStatuses.has(root?.canonicalStatus)) errors.push(`${label}: unsupported canonicalStatus ${root?.canonicalStatus}`);
    if (!Array.isArray(root?.requiredPaths)) errors.push(`${label}: requiredPaths must be an array`);
    if (!Array.isArray(root?.optionalPaths)) errors.push(`${label}: optionalPaths must be an array`);
  }

  if (!Array.isArray(registry.sharedFamilies) || registry.sharedFamilies.length === 0) {
    errors.push('source-roots.registry.json: sharedFamilies must be a non-empty array');
  }

  const protectedRoot = (registry.roots || []).find(root => root.id === 'capabilities');
  if (protectedRoot?.canonicalStatus !== 'protected-unchanged') {
    errors.push('source-roots.registry.json: capabilities root must remain protected-unchanged');
  }

  return { rootIds: ids, rootRoutes: routes };
}

function validateDeploymentsRegistry(sourceRootIds) {
  const registry = deploymentsRegistry;
  if (registry.schemaVersion !== 1) errors.push(`Unsupported deployments registry schemaVersion: ${registry.schemaVersion}`);
  if (!Array.isArray(registry.localDeployments)) errors.push('deployments.registry.json: localDeployments must be an array');

  const ids = new Set();
  const routes = new Set();
  for (const [index, deployment] of (registry.localDeployments || []).entries()) {
    const label = deployment?.id || `deployment[${index}]`;
    for (const field of ['id', 'sourceRoot', 'publicRoute', 'provider', 'publishPath', 'status']) {
      if (typeof deployment?.[field] !== 'string' || deployment[field].trim() === '') errors.push(`${label}: missing or invalid ${field}`);
    }
    if (ids.has(deployment?.id)) errors.push(`${label}: duplicate deployment id ${deployment?.id}`);
    ids.add(deployment?.id);
    if (routes.has(deployment?.publicRoute)) errors.push(`${label}: duplicate publicRoute ${deployment?.publicRoute}`);
    routes.add(deployment?.publicRoute);
    if (!sourceRootIds.has(deployment?.id)) errors.push(`${label}: deployment id does not match a registered source root`);

    if (deployment?.provider === 'netlify') {
      if (typeof deployment.configPath !== 'string' || !deployment.configPath.endsWith('/netlify.toml')) {
        errors.push(`${label}: Netlify deployment requires configPath`);
      }
      if (typeof deployment.functionsPath !== 'string' || !deployment.functionsPath.endsWith('/netlify/functions')) {
        errors.push(`${label}: Netlify deployment requires functionsPath`);
      }
    }
  }

  const netlifyRoots = (registry.localDeployments || []).filter(item => item.provider === 'netlify');
  if (netlifyRoots.length !== 4) errors.push(`deployments.registry.json: expected 4 current Netlify roots, found ${netlifyRoots.length}`);

  return { deploymentIds: ids, deploymentRoutes: routes };
}

function validateMigrationDecisions() {
  const decisions = migrationDecisions;
  if (decisions.schemaVersion !== 1) errors.push(`Unsupported migration-decisions schemaVersion: ${decisions.schemaVersion}`);
  if (decisions.decisionStatus !== 'foundation-baseline') errors.push('migration-decisions.json: decisionStatus must remain foundation-baseline');

  const evidence = decisions.evidence || {};
  if (!Number.isInteger(evidence.workflowRunId)) errors.push('migration-decisions.json: evidence.workflowRunId must be an integer');
  if (!Number.isInteger(evidence.artifactId)) errors.push('migration-decisions.json: evidence.artifactId must be an integer');
  if (typeof evidence.artifactDigest !== 'string' || !evidence.artifactDigest.startsWith('sha256:')) {
    errors.push('migration-decisions.json: evidence.artifactDigest must be a sha256 digest');
  }

  const families = decisions.sharedFamilies || [];
  if (!Array.isArray(families) || families.length !== 8) errors.push(`migration-decisions.json: expected 8 shared families, found ${families.length}`);
  const familyPaths = new Set();
  for (const family of families) {
    if (familyPaths.has(family.path)) errors.push(`migration-decisions.json: duplicate shared family ${family.path}`);
    familyPaths.add(family.path);
    if (!allowedMigrationDecisions.has(family.decision)) errors.push(`${family.path}: unsupported decision ${family.decision}`);
    if (!Number.isInteger(family.observedCopies) || family.observedCopies < 1) errors.push(`${family.path}: invalid observedCopies`);
    if (!Number.isInteger(family.uniqueHashes) || family.uniqueHashes < 1) errors.push(`${family.path}: invalid uniqueHashes`);
    if (family.decision === 'manual-review-required' && (!Array.isArray(family.groups) || family.groups.length < 2)) {
      errors.push(`${family.path}: manual review decision requires at least two hash groups`);
    }
  }

  const functions = decisions?.backendCopies?.serverlessFunctions;
  if (!functions) {
    errors.push('migration-decisions.json: missing backendCopies.serverlessFunctions');
  } else {
    if (!Array.isArray(functions.roots) || functions.roots.length !== 4) errors.push('migration-decisions.json: serverlessFunctions must list 4 roots');
    if (!Array.isArray(functions.families) || functions.families.length !== functions.uniqueFamilies) {
      errors.push('migration-decisions.json: serverless function family count mismatch');
    }
    if (functions.totalCopies !== functions.filesPerRoot * functions.roots.length) {
      errors.push('migration-decisions.json: serverless totalCopies does not match filesPerRoot × roots');
    }
    if (functions.allFamiliesIdentical !== true) errors.push('migration-decisions.json: baseline requires all function families to be marked identical');
  }

  const backups = decisions.backupArtifacts;
  if (!backups || !Array.isArray(backups.files) || backups.count !== backups.files.length) {
    errors.push('migration-decisions.json: backup artifact count mismatch');
  }

  const hardStops = decisions.hardStops || [];
  if (!hardStops.some(item => item.includes('capabilities/index.html'))) {
    errors.push('migration-decisions.json: hard stop for capabilities/index.html is required');
  }
  if (!hardStops.some(item => item.includes('Do not make the Capabilities page consume'))) {
    errors.push('migration-decisions.json: Capabilities registry-consumption hard stop is required');
  }
}

const appSummary = validateAppsRegistry();
const rootSummary = validateSourceRootsRegistry();
validateDeploymentsRegistry(rootSummary.rootIds);
validateMigrationDecisions();

if (errors.length > 0) {
  console.error(`Registry validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Registry validation passed: ${appSummary.applicationCount} applications, ` +
  `${rootSummary.rootIds.size} source roots, ${deploymentsRegistry.localDeployments.length} deployment records, ` +
  `${migrationDecisions.sharedFamilies.length} shared-family decisions.`
);
