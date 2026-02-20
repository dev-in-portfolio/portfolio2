/*
  Error Boundary Guard (v2)
  ------------------------
  Adds a visible, non-blocking error surface on-screen.

  Why:
  - Mobile/tablet users often don't see the console.
  - A runtime crash otherwise feels like "glitchy buttons" or "blank screen".

  Captures:
  - window 'error'
  - window 'unhandledrejection'

  Output:
  - Small floating panel (bottom-left)
  - Tap header to expand details
  - "Copy debug" button
*/

(function(){
  const MAX_ERRORS = 6;
  const state = {
    errors: [],
    mounted: false,
    expanded: false,
    root: null,
  };

  const CSS = `
    #nx-error-surface{position:fixed;left:12px;bottom:12px;z-index:2147483646;max-width:min(520px,calc(100vw - 24px));font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;pointer-events:none}
    #nx-error-surface *{box-sizing:border-box}
    #nx-error-card{pointer-events:auto;background:rgba(15,23,42,.92);color:#e2e8f0;border:1px solid rgba(148,163,184,.35);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.35);overflow:hidden;backdrop-filter:blur(10px)}
    #nx-error-head{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer}
    #nx-error-dot{width:10px;height:10px;border-radius:999px;background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.18)}
    #nx-error-title{font-size:12.5px;font-weight:700;letter-spacing:.2px;white-space:nowrap}
    #nx-error-sub{font-size:12px;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
    #nx-error-actions{display:flex;gap:8px}
    #nx-error-actions button{appearance:none;border:1px solid rgba(148,163,184,.35);background:rgba(30,41,59,.65);color:#e2e8f0;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:650}
    #nx-error-actions button:active{transform:translateY(1px)}
    #nx-error-body{display:none;padding:10px 12px;border-top:1px solid rgba(148,163,184,.2)}
    #nx-error-body.show{display:block}
    #nx-error-list{display:flex;flex-direction:column;gap:8px;max-height:48vh;overflow:auto}
    #nx-error-item{padding:8px 10px;border-radius:12px;border:1px solid rgba(148,163,184,.22);background:rgba(2,6,23,.35)}
    #nx-error-item .meta{font-size:11.5px;opacity:.75;margin-bottom:4px}
    #nx-error-item pre{margin:0;font-size:11.5px;line-height:1.35;white-space:pre-wrap;word-break:break-word}
  `;

  function mount(){
    if(state.mounted) return;
    state.mounted = true;

    const style = document.createElement('style');
    style.setAttribute('data-nx','error-surface');
    style.textContent = CSS;

    const root = document.createElement('div');
    root.id = 'nx-error-surface';
    root.innerHTML = `
      <div id="nx-error-card">
        <div id="nx-error-head" role="button" aria-label="Show error details">
          <div id="nx-error-dot" aria-hidden="true"></div>
          <div id="nx-error-title">Runtime issue</div>
          <div id="nx-error-sub">Tap to view details</div>
          <div id="nx-error-actions">
            <button id="nx-error-copy" type="button">Copy debug</button>
            <button id="nx-error-dismiss" type="button">Hide</button>
          </div>
        </div>
        <div id="nx-error-body">
          <div id="nx-error-list"></div>
        </div>
      </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(root);
    state.root = root;

    const head = root.querySelector('#nx-error-head');
    const body = root.querySelector('#nx-error-body');
    const dismissBtn = root.querySelector('#nx-error-dismiss');
    const copyBtn = root.querySelector('#nx-error-copy');

    head.addEventListener('click', (e) => {
      const target = e.target;
      if(target && target.tagName === 'BUTTON') return;
      state.expanded = !state.expanded;
      body.classList.toggle('show', state.expanded);
      render();
    });

    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      root.style.display = 'none';
    });

    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try{
        const text = buildDebugBundle();
        await navigator.clipboard.writeText(text);
        root.querySelector('#nx-error-sub').textContent = 'Copied debug bundle ✅';
        setTimeout(()=>render(), 900);
      }catch{
        root.querySelector('#nx-error-sub').textContent = 'Copy failed (clipboard blocked)';
        setTimeout(()=>render(), 900);
      }
    });
  }

  function normalizeError(err){
    if(!err) return { name:'Error', message:'Unknown error', stack:'' };
    if(typeof err === 'string') return { name:'Error', message: err, stack:'' };
    const name = err.name || 'Error';
    const message = err.message || String(err);
    const stack = err.stack || '';
    return { name, message, stack };
  }

  function push(payload){
    const now = new Date();
    state.errors.unshift({
      time: now.toISOString(),
      ...payload
    });
    state.errors = state.errors.slice(0, MAX_ERRORS);
    window.__NX_ERRORS__ = state.errors;

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', () => { mount(); render(); }, { once:true });
    } else {
      mount();
      render();
    }
  }

  function buildDebugBundle(){
    const lines = [];
    lines.push('Nexus Runtime Debug Bundle');
    lines.push('--------------------------');
    lines.push('URL: ' + (location.href || ''));
    lines.push('UA: ' + (navigator.userAgent || ''));
    lines.push('Time: ' + new Date().toISOString());
    lines.push('');
    state.errors.slice().reverse().forEach((e, idx) => {
      lines.push(`#${idx+1}  ${e.type || 'error'}  @ ${e.time}`);
      lines.push((e.name || '') + ': ' + (e.message || ''));
      if(e.source) lines.push('Source: ' + e.source);
      if(e.stack) lines.push('Stack:\n' + e.stack);
      lines.push('');
    });
    return lines.join('\n');
  }

  function render(){
    if(!state.root) return;
    const sub = state.root.querySelector('#nx-error-sub');
    const list = state.root.querySelector('#nx-error-list');
    const body = state.root.querySelector('#nx-error-body');

    const latest = state.errors[0];
    if(latest){
      const short = (latest.message || '').replace(/\s+/g,' ').slice(0, 120);
      sub.textContent = short || 'Tap to view details';
    } else {
      sub.textContent = 'Tap to view details';
    }

    body.classList.toggle('show', state.expanded);

    list.innerHTML = '';
    state.errors.forEach((e) => {
      const item = document.createElement('div');
      item.id = 'nx-error-item';
      item.innerHTML = `
        <div class="meta">${e.type || 'error'} • ${e.time}</div>
        <pre>${escapeHtml(`${e.name || 'Error'}: ${e.message || ''}${e.source ? `\n${e.source}` : ''}${e.stack ? `\n\n${e.stack}` : ''}`)}</pre>
      `;
      list.appendChild(item);
    });
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  // Capture sync errors
  window.addEventListener('error', (event) => {
    try{
      const err = normalizeError(event.error || event.message);
      push({
        type: 'error',
        name: err.name,
        message: err.message,
        stack: err.stack,
        source: event.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : ''
      });
    }catch(_){}
  });

  // Capture promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    try{
      const err = normalizeError(event.reason);
      push({
        type: 'unhandledrejection',
        name: err.name,
        message: err.message,
        stack: err.stack,
        source: ''
      });
    }catch(_){}
  });

  // Expose (useful for internal dev panel / debugging)
  window.NX_ERROR_SURFACE = {
    get errors(){ return state.errors; },
    show(){ if(state.root){ state.root.style.display='block'; } },
    hide(){ if(state.root){ state.root.style.display='none'; } },
    copy(){ return buildDebugBundle(); },
  };
})();
