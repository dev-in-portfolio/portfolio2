
/*
  CoverageCompass Complete App Shell
  - fixes broken wiring in the "working build"
  - adds legal/help screens, controlled exports, and PWA offline caching

  NOTE: This is not medical/legal advice. See Legal tab.
*/

const CoverageCompass = window.CoverageCompass || window["CoverageCompass"] || {};
const REPORT_UNLOCK_KEY = 'coverage_compass_report_unlocks_v1';
const ORG_PROFILE_KEY = 'coverage_compass_org_profile_v1';
const ORG_PROFILE_FIELDS = [
  'displayName',
  'supportEmail',
  'licenseMode',
  'disclosureStance',
  'reportDisclosure'
];
const PRO_REPORT_KEY = 'coverage_compass_pro_report_v1';
const PRO_REPORT_FIELDS = [
  'clientLabel',
  'preparedBy',
  'organization',
  'reviewType',
  'planningHorizon',
  'reportDate',
  'reviewerNotes'
];

const $ = (id) => document.getElementById(id);
const $all = (sel) => [...document.querySelectorAll(sel)];

function reportProducts() {
  return window.CoverageCompassReports?.getReportProducts?.() || [];
}

function reportReadiness() {
  return window.CoverageCompassReports?.reportReadinessStatus?.() || {
    status: 'not-started',
    answeredCount: 0,
    totalQuestions: CoverageCompass.questions?.length || 0,
    percentAnswered: 0,
    missingCoreItems: ['Assessment'],
    label: 'Assessment not started',
    canGenerateFinalReports: false,
    canGeneratePreliminaryReports: false,
    canGenerateEnrollmentReviewReports: false
  };
}

function assessmentAnswerCount() {
  return window.CoverageCompassReports?.assessmentAnswerCount?.() || 0;
}

function requiredCoreAnswersPresent() {
  return window.CoverageCompassReports?.requiredCoreAnswersPresent?.() || [];
}

function hasCompletedAssessment() {
  return window.CoverageCompassReports?.hasCompletedAssessment?.() || false;
}

function defaultReportUnlocks() {
  const unlocks = { source: 'private-beta', updatedAt: new Date().toISOString() };
  reportProducts().forEach((product) => { unlocks[product.id] = true; });
  return unlocks;
}

function loadReportUnlocks() {
  try {
    return { ...defaultReportUnlocks(), ...JSON.parse(localStorage.getItem(REPORT_UNLOCK_KEY) || '{}') };
  } catch {
    return defaultReportUnlocks();
  }
}

function saveReportUnlocks(unlocks = defaultReportUnlocks(), source = 'private-beta') {
  const clean = {
    ...defaultReportUnlocks(),
    ...unlocks,
    source: cleanReportText(source, 40),
    updatedAt: new Date().toISOString()
  };
  try { localStorage.setItem(REPORT_UNLOCK_KEY, JSON.stringify(clean)); } catch {}
  renderReportStore();
  return clean;
}

function reportAccessContext() {
  const unlocks = loadReportUnlocks();
  const unlocked = reportProducts().filter((p) => !!unlocks[p.id]).map((p) => p.id);
  return {
    purchase_model: 'pay-per-report',
    private_beta: true,
    billing_provider: 'unconfigured',
    source: unlocks.source || 'private-beta',
    updated_at: unlocks.updatedAt || null,
    unlocked_reports: unlocked,
    enforcement_note: 'Private beta report access. Future checkout should unlock printable downloads without requiring server sync for questionnaire answers.'
  };
}

