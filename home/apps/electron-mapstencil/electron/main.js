import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fsp from "fs/promises";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

ipcMain.handle("dialog:openImage", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:openProject", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "MapStencil", extensions: ["mapstencil.json"] }],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const raw = await fsp.readFile(filePath, "utf-8");
  return { filePath, data: JSON.parse(raw) };
});

ipcMain.handle("dialog:saveProject", async (_event, payload) => {
  let filePath = payload.filePath;
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      defaultPath: "project.mapstencil.json",
      filters: [{ name: "MapStencil", extensions: ["mapstencil.json"] }],
    });
    if (result.canceled) return null;
    filePath = result.filePath;
  }
  await fsp.writeFile(filePath, JSON.stringify(payload.data, null, 2));
  return filePath;
});

ipcMain.handle("dialog:exportJson", async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    defaultPath: "mapstencil-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled) return null;
  await fsp.writeFile(result.filePath, JSON.stringify(payload, null, 2));
  return result.filePath;
});

ipcMain.handle("dialog:exportPng", async (_event, dataUrl) => {
  const result = await dialog.showSaveDialog({
    defaultPath: "mapstencil-export.png",
    filters: [{ name: "PNG", extensions: ["png"] }],
  });
  if (result.canceled) return null;
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await fsp.writeFile(result.filePath, Buffer.from(base64, "base64"));
  return result.filePath;
});

ipcMain.handle("file:exists", async (_event, filePath) => fs.existsSync(filePath));
