/* shared/appdata-client.js
   Minimal backend sync helper for Netlify drag/drop portfolio.
   - Anonymous per-browser clientId
   - Local-first: failures are silent (apps keep working)
   - Never stores or transmits API keys (apps must choose what to send)
*/
(function(){
  const API = '/api/appdata';
  const CLIENT_KEY = 'nexus_client_id_v1';

  function uuid(){
    try{ return crypto.randomUUID(); }catch(_e){}
    return 'cid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }

  function getClientId(){
    try{
      let id = localStorage.getItem(CLIENT_KEY);
      if(!id){
        id = uuid();
        localStorage.setItem(CLIENT_KEY, id);
      }
      return id;
    }catch(_e){
      return 'cid_ephemeral';
    }
  }

  function jsonSizeBytes(obj){
    try{ return new Blob([JSON.stringify(obj)]).size; }catch(_e){
      try{ return JSON.stringify(obj).length; }catch(_e2){ return 0; }
    }
  }

  const debouncers = new Map();

  async function save(app, payload, opts){
    opts = opts || {};
    if(!app) return false;

    // Safety: avoid huge payloads (Netlify function/body limits).
    const bytes = jsonSizeBytes(payload);
    const maxBytes = opts.maxBytes || 900_000; // ~0.9MB
    if(bytes > maxBytes){
      // Silent skip: app still has local persistence.
      return false;
    }

    const body = {
      app: String(app),
      clientId: getClientId(),
      payload: payload ?? {}
    };

    try{
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok;
    }catch(_e){
      return false;
    }
  }

  function saveDebounced(app, payload, ms){
    const key = String(app || 'app') + '::' + getClientId();
    const wait = Number.isFinite(ms) ? ms : 700;

    if(debouncers.has(key)) clearTimeout(debouncers.get(key));
    debouncers.set(key, setTimeout(()=>{ save(app, payload); }, wait));
  }

  async function loadLatest(app){
    if(!app) return null;
    const url = API + '?app=' + encodeURIComponent(String(app)) + '&clientId=' + encodeURIComponent(getClientId());
    try{
      const res = await fetch(url, { method:'GET' });
      if(!res.ok) return null;
      const data = await res.json().catch(()=>null);
      if(!data || !data.payload) return null;
      return data;
    }catch(_e){
      return null;
    }
  }

  window.NexusAppData = {
    getClientId,
    save,
    saveDebounced,
    loadLatest
  };
})();