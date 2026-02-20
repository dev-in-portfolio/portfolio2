/* =========================
   GLOBAL STATE
========================= */
const DEFAULT_GOALS = { doorKnock: 30, appointmentSet: 3, water12oz: 8 };
const SPLASH_KEY = 'UBR_v2_1_splashSeen';
const STATE = {
  settings: { home: null },
  book: { tab: 'leads', clients: [], leads: [], archived: [], selected: new Set() },
  today: [],
  todayCurrentId: null,
  week: { days: [] },
  dev: { notes: '' },
  assist: {
    date: '',
    counts: {},
    freeVisits: [],
    goals: { ...DEFAULT_GOALS }
  },
  assistHistory: [] 
};
const STORAGE_KEY = 'UBR_v2_1';

// Phase C: non-blocking notifications (toast when available)
function notify(msg, kind='ok', ms=1400){
  try{
    if(typeof window.toast === 'function') return window.toast(msg, { kind, ms });
  }catch(_e){}
  try{ (window.alert ? window.alert.bind(window) : function(){})(String(msg)); }catch(_e){}
}

/* Helper: Normalize Data Structures */
function normalizeStops(arr){
  if (!Array.isArray(arr)) return;
  arr.forEach(s=>{
    if (!s) return;
    if (!Array.isArray(s.visitHistory)) s.visitHistory = [];
    if (!('lastOutcome' in s)) s.lastOutcome = '';
    if (!('createdAt' in s)) s.createdAt = new Date().toISOString();
  });
}

/* Helper: Storage */
function loadStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.settings) STATE.settings = data.settings;
    if (data?.book){
      STATE.book.clients = data.book.clients || [];
      STATE.book.leads = data.book.leads || [];
      STATE.book.archived = data.book.archived || [];
    }
    if (Array.isArray(data?.today)) STATE.today = data.today;
    if (data?.todayCurrentId) STATE.todayCurrentId = data.todayCurrentId;
    if (data?.dev?.notes) STATE.dev.notes = data.dev.notes;
    if (data?.assist){
      STATE.assist = { ...STATE.assist, ...data.assist };
    }
    if (Array.isArray(data?.assistHistory)) STATE.assistHistory = data.assistHistory;
    
    normalizeStops(STATE.today);
    ['clients','leads','archived'].forEach(k=> normalizeStops(STATE.book[k]));
  }catch(e){ console.error('Load error', e); }
}