function renderReportStore() {
  const unlocks = loadReportUnlocks();
  const stage = $('stagePill');
  if (stage && stage.textContent === 'Welcome') stage.textContent = 'Preview';
  const readiness = reportReadiness();

  const current = $('reportAccessCurrent');
  if (current) {
    if (readiness.status === 'not-started') {
      current.innerHTML = `<strong>Complete the assessment first</strong> <span class="muted">Complete the assessment so reports can include your result.</span>`;
    } else if (readiness.status === 'in-progress') {
      current.innerHTML = `<strong>Your report is not ready yet</strong> <span class="muted">Continue the assessment so your packets are based on enough information.</span>`;
    } else if (readiness.status === 'enrollment-review') {
      current.innerHTML = `<strong>Enrollment Status Review available</strong> <span class="muted">Part A and/or Part B status needs review before comparing coverage structures.</span>`;
    } else if (readiness.status === 'preliminary') {
      current.innerHTML = `<strong>Preliminary packet available</strong> <span class="muted">This preview is clearly labeled as preliminary until the assessment is completed.</span>`;
    } else {
      current.innerHTML = `<strong>Final packet available</strong> <span class="muted">Completed assessments unlock the professional printable packet workflow.</span>`;
    }
  }

  const grid = $('reportProductGrid');
  if (grid) {
    const intro = readiness.status === 'not-started'
      ? `<div class="reportEmptyState">
          <h4>Complete the assessment first so reports can include your result.</h4>
          <p>After your result is ready, each packet will use your recommendation, confidence, risk flags, and checklist items.</p>
          <button class="btn primary large" id="btnStartFromReports" type="button">Start Assessment</button>
        </div>`
      : readiness.status === 'in-progress'
        ? `<div class="reportEmptyState">
            <h4>Your report is not ready yet.</h4>
            <p>Continue the assessment so your packets are based on enough information. You can still browse the report types while you finish.</p>
            <div class="btnrow">
              <button class="btn primary large" id="btnContinueFromReports" type="button">Continue Assessment</button>
              <button class="btn large" id="btnViewReportTypes" type="button">View Report Types</button>
            </div>
          </div>`
        : '';
    grid.innerHTML = intro + reportProducts().map((product) => {
      const unlocked = !!unlocks[product.id];
      const isBundle = product.id === 'full-bundle';
      const isEnrollment = product.id === 'enrollment-status';
      const canPreviewStandard = readiness.canGeneratePreliminaryReports || readiness.canGenerateFinalReports;
      const canPreviewEnrollment = readiness.canGenerateEnrollmentReviewReports;
      const readinessBadge = isBundle
        ? (readiness.canGenerateFinalReports ? 'Final packet' : 'Complete assessment required')
        : isEnrollment
          ? (readiness.status === 'enrollment-review' ? 'Enrollment review' : 'Enrollment review unavailable')
          : readiness.status === 'complete'
            ? 'Final packet'
            : readiness.status === 'preliminary'
              ? 'Preliminary packet'
              : readiness.status === 'enrollment-review'
                ? 'Enrollment review'
                : readiness.status === 'in-progress'
                  ? 'In progress'
                  : 'Assessment required';
      const canPreview = isBundle ? readiness.canGenerateFinalReports : (isEnrollment ? canPreviewEnrollment : canPreviewStandard);
      const primaryLabel = isBundle
        ? (readiness.canGenerateFinalReports ? 'Print / Save as PDF' : 'Finish Assessment First')
        : readiness.status === 'complete'
          ? 'Print / Save as PDF'
          : isEnrollment
            ? 'Create Packet'
            : 'Preview packet';
      const secondaryLabel = isBundle
        ? 'Preview bundle'
        : (readiness.status === 'preliminary' ? 'Preview preliminary' : 'Preview');
      const primaryAction = isBundle
        ? (readiness.canGenerateFinalReports ? 'print-report' : 'continue-assessment')
        : (readiness.status === 'complete' ? 'print-report' : 'preview-report');
      const primaryDisabled = isBundle ? false : !(unlocked && canPreview);
      const secondaryDisabled = isBundle ? !readiness.canGenerateFinalReports : !canPreview;
      return `<div class="reportProductCard${product.id === 'full-bundle' ? ' featured' : ''}" data-report-id="${escapeHtml(product.id)}">
        <div class="row">
          <div class="reportIcon" aria-hidden="true">${reportIcon(product.id)}</div>
          <div>
            <div class="planName">${escapeHtml(product.name)}</div>
            <div class="planText">${escapeHtml(product.useCase || product.description || '')}</div>
          </div>
          <div class="planPrice">${escapeHtml(product.priceLabel || '')}</div>
        </div>
        <p class="muted">${escapeHtml(product.description || '')}</p>
        <div class="reportTags">
          <span>Printable</span>
          <span>Personalized</span>
          <span>${escapeHtml(readinessBadge)}</span>
          ${isEnrollment ? '<span>Enrollment review</span>' : (product.includedInBundle ? '<span>Included in bundle</span>' : '<span>Standalone packet</span>')}
        </div>
        <div class="btnrow">
          <button class="btn" data-action="${isBundle && !readiness.canGenerateFinalReports ? 'preview-report' : 'preview-report'}" data-report-id="${escapeHtml(product.id)}" type="button" ${secondaryDisabled ? 'disabled' : ''}>${secondaryLabel}</button>
          <button class="btn primary" data-action="${primaryAction}" data-report-id="${escapeHtml(product.id)}" type="button" ${primaryDisabled ? 'disabled' : ''}>${primaryLabel}</button>
        </div>
      </div>`;
    }).join('');
    const start = $('btnStartFromReports');
    if (start) {
      start.onclick = () => {
        closeReportsModal();
        resetConsentGate();
        showScreen('screenDisclaimer');
      };
    }
    const cont = $('btnContinueFromReports');
    if (cont) {
      cont.onclick = () => {
        closeReportsModal();
        showScreen('screenQuiz');
        renderQuestion();
      };
    }
    const view = $('btnViewReportTypes');
    if (view) {
      view.onclick = () => {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }
  }
}

function hasAssessmentAnswers() {
  return assessmentAnswerCount() > 0;
}

function reportIcon(id) {
  const icons = {
    'agent-ready': '✓',
    'switch-defense': '◆',
    'phone-script': '☎',
    'doorstep-event': '▣',
    'family-review': '♡',
    'annual-review': '◷',
    'red-flag': '!',
    'enrollment-status': 'ⓘ',
    'full-bundle': '▤'
  };
  return icons[id] || '•';
}

function setSaveStatus(text, ttlMs = 900) {
  const el = $('saveStatus');
  if (!el) return;
  el.textContent = text;
  if (ttlMs > 0) {
    clearTimeout(setSaveStatus._t);
    setSaveStatus._t = setTimeout(() => (el.textContent = 'Local-first'), ttlMs);
  }
}

function showScreen(id) {
  $all('.content').forEach((s) => s.classList.add('hidden'));
  const el = $(id);
  if (el) el.classList.remove('hidden');

  const pill = $('stagePill');
  if (pill) {
    const map = {
      screenFront: 'Welcome',
      screenDisclaimer: 'Disclosures',
      screenQuiz: 'Assessment',
      screenResult: 'Result',
      screenLegal: 'Legal'
    };
    pill.textContent = map[id] || 'CoverageCompass';
  }
}

// ---------- Clipboard helpers ----------
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function cleanReportText(value, max = 1000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[redacted-id]')
    .replace(/\b[1-9][A-Z0-9]{10}\b/g, '[redacted-medicare-id]')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  const email = cleanReportText(value, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function blankOrgProfile() {
  return {
    displayName: '',
    supportEmail: '',
    licenseMode: 'private-beta',
    disclosureStance: 'education-only',
    reportDisclosure: ''
  };
}

function loadOrgProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORG_PROFILE_KEY) || '{}');
    return { ...blankOrgProfile(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return blankOrgProfile();
  }
}

function saveOrgProfile(profile) {
  const clean = {
    displayName: cleanReportText(profile.displayName, 80),
    supportEmail: cleanEmail(profile.supportEmail),
    licenseMode: cleanReportText(profile.licenseMode || 'private-beta', 40),
    disclosureStance: cleanReportText(profile.disclosureStance || 'education-only', 40),
    reportDisclosure: cleanReportText(profile.reportDisclosure, 600)
  };
  try { localStorage.setItem(ORG_PROFILE_KEY, JSON.stringify(clean)); } catch {}
  return clean;
}

function readOrgProfileFromForm() {
  return saveOrgProfile({
    displayName: $('orgDisplayName')?.value,
    supportEmail: $('orgSupportEmail')?.value,
    licenseMode: $('orgLicenseMode')?.value,
    disclosureStance: $('orgDisclosureStance')?.value,
    reportDisclosure: $('orgReportDisclosure')?.value
  });
}

function writeOrgProfileToForm(profile = loadOrgProfile()) {
  const map = {
    orgDisplayName: profile.displayName,
    orgSupportEmail: profile.supportEmail,
    orgLicenseMode: profile.licenseMode,
    orgDisclosureStance: profile.disclosureStance,
    orgReportDisclosure: profile.reportDisclosure
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = $(id);
    if (el) el.value = value || '';
  });
}

function orgProfileContext() {
  const profile = readOrgProfileFromForm();
  const hasProfile = ORG_PROFILE_FIELDS
    .filter((key) => !['licenseMode', 'disclosureStance'].includes(key))
    .some((key) => !!profile[key]);
  return {
    enabled: hasProfile,
    display_name: profile.displayName || 'Coverage Compass',
    support_email: profile.supportEmail || null,
    license_mode: profile.licenseMode || 'private-beta',
    disclosure_stance: profile.disclosureStance || 'education-only',
    report_disclosure: profile.reportDisclosure || null,
    privacy_note: 'Organization profile is stored locally and included in exports for report branding/disclosure.'
  };
}

