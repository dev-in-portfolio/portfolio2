const repoPanel = document.getElementById("repo-panel");
const detailPanel = document.getElementById("detail-panel");
const logPanel = document.getElementById("log-panel");
const statusBar = document.getElementById("status-bar");
const repoList = document.getElementById("repo-list");
const presetsList = document.getElementById("presets-list");
const workspacesList = document.getElementById("workspaces-list");
const currentRepoTitle = document.getElementById("current-repo-title");
const statusContent = document.getElementById("status-content");
const diagnosticsContent = document.getElementById("diagnostics-content");

const WEB_KEY = "dockyard.web.config.v1";
const isElectron = Boolean(window.dockyard);
const logListeners = [];
const exitListeners = [];

function defaultConfig() {
  return {
    repos: [],
    presets: [{ name: "local", vars: { NODE_ENV: "development" } }],
    workspaces: [],
  };
}

function loadWebConfig() {
  try {
    const raw = localStorage.getItem(WEB_KEY);
    return raw ? JSON.parse(raw) : defaultConfig();
  } catch {
    return defaultConfig();
  }
}

function saveWebConfig(config) {
  localStorage.setItem(WEB_KEY, JSON.stringify(config));
}

const api = isElectron
  ? window.dockyard
  : {
      async loadConfig() {
        return loadWebConfig();
      },
      async saveConfig(config) {
        saveWebConfig(config);
      },
      async selectFolder() {
        const value = window.prompt("Web mode: enter a repo label/path", "demo-repo");
        return value ? value.trim() : "";
      },
      async checkNodeModules(path) {
        return true;
      },
      async checkPort(port) {
        return false;
      },
      async runRepo({ repo, command, preset, overrides }) {
        const line = `web mode: simulated run for ${repo.name} -> ${command}\n`;
        logListeners.forEach((handler) => handler({ repoId: repo.id, line }));
      },
      async stopRepo(repoId) {
        exitListeners.forEach((handler) => handler({ repoId, code: 0 }));
      },
      onLog(handler) {
        logListeners.push(handler);
      },
      onExit(handler) {
        exitListeners.push(handler);
      },
    };

const state = {
  config: null,
  activeRepo: null,
  activeWorkspace: null,
  logs: {},
  running: {},
};

function renderRepos() {
  const repos = state.config.repos;
  repoList.innerHTML = "";
  
  repos.forEach((repo) => {
    const div = document.createElement("div");
    div.className = `repo-item ${state.activeRepo?.id === repo.id ? "active" : ""}`;
    div.innerHTML = `
      <div class="flex-between">
        <strong>${repo.name}</strong>
        <span class="status-dot ${state.running[repo.id] ? "status-running" : "status-stopped"}"></span>
      </div>
      <div class="small">${repo.path}</div>
    `;
    div.onclick = () => {
      state.activeRepo = repo;
      currentRepoTitle.textContent = `Dockyard - ${repo.name}`;
      renderDetail();
      renderRepos();
    };
    repoList.appendChild(div);
  });

  document.getElementById("add-repo").onclick = () => {
    document.getElementById("addRepoModal").style.display = "block";
  };
}

function renderPresets() {
  const presets = state.config.presets;
  presetsList.innerHTML = "";
  
  presets.forEach((preset) => {
    const div = document.createElement("div");
    div.className = "repo-item";
    div.innerHTML = `
      <div><strong>${preset.name}</strong></div>
      <div class="small">${Object.keys(preset.vars || {}).length} vars</div>
    `;
    presetsList.appendChild(div);
  });

  document.getElementById("add-preset").onclick = () => {
    document.getElementById("addPresetModal").style.display = "block";
  };
}

function renderWorkspaces() {
  const workspaces = state.config.workspaces;
  workspacesList.innerHTML = "";
  
  workspaces.forEach((workspace) => {
    const div = document.createElement("div");
    div.className = "repo-item";
    div.innerHTML = `
      <div><strong>${workspace.name}</strong></div>
      <div class="small">${workspace.repoIds?.length || 0} repos</div>
    `;
    div.onclick = () => {
      state.activeWorkspace = workspace;
      loadWorkspace(workspace);
    };
    workspacesList.appendChild(div);
  });

  document.getElementById("add-workspace").onclick = () => {
    renderWorkspaceRepoSelect();
    document.getElementById("addWorkspaceModal").style.display = "block";
  };
}

