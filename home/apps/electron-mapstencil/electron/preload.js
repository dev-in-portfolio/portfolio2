import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("mapstencil", {
  openImage: () => ipcRenderer.invoke("dialog:openImage"),
  openProject: () => ipcRenderer.invoke("dialog:openProject"),
  saveProject: (payload) => ipcRenderer.invoke("dialog:saveProject", payload),
  exportJson: (payload) => ipcRenderer.invoke("dialog:exportJson", payload),
  exportPng: (dataUrl) => ipcRenderer.invoke("dialog:exportPng", dataUrl),
  fileExists: (filePath) => ipcRenderer.invoke("file:exists", filePath),
});