function blankProReport() {
  return {
    clientLabel: '',
    preparedBy: '',
    organization: '',
    reviewType: '',
    planningHorizon: '',
    reportDate: new Date().toISOString().slice(0, 10),
    reviewerNotes: ''
  };
}

function loadProReport() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRO_REPORT_KEY) || '{}');
    return { ...blankProReport(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return blankProReport();
  }
}

function saveProReport(report) {
  const clean = {
    clientLabel: cleanReportText(report.clientLabel, 80),
    preparedBy: cleanReportText(report.preparedBy, 80),
    organization: cleanReportText(report.organization, 80),
    reviewType: cleanReportText(report.reviewType, 40),
    planningHorizon: cleanReportText(report.planningHorizon, 40),
    reportDate: cleanReportText(report.reportDate, 20),
    reviewerNotes: cleanReportText(report.reviewerNotes, 1000)
  };
  try { localStorage.setItem(PRO_REPORT_KEY, JSON.stringify(clean)); } catch {}
  return clean;
}

function readProReportFromForm() {
  return saveProReport({
    clientLabel: $('proClientLabel')?.value,
    preparedBy: $('proPreparedBy')?.value,
    organization: $('proOrganization')?.value,
    reviewType: $('proReviewType')?.value,
    planningHorizon: $('proPlanningHorizon')?.value,
    reportDate: $('proReportDate')?.value,
    reviewerNotes: $('proReviewerNotes')?.value
  });
}

function writeProReportToForm(report = loadProReport()) {
  const map = {
    proClientLabel: report.clientLabel,
    proPreparedBy: report.preparedBy,
    proOrganization: report.organization,
    proReviewType: report.reviewType,
    proPlanningHorizon: report.planningHorizon,
    proReportDate: report.reportDate,
    proReviewerNotes: report.reviewerNotes
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = $(id);
    if (el) el.value = value || '';
  });
}

function proReportContext() {
  const report = readProReportFromForm();
  const hasContext = PRO_REPORT_FIELDS
    .filter((key) => key !== 'reportDate')
    .some((key) => !!report[key]);
  return {
    enabled: hasContext,
    client_label: report.clientLabel || null,
    prepared_by: report.preparedBy || null,
    organization: report.organization || null,
    review_type: report.reviewType || null,
    planning_horizon: report.planningHorizon || null,
    report_date: report.reportDate || null,
    reviewer_notes: report.reviewerNotes || null,
    privacy_note: 'Local-only print packet context. Avoid sensitive identifiers; Safe export redacts high-sensitivity questionnaire sections.'
  };
}

// ---------- Safe redaction ----------
function makeRedactedAnswers(answers) {
  // Remove health + highly identifying answers from share/export.
  // Strategy: redact sections that are typically sensitive.
  const sensitiveSections = new Set(['Health','Finances','Assistance','Eligibility','Prescriptions','Part D / Medications','Medigap Underwriting','Geography']);
  const idToSection = new Map(CoverageCompass.questions.map((q) => [q.id, q.section]));

  const out = {};
  for (const [k, v] of Object.entries(answers || {})) {
    const sec = idToSection.get(k) || '';
    if (sensitiveSections.has(sec)) continue;
    out[k] = v;
  }
  return out;
}

// ---------- State management ----------
function save() {
  CoverageCompass.saveState();
  // separate build stamp to help with cache busting and migrations later
  setSaveStatus('Saved');
}

function load() {
  return CoverageCompass.loadState();
}

function markAssessmentDirty() {
  if (CoverageCompass.state.completedAt) CoverageCompass.state.completedAt = null;
}

function fullReset() {
  try {
    localStorage.removeItem('coverage_compass_state_v1');
    localStorage.removeItem('mde_build');
  } catch {}
  CoverageCompass.state.answers = {};
  CoverageCompass.state.i = 0;
  CoverageCompass.state.completedAt = null;
  CoverageCompass.recomputeAll();
  $('btnResume').style.display = 'none';
  showScreen('screenFront');
  setSaveStatus('Cleared');
}

// ---------- Rendering: Questions ----------
function updateProgress() {
  const i = CoverageCompass.state.i || 0;
  const n = CoverageCompass.questions.length;
  const pct = Math.max(0, Math.min(1, (i + 1) / n));
  $('barFill').style.width = `${Math.round(pct * 100)}%`;
  $('barText').textContent = `${Math.round(pct * 100)}% complete`;
}

function enableNextIfAnswered(q) {
  const a = CoverageCompass.state.answers[q.id];
  const answered = Array.isArray(a) ? a.length > 0 : (a !== undefined && a !== null);
  // Most questions are effectively optional, but we keep this to prevent accidental taps.
  $('btnNext').disabled = !answered;
}

