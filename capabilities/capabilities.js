const LEDGER_URL = './evidence-ledger.json';
const evidenceLabels = {
  implementationInspected: 'Implementation inspected',
  automatedValidation: 'Automated validation',
  runtimeVerified: 'Runtime verified',
  deploymentVerified: 'Deployment verified',
  documented: 'Documented'
};

const state = { ledger: null, search: '', domain: 'all', evidence: 'all' };
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}

function safeHref(value, { source = false } = {}) {
  const candidate = String(value || '').trim();
  if (!source && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\') && !candidate.split('/').includes('..')) return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password) return '#';
    if (source && url.hostname !== 'github.com') return '#';
    return url.href;
  } catch {
    return '#';
  }
}

function validateLoadedLedger(manifest, projects, claims) {
  if (!manifest || manifest.schemaVersion !== 2) throw new Error('Unsupported evidence ledger schema.');
  if (!Array.isArray(projects) || !projects.length) throw new Error('Evidence projects are unavailable.');
  if (!Array.isArray(claims) || !claims.length) throw new Error('Evidence claims are unavailable.');
  const projectIds = new Set();
  for (const project of projects) {
    if (!project || typeof project.id !== 'string' || projectIds.has(project.id)) throw new Error('Evidence project IDs are missing or duplicated.');
    if (safeHref(project.href) === '#') throw new Error(`Unsafe project link for ${project.id}.`);
    projectIds.add(project.id);
  }
  const claimIds = new Set();
  for (const claim of claims) {
    if (!claim || typeof claim.id !== 'string' || claimIds.has(claim.id)) throw new Error('Evidence claim IDs are missing or duplicated.');
    if (!projectIds.has(claim.projectId)) throw new Error(`Unknown evidence project ${claim.projectId}.`);
    if (!claim.evidence || typeof claim.evidence !== 'object') throw new Error(`Missing evidence dimensions for ${claim.id}.`);
    if (!Array.isArray(claim.sourceFiles) || !claim.sourceFiles.length || claim.sourceFiles.some(source => safeHref(source, { source: true }) === '#')) {
      throw new Error(`Invalid evidence source for ${claim.id}.`);
    }
    claimIds.add(claim.id);
  }
}

function acceptedClaims() {
  return state.ledger.claims.filter(claim => claim.public === true);
}

