// --- Backend sync (local-first). We intentionally do NOT sync API keys. ---
function buildBackendPayload(){
  return {
    model: state.model,
    history: state.history,
    chatMessages: state.chatMessages
  };
}

function scheduleRemoteSync(){
  try{ window.NexusAppData?.saveDebounced?.("floraguide-ai", buildBackendPayload(), 1200); }catch(_e){}
}

async function hydrateFromBackendIfNeeded(){
  try{
    // Only hydrate if local history/chat are empty
    const hasLocalHistory = !!localStorage.getItem(HISTORY_STORE);
    const hasLocalChat = !!localStorage.getItem(CHAT_STORE);
    if(hasLocalHistory || hasLocalChat) return false;

    const remote = await window.NexusAppData?.loadLatest?.("floraguide-ai");
    const p = remote?.payload;
    if(p && (Array.isArray(p.history) || Array.isArray(p.chatMessages) || p.model)){
      if(Array.isArray(p.history)) localStorage.setItem(HISTORY_STORE, JSON.stringify(p.history));
      if(Array.isArray(p.chatMessages)) localStorage.setItem(CHAT_STORE, JSON.stringify(p.chatMessages));
      if(typeof p.model === 'string') localStorage.setItem(MODEL_STORE, p.model);
      return true;
    }
  }catch(_e){}