function renderQuestion() {
  const q = CoverageCompass.questions[CoverageCompass.state.i];
  if (!q) {
    finish();
    return;
  }

  $('secTag').textContent = q.section || 'Section';
  $('qText').textContent = q.text || 'Question';
  $('qNote').textContent = q.note || '';

  const opts = $('opts');
  opts.innerHTML = '';

  updateProgress();

  // UI factory
  if (q.type === 'dropdown') {
    const sel = document.createElement('select');
    sel.className = 'custom-select';
    const cur = CoverageCompass.state.answers[q.id] ?? '';

    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Select…';
    sel.appendChild(ph);

    (q.options || []).forEach((o, idx) => {
      const op = document.createElement('option');
      op.value = String(idx);
      op.textContent = o;
      sel.appendChild(op);
    });

    if (cur !== undefined && cur !== null && cur !== '') sel.value = String(cur);

    sel.onchange = () => {
      if (sel.value === '') delete CoverageCompass.state.answers[q.id];
      else CoverageCompass.state.answers[q.id] = Number(sel.value);
      markAssessmentDirty();
      CoverageCompass.recomputeAll();
      save();
      enableNextIfAnswered(q);
    };

    opts.appendChild(sel);
  } else if (q.type === 'multi') {
    const cur = Array.isArray(CoverageCompass.state.answers[q.id]) ? CoverageCompass.state.answers[q.id] : [];

    (q.options || []).forEach((o, idx) => {
      const row = document.createElement('label');
      row.className = 'opt';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = cur.includes(idx);
      row.classList.toggle('selected', cb.checked);
      const span = document.createElement('div');
      span.className = 'txt';
      span.textContent = o;

      cb.onchange = () => {
        const set = new Set(Array.isArray(CoverageCompass.state.answers[q.id]) ? CoverageCompass.state.answers[q.id] : []);
        if (cb.checked) set.add(idx);
        else set.delete(idx);
        CoverageCompass.state.answers[q.id] = [...set].sort((a, b) => a - b);
        row.classList.toggle('selected', cb.checked);
        markAssessmentDirty();
        CoverageCompass.recomputeAll();
        save();
        enableNextIfAnswered(q);
      };

      row.appendChild(cb);
      row.appendChild(span);
      opts.appendChild(row);
    });
  } else if (q.type === 'number') {
    const cur = CoverageCompass.state.answers[q.id];
    const wrap = document.createElement('div');
    wrap.className = 'panel';

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'custom-select';
    if (q.min !== undefined) inp.min = String(q.min);
    if (q.max !== undefined) inp.max = String(q.max);
    if (q.step !== undefined) inp.step = String(q.step);
    inp.value = (cur === undefined || cur === null) ? '' : String(cur);

    const hint = document.createElement('div');
    hint.className = 'muted';
    hint.style.marginTop = '8px';
    hint.textContent = (q.min !== undefined && q.max !== undefined)
      ? `Range: ${q.min} – ${q.max}`
      : 'Enter a number.';

    inp.oninput = () => {
      if (inp.value === '') delete CoverageCompass.state.answers[q.id];
      else CoverageCompass.state.answers[q.id] = Number(inp.value);
      markAssessmentDirty();
      CoverageCompass.recomputeAll();
      save();
      enableNextIfAnswered(q);
    };

    wrap.appendChild(inp);
    wrap.appendChild(hint);
    opts.appendChild(wrap);
  } else {
    // default = single
    const cur = CoverageCompass.state.answers[q.id];
    (q.options || []).forEach((o, idx) => {
      const row = document.createElement('label');
      row.className = 'opt';
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = `q_${q.id}`;
      rb.checked = cur === idx;
      row.classList.toggle('selected', rb.checked);
      const span = document.createElement('div');
      span.className = 'txt';
      span.textContent = o;

      rb.onchange = () => {
        CoverageCompass.state.answers[q.id] = idx;
        $all(`input[name="q_${q.id}"]`).forEach((input) => input.closest('.opt')?.classList.toggle('selected', input.checked));
        markAssessmentDirty();
        CoverageCompass.recomputeAll();
        save();
        enableNextIfAnswered(q);
      };

      row.appendChild(rb);
      row.appendChild(span);
      opts.appendChild(row);
    });
  }

  // Buttons state
  $('btnPrev').disabled = CoverageCompass.state.i <= 0;
  enableNextIfAnswered(q);
}

function next() {
  if (CoverageCompass.state.i < CoverageCompass.questions.length - 1) {
    CoverageCompass.state.i++;
    save();
    renderQuestion();
  } else {
    finish();
  }
}

function prev() {
  if (CoverageCompass.state.i > 0) {
    CoverageCompass.state.i--;
    save();
    renderQuestion();
  }
}

function skip() {
  const q = CoverageCompass.questions[CoverageCompass.state.i];
  if (!q) return;
  delete CoverageCompass.state.answers[q.id];
  markAssessmentDirty();
  CoverageCompass.recomputeAll();
  save();
  next();
}

