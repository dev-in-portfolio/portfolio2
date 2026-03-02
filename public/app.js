const API_BASE = "/api/timelines";

const timelinePanel = document.getElementById("timeline-panel");
const layerPanel = document.getElementById("layer-panel");
const eventPanel = document.getElementById("event-panel");
const canvasPanel = document.getElementById("canvas-panel");

const state = {
  timelines: [],
  activeTimeline: null,
  layers: [],
  events: [],
  tagFilter: "",
  zoom: "week",
  rangeFrom: "",
  rangeTo: "",
};

function deviceKey() {
  let key = localStorage.getItem("chronicle_device_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("chronicle_device_key", key);
  }
  return key;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Key": deviceKey(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadTimelines() {
  const data = await apiFetch(API_BASE);
  state.timelines = data.timelines || [];
  renderTimelinePanel();
}

async function loadTimelinesWithRetry(attempts = 3, delayMs = 700) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await loadTimelines();
      return;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function loadTimeline(id) {
  const data = await apiFetch(`${API_BASE}/${id}`);
  state.activeTimeline = data;
  await loadLayers();
  await loadEvents();
  renderLayerPanel();
  renderEventPanel();
  renderCanvas();
}

async function loadLayers() {
  if (!state.activeTimeline) return;
  const data = await apiFetch(`${API_BASE}/${state.activeTimeline.id}/layers`);
  state.layers = data.layers || [];
}

async function loadEvents() {
  if (!state.activeTimeline) return;
  const params = new URLSearchParams();
  if (state.rangeFrom) params.set("from", state.rangeFrom);
  if (state.rangeTo) params.set("to", state.rangeTo);
  if (state.tagFilter) params.set("tags", state.tagFilter);
  const data = await apiFetch(`${API_BASE}/${state.activeTimeline.id}/events?${params.toString()}`);
  state.events = data.events || [];
}

function renderTimelinePanel() {
  timelinePanel.innerHTML = `
    <h2>Timelines</h2>
    <label>Name</label>
    <input id="timeline-name" placeholder="Project Phoenix" />
    <label>Description</label>
    <textarea id="timeline-description"></textarea>
    <button id="create-timeline">Create Timeline</button>
    <div class="status" id="timeline-status"></div>
    <hr />
    <div id="timeline-list"></div>
  `;

  document.getElementById("create-timeline").onclick = async () => {
    const name = document.getElementById("timeline-name").value.trim();
    const description = document.getElementById("timeline-description").value.trim();
    const status = document.getElementById("timeline-status");
    try {
      if (!name) throw new Error("Name required");
      await apiFetch(API_BASE, {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      status.textContent = "Timeline created.";
      await loadTimelines();
    } catch (err) {
      status.textContent = err.message;
    }
  };

  const list = document.getElementById("timeline-list");
  if (!state.timelines.length) {
    list.innerHTML = `<p class="status">No timelines yet.</p>`;
  } else {
    list.innerHTML = state.timelines
      .map(
        (timeline) => `
        <div style="margin-bottom: 12px;">
          <strong>${timeline.name}</strong>
          <div>${timeline.description || ""}</div>
          <button data-id="${timeline.id}">Open</button>
        </div>
      `
      )
      .join("");
    list.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => loadTimeline(btn.dataset.id);
    });
  }
}