function renderWorkspaceRepoSelect() {
  const selectDiv = document.getElementById("workspace-repo-select");
  selectDiv.innerHTML = "";
  
  state.config.repos.forEach((repo) => {
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.margin = "4px 0";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = repo.id;
    checkbox.style.marginRight = "8px";
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(repo.name));
    selectDiv.appendChild(label);
  });
}

function loadWorkspace(workspace) {
  const workspaceRepos = state.config.repos.filter(repo => workspace.repoIds?.includes(repo.id));
  
  // Show workspace repos in main area
  repoPanel.innerHTML = `
    <div class="card">
      <h2>Workspace: ${workspace.name}</h2>
      <div id="workspace-repo-grid" class="grid-2"></div>
    </div>
  `;
  
  const grid = document.getElementById("workspace-repo-grid");
  workspaceRepos.forEach(repo => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${repo.name}</h3>
      <div class="small">${repo.path}</div>
      <div class="flex-gap" style="margin-top: 12px;">
        <button class="btn-success" data-repo-id="${repo.id}" data-command="dev">Start</button>
        <button class="btn-danger" data-repo-id="${repo.id}">Stop</button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  // Add event listeners for workspace buttons
  document.querySelectorAll("[data-repo-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const repoId = e.target.getAttribute("data-repo-id");
      const commandType = e.target.getAttribute("data-command");
      const repo = state.config.repos.find(r => r.id === repoId);
      
      if (e.target.classList.contains("btn-success")) {
        await startRepoProcess(repo, repo.commands[commandType]);
      } else {
        await stopRepoProcess(repoId);
      }
    });
  });
}

function renderDetail() {
  if (!state.activeRepo) {
    detailPanel.innerHTML = `<div class="card"><h2>Details</h2><p>Select a repo.</p></div>`;
    return;
  }
  
  const repo = state.activeRepo;
  detailPanel.innerHTML = `
    <div class="card">
      <h2 class="section-title">Repository: ${repo.name}</h2>
      
      <div class="grid-2">
        <div>
          <label>Path</label>
          <input id="repo-path" value="${repo.path}" />
          
          <label>Dev Command</label>
          <input id="cmd-dev" value="${repo.commands.dev}" />
          
          <label>Build Command</label>
          <input id="cmd-build" value="${repo.commands.build}" />
        </div>
        
        <div>
          <label>Test Command</label>
          <input id="cmd-test" value="${repo.commands.test}" />
          
          <label>Lint Command</label>
          <input id="cmd-lint" value="${repo.commands.lint}" />
          
          <label>Ports (comma)</label>
          <input id="repo-ports" value="${repo.ports.join(",")}" />
        </div>
      </div>
      
      <label>Preset</label>
      <select id="preset-select">
        ${state.config.presets.map((p) => `<option value="${p.name}">${p.name}</option>`).join("")}
      </select>
      
      <label>Env overrides (KEY=VALUE per line)</label>
      <textarea id="env-overrides" rows="4"></textarea>
      
      <div class="flex-gap">
        <button id="save-repo">Save</button>
        <button id="run-dev" class="btn-success">Start Dev</button>
        <button id="stop-dev" class="btn-danger">Stop</button>
      </div>
      
      <div id="detail-status" style="margin-top: 12px;"></div>
    </div>
  `;

  document.getElementById("save-repo").onclick = async () => {
    repo.path = document.getElementById("repo-path").value.trim();
    repo.commands.dev = document.getElementById("cmd-dev").value.trim();
    repo.commands.build = document.getElementById("cmd-build").value.trim();
    repo.commands.test = document.getElementById("cmd-test").value.trim();
    repo.commands.lint = document.getElementById("cmd-lint").value.trim();
    repo.ports = document
      .getElementById("repo-ports")
      .value.split(",")
      .map((p) => Number(p.trim()))
      .filter(Boolean);
    await api.saveConfig(state.config);
    renderRepos();
  };

  document.getElementById("run-dev").onclick = async () => {
    const status = document.getElementById("detail-status");
    try {
      const presetName = document.getElementById("preset-select").value;
      const preset = state.config.presets.find((p) => p.name === presetName);
      const overrides = parseOverrides(document.getElementById("env-overrides").value);
      
      // Run diagnostics
      const diagnostics = await runDiagnostics(repo, preset, overrides);
      renderDiagnostics(diagnostics);
      
      if (diagnostics.some(d => d.status === "error")) {
        status.innerHTML = '<span class="diagnostic-error">❌ Cannot start: diagnostics failed</span>';
        return;
      }
      
      await api.runRepo({ repo, command: repo.commands.dev, preset, overrides });
      status.innerHTML = '<span class="diagnostic-ok">✅ Dev server started</span>';
      state.running[repo.id] = true;
      renderStatus();
      renderRepos();
    } catch (err) {
      status.innerHTML = `<span class="diagnostic-error">❌ ${err.message}</span>`;
    }
  };

  document.getElementById("stop-dev").onclick = async () => {
    try {
      await api.stopRepo(repo.id);
      state.running[repo.id] = false;
      renderStatus();
      renderRepos();
      document.getElementById("detail-status").innerHTML = '<span class="diagnostic-warn">⏹️  Process stopped</span>';
    } catch (err) {
      document.getElementById("detail-status").innerHTML = `<span class="diagnostic-error">❌ ${err.message}</span>`;
    }
  };
}