// ---------- Rendering: Results ----------
function listToHtml(arr) {
  const uniq = (a) => [...new Set((a || []).filter(Boolean))];
  const items = uniq(arr);
  if (!items.length) return '<div class="muted">(none)</div>';
  return `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


// --- Glossary UI (Legal > Glossary) ---
const GlossaryUI = (async () => {
  let inited = false;
  let data = null;
  let terms = [];
  const byKey = new Map();
  const aliasToKey = new Map();
  let selectedKey = null;

  const els = {
    search: null,
    cat: null,
    list: null,
    detail: null,
    facts: null,
    sources: null,
  };

  function norm(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9+\-\s]/g, '');
  }

  function safeList(arr) {
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }

  function loadData() {
    data = window.MDE_GLOSSARY || window["Coverage Compass_GLOSSARY"] || null;
    if (!data || !Array.isArray(data.terms)) return false;

    terms = data.terms.slice().sort((a, b) => String(a.t || '').localeCompare(String(b.t || ''), undefined, { sensitivity: 'base' }));

    byKey.clear();
    aliasToKey.clear();

    for (const term of terms) {
      if (!term || !term.k) continue;
      byKey.set(term.k, term);
      aliasToKey.set(norm(term.t), term.k);
      for (const a of safeList(term.a)) aliasToKey.set(norm(a), term.k);
      // also index raw key itself
      aliasToKey.set(norm(term.k), term.k);
    }
    return true;
  }

  function ensureElements() {
    els.search = $('glossSearch');
    els.cat = $('glossCategory');
    els.list = $('glossList');
    els.detail = $('glossDetail');
    els.facts = $('glossFacts');
    els.sources = $('glossSources');
    return !!(els.search && els.cat && els.list && els.detail && els.facts && els.sources);
  }

  function buildCategoryOptions() {
    const set = new Set();
    for (const t of terms) if (t && t.c) set.add(t.c);

    const cats = Array.isArray(data.categories) && data.categories.length ? data.categories : Array.from(set).sort((a, b) => a.localeCompare(b));

    els.cat.innerHTML =
      '<option value="__all__">All categories</option>' +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function filterTerms() {
    const q = norm(els.search.value);
    const cat = els.cat.value;

    let out = terms;
    if (cat && cat !== '__all__') out = out.filter((t) => t && t.c === cat);

    if (q) {
      out = out.filter((t) => {
        const name = norm(t.t);
        if (name.includes(q)) return true;
        if (norm(t.k).includes(q)) return true;
        for (const a of safeList(t.a)) {
          if (norm(a).includes(q)) return true;
        }
        return false;
      });
    }
    return out;
  }

    function renderFactsAndSources() {
    // Key facts can be either an array (legacy) or an object map (current dataset).
    const factItems = [];

    if (data && data.verified_key_facts && typeof data.verified_key_facts === 'object') {
      for (const [k, v] of Object.entries(data.verified_key_facts)) {
        if (!v) continue;
        const pretty = String(k)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (m) => m.toUpperCase());
        factItems.push(`<li><strong>${escapeHtml(pretty)}</strong>: ${escapeHtml(v)}</li>`);
      }
    } else if (Array.isArray(data && data.key_facts)) {
      for (const v of data.key_facts) if (v) factItems.push(`<li>${escapeHtml(v)}</li>`);
    }

    const sources = Array.isArray(data && data.sources) ? data.sources.filter(Boolean) : [];
    const sourceItems = sources.map((s) => {
      if (typeof s === 'string') return `<li>${escapeHtml(s)}</li>`;
      const label = escapeHtml(s.label || s.name || 'Source');
      const url = s.url ? String(s.url) : '';
      const acc = s.accessed ? ` <span class="muted">(${escapeHtml(s.accessed)})</span>` : '';
      if (url) {
        return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>${acc}</li>`;
      }
      return `<li>${label}${acc}</li>`;
    });

    els.facts.innerHTML =
      '<h4>Key facts</h4>' +
      (factItems.length ? `<ul>${factItems.join('')}</ul>` : '<div class="muted">No key facts loaded.</div>');

    els.sources.innerHTML =
      '<h4>Sources (high-level)</h4>' +
      (sourceItems.length ? `<ul>${sourceItems.join('')}</ul>` : '<div class="muted">No sources loaded.</div>');
  }

  function renderList() {
    if (!data) {
      els.list.innerHTML = '<div class="muted" style="padding:12px">Glossary data not loaded.</div>';
      return;
    }

    const list = filterTerms();
    if (!list.length) {
      els.list.innerHTML = '<div class="muted" style="padding:12px">No glossary matches.</div>';
      return;
    }

    els.list.innerHTML = list
      .map((t) => {
        const active = t.k === selectedKey ? ' active' : '';
        return `<div class="glossaryItem${active}" role="listitem" tabindex="0" data-key="${escapeHtml(t.k)}">
          <div>
            <div class="glossaryTerm">${escapeHtml(t.t)}</div>
            <div class="glossaryDef">${escapeHtml((t.d || "").slice(0, 110))}${(t.d || "").length > 110 ? "…" : ""}</div>
            ${t.a && t.a.length ? `<div class="glossaryCat">${escapeHtml(t.a.slice(0, 2).join(', '))}${t.a.length > 2 ? '…' : ''}</div>` : ''}
          </div>
          <div class="glossaryCat">${escapeHtml(t.c || '')}</div>
        </div>`;
      })
      .join('');
  }

  function renderDetail(term) {
    const aliases = safeList(term.a);
    const related = safeList(term.r);
    const confused = safeList(term.x);

    const aliasHtml = aliases.length
      ? `<div class="pillRow">` +
        aliases.map((a) => `<button class="kpill" type="button" data-open="${escapeHtml(a)}"><span class="mini">aka</span> ${escapeHtml(a)}</button>`).join('') +
        `</div>`
      : '<div class="muted">No alternate names.</div>';

    const relatedHtml = related.length
      ? `<div class="pillRow">` +
        related.map((r) => {
          const label = (byKey.get(r) && byKey.get(r).t) ? byKey.get(r).t : r;
          return `<button class="kpill" type="button" data-open="${escapeHtml(r)}"><span class="mini">see</span> ${escapeHtml(label)}</button>`;
        }).join('') +
        `</div>`
      : '<div class="muted">None listed.</div>';

    const confusedHtml = confused.length
      ? `<div class="pillRow">` +
        confused.map((x) => {
          const label = (byKey.get(x) && byKey.get(x).t) ? byKey.get(x).t : x;
          return `<button class="kpill" type="button" data-open="${escapeHtml(x)}"><span class="mini">≠</span> ${escapeHtml(label)}</button>`;
        }).join('') +
        `</div>`
      : '<div class="muted">None listed.</div>';

    els.detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <h4 style="margin:0">${escapeHtml(term.t)} <span class="glossaryCat">(${escapeHtml(term.c || 'Uncategorized')})</span></h4>
          <div class="muted" style="margin-top:4px">Key: <code>${escapeHtml(term.k)}</code></div>
        </div>
        <button class="btn tiny" id="btnCopyGloss" type="button">Copy</button>
      </div>
      <p style="margin-top:10px">${escapeHtml(term.d || '')}</p>

      <div style="margin-top:12px">
        <div class="muted" style="margin-bottom:6px">Also known as</div>
        ${aliasHtml}
      </div>

      <div style="margin-top:12px">
        <div class="muted" style="margin-bottom:6px">Related</div>
        ${relatedHtml}
      </div>

      <div style="margin-top:12px">
        <div class="muted" style="margin-bottom:6px">Commonly confused with</div>
        ${confusedHtml}
      </div>
    `;

    const btnCopy = $('btnCopyGloss');
    if (btnCopy) {
      btnCopy.onclick = async () => {
        const text = `${term.t}: ${term.d || ''}`;
        try {
          await navigator.clipboard.writeText(text);
          setSaveStatus('Copied');
        } catch {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          setSaveStatus('Copied');
        }
      };
    }
  }

  function selectKey(k) {
    const term = byKey.get(k);
    if (!term) return;

    selectedKey = k;
    renderList();
    renderDetail(term);

    // scroll the active item into view (best-effort)
    const active = els.list.querySelector('.glossaryItem.active');
    if (active && typeof active.scrollIntoView === 'function') active.scrollIntoView({ block: 'nearest' });
  }

  function openFromText(text) {
    const k = aliasToKey.get(norm(text));
    if (k) selectKey(k);
  }

  function bindEvents() {
    els.search.addEventListener('input', () => renderList());
    els.cat.addEventListener('change', () => renderList());

    els.list.addEventListener('click', (e) => {
      const item = e.target.closest('.glossaryItem');
      if (!item) return;
      selectKey(item.dataset.key);
    });

    els.list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('.glossaryItem');
      if (!item) return;
      e.preventDefault();
      selectKey(item.dataset.key);
    });

    els.detail.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (!btn) return;
      openFromText(btn.dataset.open);
    });
  }

  async function init() {
    if (inited) return;
    if (!ensureElements()) return;

    if (!loadData()) {
      els.list.innerHTML = '<div class="muted" style="padding:12px">Glossary data not loaded.</div>';
      inited = true;
      return;
    }

    buildCategoryOptions();
    bindEvents();
    renderFactsAndSources();
    renderList();

    // Select the first term by default for a useful blank-state.
    if (terms.length) selectKey(terms[0].k);

    inited = true;
  }

  return { init, selectKey, openFromText };
})();




function renderTracePanels() {
  const t = $('tracePanel');
  const audit = $('auditLog');
  if (t) {
    const rows = (CoverageCompass.state.trace || []).map((x) => {
      const ts = x.ts ? new Date(x.ts).toLocaleString() : '';
      const body = x.obj ? JSON.stringify(x.obj, null, 2) : '';
      return `${ts ? '[' + ts + '] ' : ''}${x.msg || ''}${body ? '\n' + body : ''}`;
    });
    t.textContent = rows.join('\n\n') || '(no trace yet)';
  }
  if (audit) {
    audit.value = JSON.stringify(CoverageCompass.state.audit || {}, null, 2);
  }
}

function renderScores(ranked) {
  const grid = $('scoreGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const readiness = reportReadiness();
  if (readiness.status === 'enrollment-review') {
    grid.innerHTML = `<div class="reportReadinessBanner reportReadinessBanner--enrollment-review"><strong>Enrollment Status Needs Review</strong><span>Coverage Compass cannot produce a final Medigap / Medicare Advantage structure recommendation yet because Medicare Part A and/or Part B status needs review first.</span></div>`;
    return;
  }
  const topKey = ranked[0]?.key;
  ranked.forEach((r) => {
    const card = document.createElement('div');
    card.className = `scorecard${r.key === topKey ? ' winner' : ''}`;
    card.innerHTML = `
      <h3>${escapeHtml(r.name)}</h3>
      <div class="n">${Number(r.score).toFixed(2)}</div>
      ${r.key === topKey ? '<div class="scoreLabel">Current lead</div>' : ''}
    `;
    grid.appendChild(card);
  });
}

function buildResultChips(out) {
  const a = CoverageCompass.state.axes || {};
  const flags = CoverageCompass.state.flags || {};
  const chips = [];
  if ((a.networkDependency || 0) > 0.2 || (a.providerFragility || 0) > 0.1) chips.push('Provider verification');
  if ((a.rxRisk || 0) > 0.1 || flags.high_rx_complexity) chips.push('Covered drug list review');
  if ((a.futureLockInSensitivity || 0) > 0.2 || flags.medigap_lockout_risk) chips.push('Switching caution');
  if ((a.predictability || 0) > 0.2) chips.push('Cost predictability');
  if ((a.mobility || 0) > 0.2 || flags.hmo_snowbird_risk) chips.push('Travel / routine care away');
  if ((a.assistanceLikelihood || 0) > 0.2) chips.push('Assistance check suggested');
  if (out.confidence === 'Low') chips.push('Low confidence — verify');
  if (!chips.length) chips.push('Verify plan details before changing coverage');
  return chips.slice(0, 7);
}

function renderResults() {
  const out = CoverageCompass.pickWinner();
  const primary = out.primary;
  const ranked = out.ranked || [];
  const readiness = reportReadiness();

  const enrollmentReview = readiness.status === 'enrollment-review' || primary.key === 'INELIGIBLE';
  $('resTitle').textContent = enrollmentReview ? 'Enrollment Status Review' : `Recommendation: ${primary.name}`;
  $('resSubtitle').textContent = enrollmentReview
    ? 'Enrollment status review · recommendation not final'
    : `Confidence: ${out.confidence} · ${readiness.label}`;
  $('resHeroTitle').textContent = enrollmentReview ? 'Enrollment Status Needs Review' : primary.name;
  $('resHeroConfidence').textContent = enrollmentReview
    ? 'Enrollment review needed · not a final recommendation'
    : `${out.confidence} confidence · ${readiness.label}`;
  const why = enrollmentReview
    ? 'Coverage Compass cannot create a final Medigap / Medicare Advantage structure recommendation yet because Medicare Part A and/or Part B status needs review first.'
    : CoverageCompass.state.explanations?.why?.[0] || 'Your answers were compared across Medigap, Medicare Advantage PPO, and Medicare Advantage HMO tradeoffs.';
  $('resHeroWhy').textContent = why;
  const chipBox = $('resultChips');
  if (chipBox) chipBox.innerHTML = buildResultChips(out).map((chip) => `<span>${escapeHtml(chip)}</span>`).join('');

  renderScores(ranked);

  $('whyBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.why);
  $('tradeBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.tradeoffs);
  $('changeBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.changes);

  const warns = (CoverageCompass.state.hardWarnings || []).map((x) => `<div class="warn"><strong>Possible caution</strong><span>${escapeHtml(x)}</span></div>`).join('');
  const blocks = (CoverageCompass.state.hardBlocks || []).map((x) => `<div class="bad"><strong>Resolve first</strong><span>${escapeHtml(x)}</span></div>`).join('');

  $('warnBox').innerHTML = warns || '<div class="muted">(none)</div>';
  $('locksBox').innerHTML = blocks || '<div class="muted">(none)</div>';

  renderResultReportCta();
  const reportCta = $('reportCtaBox');
  if (reportCta && readiness.status === 'in-progress') {
    reportCta.setAttribute('aria-live', 'polite');
  }

  // Widgets
  try { CoverageCompass.renderRadar('radarContainer'); } catch {}
  try {
    const runner = ranked[1] ? ranked[1].key : null;
    CoverageCompass.renderComparison('compTableContainer', primary.key, runner);
  } catch {}

  renderTracePanels();
}

function renderResultReportCta() {
  const box = $('reportCtaBox');
  if (!box) return;
  const readiness = reportReadiness();
  const enrollmentReview = readiness.status === 'enrollment-review';
  const reportLabel = readiness.status === 'complete'
    ? 'Final Packet'
    : readiness.status === 'preliminary'
      ? 'Preliminary Packet'
      : enrollmentReview
        ? 'Enrollment Review Packet'
        : 'Report Packet';
  const disabled = enrollmentReview
    ? !readiness.canGenerateEnrollmentReviewReports
    : !(readiness.canGeneratePreliminaryReports || readiness.canGenerateFinalReports);
  const primaryId = enrollmentReview ? 'enrollment-status' : 'agent-ready';
  box.innerHTML = `
    <h3>${enrollmentReview ? 'Enrollment status needs review' : 'Turn this result into a printable Medicare decision packet'}</h3>
    <p class="muted">${enrollmentReview ? 'Use the enrollment review packet to gather the right information before comparing coverage structures.' : 'Use your result to create scripts, checklists, and agent-ready pages you can print or save.'}</p>
    <div class="reportPreviewBadge">${escapeHtml(readiness.label)}</div>
    <div class="btnrow">
      <button class="btn primary large" data-action="preview-report" data-report-id="${escapeHtml(primaryId)}" type="button" ${disabled ? 'disabled' : ''}>${enrollmentReview ? 'Create Enrollment Status Review Packet' : `${reportLabel} - Agent Ready`}</button>
      <button class="btn large" data-action="${enrollmentReview ? 'continue-assessment' : 'preview-report'}" data-report-id="${escapeHtml(enrollmentReview ? '' : 'switch-defense')}" type="button" ${enrollmentReview ? '' : (disabled ? 'disabled' : '')}>${enrollmentReview ? 'Continue Assessment' : `${reportLabel} - Switch Defense`}</button>
    </div>
    ${enrollmentReview ? '<div class="btnrow"><button class="btn tiny ghost" id="btnViewAllReports" type="button">View All Reports</button></div>' : `<div class="btnrow">
      <button class="btn" data-action="preview-report" data-report-id="phone-script" type="button" ${disabled ? 'disabled' : ''}>${reportLabel} - Phone Script</button>
      <button class="btn tiny ghost" id="btnViewAllReports" type="button">View All Reports</button>
    </div>`}
    ${disabled && !enrollmentReview ? '<div class="btnrow"><button class="btn primary large" id="btnContinueFromResult" type="button">Continue Assessment</button></div>' : ''}
    ${enrollmentReview ? '<div class="muted" style="margin-top:12px">This packet is preliminary by design and is not a final coverage recommendation.</div>' : (!readiness.canGeneratePreliminaryReports && !readiness.canGenerateFinalReports ? '<div class="muted" style="margin-top:12px">Complete the assessment to unlock final report packets.</div>' : '')}
  `;
  const viewAll = $('btnViewAllReports');
  if (viewAll) viewAll.onclick = openReportsModal;
  const continueBtn = $('btnContinueFromResult');
  if (continueBtn) {
    continueBtn.onclick = () => {
      continueAssessment();
    };
  }
}

function continueAssessment() {
  const started = assessmentAnswerCount() > 0 || (CoverageCompass.state.i || 0) > 0;
  if (started) {
    showScreen('screenQuiz');
    renderQuestion();
  } else {
    resetConsentGate();
    showScreen('screenDisclaimer');
  }
}

function finish() {
  CoverageCompass.recomputeAll();
  CoverageCompass.state.completedAt = new Date().toISOString();
  save();
  showScreen('screenResult');
  renderResults();
}

// ---------- Legal tabs ----------
function initTabs(containerId, paneSelector, paneAttr, onChange) {
  const container = $(containerId);
  if (!container) return;

  const tabs = $all(`#${containerId} [data-tab]`);
  const panes = $all(paneSelector);

  function setActive(tabKey) {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabKey));
    panes.forEach((p) => p.classList.toggle('hidden', p.getAttribute(paneAttr) !== tabKey));
    if (typeof onChange === 'function') { try { onChange(tabKey); } catch {} }
  }

  tabs.forEach((b) => {
    b.addEventListener('click', () => setActive(b.dataset.tab));
  });

  // default = first tab
  if (tabs[0]) setActive(tabs[0].dataset.tab);
  return setActive;
}

