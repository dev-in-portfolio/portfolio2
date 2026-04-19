import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("receiptbox", {
  loadConfig: () => ipcRenderer.invoke("config:load"),
  createCase: (payload) => ipcRenderer.invoke("case:create", payload),
  addArtifact: (payload) => ipcRenderer.invoke("artifact:add", payload),
  updateArtifact: (payload) => ipcRenderer.invoke("artifact:update", payload),
  exportBundle: (caseId) => ipcRenderer.invoke("bundle:export", caseId),
  pickFiles: () => ipcRenderer.invoke("dialog:pickFile"),
});
