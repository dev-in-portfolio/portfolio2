// shared/md-page.js
// Simple, robust markdown renderer for help/readme pages.
// Usage: <div id="content" data-md="/data/help/aeon.md"></div>
(function(){
  function getSiteRootUrl(){
    try{
      const script = document.currentScript;
      const src = script && script.getAttribute('src');
      if(src){
        const resolved = new URL(src, window.location.href);
        const marker = '/shared/md-page.js';
        const idx = resolved.pathname.lastIndexOf(marker);
        if(idx !== -1) return resolved.origin + resolved.pathname.slice(0, idx + 1);
      }
    }catch(_){}
    return window.location.origin + '/';
  }

  const siteRootUrl = getSiteRootUrl();

  function absolutizeInternalUrl(url, baseUrl){
    try{
      const raw = String(url || '').trim();
      if(!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return raw;
      const resolved = raw.startsWith('/')
        ? new URL(raw.slice(1), baseUrl || siteRootUrl)
        : new URL(raw, baseUrl || siteRootUrl);
      if(resolved.origin !== window.location.origin) return raw;
      return resolved.pathname + resolved.search + resolved.hash;
    }catch(_){
      return url;
    }
  }

  function esc(s){
    return String(s).replace(/[&<>\"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
    });
  }

  function inline(mdLine, linkBaseUrl){
    let s = esc(mdLine);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, label, href){
      return '<a href="' + esc(absolutizeInternalUrl(href, linkBaseUrl)) + '">' + label + '</a>';
    });
    return s;
  }

  function mdToHtml(md, linkBaseUrl){
    md = String(md).replace(/\r\n/g, '\n');
    const lines = md.split('\n');
    let out = [];
    let inCode = false;
    let listOpen = false;

    function closeList(){
      if(listOpen){ out.push('</ul>'); listOpen=false; }
    }

    for(let i=0;i<lines.length;i++){
      let l = lines[i];

      if(l.trim().startsWith('```')){
        closeList();
        if(!inCode){ out.push('<pre><code>'); inCode=true; }
        else { out.push('</code></pre>'); inCode=false; }
        continue;
      }

      if(inCode){
        out.push(esc(l) + '\n');
        continue;
      }

      const hm = l.match(/^(#{1,6})\s+(.*)$/);
      if(hm){
        closeList();
        const level = hm[1].length;
        out.push('<h'+level+'>' + inline(hm[2], linkBaseUrl) + '</h'+level+'>');
        continue;
      }

      const lm = l.match(/^\s*[-*+]\s+(.*)$/);
      if(lm){
        if(!listOpen){ out.push('<ul>'); listOpen=true; }
        out.push('<li>' + inline(lm[1], linkBaseUrl) + '</li>');
        continue;
      } else {
        closeList();
      }

      if(l.trim() === ''){
        out.push('<div style="height:10px"></div>');
        continue;
      }

      out.push('<p>' + inline(l, linkBaseUrl) + '</p>');
    }

    closeList();
    if(inCode) out.push('</code></pre>');
    return out.join('');
  }

  async function run(){
    const el = document.querySelector('[data-md]');
    if(!el) return;
    
    // Check for view mode param
    const params = new URLSearchParams(window.location.search);
    const viewMode = params.get('v') || '1';
    
    let baseDataUrl = el.getAttribute('data-md');
    let v2DataUrl = baseDataUrl;
    if (v2DataUrl.endsWith('.md')) {
        v2DataUrl = v2DataUrl.slice(0, -3) + '_v2.md';
    }
    let v3DataUrl = baseDataUrl;
    if (v3DataUrl.endsWith('.md')) {
        v3DataUrl = v3DataUrl.slice(0, -3) + '_v3.md';
    }
    
    // Add floating toggle UI
    if (!document.getElementById('v2-toggle-ui')) {
      const ui = document.createElement('div');
      ui.id = 'v2-toggle-ui';
      ui.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:9999; background:rgba(10,12,20,0.85); border:1px solid rgba(150,220,255,0.3); border-radius:999px; padding:6px; display:flex; gap:6px; backdrop-filter:blur(8px); box-shadow:0 8px 32px rgba(0,0,0,0.4);';
      
      const btnStyle = (active, color) => `text-decoration:none; font-family:var(--sans); font-size:12px; letter-spacing:0.05em; padding:6px 12px; border-radius:999px; font-weight:600; transition:all 0.2s ease; ${active ? `background:rgba(${color},0.2); color:#fff; box-shadow:inset 0 0 0 1px rgba(${color},0.4);` : 'color:rgba(255,255,255,0.6);'}`;

      const btnV1 = document.createElement('a');
      btnV1.textContent = 'Original (v1)';
      btnV1.href = '?v=1';
      btnV1.style.cssText = btnStyle(viewMode === '1', '150,220,255');
      
      const btnV2 = document.createElement('a');
      btnV2.textContent = 'Detailed (v2)';
      btnV2.href = '?v=2';
      btnV2.style.cssText = btnStyle(viewMode === '2', '150,255,180');

      const btnV3 = document.createElement('a');
      btnV3.textContent = 'Ultra-Detailed (v3)';
      btnV3.href = '?v=3';
      btnV3.style.cssText = btnStyle(viewMode === '3', '255,200,150');

      const btnSplit = document.createElement('a');
      btnSplit.textContent = 'Compare v1 vs v3';
      btnSplit.href = '?v=split';
      btnSplit.style.cssText = btnStyle(viewMode === 'split', '200,150,255');
      
      ui.appendChild(btnV1);
      ui.appendChild(btnV2);
      ui.appendChild(btnV3);
      ui.appendChild(btnSplit);
      document.body.appendChild(ui);
    }
    
    const src = document.getElementById('src');
    el.innerHTML = '<div class="small">Loading…</div>';

    if (viewMode === 'split') {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = '1fr 1fr';
      el.style.gap = '32px';
      if(src) src.textContent = 'Split View: ' + baseDataUrl + ' & ' + v3DataUrl;

      try {
        const url1 = absolutizeInternalUrl(baseDataUrl, siteRootUrl);
        const url3 = absolutizeInternalUrl(v3DataUrl, siteRootUrl);
        const [r1, r3] = await Promise.all([
          fetch(url1, {cache:'no-store'}),
          fetch(url3, {cache:'no-store'})
        ]);

        let html1 = r1.ok ? mdToHtml(await r1.text(), r1.url || url1) : '<p>Original file not found.</p>';
        let html3 = r3.ok ? mdToHtml(await r3.text(), r3.url || url3) : '<p>Ultra-Detailed v3 file not found yet.</p>';

        el.innerHTML = `
          <div style="min-width:0; word-wrap:break-word;">
            <div style="margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid rgba(150,220,255,0.3); font-family:var(--sans); font-weight:bold; letter-spacing:0.1em; color:rgba(150,220,255,0.9);">ORIGINAL (V1)</div>
            ${html1}
          </div>
          <div style="min-width:0; word-wrap:break-word;">
            <div style="margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid rgba(255,200,150,0.3); font-family:var(--sans); font-weight:bold; letter-spacing:0.1em; color:rgba(255,200,150,0.9);">ULTRA-DETAILED (V3)</div>
            ${html3}
          </div>
        `;
      } catch(e) {
        el.innerHTML = '<h2>Could not load</h2><pre>' + esc(String(e)) + '</pre>';
      }
    } else {
      el.style.display = 'block';
      let targetUrl = baseDataUrl;
      if (viewMode === '2') targetUrl = v2DataUrl;
      if (viewMode === '3') targetUrl = v3DataUrl;
      
      const url = absolutizeInternalUrl(targetUrl, siteRootUrl);
      if(src) src.textContent = url;
      try{
        const r = await fetch(url, {cache:'no-store'});
        if(!r.ok){
          console.warn('HTTP ' + r.status + ' while fetching ' + url);
          if ((viewMode === '2' || viewMode === '3') && r.status === 404) {
            el.innerHTML = '<h2>Documentation Not Available</h2><p>This app has not been updated with this level of detailed codebase documentation yet. <a href="?v=1" style="color:var(--glow);">Return to Original</a>.</p>';
          } else {
            el.innerHTML = '<h2>Could not load</h2>' +
              '<div class="small">HTTP ' + esc(r.status) + ' — <code>' + esc(url) + '</code></div>';
          }
          return;
        }
        const t = await r.text();
        el.innerHTML = mdToHtml(t, r.url || url);
      }catch(e){
        el.innerHTML = '<h2>Could not load</h2><pre>' + esc(String(e)) + '</pre>';
      }
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