// ---------- Export ----------
let exportMode = 'safe';

function setExportMode(mode) {
  exportMode = mode;
  $all('#exportTabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
  $('exportText').value = window.getExportText(exportMode);
}

function openExportModal() {
  $('exportModal').style.display = 'flex';
  writeOrgProfileToForm();
  writeProReportToForm();
  setExportMode(exportMode);
}

function closeExportModal() {
  $('exportModal').style.display = 'none';
}

let activeReport = null;

let reportsReturnFocus = null;
function openReportsModal() {
  reportsReturnFocus = document.activeElement && document.activeElement !== document.body
    ? document.activeElement
    : null;
  $('reportsModal').style.display = 'flex';
  const pill = $('stagePill');
  if (pill) pill.textContent = 'Reports';
  renderReportStore();
  $('btnCloseReports')?.focus({ preventScroll: true });
}

function closeReportsModal() {
  $('reportsModal').style.display = 'none';
  const target = reportsReturnFocus;
  reportsReturnFocus = null;
  requestAnimationFrame(() => {
    if (target?.isConnected) target.focus({ preventScroll: true });
  });
}

function buildReport(id) {
  if (!window.CoverageCompassReports) throw new Error('Report generator is not loaded.');
  const readiness = reportReadiness();
  if (id === 'full-bundle' && !readiness.canGenerateFinalReports) {
    throw new Error('Complete the assessment before generating the Full Coverage Compass Report Bundle.');
  }
  if (id === 'enrollment-status' && !readiness.canGenerateEnrollmentReviewReports) {
    throw new Error('The Enrollment Status Review Packet is only available when Medicare Part A and/or Part B status needs review.');
  }
  if (id !== 'enrollment-status' && !readiness.canGeneratePreliminaryReports && !readiness.canGenerateFinalReports) {
    throw new Error('Complete the assessment first so reports can include your result.');
  }
  return window.CoverageCompassReports.buildReport(id);
}

function openReportPreview(id) {
  try {
    activeReport = buildReport(id);
    $('reportPreviewTitle').textContent = activeReport.title;
    $('reportPreviewSubtitle').textContent = activeReport.subtitle || '';
    $('reportPreviewStatus').textContent = activeReport.readinessLabel || '';
    $('reportPreviewHint').textContent = activeReport.readiness?.status === 'complete'
      ? 'For PDF, choose Save as PDF in your browser’s print dialog.'
      : activeReport.readiness?.status === 'enrollment-review'
        ? 'This packet is an enrollment-status review. Use it to gather the right information before comparing coverage structures.'
        : 'This packet is preliminary. Use it for discussion only until the assessment is completed.';
    $('reportPreviewBody').innerHTML = activeReport.html;
    $('reportPreviewModal').style.display = 'flex';
    setSaveStatus(activeReport.readiness?.status === 'complete'
      ? 'Print dialog ready. Choose Save as PDF.'
      : activeReport.readiness?.status === 'enrollment-review'
        ? 'Enrollment review packet ready.'
        : 'Preliminary packet preview ready.', 1800);
  } catch (error) {
    setSaveStatus(error.message || 'Report unavailable', 1800);
  }
}

function closeReportPreview() {
  $('reportPreviewModal').style.display = 'none';
}

let printModeExitTimer = null;
function enterPrintMode() {
  document.body.classList.add('printing-report');
}

function exitPrintMode() {
  document.body.classList.remove('printing-report');
  if (printModeExitTimer) {
    clearTimeout(printModeExitTimer);
    printModeExitTimer = null;
  }
}

window.addEventListener('afterprint', exitPrintMode);

function printOrSavePdfActiveReport() {
  if (!activeReport) return;
  $('reportPreviewBody')?.scrollIntoView({ block: 'start' });
  enterPrintMode();
  setSaveStatus('Print dialog opening. Choose Save as PDF in the dialog.', 2000);
  try {
    window.print();
  } finally {
    printModeExitTimer = setTimeout(exitPrintMode, 3000);
  }
}

function printActiveReport() {
  printOrSavePdfActiveReport();
}

async function copyActiveReport() {
  if (!activeReport) return;
  const ok = await copyText(activeReport.text || '');
  setSaveStatus(ok ? 'Report copied' : 'Copy failed');
}

function downloadActiveReport() {
  if (!activeReport) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = activeReport.id.replace(/[^a-z0-9]+/gi, '_');
  downloadText(`Coverage_Compass_${slug}_${stamp}.txt`, activeReport.text || '');
}

function handleReportAction(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'continue-assessment') {
    continueAssessment();
    return;
  }
  const id = btn.dataset.reportId;
  if (!id) return;
  openReportPreview(id);
  if (action === 'print-report') {
    setTimeout(() => printOrSavePdfActiveReport(), 120);
  }
}

