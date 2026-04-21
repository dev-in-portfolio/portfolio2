
// init
async function init(){
  const hydrated = await hydrateFromBackendIfNeeded();
  state.history = loadHistory();
  state.chatMessages = loadChat();
  if(hydrated){
    toast("success","Archive Synced","Recovered local-first plant dossiers from backend sync.");
  }
  render();
}

window.addEventListener("online", ()=>{ state.online=true; toast("success","System Connected","Neural link re-established."); render(); });
window.addEventListener("offline", ()=>{ state.online=false; toast("warning","System Offline","Local protocol initiated."); render(); });

init();
