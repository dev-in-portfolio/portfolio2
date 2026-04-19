import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsp from "fs/promises";
import crypto from "crypto";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = () => path.join(app.getPath("home"), "ReceiptBox");
const configPath = () => path.join(baseDir(), "config.json");

async function ensureDirs() {
  await fsp.mkdir(path.join(baseDir(), "cases"), { recursive: true });
}

async function loadConfig() {
  await ensureDirs();
  try {
    const raw = await fsp.readFile(configPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { cases: [], artifacts: [] };
  }
}

async function saveConfig(config) {
  await ensureDirs();
  await fsp.writeFile(configPath(), JSON.stringify(config, null, 2));
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function artifactType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return "image";
  if ([".txt", ".log", ".diff", ".patch", ".md"].includes(ext)) return "text";
  return "binary";
}

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const data = await fsp.readFile(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function createCase(payload) {
  const config = await loadConfig();
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const folderName = `${createdAt.slice(0, 10)}__${slugify(payload.title)}__${slugify(payload.project)}`;
  const folder = path.join(baseDir(), "cases", folderName);
  await fsp.mkdir(path.join(folder, "artifacts"), { recursive: true });
  const entry = {
    id,
    title: payload.title,
    project: payload.project,
    tags: payload.tags || [],
    created_at: createdAt,
    updated_at: createdAt,
    folder,
  };
  config.cases.push(entry);
  await saveConfig(config);
  return entry;
}

async function addArtifact(caseId, filePath) {
  const config = await loadConfig();
  const caseEntry = config.cases.find((c) => c.id === caseId);
  if (!caseEntry) throw new Error("Case not found");
  const hash = await sha256(filePath);
  const existing = config.artifacts.find((a) => a.caseId === caseId && a.sha256 === hash);
  if (existing) return { duplicate: true, artifact: existing };

  const ext = path.extname(filePath);
  const index = config.artifacts.filter((a) => a.caseId === caseId).length + 1;
  const filename = `${String(index).padStart(3, "0")}_${slugify(path.basename(filePath, ext))}${ext}`;
  const target = path.join(caseEntry.folder, "artifacts", filename);
  await fsp.copyFile(filePath, target);

  const artifact = {
    id: crypto.randomUUID(),
    caseId,
    filename,
    originalPath: filePath,
    type: artifactType(filePath),
    sha256: hash,
    captured_at: new Date().toISOString(),
    tags: [],
    notes: "",
  };
  config.artifacts.push(artifact);
  caseEntry.updated_at = new Date().toISOString();
  await saveConfig(config);
  return { duplicate: false, artifact };
}

async function updateArtifact(artifactId, updates) {
  const config = await loadConfig();
  const artifact = config.artifacts.find((a) => a.id === artifactId);
  if (!artifact) throw new Error("Artifact not found");
  Object.assign(artifact, updates);
  await saveConfig(config);
  return artifact;
}

async function exportBundle(caseId) {
  const config = await loadConfig();
  const caseEntry = config.cases.find((c) => c.id === caseId);
  if (!caseEntry) throw new Error("Case not found");
  const artifacts = config.artifacts.filter((a) => a.caseId === caseId);
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `${slugify(caseEntry.title)}.zip`,
  });
  if (!filePath) return null;

  const output = fs.createWriteStream(filePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  const manifest = {
    case: {
      title: caseEntry.title,
      project: caseEntry.project,
      created_at: caseEntry.created_at,
    },
    artifacts: artifacts.map((a) => ({
      filename: a.filename,
      type: a.type,
      sha256: a.sha256,
      captured_at: a.captured_at,
      tags: a.tags,
      notes: a.notes,
    })),
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: "MANIFEST.json" });
  archive.append(`# ReceiptBox Bundle\n\n${caseEntry.title} (${caseEntry.project})`, { name: "README.md" });
  for (const artifact of artifacts) {
    const file = path.join(caseEntry.folder, "artifacts", artifact.filename);
    archive.file(file, { name: `artifacts/${artifact.filename}` });
  }
  await archive.finalize();
  return filePath;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(createWindow);

ipcMain.handle("config:load", async () => loadConfig());
ipcMain.handle("case:create", async (_event, payload) => createCase(payload));
ipcMain.handle("artifact:add", async (_event, payload) => addArtifact(payload.caseId, payload.filePath));
ipcMain.handle("artifact:update", async (_event, payload) => updateArtifact(payload.id, payload.updates));
ipcMain.handle("bundle:export", async (_event, caseId) => exportBundle(caseId));
ipcMain.handle("dialog:pickFile", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] });
  if (result.canceled) return [];
  return result.filePaths;
});
