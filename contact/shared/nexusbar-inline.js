// nexusbar-inline.js (A30 hardened)
(function(){
  function appName(){
    const b=document.body;
    return (b && (b.getAttribute("data-app") || b.dataset.app)) ? (b.getAttribute("data-app") || b.dataset.app) : "";
  }
  function setHref(sel, href){
    const a=document.querySelector(sel);
    if(a) a.setAttribute("href", href);
  }
  function wireLinks(){
    const app = appName().trim();
    setHref('[data-nexus="home"]', "/index.html");
    if(app){
      setHref('[data-nexus="help"]',   `/help/${app}/`);
      setHref('[data-nexus="readme"]', `/readme/${app}/`);
      setHref('[data-nexus="althea"]', `/althea/${app}/`);
      setHref('[data-nexus="nf"]',     `/404/${app}/`);
    } else {
      setHref('[data-nexus="help"]',   "/help/");
      setHref('[data-nexus="readme"]', "/readme/");
      setHref('[data-nexus="althea"]', "/althea/");
      setHref('[data-nexus="nf"]',     "/404/");
    }
  }

  function dedupeBars(){
    try{
      const bars = Array.from(document.querySelectorAll('.nexusbar.inline'));
      if(bars.length <= 1) return;
      // Keep the first one in DOM order
      for(let i=1;i<bars.length;i++){
        bars[i].remove();
      }
    }catch(_){}
  }

  function run(){
    // Run a few times because some apps rebuild DOM after load
    dedupeBars();
    wireLinks();
    setTimeout(()=>{ dedupeBars(); wireLinks(); }, 0);
    setTimeout(()=>{ dedupeBars(); wireLinks(); }, 50);
    setTimeout(()=>{ dedupeBars(); wireLinks(); }, 250);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", run);
  else run();

  // If something injects a second bar later, remove it
  try{
    const mo = new MutationObserver(()=>{ dedupeBars(); });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }catch(_){}
})();