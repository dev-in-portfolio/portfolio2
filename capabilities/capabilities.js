const LEDGER_URL = './evidence-ledger.json';
async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}
const evidenceLabels = {
  implementationInspected: 'Implementation inspected',
  automatedValidation: 'Automated validation',
  runtimeVerified: 'Runtime verified',
  deploymentVerified: 'Deployment verified'
};

const state = { ledger: null, search: '', domain: 'all', evidence: 'all' };
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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

function claimCard(claim, project) {
  const limitations = claim.limitations?.length
    ? `<p class="limitations"><strong>Boundary:</strong> ${escapeHtml(claim.limitations.join(' '))}</p>`
    : '';
  const sources = claim.sourceFiles.map(source => `<li>${escapeHtml(source)}</li>`).join('');
  return `<article class="claim-card">
    <a class="project-link" href="${escapeHtml(project.href)}">${escapeHtml(project.name)}</a>
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
      <summary><span class="domain-title"><h3>${escapeHtml(domain)}</h3><span>${domainClaims.length} accepted ${domainClaims.length === 1 ? 'claim' : 'claims'}</span></span></summary>
      <div class="claim-list">${domainClaims
        .sort((a,b) => projects.get(a.projectId).name.localeCompare(projects.get(b.projectId).name))
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
    state.ledger = { ...manifest, projects, claims: claimGroups.flat() };
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
