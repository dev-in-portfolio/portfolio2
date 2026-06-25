
(() => {
  const frame = document.getElementById("canvasFrame");

  const a = document.getElementById("ctlActivity");
  const m = document.getElementById("ctlMag");
  const s = document.getElementById("ctlSpin");
  const d = document.getElementById("ctlDepth");

  const va = document.getElementById("valActivity");
  const vm = document.getElementById("valMag");
  const vs = document.getElementById("valSpin");
  const vd = document.getElementById("valDepth");

  const tkMag = document.getElementById("tkMag");
  const tkAct = document.getElementById("tkAct");
  const tkSpin = document.getElementById("tkSpin");
  const tkStatus = document.getElementById("tkStatus");

  const chart = document.getElementById("miniChart");
  const ctx = chart ? chart.getContext("2d") : null;

  const feedEl = document.getElementById("quakeFeed");
  const feedNote = document.getElementById("feedNote");

  const history = [];
  const HIST_N = 60;

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function state(){
    return {
      activity: parseFloat(a.value),
      magnitude: parseFloat(m.value),
      spin: parseFloat(s.value),
      depthBias: parseFloat(d.value)
    };
  }

  function post(){
    if(!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type:"tectonic-control", ...state() }, "*");
  }

  function sync(){
    const st = state();
    va.textContent = st.activity.toFixed(2);
    vm.textContent = st.magnitude.toFixed(1);
    vs.textContent = st.spin.toFixed(2);
    vd.textContent = st.depthBias.toFixed(2);

    tkMag.textContent = "M" + st.magnitude.toFixed(1);
    tkAct.textContent = st.activity.toFixed(2);
    tkSpin.textContent = st.spin.toFixed(2);
  }

  function addHistory(){
    const st = state();
    const v = clamp(0.25 + 0.65*st.activity + 0.15*Math.sin(Date.now()*0.001) + 0.06*(Math.random()-0.5), 0, 1);
    history.push(v);
    while(history.length > HIST_N) history.shift();
    drawChart();
  }

  function drawChart(){
    if(!ctx) return;
    const w = chart.width, h = chart.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for(let i=1;i<5;i++){
      const y = (h*i)/5;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }

    if(history.length < 2) return;

    ctx.strokeStyle = "rgba(90,255,220,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<history.length;i++){
      const x = (w-8) * (i/(HIST_N-1)) + 4;
      const y = (h-10) * (1-history[i]) + 5;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(255,190,80,0.90)";
    for(let i=0;i<history.length;i++){
      if(history[i] > 0.85){
        const x = (w-8) * (i/(HIST_N-1)) + 4;
        const y = (h-10) * (1-history[i]) + 5;
        ctx.beginPath(); ctx.arc(x,y,2.6,0,Math.PI*2); ctx.fill();
      }
    }
  }

  [a,m,s,d].forEach(el => el && el.addEventListener("input", ()=>{sync(); post(); tkStatus.textContent="SIM"; }));

  sync();
  addHistory();
  setInterval(addHistory, 900);

  frame && frame.addEventListener("load", ()=>{ tkStatus.textContent="LIVE"; post(); });

  // Canvas ready ping
  window.addEventListener("message", (ev)=>{
    const msg = ev.data || {};
    if(msg.type === "tectonic-ready"){
      tkStatus.textContent="LIVE";
      post();
      return;
    }
    // Gesture updates from canvas (keep sliders in sync)
    if(msg.type === "tectonic-gesture" && msg.state){
      const st = msg.state;
      if(typeof st.activity === "number") a.value = String(clamp(st.activity, 0, 1));
      if(typeof st.magnitude === "number") m.value = String(clamp(st.magnitude, 3, 9.5));
      if(typeof st.spin === "number") s.value = String(clamp(st.spin, 0, 1));
      if(typeof st.depthBias === "number") d.value = String(clamp(st.depthBias, 0, 1));
      sync();
      tkStatus.textContent = "LIVE";
    }
  });

  // ---- "Missing something": USGS quake feed (with SIM fallback) ----
  function fmtAgo(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    if(s < 60) return s + "s";
    const m = Math.floor(s/60);
    if(m < 60) return m + "m";
    const h = Math.floor(m/60);
    if(h < 48) return h + "h";
    const d = Math.floor(h/24);
    return d + "d";
  }

  function renderFeed(items, mode){
    if(!feedEl) return;
    feedEl.innerHTML = "";
    if(feedNote) feedNote.textContent = mode === "LIVE" ? "USGS all-hour feed" : "SIM feed (offline / blocked)";
    const now = Date.now();

    items.slice(0,6).forEach(it => {
      const row = document.createElement("div");
      row.className = "feedRow";
      const mag = document.createElement("div");
      mag.className = "feedMag";
      mag.textContent = "M" + it.mag.toFixed(1);
      const meta = document.createElement("div");
      meta.className = "feedMeta";
      meta.innerHTML = `<div class="feedPlace">${it.place}</div><div class="feedTime">${fmtAgo(now - it.time)} ago</div>`;
      row.appendChild(mag);
      row.appendChild(meta);
      feedEl.appendChild(row);
    });
  }

  function simFeed(){
    const places = ["Aleutian Trench", "Chile coast", "Japan offshore", "Sumatra arc", "Alaska interior", "California ridge"];
    const now = Date.now();
    const base = parseFloat(m.value);
    const out = [];
    for(let i=0;i<10;i++){
      out.push({
        mag: clamp(base + (Math.random()-0.5)*1.2, 3.0, 8.8),
        place: places[(i + Math.floor(Math.random()*places.length))%places.length],
        time: now - (i*7 + Math.floor(Math.random()*5))*60_000
      });
    }
    return out;
  }

  async function loadUsgs(){
    // CORS is usually OK; if not, we fall back.
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 6500);
    try{
      const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if(!r.ok) throw new Error("HTTP "+r.status);
      const j = await r.json();
      const feats = (j && j.features) ? j.features : [];
      const items = feats.map(f => ({
        mag: (typeof f.properties.mag === "number" ? f.properties.mag : 0),
        place: String(f.properties.place || "Unknown"),
        time: Number(f.properties.time || Date.now())
      })).filter(x => isFinite(x.mag) && x.mag > 0).sort((a,b)=>b.time-a.time);
      renderFeed(items, "LIVE");
    } catch(e){
      renderFeed(simFeed(), "SIM");
    } finally {
      clearTimeout(t);
    }
  }

  // Feed styling (injected once)
  if(feedEl && !document.getElementById("feedStyle")){
    const st = document.createElement("style");
    st.id = "feedStyle";
    st.textContent = `
      .feedNote{color:rgba(255,255,255,.70); margin:4px 0 10px; line-height:1.4}
      .feed{display:grid; gap:10px}
      .feedRow{display:grid; grid-template-columns: 64px 1fr; gap:10px; padding:10px 10px; border-radius:16px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.05)}
      .feedMag{font-weight:950; color:rgba(255,190,80,.95); text-align:left}
      .feedMeta{display:flex; justify-content:space-between; gap:12px; align-items:baseline; flex-wrap:wrap}
      .feedPlace{color:rgba(255,255,255,.92)}
      .feedTime{color:rgba(255,255,255,.65)}
    `;
    document.head.appendChild(st);
  }

  loadUsgs();
  setInterval(loadUsgs, 120_000);
})();
