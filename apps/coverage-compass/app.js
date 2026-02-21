

async function hydrateFromBackendIfNeeded(){
  try{
    // Only hydrate if local storage is empty
    const raw = localStorage.getItem("mde_build");
    if(raw) return false;
    const remote = await window.NexusAppData?.loadLatest?.("coverage-compass");
    const p = remote?.payload;
    if(p && p.answers){
      localStorage.setItem("mde_build", JSON.stringify({ answers: p.answers, idx: p.idx || 0 }));
      return true;
    }
  }catch(_e){}
  return false;
}
/*
  CoverageCompass Complete App Shell
  - fixes broken wiring in the "working build"
  - adds legal/help screens, safe export/share, and PWA offline caching

  NOTE: This is not medical/legal advice. See Legal tab.
*/

const CoverageCompass = window.CoverageCompass || window["CoverageCompass"] || {};

const $ = (id) => document.getElementById(id);
const $all = (sel) => [...document.querySelectorAll(sel)];

function setSaveStatus(text, ttlMs = 900) {
  const el = $('saveStatus');
  if (!el) return;
  el.textContent = text;
  if (ttlMs > 0) {
    clearTimeout(setSaveStatus._t);
    setSaveStatus._t = setTimeout(() => (el.textContent = 'Local'), ttlMs);
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
      screenDisclaimer: 'Terms',
      screenQuiz: 'Quiz',
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

function fullReset() {
  try {
    localStorage.removeItem('mde_build');
  } catch {}
  CoverageCompass.state.answers = {};
  CoverageCompass.state.i = 0;
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
  $('barText').textContent = `${Math.round(pct * 100)}%`;
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
      const span = document.createElement('div');
      span.className = 'txt';
      span.textContent = o;

      cb.onchange = () => {
        const set = new Set(Array.isArray(CoverageCompass.state.answers[q.id]) ? CoverageCompass.state.answers[q.id] : []);
        if (cb.checked) set.add(idx);
        else set.delete(idx);
        CoverageCompass.state.answers[q.id] = [...set].sort((a, b) => a - b);
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
      const span = document.createElement('div');
      span.className = 'txt';
      span.textContent = o;

      rb.onchange = () => {
        CoverageCompass.state.answers[q.id] = idx;
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
    data = window["Coverage Compass_GLOSSARY"] || null;
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
      els.list.innerHTML = '<div class="muted" style="padding:12px">No matches.</div>';
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
          toast('Copied.');
        } catch {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          toast('Copied.');
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
  ranked.forEach((r) => {
    const card = document.createElement('div');
    card.className = 'scorecard';
    card.innerHTML = `
      <h3>${escapeHtml(r.name)}</h3>
      <div class="n">${Number(r.score).toFixed(2)}</div>
    `;
    grid.appendChild(card);
  });
}

function renderResults() {
  const out = CoverageCompass.pickWinner();
  const primary = out.primary;
  const ranked = out.ranked || [];

  $('resTitle').textContent = `Recommendation: ${primary.name}`;
  $('resSubtitle').textContent = `Confidence: ${out.confidence}`;

  renderScores(ranked);

  $('whyBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.why);
  $('tradeBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.tradeoffs);
  $('changeBox').innerHTML = listToHtml(CoverageCompass.state.explanations?.changes);

  const warns = (CoverageCompass.state.hardWarnings || []).map((x) => `<div class="warn">${escapeHtml(x)}</div>`).join('');
  const blocks = (CoverageCompass.state.hardBlocks || []).map((x) => `<div class="bad">${escapeHtml(x)}</div>`).join('');

  $('warnBox').innerHTML = warns || '<div class="muted">(none)</div>';
  $('locksBox').innerHTML = blocks || '<div class="muted">(none)</div>';

  // Widgets
  try { CoverageCompass.renderRadar('radarContainer'); } catch {}
  try {
    const runner = ranked[1] ? ranked[1].key : null;
    CoverageCompass.renderComparison('compTableContainer', primary.key, runner);
  } catch {}

  renderTracePanels();
}

function finish() {
  CoverageCompass.recomputeAll();
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

function getExportText(mode) {
  const out = CoverageCompass.pickWinner();
  const primary = out.primary;

  if (mode === 'safe') {
    const safeAnswers = makeRedactedAnswers(CoverageCompass.state.answers || {});
    const safeSummary = {
      build: "",
      generatedAt: new Date().toISOString(),
      recommendation: { name: primary.name, score: primary.score, confidence: out.confidence },
      ranked: (out.ranked || []).map((r) => ({ name: r.name, score: r.score })),
      // include explanations but not raw answers
      why: [...new Set(CoverageCompass.state.explanations?.why || [])],
      tradeoffs: [...new Set(CoverageCompass.state.explanations?.tradeoffs || [])],
      changes: [...new Set(CoverageCompass.state.explanations?.changes || [])],
      warnings: [...new Set(CoverageCompass.state.hardWarnings || [])],
      blocks: [...new Set(CoverageCompass.state.hardBlocks || [])],
      // include redacted answers if user wants to keep structure (optional)
      redacted_answers: safeAnswers
    };
    return JSON.stringify(safeSummary, null, 2);
  }

  // Full
  return CoverageCompass.getExportText(primary) + `\n\n---\nGenerated: ${new Date().toISOString()}\n`;
}

function setExportMode(mode) {
  exportMode = mode;
  $all('#exportTabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
  $('exportText').value = getExportText(exportMode);
}

function openExportModal() {
  $('exportModal').style.display = 'flex';
  setExportMode(exportMode);
}

function closeExportModal() {
  $('exportModal').style.display = 'none';
}

async function copyExport() {
  const ok = await copyText($('exportText').value || '');
  setSaveStatus(ok ? 'Copied' : 'Copy failed');
}

function shareLink(mode) {
  const answers = mode === 'safe' ? makeRedactedAnswers(CoverageCompass.state.answers || {}) : (CoverageCompass.state.answers || {});
  const hash = (() => {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(answers))));
    } catch {
      return '';
    }
  })();
  const base = (location.protocol === 'file:' || location.origin === 'null') ? location.href.split('#')[0] : `${location.origin}${location.pathname}`;
  return `${base}#${hash}`;
}

async function copyShareLink() {
  const link = shareLink(exportMode);
  const ok = await copyText(link);
  setSaveStatus(ok ? 'Link copied' : 'Copy failed');
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
  // SW hard-disable (battle-hardening):
  // A stale service worker was serving older cached versions of this app (including older HTML that lacked the Nexus placeholder),
  // causing "Nexus shows only after hard reload / cache clear".
  // We unregister any existing SW in this scope and clear its caches.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function (regs) {
        return Promise.all((regs || []).map(function (r) { return r.unregister(); }));
      })
      .catch(function () {});

    if (window.caches && caches.keys) {
      caches.keys()
        .then(function (keys) {
          return Promise.all((keys || []).map(function (k) {
            // Only delete CC/PWA caches; leave site/global caches alone.
            if (/coverage|cc-|pwa|compass/i.test(k)) return caches.delete(k);
          }));
        })
        .catch(function () {});
    }
  }

  // Legal + Export tabs wiring
  const setLegalTab = initTabs('legalTabs', '.legalPane', 'data-pane', (tab) => {
    if (tab === 'glossary') GlossaryUI.init();
  });
  window.CoverageCompass = window.CoverageCompass || window.CoverageCompass || {};
  (window.CoverageCompass || window.CoverageCompass).setLegalTab = setLegalTab;
  $all('#exportTabs .tab').forEach((t) => t.addEventListener('click', () => setExportMode(t.dataset.tab)));

  // Buttons
  $('btnStart').onclick = () => showScreen('screenDisclaimer');
  $('btnBackFromDisclaimer').onclick = () => showScreen('screenFront');
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

  $('btnEnter').onclick = () => { showScreen('screenQuiz'); renderQuestion(); };
  $('agree').onchange = (e) => $('btnEnter').disabled = !e.target.checked;
  $('discBox').onscroll = (e) => {
    if (e.target.scrollTop + e.target.clientHeight >= e.target.scrollHeight - 10) {
      $('agree').disabled = false;
    }
  };

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
  $('btnCopyLink').onclick = copyShareLink;

  $('btnToggleTrace').onclick = () => $('tracePanel').classList.toggle('hidden');
  $('btnCopyAudit').onclick = async () => {
    const ok = await copyText($('auditLog').value || '');
    setSaveStatus(ok ? 'Copied' : 'Copy failed');
  };

  $('btnInstall').onclick = promptInstall;

  // Resume
  await hydrateFromBackendIfNeeded();
  const had = load();
  if (had) {
    $('btnResume').style.display = 'inline-block';
    $('btnResume').onclick = () => {
      CoverageCompass.recomputeAll();
      showScreen('screenQuiz');
      renderQuestion();
    };
  }

  // Deep-link share (#...)
  if (window.location.hash && window.location.hash.length > 5) {
    const h = window.location.hash.substring(1);
    try {
      const json = decodeURIComponent(escape(atob(h)));
      const decoded = JSON.parse(json);
      if (decoded && typeof decoded === 'object') {
        CoverageCompass.state.answers = decoded;
        CoverageCompass.state.i = 0;
        CoverageCompass.recomputeAll();
        showScreen('screenResult');
        renderResults();
        return;
      }
    } catch {}
  }

  showScreen('screenFront');
})();