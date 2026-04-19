import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("dockyard", {
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  checkNodeModules: (path) => ipcRenderer.invoke("repo:checkNodeModules", path),
  checkPort: (port) => ipcRenderer.invoke("repo:checkPort", port),
  runRepo: (payload) => ipcRenderer.invoke("repo:run", payload),
  stopRepo: (repoId) => ipcRenderer.invoke("repo:stop", repoId),
  onLog: (handler) => ipcRenderer.on("log", (_event, payload) => handler(payload)),
  onExit: (handler) => ipcRenderer.on("process:exit", (_event, payload) => handler(payload)),
});
