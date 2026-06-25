(() => {
  const frame = document.getElementById("canvasFrame");
  if(!frame) return;

  const ctlIntensity = document.getElementById("ctlIntensity");
  const ctlZoom      = document.getElementById("ctlZoom");
  const ctlBoost     = document.getElementById("ctlBoost");

  const valIntensity = document.getElementById("valIntensity");
  const valZoom      = document.getElementById("valZoom");
  const valBoost     = document.getElementById("valBoost");

  const btnErupt = document.getElementById("btnErupt");
  const btnBoostToggle = document.getElementById("btnBoostToggle");

  const tKp      = document.getElementById("tKp");
  const tWind    = document.getElementById("tWind");
  const tDensity = document.getElementById("tDensity");
  const tBz      = document.getElementById("tBz");
  const tXray    = document.getElementById("tXray");
  const tRisk    = document.getElementById("tRisk");

  const apiKp    = document.getElementById("apiKp");
  const apiWind  = document.getElementById("apiWind");
  const apiMag   = document.getElementById("apiMag");
  const apiXray  = document.getElementById("apiXray");

  // Guard: if controls are missing, don’t crash the page.
  if(!ctlIntensity || !ctlZoom || !ctlBoost) return;

  const state = {
    intensity: parseFloat(ctlIntensity.value),
    zoom: parseFloat(ctlZoom.value),
    boost: parseFloat(ctlBoost.value),
    eruptNow: false
  };

  function post(){
    // If iframe is mid-reload, contentWindow can be null.
    if(!frame.contentWindow) return;
    frame.contentWindow.postMessage({ type:"helios-control", ...state }, "*");
  }

  function syncLabels(){
    if(valIntensity) valIntensity.textContent = state.intensity.toFixed(2);
    if(valZoom)      valZoom.textContent      = state.zoom.toFixed(2);
    if(valBoost)     valBoost.textContent     = state.boost.toFixed(1);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function proxy(){
    const kp = 2.0 + state.intensity * 5.8;
    const wind = 360 + state.intensity*180 + (state.boost-1)*70;
    const density = 4 + state.intensity*8;
    const bz = -1.0 - state.intensity*6;
    const xray = Math.pow(10, -7 + state.intensity*2);
    return { kp, wind, density, bz, xray };
  }

  function stormRisk(kp, bz, wind){
    const bzFactor = clamp((-bz) / 10, 0, 1);
    const windFactor = clamp((wind-300)/500, 0, 1);
    const kpFactor = clamp(kp/9, 0, 1);
    return clamp(0.12 + 0.48*bzFactor + 0.25*windFactor + 0.15*kpFactor, 0, 1);
  }

  function setTelemetry({kp, wind, density, bz, xray}){
    if(tKp)      tKp.textContent = kp.toFixed(1);
    if(tWind)    tWind.textContent = wind.toFixed(0);
    if(tDensity) tDensity.textContent = density.toFixed(1);
    if(tBz)      tBz.textContent = bz.toFixed(1);
    if(tXray)    tXray.textContent = xray.toExponential(2);
    if(tRisk)    tRisk.textContent = Math.round(stormRisk(kp,bz,wind)*100) + "%";
  }

  function refreshProxy(){ setTelemetry(proxy()); }

  ctlIntensity.addEventListener("input", () => {
    state.intensity = parseFloat(ctlIntensity.value);
    syncLabels(); refreshProxy(); post();
  });
  ctlZoom.addEventListener("input", () => {
    state.zoom = parseFloat(ctlZoom.value);
    syncLabels(); refreshProxy(); post();
  });
  ctlBoost.addEventListener("input", () => {
    state.boost = parseFloat(ctlBoost.value);
    syncLabels(); refreshProxy(); post();
  });

  if(btnErupt){
    btnErupt.addEventListener("click", () => {
      state.eruptNow = true; post();
      setTimeout(() => { state.eruptNow = false; }, 50);
    });
  }

  if(btnBoostToggle){
    btnBoostToggle.addEventListener("click", () => {
      if(state.boost < 1.8){
        state.boost = 2.6;
        ctlBoost.value = "2.6";
        btnBoostToggle.textContent = "Normal";
      }else{
        state.boost = 1.0;
        ctlBoost.value = "1.0";
        btnBoostToggle.textContent = "Boost";
      }
      syncLabels(); refreshProxy(); post();
    });
  }

  syncLabels();
  refreshProxy();

  frame.addEventListener("load", () => post());

  async function fetchJson(url, ms=6500){
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try{
      const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if(!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function pullKp(){
    const url = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
    const data = await fetchJson(url);
    const last = data && data.length ? data[data.length-1] : null;
    const kp = last ? parseFloat(last.kp_index ?? last.kp ?? last.Kp ?? last[1]) : NaN;
    if(!isFinite(kp)) throw new Error("Kp parse fail");
    return kp;
  }

  async function pullPlasma(){
    const url = "https://services.swpc.noaa.gov/json/solar-wind/plasma-1-day.json";
    const data = await fetchJson(url);
    const last = data && data.length ? data[data.length-1] : null;
    const density = Array.isArray(last) ? parseFloat(last[1]) : parseFloat(last.density);
    const speed   = Array.isArray(last) ? parseFloat(last[2]) : parseFloat(last.speed ?? last.velocity ?? last.v);
    if(!isFinite(speed)) throw new Error("plasma parse fail");
    return { density, speed };
  }

  async function pullMag(){
    const url = "https://services.swpc.noaa.gov/json/solar-wind/mag-1-day.json";
    const data = await fetchJson(url);
    const last = data && data.length ? data[data.length-1] : null;
    const bz = Array.isArray(last) ? parseFloat(last[3]) : parseFloat(last.bz ?? last.Bz);
    if(!isFinite(bz)) throw new Error("mag parse fail");
    return { bz };
  }

  async function pullXray(){
    const url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
    const data = await fetchJson(url);
    const last = data && data.length ? data[data.length-1] : null;
    const flux = last ? parseFloat(last.flux ?? last.short ?? last.long) : NaN;
    if(!isFinite(flux)) throw new Error("xray parse fail");
    return { flux };
  }

  async function refreshApis(){
    const p = proxy();
    let kp=p.kp, wind=p.wind, density=p.density, bz=p.bz, xray=p.xray;

    try{ if(apiKp) apiKp.textContent="loading…"; kp = await pullKp(); if(apiKp) apiKp.textContent="ok"; }
    catch(e){ if(apiKp) apiKp.textContent="offline"; }

    try{ if(apiWind) apiWind.textContent="loading…"; const pl = await pullPlasma(); wind = pl.speed; density = pl.density; if(apiWind) apiWind.textContent="ok"; }
    catch(e){ if(apiWind) apiWind.textContent="offline"; }

    try{ if(apiMag) apiMag.textContent="loading…"; const mg = await pullMag(); bz = mg.bz; if(apiMag) apiMag.textContent="ok"; }
    catch(e){ if(apiMag) apiMag.textContent="offline"; }

    try{ if(apiXray) apiXray.textContent="loading…"; const xr = await pullXray(); xray = xr.flux; if(apiXray) apiXray.textContent="ok"; }
    catch(e){ if(apiXray) apiXray.textContent="offline"; }

    setTelemetry({kp, wind, density, bz, xray});
  }

  refreshApis();
  setInterval(refreshApis, 60_000);
})();
