import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsp from "fs/promises";
import { spawn } from "child_process";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const processes = new Map();

function configPath() {
  return path.join(app.getPath("home"), ".dockyard", "config.json");
}

async function readConfig() {
  const file = configPath();
  try {
    const raw = await fsp.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { repos: [], presets: [{ name: "local", vars: { NODE_ENV: "development" } }] };
  }
}

async function writeConfig(config) {
  const file = configPath();
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(config, null, 2));
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=").replace(/^\"|\"$/g, "");
  }
  return env;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port, "0.0.0.0");
  });
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

ipcMain.handle("config:load", async () => readConfig());
ipcMain.handle("config:save", async (_event, config) => {
  await writeConfig(config);
  return { ok: true };
});

ipcMain.handle("dialog:selectFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("repo:checkNodeModules", async (_event, repoPath) => {
  return fs.existsSync(path.join(repoPath, "node_modules"));
});

ipcMain.handle("repo:checkPort", async (_event, port) => checkPort(port));

ipcMain.handle("repo:run", async (event, { repo, command, preset, overrides }) => {
  if (!repo?.path || !command) throw new Error("Invalid repo or command");
  if (processes.has(repo.id)) throw new Error("Process already running");

  const envBindings = repo.envPresetBindings || {};
  const envFile = envBindings[preset?.name] ? path.join(repo.path, envBindings[preset.name]) : null;
  const envVars = {
    ...process.env,
    ...(preset?.vars || {}),
    ...(envFile ? parseEnvFile(envFile) : {}),
    ...(overrides || {}),
  };

  const child = spawn(command, {
    cwd: repo.path,
    shell: true,
    env: envVars,
  });

  processes.set(repo.id, child);

  child.stdout.on("data", (data) => {
    event.sender.send("log", { repoId: repo.id, line: data.toString() });
  });

  child.stderr.on("data", (data) => {
    event.sender.send("log", { repoId: repo.id, line: data.toString() });
  });

  child.on("exit", (code) => {
    processes.delete(repo.id);
    event.sender.send("process:exit", { repoId: repo.id, code });
  });

  return { ok: true, pid: child.pid };
});

ipcMain.handle("repo:stop", async (_event, repoId) => {
  const child = processes.get(repoId);
  if (!child) return { ok: false };
  child.kill();
  processes.delete(repoId);
  return { ok: true };
});
