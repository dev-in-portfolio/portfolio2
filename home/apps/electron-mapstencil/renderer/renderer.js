const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext("2d");
const toolPanel = document.getElementById("tool-panel");
const detailPanel = document.getElementById("detail-panel");

const openMapBtn = document.getElementById("open-map");
const openProjectBtn = document.getElementById("open-project");
const saveProjectBtn = document.getElementById("save-project");
const exportJsonBtn = document.getElementById("export-json");
const exportPngBtn = document.getElementById("export-png");

const isElectron = Boolean(window.mapstencil);

const state = {
  projectPath: null,
  baseMap: null,
  image: null,
  tool: "select",
  pins: [],
  routes: [],
  active: null,
  activeRoute: null,
  scale: 1,
};

function setTool(tool) {
  state.tool = tool;
  renderTools();
}

function renderTools() {
  toolPanel.innerHTML = `
    <h2>Tools</h2>
    <button class="tool-btn ${state.tool === "select" ? "active" : ""}" data-tool="select">Select</button>
    <button class="tool-btn ${state.tool === "pin" ? "active" : ""}" data-tool="pin">Pin</button>
    <button class="tool-btn ${state.tool === "route" ? "active" : ""}" data-tool="route">Route</button>
    <button class="tool-btn ${state.tool === "erase" ? "active" : ""}" data-tool="erase">Erase</button>
    <hr />
    <label>Layers</label>
    <div><input type="checkbox" id="toggle-pins" checked /> Pins</div>
    <div><input type="checkbox" id="toggle-routes" checked /> Routes</div>
    <p>${isElectron ? "Desktop mode" : "Web preview mode"}</p>
  `;
  toolPanel.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.onclick = () => setTool(btn.dataset.tool);
  });
  document.getElementById("toggle-pins").onchange = render;
  document.getElementById("toggle-routes").onchange = render;
}

