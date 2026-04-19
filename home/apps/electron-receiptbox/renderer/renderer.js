const casePanel = document.getElementById("case-panel");
const artifactPanel = document.getElementById("artifact-panel");
const previewPanel = document.getElementById("preview-panel");
const exportBtn = document.getElementById("export-case");

const WEB_KEY = "receiptbox.web.config.v1";
const isElectron = Boolean(window.receiptbox);

const state = {
  config: null,
  activeCase: null,
  activeArtifact: null,
};

function defaultConfig() {
  return { cases: [], artifacts: [] };
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

function pickFilesWeb() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const api = isElectron
  ? window.receiptbox
  : {
      async loadConfig() {
        return loadWebConfig();
      },
      async createCase({ title, project, tags }) {
        const created = {
          id: crypto.randomUUID(),
          title,
          project,
          tags,
          folder: "web-mode",
          createdAt: new Date().toISOString(),
        };
        return created;
      },
      async addArtifact({ caseId, file }) {
        const duplicate = state.config.artifacts.some((a) => a.caseId === caseId && a.filename === file.name);
        if (duplicate) {
          return { duplicate: true };
        }
        const isImage = file.type.startsWith("image/");
        const artifact = {
          id: crypto.randomUUID(),
          caseId,
          filename: file.name,
          type: isImage ? "image" : "file",
          tags: [],
          notes: "",
          previewDataUrl: isImage ? await readAsDataUrl(file) : null,
        };
        return { duplicate: false, artifact };
      },
      async updateArtifact({ id, updates }) {
        const artifact = state.config.artifacts.find((a) => a.id === id);
        Object.assign(artifact, updates);
        return artifact;
      },
      async exportBundle(caseId) {
        const caseEntry = state.config.cases.find((c) => c.id === caseId);
        const artifacts = state.config.artifacts.filter((a) => a.caseId === caseId);
        const payload = {
          exportedAt: new Date().toISOString(),
          case: caseEntry,
          artifacts,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${caseEntry.title.replace(/\s+/g, "-").toLowerCase()}-bundle.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      async pickFiles() {
        return pickFilesWeb();
      },
    };

async function loadConfig() {
  state.config = await api.loadConfig();
  if (!state.config?.cases || !state.config?.artifacts) {
    state.config = defaultConfig();
  }
  renderCases();
  renderArtifacts();
  renderPreview();
}

function persistIfWeb() {
  if (!isElectron) {
    saveWebConfig(state.config);
  }
}

function renderCases() {
  casePanel.innerHTML = `
    <h2>Cases</h2>
    <p>${isElectron ? "Desktop mode" : "Web preview mode"}</p>
    <label>Title</label>
    <input id="case-title" placeholder="Netlify build fail" />
    <label>Project</label>
    <input id="case-project" placeholder="micro-exhibits" />
    <label>Tags (comma)</label>
    <input id="case-tags" placeholder="deploy,netlify" />
    <button id="create-case">Create Case</button>
    <div id="case-list"></div>
  `;
  const list = document.getElementById("case-list");
  state.config.cases.forEach((caseEntry) => {
    const div = document.createElement("div");
    div.className = `case-item ${state.activeCase?.id === caseEntry.id ? "active" : ""}`;
    div.innerHTML = `<strong>${caseEntry.title}</strong><div>${caseEntry.project}</div>`;
    div.onclick = () => {
      state.activeCase = caseEntry;
      state.activeArtifact = null;
      renderCases();
      renderArtifacts();
      renderPreview();
    };
    list.appendChild(div);
  });

  document.getElementById("create-case").onclick = async () => {
    const title = document.getElementById("case-title").value.trim();
    const project = document.getElementById("case-project").value.trim();
    const tags = document
      .getElementById("case-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!title || !project) return;
    const created = await api.createCase({ title, project, tags });
    state.config.cases.push(created);
    state.activeCase = created;
    persistIfWeb();
    renderCases();
    renderArtifacts();
  };
}

function renderArtifacts() {
  if (!state.activeCase) {
    artifactPanel.innerHTML = `<h2>Artifacts</h2><p>Select a case.</p>`;
    return;
  }
  const artifacts = state.config.artifacts.filter((a) => a.caseId === state.activeCase.id);
  artifactPanel.innerHTML = `
    <h2>Artifacts</h2>
    <button id="add-artifact">Add Files</button>
    <div id="artifact-list"></div>
  `;

  document.getElementById("add-artifact").onclick = async () => {
    if (isElectron) {
      const paths = await api.pickFiles();
      for (const filePath of paths) {
        const result = await api.addArtifact({ caseId: state.activeCase.id, filePath });
        if (!result.duplicate) {
          state.config.artifacts.push(result.artifact);
        }
      }
    } else {
      const files = await api.pickFiles();
      for (const file of files) {
        const result = await api.addArtifact({ caseId: state.activeCase.id, file });
        if (!result.duplicate) {
          state.config.artifacts.push(result.artifact);
        }
      }
    }
    persistIfWeb();
    renderArtifacts();
  };

  const list = document.getElementById("artifact-list");
  artifacts.forEach((artifact) => {
    const div = document.createElement("div");
    div.className = "artifact-item";
    div.innerHTML = `<strong>${artifact.filename}</strong><div>${artifact.type}</div>`;
    div.onclick = () => {
      state.activeArtifact = artifact;
      renderPreview();
    };
    list.appendChild(div);
  });
}

function renderPreview() {
  if (!state.activeArtifact) {
    previewPanel.innerHTML = `<h2>Preview</h2><p>Select an artifact.</p>`;
    return;
  }
  const artifact = state.activeArtifact;
  previewPanel.innerHTML = `
    <h2>${artifact.filename}</h2>
    <div class="preview" id="preview-box"></div>
    <label>Tags (comma)</label>
    <input id="artifact-tags" value="${artifact.tags.join(",")}" />
    <label>Notes</label>
    <textarea id="artifact-notes">${artifact.notes}</textarea>
    <button id="save-artifact">Save</button>
  `;

  const previewBox = document.getElementById("preview-box");
  if (artifact.type === "image") {
    const img = document.createElement("img");
    img.src = isElectron
      ? `file://${state.activeCase.folder}/artifacts/${artifact.filename}`
      : artifact.previewDataUrl;
    img.style.maxWidth = "100%";
    previewBox.appendChild(img);
  } else {
    previewBox.textContent = artifact.filename;
  }

  document.getElementById("save-artifact").onclick = async () => {
    const tags = document
      .getElementById("artifact-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const notes = document.getElementById("artifact-notes").value;
    const updated = await api.updateArtifact({ id: artifact.id, updates: { tags, notes } });
    Object.assign(artifact, updated);
    persistIfWeb();
  };
}

exportBtn.onclick = async () => {
  if (!state.activeCase) return;
  await api.exportBundle(state.activeCase.id);
};

loadConfig();
