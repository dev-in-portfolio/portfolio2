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
    const url = absolutizeInternalUrl(el.getAttribute('data-md'), siteRootUrl);
    const src = document.getElementById('src');
    if(src) src.textContent = url;
    el.innerHTML = '<div class="small">Loading…</div>';
    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok){
        console.warn('HTTP ' + r.status + ' while fetching ' + url);
        el.innerHTML = '<h2>Could not load</h2>' +
          '<div class="small">HTTP ' + esc(r.status) + ' — <code>' + esc(url) + '</code></div>';
        return;
      }
      const t = await r.text();
      el.innerHTML = mdToHtml(t, r.url || url);
    }catch(e){
      el.innerHTML = '<h2>Could not load</h2><pre>' + esc(String(e)) + '</pre>';
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