function renderLayerPanel() {
  if (!state.activeTimeline) {
    layerPanel.innerHTML = `<h2>Layers</h2><p class="status">Select a timeline.</p>`;
    return;
  }
  layerPanel.innerHTML = `
    <h2>Layers</h2>
    <label>Layer name</label>
    <input id="layer-name" placeholder="Deployments" />
    <label>Color</label>
    <input id="layer-color" type="color" value="#9f7bff" />
    <button id="add-layer">Add Layer</button>
    <div class="status" id="layer-status"></div>
    <hr />
    <div id="layer-list"></div>
  `;

  document.getElementById("add-layer").onclick = async () => {
    const name = document.getElementById("layer-name").value.trim();
    const color = document.getElementById("layer-color").value;
    const status = document.getElementById("layer-status");
    try {
      if (!name) throw new Error("Layer name required");
      await apiFetch(`${API_BASE}/${state.activeTimeline.id}/layers`, {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      status.textContent = "Layer added.";
      await loadLayers();
      renderLayerPanel();
      renderCanvas();
    } catch (err) {
      status.textContent = err.message;
    }
  };

  const list = document.getElementById("layer-list");
  list.innerHTML = state.layers
    .map(
      (layer) => `
      <div style="margin-bottom: 8px;">
        <span class="badge" style="background: ${layer.color}; color: #0b0d17;">${layer.name}</span>
      </div>
    `
    )
    .join("");
}

function renderEventPanel() {
  if (!state.activeTimeline) {
    eventPanel.innerHTML = `<h2>Events</h2><p class="status">Select a timeline.</p>`;
    return;
  }
  const layerOptions = state.layers
    .map((layer) => `<option value="${layer.id}">${layer.name}</option>`)
    .join("");

  eventPanel.innerHTML = `
    <h2>Event Editor</h2>
    <label>Title</label>
    <input id="event-title" placeholder="Deploy v2.3" />
    <label>Description</label>
    <textarea id="event-description"></textarea>
    <label>Layer</label>
    <select id="event-layer"><option value="">Unlayered</option>${layerOptions}</select>
    <label>Start time</label>
    <input id="event-start" type="datetime-local" />
    <label>End time</label>
    <input id="event-end" type="datetime-local" />
    <label>Tags (comma)</label>
    <input id="event-tags" placeholder="release,urgent" />
    <button id="add-event">Add Event</button>
    <div class="status" id="event-status"></div>
    <hr />
    <label>Filter tags</label>
    <input id="tag-filter" placeholder="deploy" />
    <label>Range from</label>
    <input id="range-from" type="date" />
    <label>Range to</label>
    <input id="range-to" type="date" />
    <label>Zoom</label>
    <select id="zoom-select">
      <option value="hour">Hour</option>
      <option value="day">Day</option>
      <option value="week" selected>Week</option>
      <option value="month">Month</option>
      <option value="year">Year</option>
    </select>
    <button id="apply-filters">Apply Filters</button>
  `;

  document.getElementById("add-event").onclick = async () => {
    const title = document.getElementById("event-title").value.trim();
    const description = document.getElementById("event-description").value.trim();
    const layerId = document.getElementById("event-layer").value || null;
    const start = document.getElementById("event-start").value;
    const end = document.getElementById("event-end").value || null;
    const tags = document.getElementById("event-tags").value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const status = document.getElementById("event-status");
    try {
      if (!title || !start) throw new Error("Title + start time required");
      await apiFetch(`${API_BASE}/${state.activeTimeline.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          layer_id: layerId,
          start_time: start,
          end_time: end,
          tags,
        }),
      });
      status.textContent = "Event added.";
      await loadEvents();
      renderCanvas();
    } catch (err) {
      status.textContent = err.message;
    }
  };

  document.getElementById("apply-filters").onclick = async () => {
    state.tagFilter = document.getElementById("tag-filter").value.trim();
    state.rangeFrom = document.getElementById("range-from").value;
    state.rangeTo = document.getElementById("range-to").value;
    state.zoom = document.getElementById("zoom-select").value;
    await loadEvents();
    renderCanvas();
  };
}

function renderCanvas() {
  if (!state.activeTimeline) {
    canvasPanel.innerHTML = `<h2>Timeline</h2><p class="status">Select a timeline.</p>`;
    return;
  }
  const layers = state.layers.length ? state.layers : [{ id: "unlayered", name: "Unlayered", color: "#9f7bff" }];
  const events = state.events;

  let from = state.rangeFrom ? new Date(state.rangeFrom) : null;
  let to = state.rangeTo ? new Date(state.rangeTo) : null;

  if (!from || !to) {
    const times = events.map((e) => new Date(e.start_time));
    const min = times.length ? new Date(Math.min(...times)) : new Date();
    const max = times.length ? new Date(Math.max(...times)) : new Date();
    from = from || new Date(min.getTime() - 86400000);
    to = to || new Date(max.getTime() + 86400000);
  }

  const totalMs = to - from || 1;
  const zoomScale = {
    hour: 2400,
    day: 1800,
    week: 1400,
    month: 1200,
    year: 1000,
  }[state.zoom];

  const pixelsPerMs = zoomScale / totalMs;

  canvasPanel.innerHTML = `
    <h2>Timeline</h2>
    <div class="timeline" style="min-width:${zoomScale}px;">
      ${layers
        .map((layer) => {
          const layerEvents = events.filter((e) => (e.layer_id || "unlayered") === layer.id);
          return `
            <div class="timeline-row">
              <strong>${layer.name}</strong>
              ${layerEvents
                .map((event) => {
                  const start = new Date(event.start_time);
                  const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 3600000);
                  const left = Math.max(0, (start - from) * pixelsPerMs);
                  const width = Math.max(12, (end - start) * pixelsPerMs);
                  return `
                    <div class="event" style="left:${left}px;width:${width}px;background:${layer.color};">
                      ${event.title}
                    </div>
                  `;
                })
                .join("")}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

async function init() {
  try {
    await loadTimelinesWithRetry();
  } catch (err) {
    timelinePanel.innerHTML = `<h2>Timelines</h2><p class="status">${err.message}</p>`;
    layerPanel.innerHTML = `<h2>Layers</h2><p class="status">API unavailable.</p>`;
    eventPanel.innerHTML = `<h2>Events</h2><p class="status">API unavailable.</p>`;
    canvasPanel.innerHTML = `<h2>Timeline</h2><p class="status">API unavailable.</p>`;
  }
}

init();
