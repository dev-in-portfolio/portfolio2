function chatView(){
  const msgs = state.chatMessages;
  return `
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-comments text-slate-700"></i> Garden Chat
      </div>

      <div id="chatScroll" class="mt-4 rounded-2xl border border-slate-900/10 bg-white/55 p-4 h-[420px] overflow-auto">
        ${msgs.length ? msgs.map(m=>chatBubble(m)).join("") : `<div class="text-slate-600 text-sm">Ask anything about plant care, pests, soil mixes, watering schedules…</div>`}
      </div>

      <div class="mt-3 flex gap-2">
        <input id="chatInput" value="${escapeHtml(state.chatInput)}" placeholder="Ask Flora Forensics…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 text-sm" />
        <button id="chatSend" class="btnPrimary rounded-2xl px-5 py-3 text-sm font-semibold ${state.chatBusy ? "opacity-70 cursor-not-allowed" : ""}">
          ${state.chatBusy ? "…" : "Send"}
        </button>
      </div>

      <div class="mt-2 text-xs text-slate-600">Key required for live chat. ${state.apiKey ? "Key detected ✅" : "No key set."}</div>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-shield-leaf text-emerald-700"></i> Safety
      </div>
      <div class="mt-3 text-sm text-slate-700 leading-relaxed">
        This tool provides general gardening guidance. For toxic ingestion or severe plant disease, consult professionals.
      </div>

      <button id="clearChat" class="mt-4 btnGhost rounded-2xl px-4 py-2 text-sm font-semibold w-full">Clear chat</button>
    </div>
  </div>`;
}

function chatBubble(m){
  const isUser = m.role==="user";
  const align = isUser ? "justify-end" : "justify-start";
  const bg = isUser ? "bg-emerald-500/15 border-emerald-600/20" : "bg-slate-900/5 border-slate-900/10";
  const label = isUser ? "YOU" : "FLORA";
  return `<div class="flex ${align} mb-2">
    <div class="max-w-[92%] rounded-2xl border ${bg} px-4 py-3">
      <div class="mono text-[10px] text-slate-600 mb-1">${label}</div>
      <div class="text-sm text-slate-800 whitespace-pre-wrap">${escapeHtml(m.text||"")}</div>
    </div>
  </div>`;
}

function settingsModal(){
  const keyMasked = state.apiKey ? (state.apiKey.slice(0,4)+"••••••••"+state.apiKey.slice(-4)) : "";
  return `
  <div id="settingsModal" class="fixed inset-0 hidden items-center justify-center p-4">
    <div class="fixed inset-0 modalBackdrop"></div>
    <div class="relative max-w-lg w-full glass rounded-3xl border border-white/20 shadow-soft overflow-hidden">
      <div class="p-5 border-b border-slate-900/10 flex items-center justify-between">
        <div class="font-semibold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-gear"></i> Settings</div>
        <button data-close="settingsModal" class="btnGhost rounded-2xl px-3 py-2 text-sm font-semibold">Close</button>
      </div>
      <div class="p-5 space-y-4">
        <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-4">
          <div class="text-sm font-semibold text-slate-900">Provider Key</div>
          <div class="text-xs text-slate-600 mt-1">Paste your key to enable live analysis & chat. Stored locally on this device.</div>

          <div class="mt-3 flex gap-2">
            <input id="apiKeyInput" placeholder="Paste key…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/80 px-4 py-3 text-sm mono" />
            <button id="saveKeyBtn" class="btnPrimary rounded-2xl px-4 py-3 text-sm font-semibold">Save</button>
          </div>

          ${state.apiKey ? `<div class="mt-2 text-xs text-slate-600 mono">Saved: ${escapeHtml(keyMasked)}</div>` : `<div class="mt-2 text-xs text-slate-600 mono">No key saved.</div>`}