async function copyExport() {
  const ok = await copyText($('exportText').value || '');
  setSaveStatus(ok ? 'Copied' : 'Copy failed');
}

function downloadExport() {
  const stamp = new Date().toISOString().slice(0, 10);
  const fname = exportMode === 'safe'
    ? `Coverage Compass_export_SAFE_${stamp}.txt`
    : `Coverage Compass_export_FULL_${stamp}.txt`;
  downloadText(fname, $('exportText').value || '');
}

// ---------- Help modal ----------
function openHelp() { $('helpModal').style.display = 'flex'; }
function closeHelp() { $('helpModal').style.display = 'none'; }

// ---------- Consent gate ----------
function disclosureScrolledToBottom() {
  const box = $('discBox');
  if (!box) return false;
  return box.scrollTop + box.clientHeight >= box.scrollHeight - 10;
}

function updateConsentGate() {
  const agree = $('agree');
  const enter = $('btnEnter');
  if (!agree || !enter) return;
  const scrolled = disclosureScrolledToBottom();
  agree.disabled = !scrolled;
  enter.disabled = !(scrolled && agree.checked);
  const status = $('consentStatus');
  if (status) status.textContent = scrolled ? 'Review complete — check the box to continue.' : 'Scroll to the bottom to continue.';
}

function resetConsentGate() {
  const agree = $('agree');
  const enter = $('btnEnter');
  const box = $('discBox');
  if (box) box.scrollTop = 0;
  if (agree) {
    agree.checked = false;
    agree.disabled = true;
  }
  if (enter) enter.disabled = true;
}

