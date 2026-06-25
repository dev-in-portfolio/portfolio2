// force-catch-clear.js
(function(){
  function clearOverlays(){
    try{
      const ids=["bootOverlay","splash","splashScreen","loading","loadingOverlay","errorOverlay","app404Overlay"];
      ids.forEach(id=>{ const el=document.getElementById(id); if(el){ el.style.display="none"; el.style.visibility="hidden"; el.style.opacity="0"; } });
      document.querySelectorAll(".splash,.splashscreen,.loading,.loading-overlay,.boot,.boot-overlay,.error-overlay")
        .forEach(el=>{ el.style.display="none"; el.style.visibility="hidden"; el.style.opacity="0"; });
      document.documentElement.style.overflowY="auto";
      document.body.style.overflowY="auto";
      document.body.style.position="relative";
    }catch(_){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", clearOverlays);
  else clearOverlays();
  window.addEventListener("load", ()=>setTimeout(clearOverlays,0));
  window.addEventListener("error", ()=>setTimeout(clearOverlays,0));
  window.addEventListener("unhandledrejection", ()=>setTimeout(clearOverlays,0));
  window.forceCatchClear = clearOverlays;
})();