function filteredClaims() {
  const projects = new Map(state.ledger.projects.map(project => [project.id, project]));
  const needle = state.search.trim().toLowerCase();
  return acceptedClaims().filter(claim => {
    const project = projects.get(claim.projectId);
    if (state.domain !== 'all' && claim.domain !== state.domain) return false;
    if (state.evidence !== 'all' && !claim.evidence[state.evidence]) return false;
    if (!needle) return true;
    const haystack = [project?.name, claim.domain, claim.claim, ...(claim.limitations || []), ...(claim.sourceFiles || [])].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

function renderSummary() {
  const claims = acceptedClaims();
  const projectIds = new Set(claims.map(claim => claim.projectId));
  const domains = new Set(claims.map(claim => claim.domain));
  const queued = state.ledger.projects.filter(project => project.reviewStatus === 'queued' || project.reviewStatus === 'documentation-review').length;
  const values = [claims.length, projectIds.size, domains.size, queued];
  byId('summary-grid').querySelectorAll('dd').forEach((node, index) => { node.textContent = String(values[index]); });
}

function renderDomainOptions() {
  const select = byId('domain-filter');
  select.querySelectorAll('option:not([value="all"])').forEach(option => option.remove());
  const domains = [...new Set(acceptedClaims().map(claim => claim.domain))].sort();
  for (const domain of domains) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    select.appendChild(option);
  }
}

function evidenceBadges(claim) {
  return Object.entries(evidenceLabels).map(([key, label]) =>
    `<span class="badge${claim.evidence[key] ? ' active' : ''}">${escapeHtml(label)}</span>`
  ).join('');
}

function sourceLabel(source) {
  try {
    const url = new URL(source);
    const match = url.pathname.match(/\/(?:blob|tree)\/([^/]+)\/(.+)$/);
    if (match) return match[2];
    return `${url.hostname}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return source;
  }
}

function claimCard(claim, project) {
  const limitations = claim.limitations?.length
    ? `<p class="limitations"><strong>Boundary:</strong> ${escapeHtml(claim.limitations.join(' '))}</p>`
    : '';
  const sources = claim.sourceFiles.map(source => {
    const href = safeHref(source, { source: true });
    return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel(source))}</a></li>`;
  }).join('');
  const projectHref = safeHref(project.href);
  const projectLinkAttributes = projectHref.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<article class="claim-card">
    <a class="project-link" href="${escapeHtml(projectHref)}"${projectLinkAttributes}>${escapeHtml(project.name)}</a>
    <p class="claim-text">${escapeHtml(claim.claim)}</p>
    <div class="badges" aria-label="Verification dimensions">${evidenceBadges(claim)}</div>
    ${limitations}
    <details class="sources"><summary>Inspectable sources</summary><ul>${sources}</ul></details>
  </article>`;
}

function renderClaims() {
  const root = byId('evidence-groups');
  const claims = filteredClaims();
  const projects = new Map(state.ledger.projects.map(project => [project.id, project]));
  byId('result-count').textContent = `${claims.length} of ${acceptedClaims().length} accepted claims shown.`;
  if (!claims.length) {
    root.innerHTML = '<p class="empty">No accepted claims match those filters.</p>';
    return;
  }
  const grouped = new Map();
  for (const claim of claims) {
    if (!grouped.has(claim.domain)) grouped.set(claim.domain, []);
    grouped.get(claim.domain).push(claim);
  }
  root.innerHTML = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([domain, domainClaims], index) => `<details class="domain" ${index < 2 ? 'open' : ''}>
      <summary><div class="domain-title"><h3>${escapeHtml(domain)}</h3><span>${domainClaims.length} accepted ${domainClaims.length === 1 ? 'claim' : 'claims'}</span></div></summary>
      <div class="claim-list">${domainClaims
        .sort((a, b) => projects.get(a.projectId).name.localeCompare(projects.get(b.projectId).name))
        .map(claim => claimCard(claim, projects.get(claim.projectId))).join('')}</div>
    </details>`).join('');
}

function bindControls() {
  byId('search').addEventListener('input', event => { state.search = event.target.value; renderClaims(); });
  byId('domain-filter').addEventListener('change', event => { state.domain = event.target.value; renderClaims(); });
  byId('evidence-filter').addEventListener('change', event => { state.evidence = event.target.value; renderClaims(); });
}

async function start() {
  try {
    const manifest = await loadJson(LEDGER_URL);
    const [projects, claimGroups] = await Promise.all([
      loadJson(manifest.projectFile),
      Promise.all(manifest.claimFiles.map(loadJson))
    ]);
    const claims = claimGroups.flat();
    validateLoadedLedger(manifest, projects, claims);
    state.ledger = { ...manifest, projects, claims };
    renderSummary();
    renderDomainOptions();
    bindControls();
    renderClaims();
  } catch (error) {
    console.error(error);
    byId('evidence-groups').innerHTML = '<p class="error">The evidence ledger could not be loaded. The page has not substituted unverified project claims.</p>';
    byId('result-count').textContent = 'Evidence unavailable.';
  }
}

start();

(function loadCapabilitiesAmbientMotion() {
  if (document.querySelector('script[data-nx-ambient-loader]')) return;
  const script = document.createElement('script');
  script.src = './shared/ambient-motion.js';
  script.defer = true;
  script.dataset.nxAmbientLoader = 'capabilities';
  script.addEventListener('load', () => window.NexusAmbientMotion?.mount('constellation', document.querySelector('.hero')), { once: true });
  document.head.appendChild(script);
})();

