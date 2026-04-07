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
  loads: [],
  ocrReview: null,
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

function normalizeLoads(arr){
  if(!Array.isArray(arr)) return;
  arr.forEach(load => {
    if(!load) return;
    if(!Array.isArray(load.corrections)) load.corrections = [];
    if(!Array.isArray(load.exceptions)) load.exceptions = [];
    if(!Array.isArray(load.reviewReasons)) load.reviewReasons = [];
    if(!('validationState' in load)) load.validationState = 'draft';
    if(!('confidence' in load)) load.confidence = 0;
    if(!('queueBucket' in load)) load.queueBucket = 'review';
    if(!('routeMetrics' in load)) load.routeMetrics = null;
    if(!('originGeo' in load)) load.originGeo = null;
    if(!('destinationGeo' in load)) load.destinationGeo = null;
    if(!('createdAt' in load)) load.createdAt = new Date().toISOString();
    hydrateLoadState(load);
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
    if (Array.isArray(data?.loads)) STATE.loads = data.loads;
    if (data?.ocrReview) STATE.ocrReview = data.ocrReview;
    if (data?.dev?.notes) STATE.dev.notes = data.dev.notes;
    if (data?.assist){
      STATE.assist = { ...STATE.assist, ...data.assist };
    }
    if (Array.isArray(data?.assistHistory)) STATE.assistHistory = data.assistHistory;
    
    normalizeStops(STATE.today);
    ['clients','leads','archived'].forEach(k=> normalizeStops(STATE.book[k]));
    normalizeLoads(STATE.loads);
    if(STATE.ocrReview) hydrateLoadState(STATE.ocrReview);
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
      loads: STATE.loads,
      ocrReview: STATE.ocrReview,
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

function makeLoadObject(fields = {}){
  return {
    id: fields.id || uuid(),
    source: fields.source || 'ocr',
    confidence: fields.confidence || 0,
    validationState: fields.validationState || 'draft',
    origin: fields.origin || '',
    destination: fields.destination || '',
    rate: fields.rate || '',
    commodity: fields.commodity || '',
    weight: fields.weight || '',
    pickupWindow: fields.pickupWindow || '',
    deliveryWindow: fields.deliveryWindow || '',
    exceptionNotes: fields.exceptionNotes || '',
    corrections: Array.isArray(fields.corrections) ? fields.corrections : [],
    exceptions: Array.isArray(fields.exceptions) ? fields.exceptions : [],
    reviewReasons: Array.isArray(fields.reviewReasons) ? fields.reviewReasons : [],
    queueBucket: fields.queueBucket || 'review',
    routeMetrics: fields.routeMetrics || null,
    originGeo: fields.originGeo || null,
    destinationGeo: fields.destinationGeo || null,
    createdAt: fields.createdAt || new Date().toISOString()
  };
}

function parseMoney(value){
  const num = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function parseWeight(value){
  const num = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function extractField(lines, patterns){
  for(const line of lines){
    for(const pattern of patterns){
      const match = line.match(pattern);
      if(match && match[1]) return match[1].trim();
    }
  }
  return '';
}

function detectValidationState(load){
  const required = [load.origin, load.destination, load.rate];
  const missing = required.filter(v => !String(v || '').trim()).length;
  if(missing >= 1) return 'exception';
  if((load.exceptions?.length || 0) > 0) return 'exception';
  if(load.confidence < 70) return 'needs-review';
  if(!String(load.pickupWindow || '').trim() || !String(load.deliveryWindow || '').trim()) return 'needs-review';
  return 'validated';
}

function confidenceBadge(conf){
  if(conf >= 85) return { label: `High ${conf}%`, cls: 'ok' };
  if(conf >= 65) return { label: `Medium ${conf}%`, cls: 'warn' };
  return { label: `Low ${conf}%`, cls: 'low' };
}

function startPointForLoadRouting(){
  const currentStop = getCurrentStop();
  if(currentStop?.lat != null && currentStop?.lon != null) return currentStop;
  if(STATE.settings.home?.lat != null && STATE.settings.home?.lon != null) return STATE.settings.home;
  return STATE.today.find(s => s?.lat != null && s?.lon != null) || null;
}

function explainRiskLevel(score){
  if(score >= 66) return { label: 'High', cls: 'warn' };
  if(score >= 36) return { label: 'Medium', cls: 'low' };
  return { label: 'Low', cls: 'ok' };
}

function collectReviewReasons(load){
  const reasons = [];
  if(!String(load.origin || '').trim()) reasons.push('Missing pickup origin');
  if(!String(load.destination || '').trim()) reasons.push('Missing delivery destination');
  if(!String(load.rate || '').trim()) reasons.push('Missing linehaul rate');
  if(load.confidence < 70) reasons.push('OCR confidence below dispatch threshold');
  if(load.exceptions?.length) reasons.push(...load.exceptions.filter(Boolean));
  if(load.corrections?.length) reasons.push(`Manual corrections: ${load.corrections.join(', ')}`);
  if(!load.pickupWindow) reasons.push('Pickup window not confirmed');
  if(!load.deliveryWindow) reasons.push('Delivery window not confirmed');
  return Array.from(new Set(reasons));
}

function determineQueueBucket(load){
  if(load.validationState === 'exception') return 'exception';
  if(load.validationState === 'validated') return 'ready';
  return 'review';
}

function hydrateLoadState(load){
  if(!load) return load;
  load.validationState = detectValidationState(load);
  load.reviewReasons = collectReviewReasons(load);
  load.queueBucket = determineQueueBucket(load);
  return load;
}

function computeRouteMetrics(load){
  if(!load) return null;
  const miPerM = 1 / 1609.34;
  const rateValue = parseMoney(load.rate);
  const weightValue = parseWeight(load.weight);
  const currentStart = startPointForLoadRouting();
  const laneMiles = load.originGeo && load.destinationGeo
    ? haversineMeters(load.originGeo, load.destinationGeo) * miPerM * 1.16
    : 0;
  const deadheadMiles = currentStart && load.originGeo
    ? haversineMeters(currentStart, load.originGeo) * miPerM * 1.1
    : 0;
  const weightRisk = weightValue >= 44000 ? 14 : weightValue >= 38000 ? 8 : 3;
  const windowRisk = (!load.pickupWindow ? 10 : 0) + (!load.deliveryWindow ? 10 : 0);
  const exceptionRisk = (load.exceptions?.length || 0) * 12;
  const correctionRisk = (load.corrections?.length || 0) * 5;
  const commodityText = String(load.commodity || '').toLowerCase();
  let commodityRisk = 5;
  const riskDrivers = [];
  if(/hazmat|haz|flammable/.test(commodityText)){
    commodityRisk += 22;
    riskDrivers.push('Hazmat handling');
  }
  if(/produce|reefer|frozen|temp/.test(commodityText)){
    commodityRisk += 12;
    riskDrivers.push('Temperature-sensitive freight');
  }
  if(weightValue >= 44000) riskDrivers.push('Heavy payload');
  if(!load.pickupWindow || !load.deliveryWindow) riskDrivers.push('Schedule windows incomplete');
  if(load.exceptions?.length) riskDrivers.push('Open extraction exceptions');
  const riskScore = Math.min(100, 12 + weightRisk + windowRisk + exceptionRisk + correctionRisk + commodityRisk);
  const operatingCostPerMile = 1.78 + (weightValue ? Math.min(weightValue / 50000, 1) * 0.42 : 0.18);
  const allMiles = laneMiles + deadheadMiles;
  const marginDollars = rateValue ? Math.max(0, rateValue - (allMiles * operatingCostPerMile)) : 0;
  const marginPerMile = allMiles > 0 ? marginDollars / allMiles : 0;
  const routeMetrics = {
    laneMiles,
    deadheadMiles,
    allMiles,
    rateValue,
    weightValue,
    riskScore,
    riskDrivers,
    operatingCostPerMile,
    marginDollars,
    marginPerMile
  };
  load.routeMetrics = routeMetrics;
  return routeMetrics;
}

function formatDistanceMiles(value){
  if(!Number.isFinite(value) || value <= 0) return 'Pending';
  return `${Math.round(value)} mi`;
}

function buildStrategyOptions(load){
  const metrics = load?.routeMetrics || computeRouteMetrics(load);
  if(!load || !metrics) return [];
  const baseRisk = metrics.riskScore;
  const options = [
    {
      id: 'margin',
      name: 'Margin Guard',
      summary: 'Keep the load only if payout stays ahead of reposition cost.',
      why: metrics.deadheadMiles > 0 ? 'Accepts some repositioning to preserve gross margin.' : 'Lane is already aligned with the current route base.',
      marginDollars: metrics.marginDollars,
      laneMiles: metrics.laneMiles * 1.02,
      deadheadMiles: metrics.deadheadMiles * 1.12,
      riskScore: Math.min(100, baseRisk + 8)
    },
    {
      id: 'balanced',
      name: 'Balanced Dispatch',
      summary: 'Most defensible option across payout, service, and repositioning.',
      why: 'Keeps linehaul and empty miles close to the reviewed baseline.',
      marginDollars: Math.max(0, metrics.marginDollars - 70),
      laneMiles: metrics.laneMiles,
      deadheadMiles: metrics.deadheadMiles,
      riskScore: baseRisk
    },
    {
      id: 'deadhead',
      name: 'Deadhead Cut',
      summary: 'Protect empty miles first, even if gross upside shrinks.',
      why: metrics.deadheadMiles > 0 ? 'Most useful when the truck is far from pickup.' : 'Minimal repositioning is already available.',
      marginDollars: Math.max(0, metrics.marginDollars - 140),
      laneMiles: metrics.laneMiles * 0.97,
      deadheadMiles: metrics.deadheadMiles * 0.58,
      riskScore: Math.max(8, baseRisk - 6)
    }
  ];
  options.forEach(option => {
    option.allMiles = option.laneMiles + option.deadheadMiles;
    option.marginPerMile = option.allMiles > 0 ? option.marginDollars / option.allMiles : 0;
  });
  return options;
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

      const miPerM = 1/1609.34;
      const mphCity = 25;
      const stopOverheadMin = 2;
      const currentStop = getCurrentStop();
      let startPoint = null;
      if(currentStop?.lat != null && currentStop?.lon != null) startPoint = currentStop;
      else if(STATE.settings.home?.lat != null && STATE.settings.home?.lon != null) startPoint = STATE.settings.home;
      else startPoint = geoStops[0] || null;

      let miles = 0;
      const orderedGeo = STATE.today.filter(s=>s?.lat != null && s?.lon != null);
      if(startPoint && orderedGeo.length){
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
      const preferredLoad = STATE.loads.find(load => load.queueBucket === 'ready') || STATE.loads[0] || null;
      let strategyHtml = `<div class="text-xs text-gray-500">No reviewed load object yet — use Lead Scanner to extract one.</div>`;
      if(preferredLoad){
        hydrateLoadState(preferredLoad);
        const routeMetrics = computeRouteMetrics(preferredLoad);
        const strategies = buildStrategyOptions(preferredLoad);
        const leaders = strategies.length ? {
          margin: strategies.reduce((best, current) => current.marginDollars > best.marginDollars ? current : best, strategies[0]).id,
          distance: strategies.reduce((best, current) => current.laneMiles < best.laneMiles ? current : best, strategies[0]).id,
          deadhead: strategies.reduce((best, current) => current.deadheadMiles < best.deadheadMiles ? current : best, strategies[0]).id,
          risk: strategies.reduce((best, current) => current.riskScore < best.riskScore ? current : best, strategies[0]).id
        } : { margin:'', distance:'', deadhead:'', risk:'' };
        const riskMeta = explainRiskLevel(routeMetrics?.riskScore || 0);
        const queueBadgeCls = preferredLoad.queueBucket === 'ready' ? 'ok' : preferredLoad.queueBucket === 'exception' ? 'warn' : 'low';
        strategyHtml = `
          <div class="text-sm font-bold text-white mb-2">Load Strategy Compare</div>
          <div class="text-[0.72rem] text-gray-400 mb-2">Using ${preferredLoad.queueBucket === 'ready' ? 'latest routable load' : 'latest reviewed load'}: ${escapeHtml(preferredLoad.origin || 'Unknown origin')} → ${escapeHtml(preferredLoad.destination || 'Unknown destination')}</div>
          <div class="row mb-3">
            <span class="badge ${queueBadgeCls}">${escapeHtml(preferredLoad.queueBucket)}</span>
            <span class="badge ${riskMeta.cls}">${riskMeta.label} operational risk</span>
            <span class="badge ${routeMetrics?.deadheadMiles > 120 ? 'warn' : routeMetrics?.deadheadMiles > 0 ? 'low' : 'ok'}">${formatDistanceMiles(routeMetrics?.deadheadMiles)} deadhead baseline</span>
          </div>
          ${preferredLoad.queueBucket !== 'ready' ? `<div class="text-xs text-amber-300 mb-3">Routing is still gated by the ${escapeHtml(preferredLoad.queueBucket)} queue. Clear the open review reasons before treating any option as approved.</div>` : ''}
          ${routeMetrics && (routeMetrics.laneMiles || routeMetrics.deadheadMiles) ? `
            <div class="text-[0.72rem] text-slate-400 mb-3">
              Reviewed baseline: ${formatDistanceMiles(routeMetrics.laneMiles)} linehaul • ${formatDistanceMiles(routeMetrics.deadheadMiles)} deadhead • ${routeMetrics.rateValue ? `$${Math.round(routeMetrics.marginDollars).toLocaleString()} est. margin` : 'Rate missing for margin estimate'}
            </div>
          ` : `
            <div class="text-[0.72rem] text-slate-400 mb-3">Distance metrics will sharpen after pickup and delivery locations resolve to map coordinates.</div>
          `}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            ${strategies.map(s => {
              const optionRisk = explainRiskLevel(s.riskScore);
              return `
                <div class="route-kpi">
                  <div class="flex justify-between items-start gap-2">
                    <div class="route-k">${s.name}</div>
                    <div class="flex flex-wrap justify-end gap-1">
                      ${leaders.margin === s.id ? '<span class="badge ok">Best margin</span>' : ''}
                      ${leaders.distance === s.id ? '<span class="badge low">Shortest lane</span>' : ''}
                      ${leaders.deadhead === s.id ? '<span class="badge ok">Least deadhead</span>' : ''}
                      ${leaders.risk === s.id ? '<span class="badge ok">Lowest risk</span>' : ''}
                    </div>
                  </div>
                  <div class="route-v">${s.marginDollars ? `$${Math.round(s.marginDollars).toLocaleString()}` : 'Pending'}</div>
                  <div class="text-[0.68rem] text-slate-300 mt-1">${s.summary}</div>
                  <div class="text-[0.68rem] text-slate-500 mt-1">${s.why}</div>
                  <div class="grid grid-cols-2 gap-2 mt-3 text-[0.68rem]">
                    <div><div class="route-k">Margin / mi</div><div class="text-white font-semibold">${s.marginPerMile ? `$${s.marginPerMile.toFixed(2)}` : 'Pending'}</div></div>
                    <div><div class="route-k">Distance</div><div class="text-white font-semibold">${formatDistanceMiles(s.laneMiles)}</div></div>
                    <div><div class="route-k">Deadhead</div><div class="text-white font-semibold">${formatDistanceMiles(s.deadheadMiles)}</div></div>
                    <div><div class="route-k">Risk</div><div class="text-white font-semibold"><span class="badge ${optionRisk.cls}">${optionRisk.label}</span></div></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ${routeMetrics?.riskDrivers?.length ? `<div class="text-[0.7rem] text-slate-400 mt-3">Risk drivers: ${escapeHtml(routeMetrics.riskDrivers.join(' • '))}</div>` : ''}
        `;
      }

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
          <div class="card bg-slate-900/60 border border-slate-700">${strategyHtml}</div>
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
        ['loadOrigin','loadDestination','loadRate','loadCommodity','loadWeight','loadPickupWindow','loadDeliveryWindow','loadExceptions','loadValidationState'].forEach(id=>{
          const el = document.getElementById(id);
          if(el) el.value='';
        });
        const panel = document.getElementById('loadReviewPanel');
        if(panel) panel.classList.add('hidden');
        const badges = document.getElementById('loadReviewBadges');
        if(badges) badges.innerHTML = '';
        const reviewStatus = document.getElementById('loadReviewStatus');
        if(reviewStatus) reviewStatus.innerText = 'No structured extraction yet.';
        STATE.ocrReview = null;
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
    extractLoadReview(){
        const txt = document.getElementById('ocrText').value || '';
        if(!txt.trim()) return notify('Scan text first.');
        const lines = txt.split('\n').map(l=>l.trim()).filter(Boolean);
        const routeLine = lines.find(line => /\bto\b/i.test(line) && /,/.test(line)) || '';
        const routeParts = routeLine ? routeLine.split(/\bto\b/i).map(v=>v.trim()) : [];
        const origin = extractField(lines, [/origin[:\-]\s*(.+)$/i, /pickup[:\-]\s*(.+)$/i]) || routeParts[0] || '';
        const destination = extractField(lines, [/destination[:\-]\s*(.+)$/i, /delivery[:\-]\s*(.+)$/i]) || routeParts[1] || '';
        const rate = extractField(lines, [/rate[:\-]?\s*(\$?[\d,]+(?:\.\d{2})?)/i, /linehaul[:\-]?\s*(\$?[\d,]+(?:\.\d{2})?)/i]);
        const commodity = extractField(lines, [/commodity[:\-]\s*(.+)$/i, /equipment[:\-]\s*(.+)$/i, /load[:\-]\s*(.+)$/i]);
        const weight = extractField(lines, [/weight[:\-]?\s*([\d,]+\s?(?:lb|lbs)?)/i]);
        const pickupWindow = extractField(lines, [/pickup (?:date|window)[:\-]\s*(.+)$/i, /pu[:\-]\s*(.+)$/i]);
        const deliveryWindow = extractField(lines, [/delivery (?:date|window)[:\-]\s*(.+)$/i, /del[:\-]\s*(.+)$/i]);

        let confidence = 35;
        [origin, destination, rate, commodity, weight].forEach(v => { if(String(v || '').trim()) confidence += 12; });
        if(routeLine) confidence += 8;
        confidence = Math.min(confidence, 96);

        const exceptions = [];
        if(!origin) exceptions.push('Missing pickup origin');
        if(!destination) exceptions.push('Missing delivery destination');
        if(!rate) exceptions.push('Missing linehaul rate');

        const load = makeLoadObject({
          confidence,
          origin,
          destination,
          rate,
          commodity,
          weight,
          pickupWindow,
          deliveryWindow,
          exceptions,
          exceptionNotes: exceptions.join('; ')
        });
        hydrateLoadState(load);
        STATE.ocrReview = load;
        this.renderLoadReview();
        saveStorage();
        notify('Structured load extracted.');
    },
    renderLoadReview(){
        const load = STATE.ocrReview;
        const panel = document.getElementById('loadReviewPanel');
        if(!panel) return;
        if(!load){
          panel.classList.add('hidden');
          return;
        }
        hydrateLoadState(load);
        computeRouteMetrics(load);
        panel.classList.remove('hidden');
        document.getElementById('loadOrigin').value = load.origin || '';
        document.getElementById('loadDestination').value = load.destination || '';
        document.getElementById('loadRate').value = load.rate || '';
        document.getElementById('loadCommodity').value = load.commodity || '';
        document.getElementById('loadWeight').value = load.weight || '';
        document.getElementById('loadPickupWindow').value = load.pickupWindow || '';
        document.getElementById('loadDeliveryWindow').value = load.deliveryWindow || '';
        document.getElementById('loadExceptions').value = load.exceptionNotes || '';
        document.getElementById('loadValidationState').value = load.validationState || '';
        const conf = confidenceBadge(load.confidence || 0);
        const queueLabel = load.queueBucket || determineQueueBucket(load);
        document.getElementById('loadReviewBadges').innerHTML = `
          <span class="badge ${conf.cls}">${conf.label}</span>
          <span class="badge ${queueLabel === 'ready' ? 'ok' : queueLabel === 'exception' ? 'warn' : 'low'}">${queueLabel}</span>
          <span class="badge ${load.validationState === 'validated' ? 'ok' : load.validationState === 'exception' ? 'warn' : 'low'}">${load.validationState}</span>
          ${(load.reviewReasons || []).length ? `<span class="badge warn">${load.reviewReasons.length} review item${load.reviewReasons.length > 1 ? 's' : ''}</span>` : '<span class="badge ok">No open review items</span>'}
        `;
        document.getElementById('loadReviewStatus').innerText =
          queueLabel === 'ready'
            ? 'Ready queue: this load can feed routing once you save it.'
            : queueLabel === 'exception'
              ? 'Exception queue: routing blocked until required fields are corrected.'
              : 'Review queue: confirm the open items before routing.';
    },
    async saveLoadObject(){
        const load = makeLoadObject({
          ...(STATE.ocrReview || {}),
          origin: document.getElementById('loadOrigin').value.trim(),
          destination: document.getElementById('loadDestination').value.trim(),
          rate: document.getElementById('loadRate').value.trim(),
          commodity: document.getElementById('loadCommodity').value.trim(),
          weight: document.getElementById('loadWeight').value.trim(),
          pickupWindow: document.getElementById('loadPickupWindow').value.trim(),
          deliveryWindow: document.getElementById('loadDeliveryWindow').value.trim(),
          exceptionNotes: document.getElementById('loadExceptions').value.trim()
        });
        const corrections = [];
        if(STATE.ocrReview){
          ['origin','destination','rate','commodity','weight','pickupWindow','deliveryWindow'].forEach(key => {
            if((STATE.ocrReview[key] || '') !== (load[key] || '')) corrections.push(key);
          });
        }
        if(corrections.length) load.corrections = corrections;
        load.exceptions = [];
        if(!load.origin) load.exceptions.push('Missing pickup origin');
        if(!load.destination) load.exceptions.push('Missing delivery destination');
        if(!load.rate) load.exceptions.push('Missing linehaul rate');
        const [originGeo, destinationGeo] = await Promise.all([
          load.origin ? geocode(load.origin) : Promise.resolve(null),
          load.destination ? geocode(load.destination) : Promise.resolve(null)
        ]);
        load.originGeo = originGeo ? { lat: originGeo.lat, lon: originGeo.lon, display: originGeo.display } : null;
        load.destinationGeo = destinationGeo ? { lat: destinationGeo.lat, lon: destinationGeo.lon, display: destinationGeo.display } : null;
        if(load.origin && !load.originGeo) load.exceptions.push('Pickup location did not resolve on map');
        if(load.destination && !load.destinationGeo) load.exceptions.push('Delivery location did not resolve on map');
        load.confidence = Math.max(load.confidence || 0, load.exceptions.length ? 64 : 82);
        hydrateLoadState(load);
        computeRouteMetrics(load);
        load.exceptionNotes = [
          ...load.exceptions,
          ...load.reviewReasons.filter(reason => !load.exceptions.includes(reason))
        ].join('; ');
        STATE.ocrReview = load;
        STATE.loads = [load, ...STATE.loads.filter(item => item.id !== load.id)].slice(0, 10);
        saveStorage();
        this.renderLoadReview();
        renderLoadQueue();
        Today.renderSummary();
        notify('Load object saved.');
    },
    loadSavedLoad(id){
        const load = STATE.loads.find(item => item.id === id);
        if(!load) return;
        STATE.ocrReview = makeLoadObject(load);
        hydrateLoadState(STATE.ocrReview);
        this.renderLoadReview();
        showPage('ocr');
        notify('Load opened for review.');
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
        renderLoadQueue();
        this.reset();
    }
};

function renderLoadQueue(){
    const el = document.getElementById('loadQueue');
    if(!el) return;
    if(!STATE.loads.length){
      el.innerHTML = '<div class="text-xs text-gray-500">No saved load objects yet.</div>';
      return;
    }
    STATE.loads.forEach(load => {
      hydrateLoadState(load);
      computeRouteMetrics(load);
    });
    const buckets = {
      ready: STATE.loads.filter(load => load.queueBucket === 'ready'),
      review: STATE.loads.filter(load => load.queueBucket === 'review'),
      exception: STATE.loads.filter(load => load.queueBucket === 'exception')
    };
    const renderCard = (load) => {
      const conf = confidenceBadge(load.confidence || 0);
      const riskMeta = explainRiskLevel(load.routeMetrics?.riskScore || 0);
      return `
        <div class="card bg-slate-900 border-slate-700">
          <div class="row items-start">
            <div class="grow">
              <div class="font-bold text-sm text-white">${escapeHtml(load.origin || 'Unknown origin')} → ${escapeHtml(load.destination || 'Unknown destination')}</div>
              <div class="text-xs text-slate-400 mt-1">${escapeHtml(load.commodity || 'Commodity pending')} · ${escapeHtml(load.weight || 'Weight pending')} · ${escapeHtml(load.rate || 'Rate pending')}</div>
              <div class="text-[0.7rem] text-slate-500 mt-1">Corrections: ${(load.corrections || []).length} · ${new Date(load.createdAt).toLocaleString()}</div>
              <div class="text-[0.7rem] text-slate-400 mt-2">Linehaul ${formatDistanceMiles(load.routeMetrics?.laneMiles)} • Deadhead ${formatDistanceMiles(load.routeMetrics?.deadheadMiles)} • Risk ${riskMeta.label}</div>
            </div>
            <div class="row">
              <span class="badge ${conf.cls}">${conf.label}</span>
              <span class="badge ${load.queueBucket === 'ready' ? 'ok' : load.queueBucket === 'exception' ? 'warn' : 'low'}">${escapeHtml(load.queueBucket)}</span>
            </div>
          </div>
          ${load.reviewReasons?.length ? `<div class="text-xs text-amber-300 mt-2">${escapeHtml(load.reviewReasons.join(' • '))}</div>` : ''}
          <div class="row mt-3">
            <button class="btn-mini" onclick="OCR.loadSavedLoad('${load.id}')">${load.queueBucket === 'ready' ? 'Inspect' : 'Review & Fix'}</button>
          </div>
        </div>
      `;
    };
    const renderSection = (title, subtitle, loads, badgeCls) => `
      <div class="space-y-2">
        <div class="row items-center">
          <span class="badge ${badgeCls}">${loads.length}</span>
          <div class="text-sm font-semibold text-white">${title}</div>
        </div>
        <div class="text-xs text-slate-400">${subtitle}</div>
        ${loads.length ? loads.map(renderCard).join('') : '<div class="text-xs text-slate-500">None in this queue.</div>'}
      </div>
    `;
    el.innerHTML = `
      <div class="row mb-2">
        <span class="badge ok">${buckets.ready.length} ready</span>
        <span class="badge low">${buckets.review.length} review</span>
        <span class="badge warn">${buckets.exception.length} exception</span>
      </div>
      ${renderSection('Ready Queue', 'Validated loads that can feed route comparison immediately.', buckets.ready, 'ok')}
      ${renderSection('Review Queue', 'Partially complete loads that need operator confirmation before dispatch.', buckets.review, 'low')}
      ${renderSection('Exception Queue', 'Routing-blocked loads with missing or suspicious data.', buckets.exception, 'warn')}
    `;
}

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
    renderLoadQueue();
    OCR.renderLoadReview();
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