async function runDiagnostics(repo, preset, overrides) {
  const diagnostics = [];
  
  // Check if path exists (simulated in web mode)
  diagnostics.push({
    name: "Path exists",
    status: isElectron ? "ok" : "warn",
    message: isElectron ? "Path verified" : "Web mode: path not checked"
  });
  
  // Check node_modules
  const hasModules = await api.checkNodeModules(repo.path);
  diagnostics.push({
    name: "node_modules",
    status: hasModules ? "ok" : "error",
    message: hasModules ? "Found" : "Missing - run npm install"
  });
  
  // Check ports
  for (const port of repo.ports) {
    const portInUse = await api.checkPort(port);
    diagnostics.push({
      name: `Port ${port}`,
      status: portInUse ? "error" : "ok",
      message: portInUse ? "Port in use" : "Port available"
    });
  }
  
  // Check command validity
  const hasDevCommand = repo.commands.dev && repo.commands.dev.trim();
  diagnostics.push({
    name: "Dev command",
    status: hasDevCommand ? "ok" : "error",
    message: hasDevCommand ? `Command: ${repo.commands.dev}` : "No dev command configured"
  });
  
  return diagnostics;
}

function renderDiagnostics(diagnostics) {
  diagnosticsContent.innerHTML = diagnostics.map(d => `
    <div class="diagnostic-item diagnostic-${d.status}">
      <strong>${d.name}</strong>
      <span>${d.message}</span>
    </div>
  `).join("");
}

function renderStatus() {
  const badges = Object.entries(state.running)
    .map(([id, running]) => {
      const repo = state.config.repos.find((r) => r.id === id);
      if (!repo) return "";
      return `<span class="tag">${repo.name}: ${running ? "running" : "stopped"}</span>`;
    })
    .join("");

  const mode = isElectron ? "💻 Desktop mode" : "🌐 Web preview mode";
  statusContent.innerHTML = `<div>${mode}</div><div style="margin-top: 8px;">${badges || "No processes running"}</div>`;
}

function renderLogs() {
  logPanel.innerHTML = `
    <div class="card">
      <h2 class="section-title">Logs</h2>
      <div class="log-box" id="log-box"></div>
      <button id="clear-logs" style="margin-top: 8px;">Clear Logs</button>
    </div>
  `;
  
  document.getElementById("clear-logs").onclick = () => {
    document.getElementById("log-box").textContent = "";
  };
}

async function startRepoProcess(repo, command) {
  const status = document.getElementById("detail-status");
  try {
    const presetName = "local"; // Default preset for workspace
    const preset = state.config.presets.find((p) => p.name === presetName);
    const overrides = {};
    
    await api.runRepo({ repo, command, preset, overrides });
    status.innerHTML = '<span class="diagnostic-ok">✅ Process started</span>';
    state.running[repo.id] = true;
    renderStatus();
  } catch (err) {
    status.innerHTML = `<span class="diagnostic-error">❌ ${err.message}</span>`;
  }
}