function renderDetails() {
  if (!state.active) {
    detailPanel.innerHTML = `<h2>Details</h2><p>Select a pin or route.</p>`;
    return;
  }
  if (state.active.type === "pin") {
    const pin = state.active.data;
    detailPanel.innerHTML = `
      <h2>Pin</h2>
      <label>Title</label>
      <input id="pin-title" value="${pin.title}" />
      <label>Note</label>
      <textarea id="pin-note">${pin.note}</textarea>
      <label>Tags</label>
      <input id="pin-tags" value="${pin.tags.join(",")}" />
      <button id="save-pin">Save</button>
    `;
    document.getElementById("save-pin").onclick = () => {
      pin.title = document.getElementById("pin-title").value;
      pin.note = document.getElementById("pin-note").value;
      pin.tags = document
        .getElementById("pin-tags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      render();
      scheduleSave();
    };
  } else if (state.active.type === "route") {
    const route = state.active.data;
    detailPanel.innerHTML = `
      <h2>Route</h2>
      <label>Name</label>
      <input id="route-name" value="${route.name}" />
      <label>Tags</label>
      <input id="route-tags" value="${route.tags.join(",")}" />
      <button id="save-route">Save</button>
    `;
    document.getElementById("save-route").onclick = () => {
      route.name = document.getElementById("route-name").value;
      route.tags = document
        .getElementById("route-tags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      render();
      scheduleSave();
    };
  }
}

function render() {
  if (!state.image) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);

  const showPins = document.getElementById("toggle-pins")?.checked ?? true;
  const showRoutes = document.getElementById("toggle-routes")?.checked ?? true;

  if (showRoutes) {
    state.routes.forEach((route) => {
      ctx.strokeStyle = route.color || "#50fa7b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      route.points.forEach((pt, idx) => {
        const x = pt.x * state.scale;
        const y = pt.y * state.scale;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  if (showPins) {
    state.pins.forEach((pin) => {
      ctx.fillStyle = pin.color || "#ffb86c";
      ctx.beginPath();
      ctx.arc(pin.x * state.scale, pin.y * state.scale, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function toImageCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / state.scale;
  const y = (event.clientY - rect.top) / state.scale;
  return { x, y };
}

canvas.addEventListener("click", (event) => {
  if (!state.image) return;
  const point = toImageCoords(event);

  if (state.tool === "pin") {
    const pin = {
      id: crypto.randomUUID(),
      x: point.x,
      y: point.y,
      title: "New Pin",
      note: "",
      tags: [],
    };
    state.pins.push(pin);
    state.active = { type: "pin", data: pin };
    renderDetails();
    render();
    scheduleSave();
  } else if (state.tool === "route") {
    if (!state.activeRoute) {
      state.activeRoute = {
        id: crypto.randomUUID(),
        name: "New Route",
        points: [],
        tags: [],
      };
      state.routes.push(state.activeRoute);
    }
    state.activeRoute.points.push(point);
    state.active = { type: "route", data: state.activeRoute };
    renderDetails();
    render();
    scheduleSave();
  } else if (state.tool === "select") {
    const hitPin = state.pins.find((p) => Math.hypot(p.x - point.x, p.y - point.y) < 10);
    if (hitPin) {
      state.active = { type: "pin", data: hitPin };
      renderDetails();
      return;
    }
    const hitRoute = state.routes.find((route) => route.points.some((pt) => Math.hypot(pt.x - point.x, pt.y - point.y) < 8));
    if (hitRoute) {
      state.active = { type: "route", data: hitRoute };
      renderDetails();
    }
  } else if (state.tool === "erase") {
    state.pins = state.pins.filter((p) => Math.hypot(p.x - point.x, p.y - point.y) > 10);
    state.routes = state.routes.filter((route) => !route.points.some((pt) => Math.hypot(pt.x - point.x, pt.y - point.y) < 8));
    render();
    scheduleSave();
  }
});

canvas.addEventListener("dblclick", () => {
  if (state.tool === "route" && state.activeRoute) {
    state.activeRoute = null;
  }
});

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

function downloadText(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function openMap() {
  if (isElectron) {
    const filePath = await window.mapstencil.openImage();
    if (!filePath) return;
    const exists = await window.mapstencil.fileExists(filePath);
    if (!exists) return;
    const img = new Image();
    img.src = `file://${filePath}`;
    img.onload = () => {
      state.image = img;
      state.baseMap = { type: "image", path: filePath, width: img.width, height: img.height };
      state.scale = 1;
      canvas.width = img.width;
      canvas.height = img.height;
      render();
    };
    return;
  }

  const file = await pickFile("image/*");
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    state.image = img;
    state.baseMap = { type: "image", name: file.name, width: img.width, height: img.height, webUrl: url };
    state.scale = 1;
    canvas.width = img.width;
    canvas.height = img.height;
    render();
  };
}

async function openProject() {
  if (isElectron) {
    const project = await window.mapstencil.openProject();
    if (!project) return;
    state.projectPath = project.filePath;
    state.baseMap = project.data.baseMap;
    state.pins = project.data.pins || [];
    state.routes = project.data.routes || [];
    const img = new Image();
    img.src = `file://${state.baseMap.path}`;
    img.onload = () => {
      state.image = img;
      state.scale = 1;
      canvas.width = img.width;
      canvas.height = img.height;
      render();
    };
    return;
  }

  const file = await pickFile("application/json");
  if (!file) return;
  const text = await file.text();
  const project = JSON.parse(text);
  state.projectPath = null;
  state.baseMap = project.baseMap;
  state.pins = project.pins || [];
  state.routes = project.routes || [];
  state.active = null;
  renderDetails();
  if (state.baseMap?.webUrl) {
    const img = new Image();
    img.src = state.baseMap.webUrl;
    img.onload = () => {
      state.image = img;
      canvas.width = img.width;
      canvas.height = img.height;
      render();
    };
  } else {
    alert("Project opened. Base map image cannot be restored in web mode unless webUrl is present.");
    render();
  }
}

function projectData() {
  return {
    version: 1,
    baseMap: state.baseMap,
    pins: state.pins,
    routes: state.routes,
  };
}

let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  if (!isElectron) return;
  saveTimer = setTimeout(() => {
    if (!state.projectPath) return;
    window.mapstencil.saveProject({ filePath: state.projectPath, data: projectData() });
  }, 1500);
}

saveProjectBtn.onclick = async () => {
  if (!state.baseMap) return;
  if (isElectron) {
    const path = await window.mapstencil.saveProject({ filePath: state.projectPath, data: projectData() });
    if (path) state.projectPath = path;
    return;
  }
  downloadText("mapstencil-project.json", JSON.stringify(projectData(), null, 2));
};

exportJsonBtn.onclick = async () => {
  if (!state.baseMap) return;
  if (isElectron) {
    await window.mapstencil.exportJson(projectData());
    return;
  }
  downloadText("mapstencil-export.json", JSON.stringify(projectData(), null, 2));
};

exportPngBtn.onclick = async () => {
  if (!state.baseMap) return;
  const dataUrl = canvas.toDataURL("image/png");
  if (isElectron) {
    await window.mapstencil.exportPng(dataUrl);
    return;
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "mapstencil.png";
  a.click();
};

openMapBtn.onclick = openMap;
openProjectBtn.onclick = openProject;

renderTools();
renderDetails();
