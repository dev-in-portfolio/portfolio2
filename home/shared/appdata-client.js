/* shared/appdata-client.js
   Minimal backend sync helper for Netlify drag/drop portfolio.
   - Anonymous per-browser clientId
   - Local-first: failures are silent (apps keep working)
   - Remote sync is used only when an API is explicitly configured or available
   - Never stores or transmits API keys (apps must choose what to send)
*/
(function(){
  const DEFAULT_API = '/api/appdata';
  const CLIENT_KEY = 'nexus_client_id_v1';
  const apiChecks = new Map();
  const IS_LOCAL_STATIC =
    typeof location !== 'undefined' &&
    (
      location.protocol === 'file:' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '0.0.0.0' ||
      location.hostname === 'localhost'
    );

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

  function resolveClientId(opts){
    const customId = opts && typeof opts.clientId === 'string' ? opts.clientId.trim() : '';
    return customId || getClientId();
  }

  function readConfiguredApi(){
    try{
      const globalApi =
        typeof window !== 'undefined' && typeof window.NEXUS_APPDATA_API === 'string'
          ? window.NEXUS_APPDATA_API.trim()
          : '';
      if(globalApi) return globalApi;
    }catch(_e){}

    try{
      const meta = typeof document !== 'undefined'
        ? document.querySelector('meta[name="nexus-appdata-api"]')
        : null;
      const metaApi = meta && typeof meta.content === 'string' ? meta.content.trim() : '';
      if(metaApi) return metaApi;
    }catch(_e){}

    return DEFAULT_API;
  }

  function resolveApiCandidate(opts){
    const optApi = opts && typeof opts.api === 'string' ? opts.api.trim() : '';
    return optApi || readConfiguredApi();
  }

  async function checkApiAvailable(api){
    if(!api || IS_LOCAL_STATIC) return false;
    if(!apiChecks.has(api)){
      apiChecks.set(api, (async ()=>{
        try{
          const res = await fetch(api, { method: 'OPTIONS' });
          return res.status !== 404;
        }catch(_e){
          return false;
        }
      })());
    }
    return !!(await apiChecks.get(api));
  }

  async function resolveActiveApi(opts){
    const api = resolveApiCandidate(opts);
    if(!api) return null;
    return (await checkApiAvailable(api)) ? api : null;
  }

  async function save(app, payload, opts){
    opts = opts || {};
    if(!app) return false;
    const api = await resolveActiveApi(opts);
    if(!api) return false;
    const clientId = resolveClientId(opts);
    if(!clientId) return false;

    // Safety: avoid huge payloads (Netlify function/body limits).
    const bytes = jsonSizeBytes(payload);
    const maxBytes = opts.maxBytes || 900_000; // ~0.9MB
    if(bytes > maxBytes){
      // Silent skip: app still has local persistence.
      return false;
    }

    const body = {
      app: String(app),
      clientId,
      payload: payload ?? {}
    };

    try{
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(()=>null);
      return !!(res.ok && data && data.ok);
    }catch(_e){
      return false;
    }
  }

  function saveDebounced(app, payload, ms, opts){
    const key = String(app || 'app') + '::' + resolveClientId(opts);
    const wait = Number.isFinite(ms) ? ms : 700;

    if(debouncers.has(key)) clearTimeout(debouncers.get(key));
    debouncers.set(key, setTimeout(()=>{ void save(app, payload, opts); }, wait));
  }

  async function loadLatest(app, opts){
    if(!app) return null;
    const api = await resolveActiveApi(opts);
    if(!api) return null;
    const clientId = resolveClientId(opts);
    if(!clientId) return null;
    const url = api + '?app=' + encodeURIComponent(String(app)) + '&clientId=' + encodeURIComponent(clientId);
    try{
      const res = await fetch(url, { method:'GET' });
      const data = await res.json().catch(()=>null);
      if(!res.ok || !data || !data.ok || data.payload == null) return null;
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