async function stopRepoProcess(repoId) {
  try {
    await api.stopRepo(repoId);
    state.running[repoId] = false;
    renderStatus();
  } catch (err) {
    console.error("Failed to stop process:", err);
  }
}

function parseOverrides(text) {
  const env = {};
  text.split(/\r?\n/).forEach((line) => {
    if (!line.includes("=")) return;
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim();
  });
  return env;
}

// Modal Event Handlers
document.getElementById("closeAddRepoModal").onclick = () => {
  document.getElementById("addRepoModal").style.display = "none";
};

document.getElementById("closeAddPresetModal").onclick = () => {
  document.getElementById("addPresetModal").style.display = "none";
};

document.getElementById("closeAddWorkspaceModal").onclick = () => {
  document.getElementById("addWorkspaceModal").style.display = "none";
};

document.getElementById("confirm-add-repo").onclick = async () => {
  const path = document.getElementById("new-repo-path").value.trim();
  const name = document.getElementById("new-repo-name").value.trim();
  
  if (!path || !name) {
    alert("Both path and name are required");
    return;
  }
  
  const repo = {
    id: crypto.randomUUID(),
    name,
    path,
    commands: { 
      dev: "npm run dev", 
      build: "npm run build", 
      test: "npm test", 
      lint: "npm run lint" 
    },
    ports: [3000],
    envPresetBindings: { local: ".env" },
  };
  
  state.config.repos.push(repo);
  await api.saveConfig(state.config);
  document.getElementById("addRepoModal").style.display = "none";
  document.getElementById("new-repo-path").value = "";
  document.getElementById("new-repo-name").value = "";
  renderRepos();
};

document.getElementById("confirm-add-preset").onclick = async () => {
  const name = document.getElementById("new-preset-name").value.trim();
  const varsText = document.getElementById("new-preset-vars").value;
  
  if (!name) {
    alert("Preset name is required");
    return;
  }
  
  const vars = parseOverrides(varsText);
  
  const preset = {
    name,
    vars,
  };
  
  state.config.presets.push(preset);
  await api.saveConfig(state.config);
  document.getElementById("addPresetModal").style.display = "none";
  document.getElementById("new-preset-name").value = "";
  document.getElementById("new-preset-vars").value = "";
  renderPresets();
};

document.getElementById("confirm-add-workspace").onclick = async () => {
  const name = document.getElementById("new-workspace-name").value.trim();
  
  if (!name) {
    alert("Workspace name is required");
    return;
  }
  
  const selectedRepos = Array.from(document.querySelectorAll('#workspace-repo-select input[type="checkbox"]:checked'))
    .map(checkbox => checkbox.value);
  
  if (selectedRepos.length === 0) {
    alert("Select at least one repository");
    return;
  }
  
  const workspace = {
    id: crypto.randomUUID(),
    name,
    repoIds: selectedRepos,
  };
  
  state.config.workspaces.push(workspace);
  await api.saveConfig(state.config);
  document.getElementById("addWorkspaceModal").style.display = "none";
  document.getElementById("new-workspace-name").value = "";
  renderWorkspaces();
};

document.getElementById("save-config").onclick = async () => {
  await api.saveConfig(state.config);
  alert("Configuration saved!");
};

document.getElementById("export-config").onclick = async () => {
  const configJson = JSON.stringify(state.config, null, 2);
  const blob = new Blob([configJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dockyard-config.json";
  a.click();
  URL.revokeObjectURL(url);
};

api.onLog(({ repoId, line }) => {
  const box = document.getElementById("log-box");
  if (!box) return;
  box.textContent += `[${repoId.slice(0, 4)}] ${line}`;
  box.scrollTop = box.scrollHeight;
});

api.onExit(({ repoId }) => {
  state.running[repoId] = false;
  renderStatus();
  renderRepos();
});

async function init() {
  state.config = await api.loadConfig();
  if (!state.config?.repos || !state.config?.presets || !state.config?.workspaces) {
    state.config = defaultConfig();
  }
  renderRepos();
  renderPresets();
  renderWorkspaces();
  renderDetail();
  renderLogs();
  renderStatus();
}

init();
