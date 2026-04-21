
const DEFAULT_MODEL = "gemini-1.5-flash"; // user can change in settings

const $ = (id) => document.getElementById(id);

const state = {
  tab: "dashboard", // dashboard | identify | chat | history | compare | guides
  online: navigator.onLine,
  apiKey: localStorage.getItem(KEY_STORE) || "",
  model: localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL,
  notifications: [],
  // Identify
  forensicMode: "general",
  imageFile: null,
  imageDataUrl: null,
  analyzing: false,
  result: null,
  // History
  history: [],
  // Compare
  compare: [],
  // Chat
  chatInput: "",
  chatBusy: false,
  chatMessages: [] // {role:'user'|'model', text}
};