// ---------- PWA install prompt ----------
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = $('btnInstall');
  if (btn) btn.style.display = 'inline-block';
});

async function promptInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  try { await deferredInstallPrompt.userChoice; } catch {}
  deferredInstallPrompt = null;
  const btn = $('btnInstall');
  if (btn) btn.style.display = 'none';
}

// ---------- Boot / Router ----------
(async function boot() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(function () {});
  }

  // Legal + Export tabs wiring
  const setLegalTab = initTabs('legalTabs', '.legalPane', 'data-pane', (tab) => {
    if (tab === 'glossary') GlossaryUI.init();
  });
  window.CoverageCompass = window.CoverageCompass || window.CoverageCompass || {};
  (window.CoverageCompass || window.CoverageCompass).setLegalTab = setLegalTab;
  $all('#exportTabs .tab').forEach((t) => t.addEventListener('click', () => setExportMode(t.dataset.tab)));

  // Buttons
  $('btnStart').onclick = () => {
    resetConsentGate();
    showScreen('screenDisclaimer');
  };
  $('btnBackFromDisclaimer').onclick = () => showScreen('screenFront');
  $('btnReportExamples').onclick = openReportsModal;
  $('btnViewLegalFromDisclaimer').onclick = () => {
    showScreen('screenLegal');
    (window.CoverageCompass || window.CoverageCompass)?.setLegalTab?.('terms');
  };
$('btnBackFromLegal').onclick = () => {
    // If they came from disclaimer, let them proceed; otherwise go home.
    // Minimal heuristic: if quiz not started, go to disclaimer.
    const started = Object.keys(CoverageCompass.state.answers || {}).length > 0 || (CoverageCompass.state.i || 0) > 0;
    showScreen(started ? 'screenQuiz' : 'screenDisclaimer');
  };

  $('btnHelpOpen').onclick = openHelp;
  $('btnReportsOpen').onclick = openReportsModal;
  $('btnCloseReports').onclick = closeReportsModal;
  $('btnPrivateBetaUnlockReports').onclick = () => {
    saveReportUnlocks(defaultReportUnlocks());
    setSaveStatus('Reports unlocked');
  };
  $('reportProductGrid').addEventListener('click', handleReportAction);
  $('reportCtaBox').addEventListener('click', handleReportAction);
  $('btnCloseReportPreview').onclick = closeReportPreview;
  $('btnPrintReport').onclick = printActiveReport;
  $('btnCopyReport').onclick = copyActiveReport;
  $('btnDownloadReport').onclick = downloadActiveReport;
  $('btnGlossaryOpen').onclick = () => {
    showScreen('screenLegal');
    (window.CoverageCompass || window.CoverageCompass)?.setLegalTab?.('glossary');
  };
  $('btnCloseHelp').onclick = closeHelp;
  $('btnLegalOpen').onclick = () => {
    showScreen('screenLegal');
    (window.CoverageCompass || window.CoverageCompass)?.setLegalTab?.('terms');
  };
$('footLegal').onclick = (e) => { e.preventDefault(); showScreen('screenLegal'); };
  $('footHelp').onclick = (e) => { e.preventDefault(); openHelp(); };

  $('btnEnter').onclick = () => {
    if ($('btnEnter').disabled) return;
    showScreen('screenQuiz');
    renderQuestion();
  };
  $('agree').onchange = updateConsentGate;
  $('discBox').onscroll = updateConsentGate;

  $('btnNext').onclick = next;
  $('btnPrev').onclick = prev;
  $('btnSkip').onclick = skip;

  $('btnBackToQuiz').onclick = () => { showScreen('screenQuiz'); renderQuestion(); };
  $('btnReset').onclick = fullReset;
  $('btnResetAll').onclick = fullReset;

  $('btnExport').onclick = openExportModal;
  $('btnCloseExport').onclick = closeExportModal;
  $('btnCopyExport').onclick = copyExport;
  $('btnDownloadExport').onclick = downloadExport;

  $('btnClearOrgProfile').onclick = () => {
    saveOrgProfile(blankOrgProfile());
    writeOrgProfileToForm(blankOrgProfile());
    setExportMode(exportMode);
    setSaveStatus('Org profile cleared');
  };
  $('btnClearProContext').onclick = () => {
    saveProReport(blankProReport());
    writeProReportToForm(blankProReport());
    setExportMode(exportMode);
    setSaveStatus('Print context cleared');
  };
  ['proClientLabel', 'proPreparedBy', 'proOrganization', 'proReviewType', 'proPlanningHorizon', 'proReportDate', 'proReviewerNotes']
    .concat(['orgDisplayName', 'orgSupportEmail', 'orgLicenseMode', 'orgDisclosureStance', 'orgReportDisclosure'])
    .forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => setExportMode(exportMode));
      el.addEventListener('change', () => setExportMode(exportMode));
    });

  $('btnToggleTrace').onclick = () => $('tracePanel').classList.toggle('hidden');
  $('btnCopyAudit').onclick = async () => {
    const ok = await copyText($('auditLog').value || '');
    setSaveStatus(ok ? 'Copied' : 'Copy failed');
  };

  $('btnInstall').onclick = promptInstall;
  resetConsentGate();
  renderReportStore();

  // Resume
  const had = load();
  if (had) {
    $('btnResume').style.display = 'inline-block';
    $('btnResume').onclick = () => {
      CoverageCompass.recomputeAll();
      showScreen('screenQuiz');
      renderQuestion();
    };
  }

  showScreen('screenFront');
})();