function saveStorage(){
  try{
    const copy = {
      settings: STATE.settings,
      book: {
        clients: STATE.book.clients,
        leads: STATE.book.leads,
        archived: STATE.book.archived
      },
      today: STATE.today,
      todayCurrentId: STATE.todayCurrentId,
      dev: { notes: STATE.dev.notes },
      assist: STATE.assist,
      assistHistory: STATE.assistHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
    try{ window.NexusAppData?.saveDebounced?.("ubr", copy, 1200); }catch(_e){}
  }catch(e){ console.error('Save error', e); }
}

/* =========================
   GEO / UTILS
========================= */
function uuid(){ return crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+Math.random(); }

// Safety: prevent HTML injection when we render user-provided stop fields.
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function makeStop(name, address, lat=null, lon=null, priority='Medium', extras={}){
  return {
    id: uuid(),
    name: (name||'').slice(0,100),
    address: (address||'').slice(0,240),
    lat, lon,
    priority,
    status:'',
    note:'',
    visitHistory:[],
    lastOutcome:'',
    phone: (extras.phone||'').slice(0,40),
    email: (extras.email||'').slice(0,80),
    createdAt: new Date().toISOString()
  };
}

function haversineMeters(a,b){
  // NOTE: lat/lon can be 0 (valid), so we must check for null/undefined specifically.
  if(a?.lat == null || a?.lon == null || b?.lat == null || b?.lon == null) return 9999999;
  const R=6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
  const h=Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}


async function geocode(address){
  if(!address || address.length<5) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&addressdetails=1&q=${encodeURIComponent(address)}`;
  try {
      const res = await fetch(url);
      const j = await res.json();
      if(j && j[0]) return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), display: j[0].display_name };
  } catch(e) { console.error(e); }
  return null;
}

function navUrlForStop(s){
  const q = (s.lat && s.lon) ? `${s.lat},${s.lon}` : encodeURIComponent(s.address);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
}

function getCurrentStop(){
  return STATE.today.find(s=>s.id===STATE.todayCurrentId) || null;
}

/* =========================
   TODAY
========================= */
let map, markersLayer, routeLine;
const Today = {
  render(){
    const box = document.getElementById('todayList');
    box.innerHTML = '';
    updateCurrentStopBanners();

    if (!STATE.today.length){
      box.innerHTML = '<div class="card text-center text-gray-500 py-4">No stops in route. Add from Book or Scan.</div>';
      this.drawMap();
      this.renderSummary();
      return;
    }

    STATE.today.forEach(s=>{
      const isCurrent = STATE.todayCurrentId === s.id;
      const div = document.createElement('div');
      div.className = 'card relative ' + (isCurrent ? 'current-stop' : 'border-gray-800');
      
      const visits = s.visitHistory.length;
      const last = s.lastOutcome ? ` · ${s.lastOutcome}` : '';
      
      div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="grow pr-2 cursor-pointer" onclick="Today.setCurrent('${s.id}')">
                <div class="font-bold text-sm text-white">${s.name || 'Unknown'} <span class="badge ${s.priority==='High'?'ok':s.priority==='Low'?'low':'warn'}">${s.priority}</span></div>
                <div class="text-xs text-gray-400 mt-1">${s.address}</div>
                <div class="text-[0.65rem] text-gray-500 mt-1">Visits: ${visits}${last}</div>
            </div>
            <div class="flex flex-col gap-2">
                <button class="btn-mini bg-blue-900/50 text-blue-200" onclick="Today.sendNavOne('${s.id}')">NAV</button>
                <button class="btn-mini text-red-300" onclick="Today.remove('${s.id}')">DEL</button>
            </div>
        </div>
        ${isCurrent ? '<div class="absolute top-0 right-0 p-1"><span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span></span></div>' : ''}
      `;
      box.appendChild(div);
    });
    this.drawMap();
    this.renderSummary();
  },
  renderSummary(){
      const el = document.getElementById('routeSummary');
      if(!el) return;

      const total = STATE.today.length;
      const geoStops = STATE.today.filter(s=>s?.lat != null && s?.lon != null);
      const geo = geoStops.length;

      // Start preview from the current stop if possible.
      let startIdx = 0;
      if(STATE.todayCurrentId){
        const idx = STATE.today.findIndex(s=>s.id===STATE.todayCurrentId);
        if(idx >= 0) startIdx = idx;
      }

      const next = STATE.today.slice(startIdx, startIdx + 5);
      const nextHtml = next.length ? next.map((s,i)=>{
        const n = startIdx + i + 1;
        const pri = (s.priority||'').toLowerCase();
        const b = pri==='high' ? 'ok' : pri==='low' ? 'low' : 'warn';
        const isCurrent = s.id === STATE.todayCurrentId;
        return `
          <div class="route-next-row ${isCurrent?'is-current':''}">
            <div class="route-next-n">${n}</div>
            <div class="route-next-main">
              <div class="route-next-title">${escapeHtml(s.name||'Unknown')} <span class="badge ${b}">${escapeHtml(s.priority||'')}</span></div>
              <div class="route-next-sub">${escapeHtml(s.address||'')}</div>
            </div>
          </div>
        `;
      }).join('') : `<div class="text-xs text-gray-500">No stops yet — add from Book or Scan.</div>`;

      // Rough route stats (best-effort; no external routing API)
      const miPerM = 1/1609.34;
      const mphCity = 25;              // conservative average
      const stopOverheadMin = 2;       // parking / walk-up buffer

      // Determine a reasonable start point for distance estimation.
      const currentStop = getCurrentStop();
      let startPoint = null;
      if(currentStop?.lat != null && currentStop?.lon != null) startPoint = currentStop;
      else if(STATE.settings.home?.lat != null && STATE.settings.home?.lon != null) startPoint = STATE.settings.home;
      else startPoint = geoStops[0] || null;

      // Estimate distance across geocoded stops in current order.
      let miles = 0;
      const orderedGeo = STATE.today.filter(s=>s?.lat != null && s?.lon != null);
      if(startPoint && orderedGeo.length){
        // If the startPoint is not the first geostop, include the first leg.
        const first = orderedGeo[0];
        if(first && (startPoint.id !== first.id)){
          miles += haversineMeters(startPoint, first) * miPerM;
        }
        for(let i=0;i<orderedGeo.length-1;i++){
          miles += haversineMeters(orderedGeo[i], orderedGeo[i+1]) * miPerM;
        }
      }

      const driveMin = miles > 0 ? (miles / mphCity) * 60 : 0;
      const estMin = driveMin + (total * stopOverheadMin);
      const estLo = estMin ? Math.max(0, estMin * 0.85) : 0;
      const estHi = estMin ? estMin * 1.20 : 0;

      const conf = total ? Math.round((geo / total) * 100) : 0;
      const confLabel = conf >= 90 ? 'High' : conf >= 70 ? 'Medium' : 'Low';
      const confKind = conf >= 90 ? 'ok' : conf >= 70 ? 'warn' : 'low';

      const milesStr = miles ? `${miles.toFixed(1)} mi` : '—';
      const timeStr = estMin ? `${Math.round(estLo)}–${Math.round(estHi)} min` : '—';

      // Update the meta label in the Stops card header (right side)
      const meta = document.getElementById('todayStopsMeta');
      if(meta){
        meta.textContent = total ? `${total} stops • ${geo} geo • ${milesStr}` : '';
      }

      el.innerHTML = `
        <div class="route-summary">
          <div class="route-kpis">
            <div class="route-kpi">
              <div class="route-k">Stops</div>
              <div class="route-v">${total}</div>
            </div>
            <div class="route-kpi">
              <div class="route-k">Geocoded</div>
              <div class="route-v">${geo}</div>
            </div>
            <div class="route-kpi">
              <div class="route-k">Est Miles</div>
              <div class="route-v">${milesStr}</div>
            </div>
            <div class="route-kpi">
              <div class="route-k">Drive Time</div>
              <div class="route-v">${timeStr}</div>
            </div>
            <div class="route-kpi">
              <div class="route-k">Confidence</div>
              <div class="route-v"><span class="badge ${confKind}">${confLabel} · ${conf}%</span></div>
            </div>
          </div>

          <div class="route-next">
            <div class="route-next-h">
              <div class="text-sm font-bold text-white">Next Up</div>
              <div class="text-[0.7rem] text-gray-400">Preview from current stop</div>
            </div>
            <div class="route-next-list">${nextHtml}</div>
          </div>
        </div>
      `;
  },
  setCurrent(id){
      STATE.todayCurrentId = id;
      saveStorage();
      this.render();
      Assistant.updateDisplay();
  },
  remove(id){
      if(!confirm('Remove stop?')) return;
      STATE.today = STATE.today.filter(s=>s.id!==id);
      if(STATE.todayCurrentId===id) STATE.todayCurrentId=null;
      saveStorage();
      this.render();
  },
  optimize(){
      const geo = STATE.today.filter(s=>s.lat);
      const others = STATE.today.filter(s=>!s.lat);
      if(geo.length < 2) return;
      
      let current = STATE.settings.home?.lat ? STATE.settings.home : geo[0];
      let pool = [...geo];
      const sorted = [];
      
      while(pool.length > 0){
          let closest = null, minDist = Infinity, idx = -1;
          pool.forEach((p,i)=>{
              const d = haversineMeters(current, p);
              if(d < minDist){ minDist=d; closest=p; idx=i; }
          });
          sorted.push(closest);
          current = closest;
          pool.splice(idx,1);
      }
      STATE.today = [...sorted, ...others];
      saveStorage();
      this.render();
      notify('Route Optimized.');
  },
  clear(){
      if(confirm('Delete entire route?')){
          STATE.today=[]; STATE.todayCurrentId=null; saveStorage(); this.render();
      }
  },
  sendNavOne(id){
      const s = STATE.today.find(x=>x.id===id);
      if(s) window.open(navUrlForStop(s), '_blank');
  },
  sendNavAll(){
      const s = STATE.today[0];
      if(s) window.open(navUrlForStop(s), '_blank');
  },
  drawMap(){
    const el = document.getElementById('map');
    const statusEl = document.getElementById('mapStatus');
    if(!el) return;
    if(!window.L || !window.L.map){ if(statusEl) statusEl.textContent = "Map: Leaflet failed to load."; return; }
    if(!map){
        // Create the map immediately so users see *something* even before they have geocoded stops.
        // This also prevents the "blank/gray" first-load bug on some mobile/tablet browsers.
        map = L.map('map', {
          preferCanvas: false,
          zoomControl: true,
          attributionControl: true
        }).setView([39.8,-98.5], 4);

        const tl = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
          crossOrigin: true
        });
        tl.on('loading', ()=>{ if(statusEl) statusEl.textContent = 'Map: loading tiles…'; });
        tl.on('load', ()=>{
          if(statusEl) statusEl.textContent = 'Map: ready.';
          // Some browsers need an extra invalidate after first tile paint.
          try{ map.invalidateSize(); }catch(e){}
        });
        tl.on('tileerror', ()=>{
          if(statusEl) statusEl.textContent = 'Map: tile load error (network/CSP).';
        });
        tl.addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        // Keep Leaflet sized correctly on tablets / rotation / split-view.
        window.addEventListener('resize', ()=>{ try{ map.invalidateSize(); }catch(e){} }, {passive:true});
    }
    
    markersLayer.clearLayers();
    if(routeLine) routeLine.remove();

    const pts = STATE.today.filter(s=>s.lat);
    if(pts.length===0){
      if(statusEl) statusEl.textContent = 'Map: add geo-coded stops to draw a route.';
      return;
    }

    const latlngs = pts.map(s=>[s.lat,s.lon]);
    
    pts.forEach((s, i)=>{
        const isCurrent = STATE.todayCurrentId === s.id;
        const color = isCurrent ? '#facc15' : (s.lastOutcome ? '#22c55e' : '#3b82f6');
        L.circleMarker([s.lat, s.lon], {
            radius: isCurrent ? 8 : 6,
            color: '#fff', weight: 1,
            fillColor: color, fillOpacity: 0.9
        }).bindTooltip(`${i+1}. ${s.name}`).addTo(markersLayer);
    });
    
    routeLine = L.polyline(latlngs, {color: '#64748b', weight: 3, dashArray: '5, 10'}).addTo(map);
    map.fitBounds(routeLine.getBounds(), {padding:[30,30]});
  }
};

