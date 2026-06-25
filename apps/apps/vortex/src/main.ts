import * as THREE from 'three'

window.THREE = THREE;

(function () {
  const STORAGE_KEY = "vortex-v3-settings";

  const state: Record<string, any> = {
    asset: "BTC",
    themeColor: "#00ff9d",
    chartData: [] as number[],
    simMode: false,
    errorStreak: 0,
    tickCount: 0,
    volatility: { score: 0, label: "booting" },
    probeIndex: 0,
    liveModeAvailable: false,
    feeds: {} as Record<string, any>,
    audioEnabled: true
  };

  const BINANCE_SYMBOLS: Record<string, string> = {
    BTC: "btcusdt",
    ETH: "ethusdt",
    SOL: "solusdt"
  };

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch (e) {
    storage = null;
  }

  const assetColors: Record<string, string> = {
    BTC: "#00ff9d",
    ETH: "#4da6ff",
    SOL: "#9c6bff"
  };

  const chartCanvas = document.getElementById("chartCanvas") as HTMLCanvasElement | null;
  const logStream = document.getElementById("log-stream") as HTMLElement | null;
  const sessionLabelEl = document.getElementById("sessionLabel") as HTMLElement | null;
  const tickLabelEl = document.getElementById("tickLabel") as HTMLElement | null;
  const tickMetricEl = document.getElementById("tickMetric") as HTMLElement | null;
  const priceMainEl = document.getElementById("priceMain") as HTMLElement | null;
  const priceSubEl = document.getElementById("priceSub") as HTMLElement | null;
  const volPillEl = document.getElementById("volPill") as HTMLElement | null;
  const volLabelEl = document.getElementById("volLabel") as HTMLElement | null;
  const volMetricEl = document.getElementById("volMetric") as HTMLElement | null;
  const modePillEl = document.getElementById("modePill") as HTMLElement | null;
  const modeLabelEl = document.getElementById("modeLabel") as HTMLElement | null;
  const vortexMetricEl = document.getElementById("vortexMetric") as HTMLElement | null;
  const simBadgeEl = document.getElementById("simBadge") as HTMLElement | null;
  const simFlagEl = document.getElementById("simFlag") as HTMLElement | null;
  const simToggleEl = document.getElementById("simToggle") as HTMLElement | null;
  const errorStreakEl = document.getElementById("errorStreak") as HTMLElement | null;
  const probeIndexEl = document.getElementById("probeIndex") as HTMLElement | null;
  const volBandEl = document.getElementById("volBand") as HTMLElement | null;
  const consoleStatusEl = document.getElementById("consoleStatus") as HTMLElement | null;
  const sessionModeLabelEl = document.getElementById("sessionModeLabel") as HTMLElement | null;
  const assetLabelEl = document.getElementById("assetLabel") as HTMLElement | null;
  const clearLogBtn = document.getElementById("clearLogBtn") as HTMLElement | null;
  const audioBadgeEl = document.getElementById("audioBadge") as HTMLElement | null;
  const audioFlagEl = document.getElementById("audioFlag") as HTMLElement | null;
  const audioToggleEl = document.getElementById("audioToggle") as HTMLElement | null;

  const aiModalBackdrop = document.getElementById("aiModalBackdrop") as HTMLElement | null;
  const aiModalClose = document.getElementById("aiModalClose") as HTMLElement | null;

  const coachRawEl = document.getElementById("aiCoachRaw") as HTMLElement | null;
  const criticRawEl = document.getElementById("aiCriticRaw") as HTMLElement | null;
  const ideaRawEl = document.getElementById("aiIdeaRaw") as HTMLElement | null;
  const rawPromptEls: Record<string, HTMLElement | null> = {
    coach: coachRawEl,
    critic: criticRawEl,
    "idea-scout": ideaRawEl
  };

  let chartCtx: CanvasRenderingContext2D | null = null;
  let vortex3D: Record<string, any> | null = null;
  let chart3D: Record<string, any> | null = null;
  let audioCtx: AudioContext | null = null;
  let chartFrameId: number | null = null;
  let vortexFrameId: number | null = null;
  let tickIntervalId: number | null = null;

  const APP_ID = "vortex-field";
  const typewriterStates: Record<string, any> = {};

  /* ---------- LOGGING ---------- */
  function log(message: string, kind?: string) {
    if (!logStream) return;
    const entry = document.createElement("div");
    entry.className =
      "log-entry " +
      (kind === "sys"
        ? "sys"
        : kind === "warn"
        ? "warn"
        : kind === "err"
        ? "err"
        : kind === "ai"
        ? "log-entry-ai"
        : "");
    const prefix = document.createElement("span");
    prefix.className = "log-prefix";
    prefix.textContent =
      kind === "sys"
        ? "SYS"
        : kind === "warn"
        ? "WARN"
        : kind === "err"
        ? "ERR"
        : kind === "ai"
        ? "AI"
        : "LOG";
    const msgSpan = document.createElement("span");
    msgSpan.className = "log-msg";
    msgSpan.textContent = message;
    entry.appendChild(prefix);
    entry.appendChild(msgSpan);
    logStream.appendChild(entry);
    logStream.scrollTop = logStream.scrollHeight;

    if (window.TelemetryHub && (TelemetryHub as any).log) {
      (TelemetryHub as any).log("vortex-field", "LOG", kind + ": " + message);
    }
  }

  /* ---------- STATE PERSISTENCE ---------- */
  function loadState() {
    if (!storage) return;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    } catch (e: any) {
      log("failed to load state: " + e.message, "warn");
    }
  }

  function saveState() {
    if (!storage) return;
    try {
      const snapshot = {
        asset: state.asset,
        themeColor: state.themeColor,
        simMode: state.simMode,
        audioEnabled: state.audioEnabled
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      // ignore
    }
  }

  /* ---------- THEME & UI ---------- */
  function updateTheme() {
    const root = document.documentElement;
    root.style.setProperty("--primary", state.themeColor);
  }

  function updateLabels() {
    if (sessionLabelEl) sessionLabelEl.textContent = "session: vortex field";
    if (tickLabelEl) tickLabelEl.textContent = "ticks: " + state.tickCount;
    if (tickMetricEl) tickMetricEl.textContent = state.tickCount.toString();
    if (errorStreakEl) errorStreakEl.textContent = state.errorStreak.toString();
    if (probeIndexEl) probeIndexEl.textContent = state.probeIndex.toString();
    if (assetLabelEl) assetLabelEl.textContent = "asset: " + state.asset + " / USD";

    const modeStr = state.simMode
      ? "SIM mode (synthetic)"
      : state.liveModeAvailable
      ? "live feed (Binance)"
      : "live feed (attempting)";
    if (sessionModeLabelEl) sessionModeLabelEl.textContent = "mode: " + modeStr;
    if (simFlagEl) simFlagEl.textContent = state.simMode ? "on" : "off";
    if (simToggleEl) simToggleEl.classList.toggle("on", state.simMode);
    if (modeLabelEl) modeLabelEl.textContent = state.simMode ? "SIM" : "LIVE";

    if (audioBadgeEl && audioFlagEl && audioToggleEl) {
      audioFlagEl.textContent = state.audioEnabled ? "on" : "off";
      audioToggleEl.textContent =
        "audio click: " + (state.audioEnabled ? "on" : "off");
      audioToggleEl.classList.toggle("on", state.audioEnabled);
      audioToggleEl.setAttribute(
        "aria-pressed",
        state.audioEnabled ? "true" : "false"
      );
    }

    const volScore = state.volatility.score || 0;
    let band = "neutral";
    let pillClass = "pill";
    if (volScore < 1.5) {
      band = "calm";
      pillClass += " good";
    } else if (volScore < 3.5) {
      band = "neutral";
      pillClass += " warn";
    } else {
      band = "spicy";
      pillClass += " bad";
    }
    if (volBandEl) volBandEl.textContent = band;
    if (volPillEl) volPillEl.className = pillClass;
    if (volLabelEl) volLabelEl.textContent = band + " • " + volScore.toFixed(2) + "%";
    if (volMetricEl) volMetricEl.textContent = volScore.toFixed(2) + "%";
  }

  function updatePriceLabels() {
    const data = state.chartData as number[];
    if (!data.length) {
      if (priceMainEl) priceMainEl.textContent = "$0.00";
      if (priceSubEl) priceSubEl.textContent = "Δ 0.00 (0.00%)";
      return;
    }
    const last = data[data.length - 1];
    const first = data[0];
    const delta = last - first;
    const pct = first !== 0 ? (delta / first) * 100 : 0;
    if (priceMainEl) priceMainEl.textContent = "$" + last.toFixed(2);
    if (priceSubEl) priceSubEl.textContent =
      "Δ " +
      delta.toFixed(2) +
      " (" +
      (pct >= 0 ? "+" : "") +
      pct.toFixed(2) +
      "%)";
  }

  function resizeCanvas() {
    if (!chartCanvas) return;
    const rect = chartCanvas.getBoundingClientRect();
    chartCanvas.width = Math.max(320, rect.width * ((window.UIHelpers && typeof (window.UIHelpers as any).getPixelRatio === "function") ? (window.UIHelpers as any).getPixelRatio("vortex") : (window.devicePixelRatio || 1)));
    chartCanvas.height = Math.max(140, 210 * ((window.UIHelpers && typeof (window.UIHelpers as any).getPixelRatio === "function") ? (window.UIHelpers as any).getPixelRatio("vortex") : (window.devicePixelRatio || 1)));
    chartCtx = chartCanvas.getContext("2d");
    renderChart();
  }

  /* ---------- REAL DATA FEED (BINANCE) ---------- */
  function getFeed(asset: string) {
    if (!state.feeds[asset]) {
      state.feeds[asset] = {
        ws: null,
        lastPrice: null,
        lastUpdated: 0,
        live: false
      };
    }
    return state.feeds[asset];
  }

  function handleRealPrice(asset: string, price: number, source: string) {
    if (!isFinite(price)) return;
    const feed = getFeed(asset);
    feed.lastPrice = price;
    feed.lastUpdated = Date.now();
    feed.live = true;
    state.liveModeAvailable = true;

    if (asset === state.asset && !state.simMode) {
      if (!state.chartData.length) {
        state.chartData.push(price);
      } else {
        state.chartData.push(price);
      }
      if (state.chartData.length > 120) {
        state.chartData.shift();
      }
      state.tickCount += 1;
      computeVolatility();
      updatePriceLabels();
      updateLabels();
      renderChart();
    }
  }

  function connectBinanceStream(asset: string) {
    const symbol = BINANCE_SYMBOLS[asset];
    if (!symbol || !("WebSocket" in window)) return;
    const feed = getFeed(asset);
    if (feed.ws && (feed.ws.readyState === WebSocket.OPEN || feed.ws.readyState === WebSocket.CONNECTING)) return;

    try {
      const ws = new WebSocket(
        "wss://stream.binance.com:9443/ws/" + symbol + "@trade"
      );
      feed.ws = ws;

      ws.onopen = function () {
        log(
          "live feed connected (" + asset + " via Binance trade stream)",
          "sys"
        );
        state.liveModeAvailable = true;
        updateLabels();
      };

      ws.onmessage = function (evt) {
        try {
          const data = JSON.parse(evt.data);
          const price = parseFloat(data.p || data.c || data.lastPrice);
          handleRealPrice(asset, price, "ws");
        } catch (e) {
          console.warn("binance ws parse error", e);
        }
      };

      ws.onerror = function () {
        log(
          "live feed error for " + asset + " — falling back to SIM if needed",
          "warn"
        );
        feed.live = false;
        state.errorStreak += 1;
        updateLabels();
      };

      ws.onclose = function () {
        feed.ws = null;
        feed.live = false;
      };
    } catch (e: any) {
      log("WebSocket init failed for " + asset + ": " + e.message, "warn");
    }
  }

  function ensureLiveFeeds() {
    if (state.simMode) return;
    ["BTC", "ETH", "SOL"].forEach(connectBinanceStream);
  }

  function fetchHistorical(asset: string) {
    const symbol = BINANCE_SYMBOLS[asset];
    if (!symbol) {
      seedChartSim();
      return;
    }
    const url =
      "https://api.binance.com/api/v3/klines?symbol=" +
      symbol.toUpperCase() +
      "&interval=1m&limit=120";

    fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (rows: any[]) {
        if (!Array.isArray(rows)) throw new Error("unexpected response");
        const closes = rows
          .map(function (k: any[]) {
            return parseFloat(k[4]);
          })
          .filter(function (v: number) {
            return isFinite(v);
          });
        if (!closes.length) throw new Error("no candle data");
        state.chartData = closes;
        state.tickCount = closes.length;
        computeVolatility();
        updatePriceLabels();
        updateLabels();
        renderChart();
        state.liveModeAvailable = true;
        log(
          "seeded chart from Binance 1m candles for " + asset,
          "sys"
        );
      })
      .catch(function (err: Error) {
        log(
          "failed to fetch Binance historical for " +
            asset +
            ": " +
            err.message,
          "warn"
        );
        state.liveModeAvailable = false;
        seedChartSim();
      });
  }


  /* ---------- LIVE DATA HELPERS (WRAPPER + OPTIONAL SPOT PRICE) ---------- */

  // Coingecko IDs for a simple last-trade sanity check (optional)
  const COINGECKO_IDS: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana"
  };

  async function fetchSpotPrice(asset: string) {
    const id = COINGECKO_IDS[asset];
    if (!id) throw new Error("No Coingecko id for asset: " + asset);
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=" +
      encodeURIComponent(id) +
      "&vs_currencies=usd";

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Coingecko HTTP " + resp.status);
    }
    const data = await resp.json();
    const value = data[id] && data[id].usd;
    if (typeof value !== "number") {
      throw new Error("unexpected Coingecko payload");
    }
    return value;
  }

  let liveLoopTimer: number | null = null;

  function startLiveLoop(intervalMs: number) {
    const delay = Math.max(30_000, intervalMs || 60_000);
    if (liveLoopTimer) {
      clearInterval(liveLoopTimer);
      liveLoopTimer = null;
    }
    if (state.simMode) return;

    try {
      fetchHistorical(state.asset).catch(e => console.warn("fetchHistorical failed", e));
    } catch (e) {
      console.warn("startLiveLoop seed failed", e);
    }

    liveLoopTimer = window.setInterval(function () {
      if (state.simMode) {
        if (liveLoopTimer) clearInterval(liveLoopTimer);
        liveLoopTimer = null;
        return;
      }
      try {
        fetchHistorical(state.asset).catch(e => console.warn("fetchHistorical failed", e));
      } catch (e) {
        console.warn("liveLoop tick failed", e);
      }
    }, delay);
  }

  function stopLiveLoop() {
    if (liveLoopTimer) {
      clearInterval(liveLoopTimer);
      liveLoopTimer = null;
    }
  }

  (window as any).vortexLive = {
    fetchHistorical,
    connectStream: connectBinanceStream,
    fetchSpotPrice,
    startLiveLoop,
    stopLiveLoop
  };
  /* ---------- CHART / TICKS ---------- */
  function seedPriceForAsset(asset: string) {
    if (asset === "BTC") return 88027.47 + (Math.random() - 0.5) * 440.14;
    if (asset === "ETH") return 2969.75 + (Math.random() - 0.5) * 19.80;
    if (asset === "SOL") return 125.51 + (Math.random() - 0.5) * 6.28;
    return 100;
  }

  function seedChartSim() {
    state.chartData.length = 0;
    const base = seedPriceForAsset(state.asset);
    for (let i = 0; i < 40; i++) {
      const wobble = (Math.random() - 0.5) * (base / 200);
      state.chartData.push(base + wobble);
    }
    state.tickCount = 40;
    computeVolatility();
    updatePriceLabels();
    updateLabels();
    renderChart();
    if (!state.simMode) {
      log("SIM seed used (live feed unavailable)", "warn");
    }
  }

  function seedChart() {
    if (state.simMode) {
      seedChartSim();
    } else {
      fetchHistorical(state.asset);
    }
  }

  function computeVolatility() {
    const data = state.chartData as number[];
    if (!data.length) {
      state.volatility = { score: 0, label: "booting" };
      return;
    }
    const windowSize = Math.min(40, data.length);
    const slice = data.slice(data.length - windowSize);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    if (!isFinite(mean) || mean === 0) {
      state.volatility = { score: 0, label: "booting" };
      return;
    }
    const variance =
      slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
      slice.length;
    const stdDev = Math.sqrt(variance);
    const pct = (stdDev / mean) * 100;
    state.volatility.score = pct;
    let label = "neutral";
    if (pct < 1.5) label = "calm";
    else if (pct < 3.5) label = "neutral";
    else label = "spicy";
    state.volatility.label = label;
  }

  function renderChart() {
    if (!chartCtx || !chartCanvas) return;
    const w = chartCanvas.width;
    const h = chartCanvas.height;
    chartCtx.setTransform(1, 0, 0, 1, 0, 0);
    chartCtx.clearRect(0, 0, w, h);

    const data = state.chartData as number[];
    if (data.length < 2) return;

    const min = Math.min.apply(null, data);
    const max = Math.max.apply(null, data);
    const pad = (max - min) * 0.1 || 1;
    const lo = min - pad;
    const hi = max + pad;

    const pr = ((window.UIHelpers && typeof (window.UIHelpers as any).getPixelRatio === "function") ? (window.UIHelpers as any).getPixelRatio("vortex") : (window.devicePixelRatio || 1)) || 1;

    chartCtx.lineWidth = 1.4 * pr;
    chartCtx.strokeStyle = state.themeColor;
    chartCtx.shadowColor = state.themeColor;
    chartCtx.shadowBlur = 8 * pr;
    chartCtx.beginPath();
    data.forEach((val, idx) => {
      const t = idx / (data.length - 1 || 1);
      const x =
        t * (w - 16 * pr) +
        8 * pr;
      const norm = (val - lo) / (hi - lo || 1);
      const y =
        (1 - norm) * (h - 16 * pr) +
        8 * pr;
      if (idx === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();

    chartCtx.shadowBlur = 0;
    chartCtx.globalAlpha = 0.18;
    chartCtx.fillStyle = state.themeColor;
    chartCtx.lineTo(
      w - 8 * pr,
      h - 8 * pr
    );
    chartCtx.lineTo(
      8 * pr,
      h - 8 * pr
    );
    chartCtx.closePath();
    chartCtx.fill();
    chartCtx.globalAlpha = 1;

    const lastIndex = data.length - 1;
    const lastVal = data[lastIndex];
    const tLast = lastIndex / (data.length - 1 || 1);
    const xLast =
      tLast * (w - 16 * pr) +
      8 * pr;
    const normLast = (lastVal - lo) / (hi - lo || 1);
    const yLast =
      (1 - normLast) * (h - 16 * pr) +
      8 * pr;

    chartCtx.save();
    chartCtx.strokeStyle = "rgba(186, 208, 255, 0.7)";
    chartCtx.setLineDash([
      4 * pr,
      3 * pr
    ]);
    chartCtx.lineWidth = 1 * pr;
    chartCtx.beginPath();
    chartCtx.moveTo(xLast, 8 * pr);
    chartCtx.lineTo(xLast, h - 8 * pr);
    chartCtx.stroke();
    chartCtx.restore();

    chartCtx.save();
    chartCtx.fillStyle = "#ffffff";
    chartCtx.shadowColor = state.themeColor;
    chartCtx.shadowBlur = 10 * pr;
    const rHead = 3 * pr;
    chartCtx.beginPath();
    chartCtx.arc(xLast, yLast, rHead, 0, Math.PI * 2);
    chartCtx.fill();
    chartCtx.restore();

    updateChart3D(lo, hi);
  }



  function initChart3D() {
    if (!window.THREE) return;
    if (chartFrameId) cancelAnimationFrame(chartFrameId);
    const canvas = document.getElementById("chart3dCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0f20, 3.0, 8.0);

    const camera = new THREE.PerspectiveCamera(
      40,
      (canvas.clientWidth || 320) / (canvas.clientHeight || 120),
      0.1,
      20
    );
    camera.position.set(0.2, 1.15, 2.6);
    camera.lookAt(0, 0, 0);

    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x050712,
      transparent: true,
      opacity: 0.75
    });
    const baseGeo = new THREE.PlaneGeometry(4.2, 1.3);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, -0.001, 0);
    scene.add(base);

    const gridGroup = new THREE.Group();
    const gridColor = new THREE.Color(0x224066);
    const gridStepsX = 16;
    const gridStepsZ = 8;
    const spanX = 3.8;
    const spanZ = 1.2;

    const gridMat = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: 0.28
    });

    for (let i = 0; i <= gridStepsX; i++) {
      const t = i / gridStepsX;
      const x = (t - 0.5) * spanX;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array([
        x, 0.0, -spanZ * 0.5,
        x, 0.0,  spanZ * 0.5
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const line = new THREE.Line(geo, gridMat);
      gridGroup.add(line);
    }
    for (let k = 0; k <= gridStepsZ; k++) {
      const u = k / gridStepsZ;
      const z = (u - 0.5) * spanZ;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array([
        -spanX * 0.5, 0.0, z,
         spanX * 0.5, 0.0, z
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const line = new THREE.Line(geo, gridMat);
      gridGroup.add(line);
    }
    gridGroup.position.y = 0.0001;
    scene.add(gridGroup);

    const lineGeomMid = new THREE.BufferGeometry();
    const lineGeomHi  = new THREE.BufferGeometry();
    const lineGeomLo  = new THREE.BufferGeometry();

    const matMid = new THREE.LineBasicMaterial({
      color: 0x9fe3ff,
      transparent: true,
      opacity: 0.95,
      fog: true
    });
    const matHi = new THREE.LineBasicMaterial({
      color: 0x9fe3ff,
      transparent: true,
      opacity: 0.35,
      fog: true
    });
    const matLo = new THREE.LineBasicMaterial({
      color: 0x9fe3ff,
      transparent: true,
      opacity: 0.35,
      fog: true
    });

    const lineMid = new THREE.Line(lineGeomMid, matMid);
    const lineHi  = new THREE.Line(lineGeomHi,  matHi);
    const lineLo  = new THREE.Line(lineGeomLo,  matLo);

    const group = new THREE.Group();
    group.add(lineMid, lineHi, lineLo);
    scene.add(group);

    function resize3D() {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 120;
      const ratio = w / h;
      renderer.setPixelRatio(((window.UIHelpers && typeof (window.UIHelpers as any).getPixelRatio === "function") ? (window.UIHelpers as any).getPixelRatio("vortex") : (window.devicePixelRatio || 1)) || 1);
      renderer.setSize(w, h, false);
      camera.aspect = ratio;
      camera.updateProjectionMatrix();
    }

    resize3D();
    window.addEventListener("resize", resize3D);

    chart3D = {
      renderer,
      scene,
      camera,
      canvas,
      group,
      lineMid,
      lineHi,
      lineLo,
      grid: gridGroup,
      resize3D,
      baseGeo,
      baseMat,
      gridMat,
      lineGeomMid,
      lineGeomHi,
      lineGeomLo,
      matMid,
      matHi,
      matLo
    };

    function loop(time: number) {
      chartFrameId = requestAnimationFrame(loop);
      const t = time * 0.00025;
      const wobble = Math.min(1.4, Math.max(0.5, (state.veiNorm || 0.6) + 0.2));
      group.rotation.y = Math.sin(t * wobble) * 0.35;
      group.position.y = Math.sin(t * 0.7) * 0.06;
      renderer.render(scene, camera);
    }
    loop(0);
  }

  function updateChart3D(lo: number, hi: number) {
    if (!window.THREE) return;
    const data = state.chartData as number[];
    if (!data || data.length < 2) return;

    if (!chart3D || !chart3D.lineMid) {
      initChart3D();
      if (!chart3D || !chart3D.lineMid) return;
    }

    const n = data.length;

    const win = Math.max(4, Math.floor(n * 0.12));
    const highs = new Array(n).fill(-Infinity);
    const lows  = new Array(n).fill(Infinity);
    for (let i = 0; i < n; i++) {
      let loW = i - win; if (loW < 0) loW = 0;
      let hiW = i + win; if (hiW > n - 1) hiW = n - 1;
      let h = -Infinity, l = Infinity;
      for (let k = loW; k <= hiW; k++) {
        const v = data[k];
        if (v > h) h = v;
        if (v < l) l = v;
      }
      highs[i] = h;
      lows[i] = l;
    }

    function ensureAttr(geom: THREE.BufferGeometry, count: number) {
      let attr = geom.getAttribute("position");
      if (!attr || attr.count !== count) {
        const arr = new Float32Array(count * 3);
        geom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        attr = geom.getAttribute("position");
      }
      return attr;
    }

    const posMid = ensureAttr(chart3D.lineMid.geometry, n).array as Float32Array;
    const posHi  = ensureAttr(chart3D.lineHi.geometry,  n).array as Float32Array;
    const posLo  = ensureAttr(chart3D.lineLo.geometry,  n).array as Float32Array;

    const spanX = 3.6;
    const spanY = 0.9;
    const spanZ = 1.2;

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1 || 1);

      const vMid = data[i];
      const vHi  = highs[i];
      const vLo  = lows[i];

      const normMid = (vMid - lo) / (hi - lo || 1);
      const normHi  = (vHi  - lo) / (hi - lo || 1);
      const normLo  = (vLo  - lo) / (hi - lo || 1);

      const x = (t - 0.5) * spanX;
      const yMid = (normMid - 0.5) * spanY;
      const yHi  = (normHi  - 0.5) * spanY;
      const yLo  = (normLo  - 0.5) * spanY;

      const z = Math.sin(t * Math.PI * 2) * 0.18 * spanZ * Math.max(0.4, state.veiNorm || 0.6);

      let idx = i * 3;
      posMid[idx] = x; posMid[idx + 1] = yMid; posMid[idx + 2] = z;
      posHi[idx]  = x; posHi[idx + 1]  = yHi;  posHi[idx + 2]  = z * 0.9;
      posLo[idx]  = x; posLo[idx + 1]  = yLo;  posLo[idx + 2]  = z * 1.1;
    }

    chart3D.lineMid.geometry.getAttribute("position").needsUpdate = true;
    chart3D.lineHi.geometry.getAttribute("position").needsUpdate  = true;
    chart3D.lineLo.geometry.getAttribute("position").needsUpdate  = true;

    chart3D.lineMid.geometry.computeBoundingSphere();
    chart3D.lineHi.geometry.computeBoundingSphere();
    chart3D.lineLo.geometry.computeBoundingSphere();

    const vei = Math.min(1, Math.max(0, state.veiNorm || 0.6));
    function rampColor(v: number) {
      if (v < 0.5) {
        const t = v / 0.5;
        const r = Math.round(0x6f + (0x9f - 0x6f) * t);
        const g = Math.round(0xb2 + (0xf7 - 0xb2) * t);
        const b = Math.round(0xff + (0xff - 0xff) * t);
        return new THREE.Color((r << 16) + (g << 8) + b);
      } else {
        const t = (v - 0.5) / 0.5;
        const r = Math.round(0x9f + (0xff - 0x9f) * t);
        const g = Math.round(0xf7 + (0x5b - 0xf7) * t);
        const b = Math.round(0xff + (0xf5 - 0xff) * t);
        return new THREE.Color((r << 16) + (g << 8) + b);
      }
    }
    const c = rampColor(vei);

    chart3D.lineMid.material.color = c.clone();
    chart3D.lineHi.material.color  = c.clone();
    chart3D.lineLo.material.color  = c.clone();

    const opMid = 0.85 + vei * 0.1;
    const opSide = 0.25 + vei * 0.25;
    chart3D.lineMid.material.opacity = opMid;
    chart3D.lineHi.material.opacity  = opSide;
    chart3D.lineLo.material.opacity  = opSide;
  }
function pushTick() {
    state.probeIndex += 1;

    if (state.simMode || !state.liveModeAvailable) {
      const last =
        state.chartData.length > 0
          ? state.chartData[state.chartData.length - 1]
          : seedPriceForAsset(state.asset);

      const baseVol =
        state.asset === "BTC" ? 0.9 : state.asset === "ETH" ? 1.2 : 1.6;
      const simBoost = state.simMode ? 1.7 : 1;
      const jitter = baseVol * simBoost;

      const next =
        last +
        (Math.random() - 0.5) * jitter * (last / 100) +
        (Math.random() - 0.5) * 0.05 * (last / 100);

      state.chartData.push(Math.max(0, next));
      if (state.chartData.length > 120) {
        state.chartData.shift();
      }
      state.tickCount += 1;

      computeVolatility();
      updatePriceLabels();
    }

    updateLabels();
    renderChart();
  }

  /* ---------- 3D VORTEX ---------- */
  function initVortex3D() {
    if (vortexFrameId) cancelAnimationFrame(vortexFrameId);
    const canvas = document.getElementById("vortex3d") as HTMLCanvasElement | null;
    if (!canvas || !window.THREE) {
      if (vortexMetricEl) vortexMetricEl.textContent = "offline (no three.js)";
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    renderer.setPixelRatio(((window.UIHelpers && typeof (window.UIHelpers as any).getPixelRatio === "function") ? (window.UIHelpers as any).getPixelRatio("vortex") : (window.devicePixelRatio || 1)) || 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight),
      0.1,
      100
    );

    function doResize() {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    doResize();

    camera.position.z = 12;

    const geometry = new THREE.BufferGeometry();
    const __qp = (window.NexusPrefs && (window.NexusPrefs as any).qualityProfile) ? (window.NexusPrefs as any).qualityProfile() : { particleScale: 1 };
    const count = Math.max(250, Math.round(800 * (Number(__qp.particleScale) || 1)));

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 4;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.065,
      color: new THREE.Color(state.themeColor),
      transparent: true,
      opacity: 0.9
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    let lastTime = performance.now();

    function resize() {
      doResize();
    }

    window.addEventListener("resize", resize);

    function setFocus(asset: string) {
      const color = assetColors[asset] || "#00ff9d";
      material.color = new THREE.Color(color);
    }

    function updateFromData(volatilityScore: number) {
      const positionsAttr = geometry.getAttribute("position");
      const arr = positionsAttr.array as Float32Array;
      const wobble = Math.min(1.5, Math.max(0.3, volatilityScore / 2.5));
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += (Math.random() - 0.5) * 0.005 * wobble;
      }
      positionsAttr.needsUpdate = true;
    }

    function animate() {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const rotor =
        0.12 + Math.min(0.8, state.volatility.score / 10) * 0.6;
      points.rotation.y += rotor * dt;

      updateFromData(state.volatility.score || 0.5);

      renderer.render(scene, camera);
      vortexFrameId = requestAnimationFrame(animate);
    }

    vortexFrameId = requestAnimationFrame(animate);

    vortex3D = {
      setFocus,
      updateFromData,
      resize,
      renderer,
      geometry,
      material
    };

    if (vortexMetricEl) vortexMetricEl.textContent = "online • particle field";
    log("SYS: 3D vortex field online", "sys");
  }

  /* ---------- AI ADVISORS ---------- */
  function buildAIContext() {
    const lastPrice =
      state.chartData && state.chartData.length
        ? state.chartData[state.chartData.length - 1]
        : null;

    return {
      asset: state.asset,
      themeColor: state.themeColor,
      tickCount: state.tickCount,
      simMode: state.simMode,
      errorStreak: state.errorStreak,
      volatility: state.volatility,
      lastPrice,
      chartPoints: state.chartData ? state.chartData.length : 0,
      has3D: !!vortex3D,
      probeIndex: state.probeIndex,
      liveModeAvailable: state.liveModeAvailable
    };
  }

  function buildBaseNarrative(ctx: Record<string, any>) {
    const vol = ctx.volatility || { score: 0, label: "unknown" };
    const lastPriceStr =
      typeof ctx.lastPrice === "number"
        ? ctx.lastPrice.toFixed(2)
        : "no live price yet";
    const modeStr = ctx.simMode
      ? "offline SIM mode using synthetic ticks"
      : ctx.liveModeAvailable
      ? "live mode using Binance candles + trade stream"
      : "live mode attempting remote APIs with SIM fallback";
    const threeD = ctx.has3D
      ? "The 3D vortex field backdrop is online and reacting to volatility."
      : "The 3D vortex field backdrop is offline, so only the 2D chart is visible.";

    return (
      "You are embedded inside the VORTEX multi-asset browser HUD for BTC, ETH, and SOL. " +
      "The user is currently focused on " +
      ctx.asset +
      " priced in USD. " +
      "The main dashboard shows approximately " +
      ctx.chartPoints +
      " recent ticks with a last seen price of " +
      lastPriceStr +
      ". " +
      "Volatility is classified as " +
      vol.label +
      " with a rolling standard deviation of roughly " +
      (vol.score || 0).toFixed(2) +
      " percent. " +
      "The app is running in " +
      modeStr +
      " and exposes a console-style log plus a HUD of status panels. " +
      threeD +
      " Use both this narrative and the structured ctx object when responding."
    );
  }

  function activateAiTab(role: string) {
    const tabs = document.querySelectorAll(".ai-tab");
    const panes = document.querySelectorAll(".ai-pane");
    const activeLabelEl = document.getElementById("aiAdvisorActiveLabel");

    tabs.forEach((btn) => {
      const isActive = (btn as HTMLElement).dataset.role === role;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    panes.forEach((pane) => {
      const isActive = (pane as HTMLElement).dataset.role === role;
      pane.classList.toggle("active", isActive);
      (pane as HTMLElement).hidden = !isActive;
    });

    if (activeLabelEl) {
      const label =
        role === "critic"
          ? "active advisor: Signal Critic"
          : role === "idea-scout"
          ? "active advisor: Idea Scout"
          : "active advisor: Field Coach";
      activeLabelEl.textContent = label;
    }
  }

  function streamText(role: string, text: string, outputEl: HTMLElement) {
    const key = role || "coach";
    let stateObj = typewriterStates[key];
    if (!stateObj) {
      stateObj = typewriterStates[key] = {};
    }
    if (stateObj.timer) {
      clearInterval(stateObj.timer);
      stateObj.timer = null;
    }
    stateObj.fullText = text;
    stateObj.outputEl = outputEl;
    stateObj.stopped = false;
    outputEl.textContent = "";
    let i = 0;
    stateObj.timer = setInterval(function () {
      if (stateObj.stopped || i >= text.length) {
        clearInterval(stateObj.timer);
        stateObj.timer = null;
        outputEl.textContent = text;
        return;
      }
      outputEl.textContent += text.charAt(i++);
    }, 12);
  }

  function stopStream(role: string) {
    const key = role || "coach";
    const stateObj = typewriterStates[key];
    if (!stateObj) return;
    stateObj.stopped = true;
    if (stateObj.timer) {
      clearInterval(stateObj.timer);
      stateObj.timer = null;
    }
    if (stateObj.outputEl && typeof stateObj.fullText === "string") {
      stateObj.outputEl.textContent = stateObj.fullText;
    }
  }

  function offlineAdvisor(role: string, userPrompt: string, uiBindings: Record<string, any>) {
    const ctx = buildAIContext();
    const baseNarrative = buildBaseNarrative(ctx);
    let body = "";

    if (role === "critic") {
      body =
        "Offline Critic Mode — no AI engines are reachable, so this is a rules-based briefing.\n\n" +
        "• Current asset: " +
        ctx.asset +
        " with " +
        ctx.chartPoints +
        " points in view.\n" +
        "• Volatility flag: " +
        (ctx.volatility ? ctx.volatility.label : "unknown") +
        ". Error streak: " +
        ctx.errorStreak +
        ".\n" +
        "• SIM mode: " +
        (ctx.simMode ? "ON (synthetic data)" : "OFF (live market data)") +
        ".\n\n" +
        "Look for odd jumps in the chart, stalled tick counters, or repeated error logs in the console panel. " +
        "Treat this like a pre-flight check before trusting anything for production decisions.\n\n" +
        "Base snapshot:\n" +
        baseNarrative;
    } else if (role === "idea-scout") {
      body =
        "Offline Idea Scout — engines are offline, but we can still sketch ideas from the HUD state.\n\n" +
        "- Use VORTEX as a demo cockpit: screenshot the 3D field plus chart to explain volatility to non-technical clients.\n" +
        "- Add a per-asset story mode: narrate how BTC, ETH, and SOL behave differently when markets are calm vs spicy.\n" +
        "- Attach badges or achievements to tickCount so each session feels like a mission run.\n\n" +
        "Base narrative snapshot:\n" +
        baseNarrative;
    } else {
      body =
        "Offline Field Coach — AI engines are unavailable, so this is a static walkthrough.\n\n" +
        "1) Pick an asset (BTC / ETH / SOL) along the top nav.\n" +
        "2) Watch the main chart and volatility row; the tick counter tracks how long this session has been running.\n" +
        "3) Flip SIM mode to see how the cockpit behaves with synthetic data only vs live Binance feeds.\n" +
        "4) Use the log panel on the right as your mission feed: it reports errors, API calls, and 3D status.\n\n" +
        "Once AI engines are restored, this advisor will generate tailored walkthroughs instead of fixed text.\n\n" +
        "Base snapshot:\n" +
        baseNarrative;
    }

    if (uiBindings.output) {
      streamText(role, body, uiBindings.output);
    }
    if (uiBindings.status) {
      uiBindings.status.textContent =
        "Offline advisor response — shared AI lab kit not detected.";
    }
    if (uiBindings.button) {
      uiBindings.button.disabled = false;
      uiBindings.button.textContent = uiBindings.defaultLabel;
    }

    if (window.TelemetryHub && (TelemetryHub as any).log) {
      (TelemetryHub as any).log(
        APP_ID,
        "AI",
        "Offline advisor used for role=" + role + " asset=" + ctx.asset
      );
    }

    log(
      "AI (offline): " + role + " advisor responded without engines",
      "sys"
    );
  }

  function createAdvisorUI(role: string, uiBindings: Record<string, any>) {
    return {
      setText: function (text: string, isHTML: boolean) {
        if (!uiBindings.output) return;
        if (isHTML) {
          stopStream(role);
          uiBindings.output.innerHTML = text;
        } else {
          streamText(role, String(text), uiBindings.output);
        }
      },
      setStatus: function (text: string) {
        if (uiBindings.status) {
          uiBindings.status.textContent = text;
        }
      },
      onDone: function () {
        if (uiBindings.button) {
          uiBindings.button.disabled = false;
          uiBindings.button.textContent = uiBindings.defaultLabel;
        }
      },
      log: function (msg: string) {
        if (window.TelemetryHub && (TelemetryHub as any).log) {
          (TelemetryHub as any).log(APP_ID, "AI", msg);
        }
        log("AI: " + msg, "ai");
      }
    };
  }

  async function runAdvisor(role: string, userPrompt: string, uiBindings: Record<string, any>) {
    const ctx = buildAIContext();
    const baseNarrative = buildBaseNarrative(ctx);
    const persona =
      window.AIPersonas && (window.AIPersonas as any).getPersona
        ? (window.AIPersonas as any).getPersona(APP_ID, role)
        : "";

    const ui = createAdvisorUI(role, uiBindings);

    ui.setStatus("Routing to best available engine (Forge / local / offline)…");
    ui.log("runAdvisor(start) role=" + role + " asset=" + ctx.asset);

    const debugPrompt =
      baseNarrative +
      "\n\nPersona Script:\n" +
      (persona || "(none)") +
      "\n\nUser Prompt:\n" +
      userPrompt;
    const rawBox = rawPromptEls[role];
    if (rawBox) {
      rawBox.textContent = debugPrompt;
    }

    if (
      !(window as any).AIAdvisorRouter ||
      !(window as any).AIAdvisorRouter.runAdvisor
    ) {
      ui.log("AIAdvisorRouter missing — falling back to offline rules.");
      offlineAdvisor(role, userPrompt, uiBindings);
      return;
    }

    try {
      await (window as any).AIAdvisorRouter.runAdvisor({
        appId: APP_ID,
        ctx,
        baseNarrative,
        persona,
        userPrompt,
        ui,
        mode: "auto"
      });
    } catch (err) {
      console.error("AIAdvisorRouter error", err);
      ui.setStatus(
        "Advisor error — falling back to offline narrative: " +
          (err && (err as any).message ? (err as any).message : "unknown error")
      );
      offlineAdvisor(role, userPrompt, uiBindings);
    }
  }

  function initAIAdvisors() {
    const aiPanel = document.querySelector(".ai-panel");
    const globalStatusEl = document.getElementById("aiGlobalStatus");

    if (!aiPanel) return;

    const hasRouter =
      !!((window as any).AIAdvisorRouter && (window as any).AIAdvisorRouter.runAdvisor);
    const hasLabKit =
      !!(window as any).AIPersonas &&
      !!(window as any).StateStore &&
      !!(window as any).TelemetryHub &&
      hasRouter;

    if (globalStatusEl) {
      globalStatusEl.textContent = hasLabKit
        ? "AI lab online — shared Forge + local engines, with automatic offline fallback."
        : "AI lab in offline mode — shared AI kit not fully detected; advisors will use rules-only responses.";
    }

    const diagSlot = document.getElementById("aiDiagSlot");
    if (diagSlot && (window as any).AIDiagnostics && (window as any).AIDiagnostics.renderStatusCard) {
      try {
        (window as any).AIDiagnostics.renderStatusCard("aiDiagSlot", { appId: APP_ID });
      } catch (e) {
        console.warn("AIDiagnostics.renderStatusCard failed", e);
      }
    }

    let uiState: Record<string, any> = {
      activeTab: "coach",
      lastPrompts: {}
    };

    if ((window as any).StateStore && (window as any).StateStore.load) {
      try {
        uiState = (window as any).StateStore.load(APP_ID, "ai-ui", uiState);
      } catch (e) {
        console.warn("StateStore.load(ai-ui) failed", e);
      }
    }

    const panes = Array.from(document.querySelectorAll(".ai-pane"));
    const tabs = Array.from(document.querySelectorAll(".ai-tab"));

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const role = (tab as HTMLElement).dataset.role || "coach";
        activateAiTab(role);
        uiState.activeTab = role;
        if ((window as any).StateStore && (window as any).StateStore.save) {
          (window as any).StateStore.save(APP_ID, "ai-ui", uiState);
        }
      });
    });

    const rawToggles = document.querySelectorAll(".ai-raw-toggle");
    rawToggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = (btn as HTMLElement).dataset.role;
        const box = rawPromptEls[role as string];
        if (!box) return;
        if (!box.textContent.trim()) {
          box.textContent =
            "Raw prompt will appear here after you ask this advisor at least once.";
        }
        box.classList.toggle("open");
      });
    });

    panes.forEach((pane) => {
      const role = (pane as HTMLElement).dataset.role;
      const textarea = pane.querySelector("textarea") as HTMLTextAreaElement | null;
      const button = pane.querySelector(".ai-ask-btn") as HTMLButtonElement | null;
      const stopButton = pane.querySelector(".ai-stop-btn") as HTMLButtonElement | null;
      const output = pane.querySelector(".ai-output") as HTMLElement | null;
      const statusEl = pane.querySelector(".ai-status") as HTMLElement | null;

      if (!role || !textarea || !button || !output || !statusEl) return;

      if (uiState.lastPrompts && uiState.lastPrompts[role]) {
        textarea.value = uiState.lastPrompts[role];
      }

      const defaultLabel = button.textContent;

      if (stopButton) {
        stopButton.addEventListener("click", () => {
          stopStream(role);
          if (statusEl) {
            statusEl.textContent = "Output paused.";
          }
        });
      }

      button.addEventListener("click", async () => {
        const userPrompt = textarea.value.trim();
        if (!userPrompt) {
          statusEl.textContent = "Type a question or request first.";
          textarea.focus();
          return;
        }

        uiState.lastPrompts[role] = userPrompt;
        if ((window as any).StateStore && (window as any).StateStore.save) {
          (window as any).StateStore.save(APP_ID, "ai-ui", uiState);
        }

        button.disabled = true;
        button.textContent = "Thinking…";
        output.textContent = "";
        statusEl.textContent = "Advisor warming up…";

        if (window.TelemetryHub && (TelemetryHub as any).log) {
          const ctx = buildAIContext();
          (TelemetryHub as any).log(
            APP_ID,
            "AI",
            role +
              " advisor invoked for asset=" +
              ctx.asset +
              " ticks=" +
              ctx.chartPoints
          );
        }

        const bindings = {
          button,
          output,
          status: statusEl,
          defaultLabel
        };

        if (hasLabKit) {
          await runAdvisor(role, userPrompt, bindings);
        } else {
          offlineAdvisor(role, userPrompt, bindings);
        }
      });
    });

    const initialRole = uiState.activeTab || "coach";
    activateAiTab(initialRole);
  }

  function openAiModal(role: string) {
    if (!aiModalBackdrop) return;
    aiModalBackdrop.classList.add("show");
    aiModalBackdrop.setAttribute("aria-hidden", "false");
    activateAiTab(role || "coach");
    const inputId =
      role === "critic"
        ? "aiCriticInput"
        : role === "idea-scout"
        ? "aiIdeaInput"
        : "aiCoachInput";
    const inputEl = document.getElementById(inputId) as HTMLElement | null;
    if (inputEl) {
      setTimeout(() => inputEl.focus(), 50);
    }
  }

  function closeAiModal() {
    if (!aiModalBackdrop) return;
    aiModalBackdrop.classList.remove("show");
    aiModalBackdrop.setAttribute("aria-hidden", "true");
  }

  /* ---------- HAPTICS + AUDIO ---------- */
  function initAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  async function playClickSound() {
    if (!state.audioEnabled) return;
    const ctx = initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(8000, ctx.currentTime);
    osc.type = "square";
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  function hapticPulse() {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // ignore
      }
    }
  }

  function wireFeedback() {
    document.addEventListener("click", function (evt) {
      const target = evt.target as HTMLElement;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.closest("button") ||
        target.closest(".asset-btn") ||
        target.classList.contains("ai-inline-btn")
      ) {
        hapticPulse();
        playClickSound();
      }
    });
  }

  /* ---------- PRESENTATION MODE ---------- */
  function wirePresentationMode() {
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        document.body.classList.toggle("presentation-mode");
        const on = document.body.classList.contains("presentation-mode");
        log(
          "presentation mode " +
            (on ? "ENABLED" : "disabled") +
            " (Ctrl+Shift+P)",
          "sys"
        );
      }
    });
  }

  /* ---------- EVENTS ---------- */
  function setAsset(asset: string) {
    if (state.asset === asset) return;
    state.asset = asset;
    state.themeColor = assetColors[asset] || "#00ff9d";
    if (vortex3D && vortex3D.setFocus) {
      vortex3D.setFocus(asset);
    }
    const buttons = document.querySelectorAll(".asset-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", (btn as HTMLElement).dataset.asset === asset);
    });
    updateTheme();
    seedChart();
    if (!state.simMode) {
      connectBinanceStream(asset);
    }
    saveState();
    log("asset changed → " + asset, "sys");
  }

  function toggleSimMode() {
    state.simMode = !state.simMode;
    if (state.simMode) {
      state.errorStreak = 0;
      if (consoleStatusEl) consoleStatusEl.textContent = "connected";
      state.liveModeAvailable = false;
    } else {
      if (consoleStatusEl) consoleStatusEl.textContent = "listening";
      ensureLiveFeeds();
    }
    seedChart();
    updateLabels();
    saveState();
    log(
      "SIM mode " +
        (state.simMode
          ? "enabled (offline ticks)"
          : "disabled (live Binance feed)"),
      "sys"
    );
  }

  function toggleAudioClick() {
    state.audioEnabled = !state.audioEnabled;
    updateLabels();
    saveState();
    log(
      "audio click " + (state.audioEnabled ? "enabled" : "muted"),
      "sys"
    );
  }

  function wireEvents() {
    const assetButtons = document.querySelectorAll(".asset-btn");
    assetButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const asset = (btn as HTMLElement).dataset.asset;
        setAsset(asset as string);
      });
    });

    if (simToggleEl) {
      simToggleEl.addEventListener("click", () => {
        toggleSimMode();
      });
    }

    if (audioToggleEl) {
      audioToggleEl.addEventListener("click", () => {
        toggleAudioClick();
      });
    }

    if (clearLogBtn) {
      clearLogBtn.addEventListener("click", () => {
        if (logStream) logStream.innerHTML = "";
        log("log cleared", "sys");
      });
    }

    const aiInlineButtons = document.querySelectorAll(".ai-inline-btn");
    aiInlineButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = (btn as HTMLElement).dataset.role || "coach";
        openAiModal(role);
      });
    });

    if (aiModalClose) {
      aiModalClose.addEventListener("click", () => {
        closeAiModal();
      });
    }

    if (aiModalBackdrop) {
      aiModalBackdrop.addEventListener("click", (evt) => {
        if (evt.target === aiModalBackdrop) {
          closeAiModal();
        }
      });
    }

    window.addEventListener("resize", () => {
      resizeCanvas();
      if (vortex3D && vortex3D.resize) {
        vortex3D.resize();
      }
    });
  }

  /* ---------- CLEANUP ---------- */
  function cleanup() {
    if (chartFrameId) cancelAnimationFrame(chartFrameId);
    if (vortexFrameId) cancelAnimationFrame(vortexFrameId);
    if (tickIntervalId) clearInterval(tickIntervalId);
    stopLiveLoop();

    if (chart3D) {
      if (chart3D.baseGeo) chart3D.baseGeo.dispose();
      if (chart3D.baseMat) chart3D.baseMat.dispose();
      if (chart3D.gridMat) chart3D.gridMat.dispose();
      if (chart3D.lineGeomMid) chart3D.lineGeomMid.dispose();
      if (chart3D.lineGeomHi) chart3D.lineGeomHi.dispose();
      if (chart3D.lineGeomLo) chart3D.lineGeomLo.dispose();
      if (chart3D.matMid) chart3D.matMid.dispose();
      if (chart3D.matHi) chart3D.matHi.dispose();
      if (chart3D.matLo) chart3D.matLo.dispose();
      if (chart3D.grid && chart3D.grid.children) {
        chart3D.grid.children.forEach((child: THREE.Line) => {
          child.geometry.dispose();
        });
      }
      if (chart3D.renderer) chart3D.renderer.dispose();
    }

    if (vortex3D) {
      if (vortex3D.geometry) vortex3D.geometry.dispose();
      if (vortex3D.material) vortex3D.material.dispose();
      if (vortex3D.renderer) vortex3D.renderer.dispose();
    }

    chart3D = null;
    vortex3D = null;
  }

  /* ---------- INIT ---------- */
  function init() {
    window.addEventListener("beforeunload", cleanup);
    if (typeof console !== "undefined" && console.log) {
      try {
        console.log(
          "%c Built by Devin O'Rourke • 2025",
          "background:#050509;color:#00ff9d;padding:4px 8px;border-radius:4px;font-family:JetBrains Mono,monospace;"
        );
      } catch (e) {
        // ignore
      }
    }

    loadState();
    state.themeColor = assetColors[state.asset] || "#00ff9d";
    updateTheme();
    resizeCanvas();
    try { seedChartSim(); } catch (e) {}
    seedChart();
    ensureLiveFeeds();
    initVortex3D();
    updateLabels();
    updatePriceLabels();
    initAIAdvisors();
    wireEvents();
    wireFeedback();
    wirePresentationMode();

    log("SYS: VORTEX online • vortex field booted", "sys");

    tickIntervalId = window.setInterval(() => {
      try {
        pushTick();
      } catch (e: any) {
        state.errorStreak += 1;
        updateLabels();
        log("tick error: " + e.message, "err");
      }
    }, 2200);
  }

  window.addEventListener("load", init);
})();
