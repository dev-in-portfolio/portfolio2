/* lab-shell.js — shared top bar + help/README overlay for every lab page (P15)
   - Fixed, non-overlapping header
   - Optional per-lab overrides: window.LAB_SHELL_CONFIG = { title, subtitle, readmeFile, hideNativeHeader? }
*/
(() => {
  'use strict';

  // This shell is intended for *lab* pages (aeon.html, helios.html, etc.).
  // The Nexus pages (home/about/case-studies/readme/help/404) use their own navigation.
  // Some hosts serve the Nexus home from a path like "/portfolio" (no trailing slash),
  // which would otherwise incorrectly load this lab shell and (worse) its dimming overlay.
  const pRaw = String(location.pathname || '/');
  const pTrim = pRaw.replace(/\/+$/,'');
  const last = (pTrim.split('/').pop() || '').toLowerCase();

  // Hard stop: never run inside real app routes.
  // These pages already render their own layout + the global Nexus nav.
  // If Lab Shell mounts here, its overlay can visually erase the app.
  if (/^\/apps\//i.test(pRaw)) return;

  // Fast-path: obvious Nexus routes
  const isNexusRoute = (
    last === '' ||
    last === 'index' || last === 'index.html' ||
    last === 'about' || 
    last === 'case-studies' || last === 'case-studies.html' ||
    last === 'readme' || last === 'readme.html' ||
    last === 'help' || last === 'help.html' ||
    last === '404' || last === '404.html' ||
    last === 'health' || last === 'health.html' ||
    last === 'settings' || last === 'settings.html' ||
    // common subfolder deploy patterns
    last === 'portfolio'
  );

  // DOM heuristics: if the page already has a Nexus bar, don't inject the lab shell.
  // Extra hard-stop: if the body is explicitly tagged as a Nexus page, bail.
  const bodyIsNexus = !!(document.body && document.body.classList && document.body.classList.contains('page-nexus'));
  const hasNexusNav = !!document.querySelector('.nexusbar, #nexusbar, #startHereStrip, .startHereCard, .nxsGrid');

  if (isNexusRoute || bodyIsNexus || hasNexusNav) return;

  const AUTO_LAB_CONFIGS = {"Aeon": {"title": "Aeon — Orbital Sandbox", "subtitle": "Full-viewport workspace for gravity, orbits, and motion experiments.", "readmeFile": "readmes/aeon.md"}, "Helios": {"title": "Helios — Stellar Controls", "subtitle": "Solar visualization with readable panels and screen-adaptive canvas sizing.", "readmeFile": "readmes/helios.md"}, "Helix": {"title": "Helix — Protein Viewer", "subtitle": "Protein structure explorer with a curated starter library and defaults on load.", "readmeFile": "readmes/helix.md"}, "Magma": {"title": "Magma — Volcanic Sandbox", "subtitle": "High-load visual lab with performance controls for smooth interaction.", "readmeFile": "readmes/magma.md"}, "String": {"title": "String — Procedural Structures", "subtitle": "Canvas-first lab with proportional sizing and a fullscreen toggle.", "readmeFile": "readmes/string.md"}, "Tectonic": {"title": "Tectonic — Plate Dynamics", "subtitle": "Earth systems / plate-style simulation with clear parameters and readable UI.", "readmeFile": "readmes/tectonic.md"}, "Transit": {"title": "Transit — Orbital Transit", "subtitle": "A simulation lab that must be responsive and gesture-friendly on mobile.", "readmeFile": "readmes/transit.md"}, "Vortex": {"title": "Vortex — Market Vortex", "subtitle": "Finance/market-flavored simulation with credible, current-looking numbers.", "readmeFile": "readmes/vortex.md"}};

  function labKeyFromPath(){
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    const m = p.match(/^([a-z0-9_-]+)\.html$/i);
    if (!m) return null;
    const base = m[1];
    // normalize common filenames
    const map = {
      'aeon': 'Aeon',

      'helios': 'Helios',
      'helix': 'Helix',
      'magma': 'Magma',
      'string': 'String',
      'tectonic': 'Tectonic',
      'transit': 'Transit',
      'vortex': 'Vortex'};
    return map[base] || null;
  }


  function appIdFromLabKey(k){
    const map = {
      'Aeon': 'aeon-quantum-v15-0-warp-hero-cams-x-ray-hud',

      'Helios': 'helios-solar-dynamics',
      'Helix': 'helix-live-protein-lab',
      'Magma': 'magma-omega-enter-magma-chamber',
      'String': 'string-theory-4d-manifold-lab',
      'Tectonic': 'tectonic-satellite-global-seismic-monitor',
      'Transit': 'transit-3d-prestige-edition',
      'Vortex': 'vortex-v3-3-multi-asset-vortex-field'
    };
    return map[k] || '';
  }

  async function ensureAIScripts(){
    // Load ai-router/personas on-demand (some labs don't include them)
    const needRouter = !(window.AIAdvisorRouter && typeof window.AIAdvisorRouter.runAdvisor === 'function');
    const needPersonas = !(window.AIPersonas && typeof window.AIPersonas.getPersona === 'function');

    function loadScript(src){
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
      });
    }

    try{
      if (needPersonas) await loadScript('ai-personas.js');
      if (needRouter) await loadScript('ai-router.js');
      return true;
    }catch(_e){
      return false;
    }
  }

  function effectiveConfig(){
    const exp = window.LAB_SHELL_CONFIG;
    if (exp && typeof exp === 'object') return exp;
    const k = labKeyFromPath();
    return (k && AUTO_LAB_CONFIGS[k]) ? AUTO_LAB_CONFIGS[k] : {};
  }

  function addCSS(){
    if (document.getElementById('labShellCSS')) return;
    const l = document.createElement('link');
    l.id = 'labShellCSS';
    l.rel = 'stylesheet';
    l.href = 'lab-shell.css';
    document.head.appendChild(l);
  }

  function el(tag, attrs = {}, children = []){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)){
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, String(v));
    }
    for (const c of children){
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }

  function setShellHeightVar(){
    const bar = document.getElementById('labShellBar');
    if (!bar) return;
    const h = Math.max(40, Math.round(bar.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--labShellH', h + 'px');
    // push page content down
    document.body.style.paddingTop = `calc(${h}px + env(safe-area-inset-top, 0px))`;
  }

  function mdToHTML(md){
    // Very small, safe markdown: paragraphs, headings, bullet lists, inline code.
    const esc = (s) => s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const lines = md.split('\n');
    let out = [];
    let inList = false;

    const flushList = () => {
      if (inList){ out.push('</ul>'); inList = false; }
    };

    for (let raw of lines){
      const line = raw.replace(/\r/g,'');
      if (/^\s*$/.test(line)){ flushList(); continue; }

      const h3 = line.match(/^###\s+(.*)$/);
      const h2 = line.match(/^##\s+(.*)$/);
      if (h2){ flushList(); out.push(`<h2>${esc(h2[1])}</h2>`); continue; }
      if (h3){ flushList(); out.push(`<h3>${esc(h3[1])}</h3>`); continue; }

      const li = line.match(/^\s*-\s+(.*)$/);
      if (li){
        if (!inList){ out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineCode(esc(li[1]))}</li>`);
        continue;
      }

      flushList();
      out.push(`<p>${inlineCode(esc(line))}</p>`);
    }
    flushList();
    return out.join('\n');

    function inlineCode(s){
      return s.replace(/`([^`]+)`/g, (_,code) => `<code>${code}</code>`);
    }
  }

  async function fetchReadmeMarkdown(cfg){
    const file = (cfg && typeof cfg.readmeFile === 'string') ? cfg.readmeFile.trim() : '';
    if (file){
      try{
        const r = await fetch(file, { cache: 'no-store' });
        if (r && r.ok){
          const t = await r.text();
          if (typeof t === 'string') return t;
        }
      }catch(_e){ /* ignore */ }
    }
    const inline = (cfg && typeof cfg.readmeMarkdown === 'string') ? cfg.readmeMarkdown.trim() : '';
    return inline;
  }

  function computeAIStatus(){
    // Best-effort: if ai_proxy.php exists and key configured, show ready; otherwise unknown.
    // We avoid hard failing if server blocks the request.
    const pill = document.getElementById('labShellAI');
    if (!pill) return;
    pill.textContent = 'AI: checking…';
    fetch('ai_proxy.php?health=1', { cache: 'no-store' })
      .then(r => r.ok ? r.json().catch(()=>null) : null)
      .then(j => {
        if (!j){ pill.textContent = 'AI: unknown'; return; }
        if (j.configured === true){ pill.textContent = 'AI: ready'; pill.style.color = '#a7f3d0'; }
        else { pill.textContent = 'AI: not set'; pill.style.color = '#fca5a5'; }
      })
      .catch(() => { pill.textContent = 'AI: unknown'; });
  }

  function render(){
    addCSS();
    const cfg = effectiveConfig();
    const title = cfg.title || document.title || 'Lab';
    const subtitle = cfg.subtitle || '';

    const back = el('a', { class:'labShellBtn', href:'index.html', title:'Back to Nexus' }, [
      el('span', { class:'labShellIcon' }, ['←']),
      el('span', { class:'labShellLabel' }, ['Nexus']),
    ]);

    const titleBlock = el('div', { class:'labShellTitle' }, [
      el('strong', {}, [title]),
      el('span', {}, [subtitle]),
    ]);

    const helpBtn = el('button', { class:'labShellBtn', type:'button', title:'Help' }, [
      el('span', { class:'labShellIcon' }, ['?']),
      el('span', { class:'labShellLabel' }, ['Help']),
    ]);

    const readmeBtn = el('button', { class:'labShellBtn', type:'button', title:'README' }, [
      el('span', { class:'labShellIcon' }, ['📄']),
      el('span', { class:'labShellLabel' }, ['README']),
    ]);

    const notFoundBtn = el('a', { class:'labShellBtn', href:'404.html', title:'Open the 404 page' }, [
      el('span', { class:'labShellIcon' }, ['🚫']),
      el('span', { class:'labShellLabel' }, ['404']),
    ]);

    const onlinePill = el('div', { class:'labShellPill', id:'labShellNet' }, [
      el('span', { class:'labShellDot', html:'●' }),
      el('span', { class:'labShellLabel' }, ['online']),
    ]);

    const aiPill = el('div', { class:'labShellPill', id:'labShellAI', role:'button', tabindex:'0', title:'AI advisor' }, ['AI: unknown']);

    const bar = el('div', { id:'labShellBar' }, [
      el('div', { id:'labShellLeft' }, [ back, titleBlock ]),
      el('div', { id:'labShellRight' }, [ readmeBtn, helpBtn, notFoundBtn, onlinePill, aiPill ]),
    ]);

    document.body.prepend(bar);

    // Overlay
    const overlay = el('div', { id:'labShellOverlay' }, [
      el('div', { id:'labShellPanel' }, []),
    ]);
    document.body.appendChild(overlay);

    function openOverlay(kind){
      const panel = document.getElementById('labShellPanel');
      const k = labKeyFromPath() || 'Lab';
      if (kind === 'ai'){
        const appId = appIdFromLabKey(k);
        panel.innerHTML = `
          <h2>${escapeHTML(k)} — AI Advisor</h2>
          <p>This is the shared AI advisor for the portfolio labs. It can use (1) visible UI controls, and (2) any lab-provided context via <code>window.getLabAIContext()</code>.</p>
          <div class="labShellAiRow">
            <label for="labShellPersona">Persona</label>
            <select id="labShellPersona">
              <option value="navigator">Navigator</option>
              <option value="coach">Coach</option>
              <option value="critic">Critic</option>
            </select>
          </div>
          <textarea id="labShellAsk" rows="4" placeholder="Ask about what’s on screen… (e.g., ‘What does this control do?’ or ‘How do I make it faster?’)"></textarea>
          <div class="labShellAiBtns">
            <button id="labShellAskBtn">Ask AI</button>
            <button id="labShellCloseBtn">Close</button>
          </div>
          <div id="labShellAiStatus" class="labShellAiStatus">Status: idle</div>
          <pre id="labShellAiOut" class="labShellAiOut"></pre>
        `;

        // Persona persistence
        try{
          const KEY = 'ai_persona_v1';
          const sel = document.getElementById('labShellPersona');
          const saved = (localStorage && localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'navigator';
          if (sel && saved) sel.value = saved;
          if (sel) sel.addEventListener('change', () => {
            try{ localStorage && localStorage.setItem(KEY, sel.value); }catch(_e){}
          });
        }catch(_e){}

        // Ask handler
        const btn = document.getElementById('labShellAskBtn');
        const out = document.getElementById('labShellAiOut');
        const st = document.getElementById('labShellAiStatus');
        const ask = document.getElementById('labShellAsk');
        const sel = document.getElementById('labShellPersona');

        const run = async () => {
          if (!btn || !out || !st || !ask || !sel) return;
          const q = (ask.value || '').trim();
          if (!q){
            ask.focus();
            return;
          }
          btn.disabled = true;
          st.textContent = 'Status: loading…';
          out.textContent = '';

          const ok = await ensureAIScripts();
          if (!ok || !(window.AIAdvisorRouter && typeof window.AIAdvisorRouter.runAdvisor === 'function')){
            st.textContent = 'Status: AI scripts unavailable (missing ai-router.js).';
            btn.disabled = false;
            return;
          }

          const ctx = {
            shell: { lab: k, title: title || '', subtitle: subtitle || '' },
            path: location.pathname,
            hash: location.hash
          };

          try{
            await window.AIAdvisorRouter.runAdvisor({
              appId,
              role: sel.value,
              userPrompt: q,
              ctx,
              ui: {
                setText: (t) => { out.textContent = t || ''; },
                setStatus: (s) => { st.textContent = 'Status: ' + (s || ''); },
                log: (...a) => console.log('[lab-shell ai]', ...a)}
            });
          }catch(e){
            st.textContent = 'Status: error';
            out.textContent = (e && e.message) ? e.message : String(e);
          }finally{
            btn.disabled = false;
          }
        };

        if (btn) btn.addEventListener('click', run);
        if (ask) ask.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ run(); }
        });

      } else if (kind === 'help'){
        panel.innerHTML = `
          <h2>${escapeHTML(k)} — Help</h2>
          <p>This is a portfolio lab module. Use the controls inside the lab to explore the behavior. The header is shared across labs so navigation and status stay consistent.</p>
          <h3>Mobile tips</h3>
          <ul>
            <li>Try rotating your device if the layout feels cramped.</li>
            <li>Use pinch-zoom / drag gestures where available.</li>
          </ul>
          <h3>Performance</h3>
          <p>If a lab feels heavy, lower quality settings (when offered), disable post effects, and consider an FPS cap.</p>
          <div id="labShellCloseRow"><button id="labShellCloseBtn">Close</button></div>
        `;
      } else {
        // README: prefer loading from cfg.readmeFile (readmes/*.md). Fallback to inline cfg.readmeMarkdown.
        const headerHTML = `
          <h2>${escapeHTML(title)}</h2>
          ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ''}
        `;

        panel.innerHTML = `
          ${headerHTML}
          <p>Loading README…</p>
          <div id="labShellCloseRow"><button id="labShellCloseBtn">Close</button></div>
        `;

        // async load (keep overlay responsive)
        fetchReadmeMarkdown(cfg).then((raw) => {
          let md = (raw || '').toString();
          // If the markdown starts with an H1, remove it since the shell renders the title already.
          md = md.replace(/^#\s+.*\n\s*\n?/, '');
          const bodyHTML = md.trim() ? mdToHTML(md.trim()) : `<p>No README available for this lab yet.</p>`;
          panel.innerHTML = `
            ${headerHTML}
            ${bodyHTML}
            <div id="labShellCloseRow"><button id="labShellCloseBtn">Close</button></div>
          `;
          const b = document.getElementById('labShellCloseBtn');
          if (b) b.addEventListener('click', closeOverlay);
        }).catch(() => {
          panel.innerHTML = `
            ${headerHTML}
            <p>README could not be loaded.</p>
            <div id="labShellCloseRow"><button id="labShellCloseBtn">Close</button></div>
          `;
          const b = document.getElementById('labShellCloseBtn');
          if (b) b.addEventListener('click', closeOverlay);
        });
      }
      overlay.setAttribute('data-open','1');
      const btn = document.getElementById('labShellCloseBtn');
      if (btn) btn.addEventListener('click', closeOverlay);
    }
    function closeOverlay(){
      overlay.removeAttribute('data-open');
    }

    aiPill.addEventListener('click', () => openOverlay('ai'));
    aiPill.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openOverlay('ai'); });

    helpBtn.addEventListener('click', () => openOverlay('help'));
    readmeBtn.addEventListener('click', () => openOverlay('readme'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

    // Online/offline status
    const syncNet = () => {
      const on = navigator.onLine;
      const lbl = onlinePill.querySelector('.labShellLabel');
      const dot = onlinePill.querySelector('.labShellDot');
      if (lbl) lbl.textContent = on ? 'online' : 'offline';
      if (dot) dot.style.color = on ? '#34d399' : '#f87171';
    };
    window.addEventListener('online', syncNet);
    window.addEventListener('offline', syncNet);
    syncNet();

    // Shell height var
    setShellHeightVar();
    new ResizeObserver(setShellHeightVar).observe(bar);

    // optional hide native headers if requested
    if (cfg.hideNativeHeader){
      const maybe = document.querySelector('header, .header, .topbar, #topbar');
      if (maybe) maybe.style.display = 'none';
    }

    computeAIStatus();
  }

  function escapeHTML(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  try { render(); } catch (e) { /* fail-open */ }
})();