/* =========================
   BOOK
========================= */
const Book = {
    get active(){ return STATE.book.tab; },
    set active(v){ 
        STATE.book.tab = v; 
        STATE.book.selected.clear();
        ['tabClients','tabLeads','tabArchived'].forEach(id => {
            const btn = document.getElementById(id);
            if(id.toLowerCase().includes(v)) {
                btn.classList.add('btn-accent');
                btn.classList.remove('btn-ghost');
            } else {
                btn.classList.remove('btn-accent');
            }
        });
        this.render(); 
    },
    filtered(){
        const list = STATE.book[STATE.book.tab] || [];
        const q = document.getElementById('searchBox').value.toLowerCase();
        const pri = document.getElementById('priorityFilter').value;
        const geo = document.getElementById('geoFilter').value;
        return list.filter(s=>{
            if(q && !s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
            if(pri && s.priority !== pri) return false;
            if(geo==='yes' && !s.lat) return false;
            if(geo==='no' && s.lat) return false;
            return true;
        });
    },
    render(){
        const box = document.getElementById('bookList');
        box.innerHTML='';
        const list = this.filtered();
        
        list.forEach(s=>{
            const sel = STATE.book.selected.has(s.id);
            const div = document.createElement('div');
            div.className = `card flex items-center gap-3 ${sel ? 'border-yellow-500 bg-yellow-900/10' : ''}`;
            div.innerHTML = `
                <input type="checkbox" class="w-5 h-5 rounded border-gray-600" ${sel?'checked':''} onchange="Book.toggleSel('${s.id}')">
                <div class="grow text-sm">
                    <div class="font-bold text-white">${s.name}</div>
                    <div class="text-xs text-gray-400">${s.address}</div>
                </div>
                ${s.lat ? '<span class="text-xs text-green-500">📍</span>' : ''}
                <button class="btn-mini" onclick="Book.addToToday('${s.id}')">+Day</button>
            `;
            box.appendChild(div);
        });
        if(!list.length) box.innerHTML = '<div class="text-center text-xs text-gray-500 mt-4">No records found.</div>';
    },
    toggleSel(id){
        if(STATE.book.selected.has(id)) STATE.book.selected.delete(id);
        else STATE.book.selected.add(id);
        saveStorage();
    },
    clearSelection(){ STATE.book.selected.clear(); this.render(); },
    add(type){
        const n = document.getElementById('newName').value;
        const a = document.getElementById('newAddress').value;
        const p = document.getElementById('newPriority').value;
        if(!n && !a) return;
        STATE.book[type].push(makeStop(n,a,null,null,p));
        document.getElementById('newName').value='';
        document.getElementById('newAddress').value='';
        saveStorage();
        this.active = type;
    },
    addToToday(id){
        const s = STATE.book[STATE.book.tab].find(x=>x.id===id);
        if(s && !STATE.today.find(x=>x.id===id)){
            STATE.today.push({...s});
            saveStorage();
            notify('Added to Today');
        }
    },
    massAdd(){
        let c=0;
        STATE.book.selected.forEach(id=>{
             const s = STATE.book[STATE.book.tab].find(x=>x.id===id);
             if(s && !STATE.today.find(x=>x.id===id)){ STATE.today.push({...s}); c++; }
        });
        STATE.book.selected.clear();
        saveStorage();
        this.render();
        notify(`Added ${c} stops to Today.`);
    },
    async geocodeNew(){
        const addr = document.getElementById('newAddress').value;
        if(!addr) return;
        const g = await geocode(addr);
        if(g) {
            document.getElementById('newAddress').value = g.display;
            notify('Address Found & Standardized');
        } else {
            notify('Address not found');
        }
    }
};

/* =========================
   PLAN WEEK
========================= */
const PlanWeek = {
    run(){
        const pool = [...STATE.book.clients, ...STATE.book.leads].filter(s=>s.lat);
        if(!pool.length) { notify('No geocoded contacts available.'); return; }
        const perDay = parseInt(document.getElementById('pmwStops').value) || 20;
        
        const clusters = [];
        let remaining = [...pool];
        
        while(remaining.length > 0){
            let center = remaining[0];
            let daySet = [center];
            remaining.splice(0,1);
            
            remaining.sort((a,b) => haversineMeters(center, a) - haversineMeters(center, b));
            
            const chunk = remaining.slice(0, perDay-1);
            daySet = daySet.concat(chunk);
            remaining = remaining.slice(perDay-1);
            clusters.push(daySet);
        }
        
        STATE.week.days = clusters;
        saveStorage();
        this.render();
    },
    render(){
        const out = document.getElementById('pmwOut');
        out.innerHTML = '';
        STATE.week.days.forEach((day, i)=>{
            const div = document.createElement('div');
            div.className = 'card bg-slate-900';
            div.innerHTML = `
                <div class="row items-center mb-2">
                    <div class="font-bold text-accent-500 grow">Day ${i+1} (${day.length} stops)</div>
                    <button class="btn-mini bg-blue-600 text-white" onclick="PlanWeek.pushDay(${i})">Add to Today</button>
                </div>
                <div class="text-xs text-gray-400 truncate">${day[0].address} area...</div>
            `;
            out.appendChild(div);
        });
    },
    pushDay(i){
        const day = STATE.week.days[i];
        let c=0;
        day.forEach(s=>{
            if(!STATE.today.find(x=>x.id===s.id)){ STATE.today.push({...s}); c++; }
        });
        saveStorage();
        notify(`Added ${c} stops to Today.`);
    }
};

/* =========================
   OCR
========================= */
const OCR = {
    cropper: null,
    reset(){
        document.getElementById('ocrImage').src = '';
        if(this.cropper) { this.cropper.destroy(); this.cropper=null; }
        document.getElementById('ocrText').value = '';
        ['ocrName','ocrAddr','ocrPhone','ocrEmail','ocrNotes'].forEach(id=>document.getElementById(id).value='');
        document.getElementById('ocrGeoStatus').innerText = '';
        document.getElementById('ocrFile').value = '';
    },
    loadFile(file){
        if(!file) return;
        const url = URL.createObjectURL(file);
        const img = document.getElementById('ocrImage');
        img.src = url;
        img.onload = () => {
            if(this.cropper) this.cropper.destroy();
            this.cropper = new Cropper(img, { viewMode:1, autoCropArea:1 });
        }
    },
    async cropAndOCR(){
        if(!this.cropper) return notify('No image');
        document.getElementById('ocrProgress').classList.remove('hidden');
        const canvas = this.cropper.getCroppedCanvas();
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        document.getElementById('ocrText').value = text;
        document.getElementById('ocrProgress').classList.add('hidden');
    },
    parseToLead(){
        const txt = document.getElementById('ocrText').value;
        const lines = txt.split('\n').map(l=>l.trim()).filter(l=>l.length>2);
        if(lines.length>0) document.getElementById('ocrName').value = lines[0];
        if(lines.length>1) {
            const addrLines = lines.slice(1,3).join(', ');
            document.getElementById('ocrAddr').value = addrLines.replace(/[^a-zA-Z0-9 ,.-]/g, '');
        }
    },
    async geocodeRefined(){
        const addr = document.getElementById('ocrAddr').value;
        const status = document.getElementById('ocrGeoStatus');
        status.innerText = 'Geocoding...';
        const geo = await geocode(addr);
        if(geo){
            document.getElementById('ocrAddr').value = geo.display;
            status.innerText = '✅ Verified';
            return geo;
        } else {
            status.innerText = '❌ Not Found';
            return null;
        }
    },
    async createLead(){
        const name = document.getElementById('ocrName').value;
        const addr = document.getElementById('ocrAddr').value;
        const pri = document.getElementById('ocrPriority').value;
        const notes = document.getElementById('ocrNotes').value;
        const addToday = document.getElementById('ocrAddToToday').checked;
        
        if(!name && !addr) return notify('Name/Address required');
        
        const geo = await geocode(addr);
        const lead = makeStop(name, addr, geo?.lat, geo?.lon, pri, {
            phone: document.getElementById('ocrPhone').value,
            email: document.getElementById('ocrEmail').value
        });
        lead.note = notes;
        
        STATE.book.leads.push(lead);
        if(addToday) STATE.today.push({...lead});
        
        saveStorage();
        notify('Saved!');
        this.reset();
    }
};

/* =========================
   ASSISTANT
========================= */
const Assistant = {
    selected: new Set(),
    ensureToday(){
        const d = new Date().toISOString().split('T')[0];
        if(STATE.assist.date !== d){
            if(STATE.assist.date) this.recordHistory(STATE.assist.date);
            STATE.assist.date = d;
            STATE.assist.counts = {};
            STATE.assist.freeVisits = [];
            saveStorage();
        }
    },
    recordHistory(date){
        STATE.assistHistory.push({ date, counts: {...STATE.assist.counts} });
        if(STATE.assistHistory.length > 30) STATE.assistHistory.shift();
    },
    toggleAction(btn){
        const k = btn.dataset.key;
        if(this.selected.has(k)) { this.selected.delete(k); btn.classList.remove('active'); }
        else { this.selected.add(k); btn.classList.add('active'); }
    },
    clearSelections(){
        this.selected.clear();
        document.querySelectorAll('.toggle').forEach(b=>b.classList.remove('active'));
    },
    submitStop(){
        if(!this.selected.size) return;
        this.ensureToday();
        const actions = [...this.selected];
        
        actions.forEach(k => {
            STATE.assist.counts[k] = (STATE.assist.counts[k]||0) + 1;
        });

        const stop = getCurrentStop();
        const entry = { time: new Date().toISOString(), actions, note: '' };
        
        if(stop){
            stop.visitHistory.push(entry);
            stop.lastOutcome = actions[actions.length-1];
        } else {
            STATE.assist.freeVisits.push(entry);
        }

        const logMsg = `${new Date().toLocaleTimeString()} - ${actions.join(', ')} @ ${stop ? stop.name : 'Free Roam'}`;
        const li = document.createElement('li'); li.innerText = logMsg;
        document.getElementById('log').prepend(li);

        this.clearSelections();
        this.updateDisplay();
        Today.render();
        saveStorage();
    },
    updateDisplay(){
        this.ensureToday();
        const c = STATE.assist.counts;
        const box = document.getElementById('assistMini');
        
        const keys = ['doorKnock','qualityConversation','appointmentSet'];
        const labels = {'doorKnock':'Doors', 'qualityConversation':'Convos', 'appointmentSet':'Appts'};
        box.innerHTML = keys.map(k=>`
            <div class="bg-slate-800 rounded p-2 border border-slate-700">
                <div class="text-xs text-gray-400 uppercase">${labels[k]}</div>
                <div class="text-xl font-bold text-accent-500">${c[k]||0}</div>
            </div>
        `).join('');
        
        const histDiv = document.getElementById('assistantStreaks');
        histDiv.innerHTML = `<div class="text-xs text-gray-400 mt-2">History entries: ${STATE.assistHistory.length}</div>`;

        updateCurrentStopBanners();
        this.renderDailyBrief();
    },
    renderDailyBrief(){
        const c = STATE.assist.counts;
        const goals = STATE.assist.goals;
        const dn = c.doorKnock||0;
        const ap = c.appointmentSet||0;
        
        let msg = "Let's get moving.";
        if(dn > 0) {
            msg = `${dn} doors knocked. ${ap} appointments. `;
            if(dn >= goals.doorKnock) msg += "Door goal hit! ";
            else msg += `${goals.doorKnock - dn} more doors to goal.`;
        }
        document.getElementById('assistantDailyBrief').innerText = msg;
    },
    copyTodaySummary(){
        const c = STATE.assist.counts;
        const txt = `Update ${STATE.assist.date}:\nDoors: ${c.doorKnock||0}\nConvos: ${c.qualityConversation||0}\nAppts: ${c.appointmentSet||0}`;
        navigator.clipboard.writeText(txt).then(()=>notify('Copied summary'));
    },
    copy7DaySummary(){
        notify('7 Day Summary copied (placeholder)'); 
    },
    resetDailyMetrics(){
        if(confirm('Start fresh for today? This zeros out today\'s counters.')){
            STATE.assist.counts = {};
            saveStorage();
            this.updateDisplay();
        }
    }
};

/* =========================
   SETTINGS
========================= */
const Settings = {
    async saveHome(){
        const homeInput = document.getElementById('homeInput');
        const val = homeInput ? String(homeInput.value||'').trim() : '';
        if(!val){
            notify('Please enter a Home Base address.');
            return;
        }
        const geo = await geocode(val);
        if(geo){
            STATE.settings.home = geo;
            saveStorage();
            // Normalize input to the resolved display string
            if(homeInput) homeInput.value = geo.display || val;
            notify('Home Base Saved.');
        } else {
            notify('Could not locate address.');
        }
    },
    clearAll(){
        if(confirm('WARNING: This will delete ALL data. Are you sure?')){
            try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
            location.reload();
        }
    },
    downloadBackup(){
        let raw = "";
        try{ raw = localStorage.getItem(STORAGE_KEY) || ""; }catch(e){ raw = ""; }
        if(!raw){
          notify('No backup data found yet. Add a stop first, then export.');
          return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(raw);
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "ubr_backup_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        dlAnchorElem.remove();
    }
};

/* =========================
   SPLASH CONTROL
========================= */
const Splash = {
  next(){
    const s1 = document.getElementById('splash1');
    const s2 = document.getElementById('splash2');
    if(!s1 || !s2) return;
    s1.classList.add('hidden');
    s2.classList.remove('hidden');
  },
  back(){
    const s1 = document.getElementById('splash1');
    const s2 = document.getElementById('splash2');
    if(!s1 || !s2) return;
    s2.classList.add('hidden');
    s1.classList.remove('hidden');
  },
  close(skip){
    const overlay = document.getElementById('splashOverlay');
    if(overlay) overlay.classList.add('hidden');
    if(skip){
      try { localStorage.setItem(SPLASH_KEY, '1'); } catch(e){}
    }
    // If the map was initialized while the splash overlay was covering the
    // viewport, Leaflet may render a blank/gray tile area until invalidateSize()
    // is called after the map becomes visible. This is a common mobile/tablet
    // symptom when a fixed overlay sits above the map during init.
    setTimeout(function(){
      try{
        if(map && typeof map.invalidateSize === 'function') map.invalidateSize();
      }catch(e){}
    }, 250);
  },
  init(){
    const overlay = document.getElementById('splashOverlay');
    if(!overlay) return;
    let seen = null;
    try { seen = localStorage.getItem(SPLASH_KEY); } catch(e){}
    if(seen === '1'){
      overlay.classList.add('hidden');
    } else {
      // "Tap anywhere to enter" must actually work.
      overlay.addEventListener('click', function(){
        Splash.close(true);
      }, {passive:true});
      overlay.addEventListener('touchend', function(){
        Splash.close(true);
      }, {passive:true});
    }
  }
};

/* =========================
   UI & INIT
========================= */
function updateCurrentStopBanners(){
    const s = getCurrentStop();
    const txt = s ? `Current: ${s.name}` : 'No Stop Selected';
    document.getElementById('currentStopTodayBanner').innerText = txt;
    document.getElementById('currentStopBanner').innerText = txt;
}

function showPage(id){
    document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('page-' + id);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('#mainNav .btn').forEach(btn => {
        if(btn.dataset.target === id) btn.classList.add('nav-active');
        else btn.classList.remove('nav-active');
    });

    if(id === 'today' && map) {
        setTimeout(() => map.invalidateSize(), 200);
    }
}

(function(){
  function waitForLeaflet(cb){
    var start = Date.now();
    (function tick(){
      if(window.L && typeof window.L.map === 'function') return cb();
      if(Date.now() - start > 8000){
        console.warn('[UBR] Leaflet did not load within 8s; retrying after DOM ready.');
        return cb();
      }
      requestAnimationFrame(tick);
    })();
  }

  function boot(){
    const continueBoot = () => {
    loadStorage();

    const homeInput = document.getElementById('homeInput');
    if(STATE.settings.home && homeInput) homeInput.value = STATE.settings.home.display;
    const devNotesEl = document.getElementById('devNotes');
    if(devNotesEl){
      if(STATE.dev.notes) devNotesEl.value = STATE.dev.notes;

      devNotesEl.addEventListener('input', (e)=>{
      STATE.dev.notes = e.target.value;
      saveStorage();
    });
    }

    Book.active = 'leads';
    Today.render();
    Assistant.updateDisplay();

    showPage('today');
    Splash.init();

    // Ensure map paints on first load (tablet-safe)
    try{ if(window.L) Today.drawMap(); }catch(e){ console.warn('[UBR] drawMap init failed', e); }
    if(map){ setTimeout(()=>{ try{ map.invalidateSize(); }catch(e){} }, 250); }
  
    };

    (async ()=>{
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw && window.NexusAppData?.loadLatest){
          const remote = await window.NexusAppData.loadLatest("ubr");
          if(remote && remote.payload){
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.payload));
          }
        }
      }catch(_e){}
      continueBoot();
    })();
}

  document.addEventListener('DOMContentLoaded', function(){
    waitForLeaflet(boot);
  });
})();
