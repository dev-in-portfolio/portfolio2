(function() {
  const state = {
    deviceKey: 'demo-device',
    sseSource: null,
    uptimeTimer: null,
    categories: [],
    rollups: [],
    stats: {
      entries: 0,
      categories: 0,
      uptime: 0
    },
    range: 30 // days
  };

  // DOM Elements
  const deviceKeyInput = document.getElementById('device-key-input');
  const connectBtn = document.getElementById('connect-btn');
  const rangeSlider = document.getElementById('range-slider');
  const rangeVal = document.getElementById('range-val');
  
  const routeMethod = document.getElementById('route-method');
  const routePath = document.getElementById('route-path');
  const getParams = document.getElementById('get-params');
  const postParams = document.getElementById('post-params');
  const postCategory = document.getElementById('post-category');
  const sendRequestBtn = document.getElementById('send-request-btn');
  const responseConsole = document.getElementById('response-console');
  
  const statEntries = document.getElementById('stat-entries');
  const statCategories = document.getElementById('stat-categories');
  const statUptime = document.getElementById('stat-uptime');
  const categorySummaryList = document.getElementById('category-summary-list');
  
  const sseStatus = document.getElementById('sse-status');
  const sseConsole = document.getElementById('sse-console');
  
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  // Initialization
  function init() {
    state.deviceKey = deviceKeyInput.value.trim() || 'demo-device';
    setupEventListeners();
    connect();
  }

  function setupEventListeners() {
    connectBtn.addEventListener('click', () => {
      state.deviceKey = deviceKeyInput.value.trim() || 'demo-device';
      showToast('X-Device-Key set: ' + state.deviceKey);
      connect();
    });

    rangeSlider.addEventListener('input', () => {
      const vals = { '1': 7, '2': 30, '3': 90 };
      const labels = { '1': '7d', '2': '30d', '3': '90d' };
      state.range = vals[rangeSlider.value];
      rangeVal.textContent = labels[rangeSlider.value];
      fetchRollups();
    });

    routeMethod.addEventListener('change', () => {
      const method = routeMethod.value;
      if (method === 'POST') {
        postParams.style.display = 'grid';
        getParams.style.display = 'none';
      } else {
        postParams.style.display = 'none';
        getParams.style.display = 'grid';
      }
    });

    routePath.addEventListener('change', () => {
      const path = routePath.value;
      if (path === '/api/ledger/entries' && routeMethod.value === 'POST') {
        postParams.style.display = 'grid';
      }
    });

    sendRequestBtn.addEventListener('click', executePlaygroundRequest);
  }

  // API Helpers
  async function apiFetch(url, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-Key': state.deviceKey
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(url, options);
      const json = await res.json();
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      return { ok: false, status: 500, data: { error: 'Network or server error.' } };
    }
  }

  // Core Connection
  async function connect() {
    stopSSE();
    clearInterval(state.uptimeTimer);
    
    showToast('Connecting to PalmLedger API...');
    
    const healthy = await fetchHealth();
    if (!healthy) {
      responseConsole.textContent = 'Failed to connect to PalmLedger backend.\nVerify server is running on http://127.0.0.1:3013/';
      return;
    }

    await Promise.all([
      fetchStatus(),
      fetchCategories(),
      fetchRollups()
    ]);

    startSSE();
    startUptimeTimer();
  }

  async function fetchHealth() {
    const res = await apiFetch('/api/ledger/health');
    if (res.ok) {
      state.stats.uptime = res.data.uptimeSeconds;
      statUptime.textContent = formatDuration(state.stats.uptime);
      return true;
    }
    return false;
  }

  async function fetchStatus() {
    const res = await apiFetch('/api/ledger/status');
    if (res.ok) {
      state.stats.entries = res.data.entries;
      state.stats.categories = res.data.categories;
      statEntries.textContent = state.stats.entries;
      statCategories.textContent = state.stats.categories;
    }
  }

  async function fetchCategories() {
    const res = await apiFetch('/api/ledger/categories');
    if (res.ok && res.data.categories) {
      state.categories = res.data.categories;
      updateCategoryDropdown();
    }
  }

  async function fetchRollups() {
    const res = await apiFetch(`/api/ledger/rollups?range=${state.range}d&groupBy=day`);
    if (res.ok && res.data.rollups) {
      state.rollups = res.data.rollups;
      renderChart();
      updateCategorySummary();
    }
  }

  async function updateCategorySummary() {
    const res = await apiFetch(`/api/ledger/rollups?range=${state.range}d&groupBy=category`);
    if (res.ok && res.data.rollups) {
      categorySummaryList.innerHTML = res.data.rollups.map(cat => `
        <li class="category-item">
          <span>${cat.label} <span class="muted">(${cat.entry_count})</span></span>
          <span class="amount">${Number(cat.total_amount).toFixed(2)}</span>
        </li>
      `).join('') || '<li class="muted">No transactions found in this range.</li>';
    }
  }

  function updateCategoryDropdown() {
    postCategory.innerHTML = `
      <option value="">None (Uncategorized)</option>
      ${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
  }

  // SSE Stream Listening
  function startSSE() {
    stopSSE();
    
    sseConsole.innerHTML = '<div>[SSE] Starting connection...</div>';
    sseStatus.textContent = 'Connecting...';
    sseStatus.className = 'status-badge';

    const url = `/api/ledger/stream?deviceKey=${encodeURIComponent(state.deviceKey)}`;
    state.sseSource = new EventSource(url);

    state.sseSource.onopen = () => {
      sseStatus.textContent = 'Connected';
      sseStatus.className = 'status-badge connected';
      appendSseLog('SYSTEM', 'SSE Connection established.');
    };

    state.sseSource.onmessage = (event) => {
      if (event.data === ':ok') return;
      try {
        const payload = JSON.parse(event.data);
        appendSseLog('ENTRY_CREATED', JSON.stringify(payload, null, 2));
        showToast(`⚡ SSE Event: New entry "${payload.title}" created!`);
        
        // Refresh dashboard metrics
        fetchStatus();
        fetchRollups();
      } catch (err) {
        appendSseLog('ERROR', 'Malformed JSON payload: ' + event.data);
      }
    };

    state.sseSource.onerror = () => {
      sseStatus.textContent = 'Disconnected';
      sseStatus.className = 'status-badge';
      appendSseLog('SYSTEM', 'SSE Connection failed or disconnected. Retrying...');
    };
  }

  function stopSSE() {
    if (state.sseSource) {
      state.sseSource.close();
      state.sseSource = null;
    }
    sseStatus.textContent = 'Offline';
    sseStatus.className = 'status-badge';
  }

  function appendSseLog(event, data) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'sse-entry';
    entry.innerHTML = `
      <span class="timestamp">[${time}] ${event}</span>
      <span class="payload">${data}</span>
    `;
    sseConsole.appendChild(entry);
    sseConsole.scrollTop = sseConsole.scrollHeight;
  }

  // Playground Execution
  async function executePlaygroundRequest() {
    const method = routeMethod.value;
    const path = routePath.value;
    
    responseConsole.textContent = 'Sending request...';
    
    let body = null;
    let url = path;

    if (method === 'POST') {
      if (path === '/api/ledger/categories') {
        const name = prompt('Category name:');
        if (!name) {
          responseConsole.textContent = 'Canceled.';
          return;
        }
        body = { name, kind: 'custom' };
      } else if (path === '/api/ledger/entries') {
        body = {
          title: document.getElementById('post-title').value,
          amountNum: parseFloat(document.getElementById('post-amount').value) || 0,
          amountUnit: document.getElementById('post-unit').value,
          categoryId: postCategory.value || null
        };
      }
    } else if (method === 'GET') {
      const q = document.getElementById('get-search').value;
      if (q) {
        url += '?q=' + encodeURIComponent(q);
      }
    } else if (method === 'DELETE') {
      const targetId = prompt('Enter item ID to delete:');
      if (!targetId) {
        responseConsole.textContent = 'Canceled.';
        return;
      }
      url += '/' + targetId;
    }

    const res = await apiFetch(url, method, body);
    responseConsole.textContent = `HTTP ${res.status}\n\n` + JSON.stringify(res.data, null, 2);

    if (res.ok) {
      showToast(`${method} request succeeded!`);
      // Update stats and summaries if editing categories/entries
      if (path.includes('/categories')) fetchCategories();
      fetchStatus();
      fetchRollups();
    }
  }

  // Neon-Glow Chart Drawing
  function renderChart() {
    const canvas = document.getElementById('rolling-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    const data = state.rollups;
    if (!data.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available to plot.', w / 2, h / 2);
      return;
    }

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 30;

    const graphWidth = w - paddingLeft - paddingRight;
    const graphHeight = h - paddingTop - paddingBottom;

    // Parse totals
    const points = data.map((d, index) => ({
      xVal: index,
      yVal: parseFloat(d.total_amount || 0),
      label: formatLabel(d.label)
    }));

    const maxY = Math.max(...points.map(p => p.yVal), 10) * 1.15;
    const minY = 0;

    // Coordinates mapping
    const getX = (index) => paddingLeft + (index / Math.max(1, points.length - 1)) * graphWidth;
    const getY = (yVal) => paddingTop + graphHeight - ((yVal - minY) / (maxY - minY)) * graphHeight;

    // Draw Grid Lines & Axes Labels
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const val = minY + (i / yTicks) * (maxY - minY);
      const y = getY(val);
      
      // Horizontal grid lines
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      ctx.fillText(Math.round(val).toString(), paddingLeft - 8, y + 3);
    }

    // Draw X axis labels (Skip some if too many)
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(points.length / 5));
    points.forEach((p, i) => {
      if (i % labelStep === 0) {
        ctx.fillText(p.label, getX(i), h - paddingBottom + 16);
      }
    });

    // Draw Neon Line
    ctx.beginPath();
    points.forEach((p, i) => {
      const cx = getX(i);
      const cy = getY(p.yVal);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });

    // Stroke style with neon glow
    ctx.save();
    ctx.shadowColor = '#84cc16';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Fill area below chart
    ctx.beginPath();
    points.forEach((p, i) => {
      const cx = getX(i);
      const cy = getY(p.yVal);
      if (i === 0) ctx.moveTo(cx, getY(0));
      ctx.lineTo(cx, cy);
      if (i === points.length - 1) ctx.lineTo(cx, getY(0));
    });
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, h - paddingBottom);
    gradient.addColorStop(0, 'rgba(132, 204, 22, 0.15)');
    gradient.addColorStop(1, 'rgba(132, 204, 22, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw dots on data points
    points.forEach((p, i) => {
      const cx = getX(i);
      const cy = getY(p.yVal);

      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#84cc16';
      ctx.fill();
      ctx.strokeStyle = '#0b0f19';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function formatLabel(dbLabel) {
    if (!dbLabel) return '';
    const date = new Date(dbLabel);
    if (Number.isNaN(date.getTime())) return dbLabel;
    return (date.getMonth() + 1) + '/' + date.getDate();
  }

  // Duration Formatter
  function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startUptimeTimer() {
    state.uptimeTimer = setInterval(() => {
      state.stats.uptime += 1;
      statUptime.textContent = formatDuration(state.stats.uptime);
    }, 1000);
  }

  // Toast System
  let toastTimeout = null;
  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  window.addEventListener('resize', renderChart);

  // Run
  init();
})();
