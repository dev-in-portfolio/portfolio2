/* Shared Toast Utility (Phase C)
   - Lightweight, dependency-free
   - Safe: does NOT override alert/confirm
   - Usage: window.toast('Saved!', { kind: 'ok', ms: 1400 })
*/

(function(){
  if (typeof window === 'undefined') return;
  if (typeof window.toast === 'function') return; // don't overwrite app-specific implementations

  const ensureStack = ()=>{
    let stack = document.getElementById('nxToastStack');
    if (!stack){
      stack = document.createElement('div');
      stack.id = 'nxToastStack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('aria-atomic', 'true');
      document.body.appendChild(stack);
    }
    return stack;
  };

  const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));

  window.toast = function(message, opts={}){
    try{
      const msg = (message == null) ? '' : String(message);
      const kind = (opts.kind || opts.type || 'ok');
      const ms = clamp(Number(opts.ms ?? opts.t ?? 1400) || 1400, 500, 6000);

      const stack = ensureStack();
      const el = document.createElement('div');
      el.className = 'nxToast';
      el.dataset.kind = kind;
      el.setAttribute('role', 'status');
      el.textContent = msg;

      // Click-to-dismiss
      el.addEventListener('click', ()=>{
        try{ el.classList.add('nxOut'); }catch(_e){}
        setTimeout(()=>{ try{ el.remove(); }catch(_e){} }, 180);
      }, { passive: true });

      stack.appendChild(el);

      setTimeout(()=>{
        try{ el.classList.add('nxOut'); }catch(_e){}
        setTimeout(()=>{ try{ el.remove(); }catch(_e){} }, 180);
      }, ms);

      return el;
    }catch(e){
      // Absolute fallback: if something goes wrong, avoid breaking app flows.
      try{ console.warn('toast error', e); }catch(_e){}
      return null;
    }
  };
})();
