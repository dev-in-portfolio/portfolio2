
(() => {

  const $ = (id) => document.getElementById(id);

// -------------------------------------------------------------
// Public‑domain music examples (remote URLs)
// NOTE: We do NOT bundle audio files inside the repo because this
// project is drag‑and‑drop static hosting and the container that
// builds the zip has no internet access. Instead, we reference
// Wikimedia Commons "Special:FilePath" URLs (CORS‑friendly) so the
// browser can fetch the audio at runtime.
// -------------------------------------------------------------

const MUSIC_LIBRARY = {
  fur_elise: {
    label: "Für Elise (CC0)",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/FurElise.ogg",
    filename: "FurElise.ogg",
  },
  gymnopedie: {
    label: "Gymnopédie No. 1 (PD/CC0)",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Gymnopedie%20No.%201..ogg",
    filename: "Gymnopedie No. 1..ogg",
  },
  clair_de_lune: {
    label: "Clair de Lune (USAF Band, PD)",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Clair%20de%20Lune%20-%20Wright%20Brass%20-%20United%20States%20Air%20Force%20Band%20of%20Flight.mp3",
    filename: "Clair de Lune - Wright Brass - United States Air Force Band of Flight.mp3",
  },
  moonlight: {
    label: "Moonlight Sonata (Musopen, PD)",
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Ludwig%20van%20Beethoven%20-%20sonata%20no.%2014%20in%20c%20sharp%20minor%20%27moonlight%27%2C%20op.%2027%20no.%202%20-%20i.%20adagio%20sostenuto.ogg",
    filename:
      "Ludwig van Beethoven - sonata no. 14 in c sharp minor 'moonlight', op. 27 no. 2 - i. adagio sostenuto.ogg",
  },
  maple_leaf: {
    label: "Maple Leaf Rag (1916, PD)",
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Maple%20Leaf%20Rag%20-%20played%20by%20Scott%20Joplin%201916%20sample.ogg",
    filename: "Maple Leaf Rag - played by Scott Joplin 1916 sample.ogg",
  },
  entertainer: {
    label: "The Entertainer (1902, PD)",
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Scott%20Joplin%20-%2004%20-%20The%20Entertainer%201902%20piano%20roll.mp3",
    filename: "Scott Joplin - 04 - The Entertainer 1902 piano roll.mp3",
  },
  blue_danube: {
    label: "Blue Danube (Vienna Phil, CC0)",
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Johann%20Strauss%20II%20-%20An%20der%20sch%C3%B6nen%20blauen%20Donau%20-%20Vienna%20Philharmonic%20Orchestra%20conducted%20by%20Hans%20Knappertsbusch.ogg",
    filename:
      "Johann Strauss II - An der schönen blauen Donau - Vienna Philharmonic Orchestra conducted by Hans Knappertsbusch.ogg",
  },
  valkyries: {
    label: "Ride of the Valkyries (1921, PD)",
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Richard%20Wagner%20-%20Ride%20of%20the%20Valkyries%20original.ogg",
    filename: "Richard Wagner - Ride of the Valkyries original.ogg",
  },
  hall_mountain_king: {
    label: "Hall of the Mountain King (PD)",
    // If this URL ever 404s, user can still upload their own music file.
    url:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Edvard%20Grieg%20-%20In%20the%20Hall%20of%20the%20Mountain%20King.ogg",
    filename: "Edvard Grieg - In the Hall of the Mountain King.ogg",
  },
};

async function fileFromMusicLibrary() {
  const sel = $("musicLibrary");
  const choice = sel && sel.value ? MUSIC_LIBRARY[sel.value] : null;
  if (!choice) return null;

  try {
    showToast(`Fetching music: ${choice.label}…`, 2000);
    const res = await fetch(choice.url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const name = choice.filename || `music_${sel.value}`;
    const type = blob.type || (name.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/ogg");
    return new File([blob], name, { type });
  } catch (e) {
    console.error("Music library fetch failed:", e);
    showToast(`Music library track failed to load (${String(e)}). Upload a local file instead.`, 3200);
    return null;
  }
}
  const fileInput = $("fileInput");
  const assetEmpty = $("assetEmpty");
  const assetGrid = $("assetGrid");
  const player = $("player");
  const nowPlaying = $("nowPlaying");
  const clipMeta = $("clipMeta");
  const timelineEmpty = $("timelineEmpty");
  const timelineList = $("timelineList");
  const clearTimelineBtn = $("clearTimelineBtn");
  const resetBtn = $("resetBtn");
  const playSeqBtn = $("playSeqBtn");
  const stopBtn = $("stopBtn");

  const toast = $("toast");
  const renderBtn = $("renderBtn");
  const exportBriefBtn = $("exportBriefBtn");
  const resSel = $("resSel");
  const fmtSel = $("fmtSel");
  const presetBtns = [...document.querySelectorAll(".presetBtn")];

  const STORAGE_KEY = "splice_video_v1";

  /** @type {{assets: any[], timeline: any[], preset: string, res: string, fmt: string}} */
  const state = {
    assets: [],   // { id, name, url, duration }
    timeline: [], // normalized clip objects with trims, beat markers, timing metadata, and notes
    preset: "Standard",
    res: "720p",
    fmt: "MP4",
  };

  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);

  function showToast(msg, ms=1800){
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add("ring-1","ring-white/20");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("ring-1","ring-white/20");
    }, ms);
  }

  function triggerDownload(filename, mime, dataStr){
  try{
    const blob = new Blob([dataStr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after a moment to avoid canceling download on some mobiles
    setTimeout(() => { try{ URL.revokeObjectURL(url); }catch{} }, 30000);
    return true;
  }catch(err){
    console.warn('[Splice] triggerDownload failed', err);
    return false;
  }
}

async function downloadBlob(blob, filename){
  // Reliable-ish download across desktop + Android.
  // Some Android WebViews ignore <a download> for blob URLs unless it's a direct user gesture.
  // When available, File System Access API is more dependable.
  try{
    if (window.showSaveFilePicker && typeof window.showSaveFilePicker === 'function'){
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok:true, method:'filePicker' };
    }
  }catch(err){
    console.warn('[Splice] showSaveFilePicker failed; falling back to blob download', err);
  }

  try{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    // target _blank helps some mobile flows complete the download
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { try{ URL.revokeObjectURL(url); }catch{} }, 30000);
    return { ok:true, method:'anchor' };
  }catch(err){
    console.error('[Splice] downloadBlob failed', err);
    return { ok:false, method:'none', err };
  }
}

function fmtTime(sec){
    if (!Number.isFinite(sec)) return "—";
    const m = Math.floor(sec / 60);
    const s = sec - m*60;
    return `${m}:${s.toFixed(2).padStart(5,"0")}`;
  }

  function clampNum(n, a, b){
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
  }

  function clipDuration(clip){
    return Math.max(0, (clip?.end || 0) - (clip?.start || 0));
  }

  function clipPlannedDuration(clip){
    return clipDuration(clip) + Math.max(0, Number(clip?.holdAfter || 0));
  }

  function guessBeat(idx, label){
    const text = String(label || "").toLowerCase();
    if (text.includes("intro") || idx === 0) return "intro";
    if (text.includes("reveal")) return "reveal";
    if (text.includes("proof") || text.includes("demo")) return "proof";
    if (text.includes("cta") || text.includes("close") || text.includes("outro")) return "cta";
    return "build";
  }

  function beatColor(beat){
    switch (beat){
      case "intro": return "#39FF14";
      case "build": return "#60A5FA";
      case "reveal": return "#F59E0B";
      case "proof": return "#F472B6";
      case "cta": return "#FB7185";
      default: return "rgba(255,255,255,0.55)";
    }
  }

  function normalizeTimelineClip(raw, asset=null, idx=0){
    const assetDuration = Number.isFinite(asset?.duration) ? Math.max(0.01, asset.duration) : Math.max(0.01, Number(raw?.end || 0.01));
    const start = clampNum(Number(raw?.start ?? 0), 0, assetDuration);
    let end = clampNum(Number(raw?.end ?? assetDuration), 0.01, assetDuration);
    if (end <= start) end = clampNum(start + 0.25, 0.01, assetDuration);
    const label = String(raw?.label || "").slice(0, 80);
    const beat = ["intro","build","reveal","proof","cta"].includes(raw?.beat) ? raw.beat : guessBeat(idx, label || asset?.name);
    const transition = ["cut","dissolve","hold","punch"].includes(raw?.transition) ? raw.transition : "cut";
    const transitionSec = clampNum(Number(raw?.transitionSec ?? 0.2), 0, 4);
    const holdAfter = clampNum(Number(raw?.holdAfter ?? 0), 0, 8);
    const notes = String(raw?.notes || "").slice(0, 240);
    return {
      id: typeof raw?.id === "string" ? raw.id : uid(),
      assetId: raw?.assetId || asset?.id || "",
      start,
      end,
      label,
      beat,
      transition,
      transitionSec,
      holdAfter,
      notes
    };
  }

  function normalizeTimeline(){
    state.timeline = state.timeline
      .map((clip, idx) => normalizeTimelineClip(clip, state.assets.find(a => a.id === clip.assetId), idx))
      .filter(clip => clip.assetId);
  }

  function timelineSummary(){
    const totalRuntime = state.timeline.reduce((sum, clip) => sum + clipPlannedDuration(clip), 0);
    const beatCount = state.timeline.length;
    const averageBeat = beatCount ? totalRuntime / beatCount : 0;
    const transitionCounts = state.timeline.reduce((acc, clip) => {
      acc[clip.transition] = (acc[clip.transition] || 0) + 1;
      return acc;
    }, {});
    const dominantTransition = Object.entries(transitionCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "cut";
    return {
      totalRuntime,
      beatCount,
      averageBeat,
      dominantTransition,
      annotated: state.timeline.filter(clip => clip.notes.trim()).length
    };
  }

  function renderTimelineSummary(){
    const summary = document.getElementById("timelineSummary");
    if (!summary) return;
    const stats = timelineSummary();
    summary.innerHTML = `
      <div class="spliceSummaryCard">
        <div class="spliceSummaryLabel">Runtime</div>
        <div class="spliceSummaryValue">${fmtTime(stats.totalRuntime)}</div>
        <div class="spliceSummarySub">Trimmed duration plus hold beats</div>
      </div>
      <div class="spliceSummaryCard">
        <div class="spliceSummaryLabel">Beats</div>
        <div class="spliceSummaryValue">${stats.beatCount}</div>
        <div class="spliceSummarySub">${stats.annotated} with notes attached</div>
      </div>
      <div class="spliceSummaryCard">
        <div class="spliceSummaryLabel">Pacing</div>
        <div class="spliceSummaryValue">${stats.beatCount ? fmtTime(stats.averageBeat) : "—"}</div>
        <div class="spliceSummarySub">Average planned duration per beat</div>
      </div>
      <div class="spliceSummaryCard">
        <div class="spliceSummaryLabel">Transitions</div>
        <div class="spliceSummaryValue">${stats.dominantTransition}</div>
        <div class="spliceSummarySub">Most common handoff mode in sequence</div>
      </div>
    `;
  }

  function pacingDiagnostic(){
    if (!state.timeline.length){
      return "Add a few beats and Splice will call out pacing risks, missing structure, and transition balance here.";
    }
    const stats = timelineSummary();
    const issues = [];
    const hasIntro = state.timeline.some(clip => clip.beat === "intro");
    const hasCta = state.timeline.some(clip => clip.beat === "cta");
    if (!hasIntro) issues.push("No intro beat yet. The sequence drops viewers directly into the action.");
    if (!hasCta) issues.push("No CTA beat yet. The sequence has no explicit closing move.");

    state.timeline.forEach((clip, idx) => {
      const planned = clipPlannedDuration(clip);
      if (planned < 0.9) issues.push(`Beat ${idx + 1} is under one second planned runtime. It will read as a flash unless that is intentional.`);
      if (planned > 6) issues.push(`Beat ${idx + 1} runs long at ${fmtTime(planned)}. Consider splitting or tightening it.`);
      if (clip.transition === "dissolve" && clip.transitionSec > planned * 0.45){
        issues.push(`Beat ${idx + 1} spends too much of its runtime dissolving. Transition length is dominating the beat.`);
      }
    });

    if (stats.averageBeat && stats.averageBeat < 1.4) issues.push("Average pacing is very aggressive. Good for reels, risky for explanation-heavy sequences.");
    if (stats.averageBeat && stats.averageBeat > 4.5) issues.push("Average pacing is slow. Good for mood, risky for short-form retention.");
    if (stats.dominantTransition === "cut" && state.timeline.length >= 4) issues.push("Cuts dominate the whole sequence. Add one deliberate contrast beat if you want the pacing to breathe.");

    return issues.length
      ? issues.join("\n")
      : "Pacing looks balanced. You have a usable structure, reasonable beat lengths, and no obvious transition imbalance.";
  }

  function buildSequenceBrief(){
    if (!state.timeline.length){
      return "Splice sequence brief\n\nNo timeline beats yet.";
    }
    const stats = timelineSummary();
    const lines = [
      "Splice sequence brief",
      "",
      `Runtime: ${fmtTime(stats.totalRuntime)}`,
      `Beats: ${stats.beatCount}`,
      `Average beat: ${stats.averageBeat ? fmtTime(stats.averageBeat) : "—"}`,
      `Dominant transition: ${stats.dominantTransition}`,
      "",
      "Pacing readout:",
      pacingDiagnostic(),
      "",
      "Beat plan:"
    ];

    state.timeline.forEach((clip, idx) => {
      const asset = state.assets.find(a => a.id === clip.assetId);
      lines.push(
        `${idx + 1}. ${clip.label || asset?.name || "Untitled beat"}`,
        `   beat: ${clip.beat} | trim: ${fmtTime(clip.start)} -> ${fmtTime(clip.end)} | planned: ${fmtTime(clipPlannedDuration(clip))}`,
        `   transition: ${clip.transition} (${Number(clip.transitionSec || 0).toFixed(2)}s) | hold: ${Number(clip.holdAfter || 0).toFixed(2)}s`,
        `   source: ${asset?.name || "(missing asset)"}`,
        `   note: ${clip.notes?.trim() || "No note"}`
      );
    });

    return lines.join("\n");
  }

  function renderSequenceBrief(){
    const preview = $("briefPreview");
    const diagnostic = $("timelineDiagnostic");
    if (preview) preview.textContent = buildSequenceBrief();
    if (diagnostic){
      diagnostic.innerHTML = `
        <div class="spliceDiagnosticTitle">Pacing Readout</div>
        <div class="spliceDiagnosticText">${escapeHtml(pacingDiagnostic())}</div>
      `;
    }
  }

  function persist(){
    try{
      normalizeTimeline();
      const slim = {
        assets: state.assets.map(a => ({ id:a.id, name:a.name, url:a.url, duration:a.duration })),
        timeline: state.timeline,
        preset: state.preset,
        res: state.res,
        fmt: state.fmt
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    }catch{}
  }

  function clearPersist(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  }

  async function readVideoDuration(url){
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
      v.onerror = () => resolve(0);
    });
  }

  function renderAssets(){
    if (state.assets.length === 0){
      assetEmpty.hidden = false;
      assetGrid.hidden = true;
      assetGrid.innerHTML = "";
      return;
    }
    assetEmpty.hidden = true;
    assetGrid.hidden = false;
    assetGrid.innerHTML = "";

    for (const a of state.assets){
      const card = document.createElement("div");
      card.className = "rounded-2xl border border-white/10 bg-black/30 overflow-hidden hover:bg-black/40 transition";
      card.innerHTML = `
        <div class="aspect-video bg-black/60">
          <video class="w-full h-full object-cover" src="${a.url}" muted playsinline preload="metadata"></video>
        </div>
        <div class="p-3 space-y-2">
          <div class="text-[11px] font-semibold text-zinc-200 truncate" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</div>
          <div class="text-[10px] text-zinc-500">Duration: <span class="text-zinc-300 font-semibold">${fmtTime(a.duration)}</span></div>
          <div class="flex items-center gap-2">
            <button class="addBtn flex-1 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-[0.18em] px-3 py-2 hover:bg-zinc-200 transition" data-id="${a.id}">Add</button>
            <button class="previewBtn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold hover:bg-white/10 transition" data-id="${a.id}">Preview</button>
          </div>
        </div>
      `;
      assetGrid.appendChild(card);
    }
  }

  function renderTimeline(){
    normalizeTimeline();
    renderTimelineSummary();
    renderSequenceBrief();
    if (state.timeline.length === 0){
      timelineEmpty.hidden = false;
      timelineList.hidden = true;
      timelineList.innerHTML = "";
      return;
    }
    timelineEmpty.hidden = true;
    timelineList.hidden = false;
    timelineList.innerHTML = "";

    state.timeline.forEach((c, idx) => {
      const a = state.assets.find(x => x.id === c.assetId);
      const name = a ? a.name : "(missing asset)";
      const dur = a ? a.duration : 0;
      const trimDuration = clipDuration(c);
      const plannedDuration = clipPlannedDuration(c);
      const sequenceOffset = state.timeline.slice(0, idx).reduce((sum, clip) => sum + clipPlannedDuration(clip), 0);

      const row = document.createElement("div");
      row.className = "rounded-2xl border border-white/10 bg-black/30 p-3";
      row.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold text-zinc-200 truncate">${escapeHtml(c.label || `Clip ${idx+1}`)}</div>
            <div class="text-[10px] text-zinc-500 truncate">${escapeHtml(name)}</div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="spliceBeatPill" style="--beat-color:${beatColor(c.beat)}">${escapeHtml(c.beat)}</span>
              <span class="text-[10px] text-zinc-500">Seq ${fmtTime(sequenceOffset)}</span>
              <span class="text-[10px] text-zinc-500">Trim ${fmtTime(trimDuration)}</span>
              <span class="text-[10px] text-zinc-500">Planned ${fmtTime(plannedDuration)}</span>
            </div>
            <div class="mt-1 text-[10px] text-zinc-500">${fmtTime(c.start)} → ${fmtTime(c.end)} <span class="text-zinc-700">•</span> src ${fmtTime(dur)} <span class="text-zinc-700">•</span> ${escapeHtml(c.transition)} ${Number(c.transitionSec || 0).toFixed(2)}s</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="playClipBtn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold hover:bg-white/10 transition" data-id="${c.id}">Play</button>
            <button class="upBtn rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-semibold hover:bg-white/10 transition" data-id="${c.id}">↑</button>
            <button class="downBtn rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-semibold hover:bg-white/10 transition" data-id="${c.id}">↓</button>
            <button class="delBtn rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-semibold hover:bg-white/10 transition" data-id="${c.id}">✕</button>
          </div>
        </div>

        <div class="mt-3 spliceTimelineGrid">
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Start</label>
            <input class="startIn w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50" type="number" step="0.01" min="0" max="${dur}" value="${c.start}" data-id="${c.id}" />
          </div>
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">End</label>
            <input class="endIn w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50" type="number" step="0.01" min="0" max="${dur}" value="${c.end}" data-id="${c.id}" />
          </div>
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Label</label>
            <input class="labelIn w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50" type="text" value="${escapeAttr(c.label||"")}" placeholder="Optional" data-id="${c.id}" />
          </div>
        </div>

        <div class="mt-3 spliceTimelineGrid--timing">
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Beat</label>
            <select class="beatSel w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50 transition-colors cursor-pointer" data-id="${c.id}">
              <option value="intro" ${c.beat === "intro" ? "selected" : ""}>Intro</option>
              <option value="build" ${c.beat === "build" ? "selected" : ""}>Build</option>
              <option value="reveal" ${c.beat === "reveal" ? "selected" : ""}>Reveal</option>
              <option value="proof" ${c.beat === "proof" ? "selected" : ""}>Proof</option>
              <option value="cta" ${c.beat === "cta" ? "selected" : ""}>CTA</option>
            </select>
          </div>
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Transition</label>
            <select class="transitionSel w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50 transition-colors cursor-pointer" data-id="${c.id}">
              <option value="cut" ${c.transition === "cut" ? "selected" : ""}>Cut</option>
              <option value="dissolve" ${c.transition === "dissolve" ? "selected" : ""}>Dissolve</option>
              <option value="hold" ${c.transition === "hold" ? "selected" : ""}>Hold</option>
              <option value="punch" ${c.transition === "punch" ? "selected" : ""}>Punch</option>
            </select>
          </div>
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Transition sec</label>
            <input class="transitionIn w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50" type="number" step="0.05" min="0" max="4" value="${Number(c.transitionSec || 0)}" data-id="${c.id}" />
          </div>
          <div>
            <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Hold after</label>
            <input class="holdIn w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50" type="number" step="0.05" min="0" max="8" value="${Number(c.holdAfter || 0)}" data-id="${c.id}" />
          </div>
        </div>

        <div class="mt-3">
          <label class="text-[9px] uppercase tracking-[0.28em] text-zinc-600 font-bold">Beat notes</label>
          <textarea class="notesIn spliceTimelineTextarea mt-1" placeholder="Why this beat exists, what should happen here, or what the next cut should emphasize." data-id="${c.id}">${escapeHtml(c.notes || "")}</textarea>
        </div>
      `;
      timelineList.appendChild(row);
    });
  }

  function setPlayer(assetUrl, start=0, end=null, label=""){
    player.src = assetUrl;
    player.currentTime = Math.max(0, start);
    player.play().catch(()=>{});
    nowPlaying.textContent = label ? `Playing: ${label}` : "Playing clip…";

    const tick = () => {
      if (end != null && player.currentTime >= end){
        player.pause();
        player.removeEventListener("timeupdate", tick);
      }
    };
    player.addEventListener("timeupdate", tick);
  }

  async function playSequence(){
    if (state.timeline.length === 0){
      showToast("Add clips to timeline first.");
      return;
    }
    stopSequence();
    state._seqStop = false;

    for (let i=0; i<state.timeline.length; i++){
      if (state._seqStop) break;
      const clip = state.timeline[i];
      const a = state.assets.find(x => x.id === clip.assetId);
      if (!a) continue;

      nowPlaying.textContent = `Sequence: ${clip.label || `Clip ${i+1}`}`;
      clipMeta.textContent = `${fmtTime(clip.start)} → ${fmtTime(clip.end)} · ${clip.beat} · ${clip.transition}`;

      player.src = a.url;
      await player.play().catch(()=>{});

      // seek
      player.currentTime = Math.max(0, clip.start);

      await new Promise((resolve) => {
        const onTime = () => {
          if (state._seqStop){ cleanup(); resolve(); return; }
          if (player.currentTime >= clip.end){ cleanup(); resolve(); }
        };
        const onEnd = () => { cleanup(); resolve(); };
        function cleanup(){
          player.removeEventListener("timeupdate", onTime);
          player.removeEventListener("ended", onEnd);
          player.pause();
        }
        player.addEventListener("timeupdate", onTime);
        player.addEventListener("ended", onEnd);
      });

      if (!state._seqStop && Number(clip.holdAfter || 0) > 0){
        await new Promise((resolve) => window.setTimeout(resolve, Number(clip.holdAfter) * 1000));
      }
    }

    if (!state._seqStop){
      nowPlaying.textContent = "Sequence finished.";
      clipMeta.textContent = "";
    }
  }

  function stopSequence(){
    state._seqStop = true;
    try{ player.pause(); }catch{}
  }

  function escapeHtml(s){
    return (s ?? "").toString().replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  // Asset events
  assetGrid.addEventListener("click", (e) => {
    const add = e.target.closest(".addBtn");
    const prev = e.target.closest(".previewBtn");
    if (add){
      const id = add.dataset.id;
      const a = state.assets.find(x => x.id === id);
      if (!a) return;
      state.timeline.push(normalizeTimelineClip({
        id: uid(),
        assetId: a.id,
        start: 0,
        end: Math.max(0.01, a.duration),
        label: "",
        beat: guessBeat(state.timeline.length, a.name),
        transition: "cut",
        transitionSec: 0.2,
        holdAfter: 0,
        notes: ""
      }, a, state.timeline.length));
      persist();
      renderTimeline();
      showToast("Added to timeline.");
      return;
    }
    if (prev){
      const id = prev.dataset.id;
      const a = state.assets.find(x => x.id === id);
      if (!a) return;
      nowPlaying.textContent = `Preview: ${a.name}`;
      clipMeta.textContent = `0:00.00 → ${fmtTime(a.duration)}`;
      setPlayer(a.url, 0, a.duration, a.name);
      return;
    }
  });

  // Timeline events (buttons)
  timelineList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const idx = state.timeline.findIndex(x => x.id === id);
    if (idx < 0) return;

    if (btn.classList.contains("delBtn")){
      state.timeline.splice(idx, 1);
      persist(); renderTimeline();
      return;
    }
    if (btn.classList.contains("upBtn") && idx > 0){
      const t = state.timeline[idx];
      state.timeline[idx] = state.timeline[idx-1];
      state.timeline[idx-1] = t;
      persist(); renderTimeline();
      return;
    }
    if (btn.classList.contains("downBtn") && idx < state.timeline.length-1){
      const t = state.timeline[idx];
      state.timeline[idx] = state.timeline[idx+1];
      state.timeline[idx+1] = t;
      persist(); renderTimeline();
      return;
    }
    if (btn.classList.contains("playClipBtn")){
      const c = state.timeline[idx];
      const a = state.assets.find(x => x.id === c.assetId);
      if (!a) return;
      nowPlaying.textContent = `Playing: ${c.label || a.name}`;
      clipMeta.textContent = `${fmtTime(c.start)} → ${fmtTime(c.end)} · ${c.beat} · ${c.transition}`;
      setPlayer(a.url, c.start, c.end, c.label || a.name);
      return;
    }
  });

  // Timeline inputs (trim + label)
  timelineList.addEventListener("input", (e) => {
    const startIn = e.target.closest(".startIn");
    const endIn = e.target.closest(".endIn");
    const labelIn = e.target.closest(".labelIn");
    const transitionIn = e.target.closest(".transitionIn");
    const holdIn = e.target.closest(".holdIn");
    const notesIn = e.target.closest(".notesIn");
    if (!startIn && !endIn && !labelIn && !transitionIn && !holdIn && !notesIn) return;

    const id = (startIn || endIn || labelIn || transitionIn || holdIn || notesIn).dataset.id;
    const clip = state.timeline.find(x => x.id === id);
    if (!clip) return;

    const a = state.assets.find(x => x.id === clip.assetId);
    const max = a ? a.duration : 0;

    if (startIn){
      const v = Number(startIn.value);
      clip.start = Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
      if (clip.end <= clip.start) clip.end = Math.min(max, clip.start + 0.25);
    }
    if (endIn){
      const v = Number(endIn.value);
      clip.end = Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : Math.max(0.25, clip.start + 0.25);
      if (clip.end <= clip.start) clip.start = Math.max(0, clip.end - 0.25);
    }
    if (labelIn){
      clip.label = labelIn.value.slice(0, 80);
    }
    if (transitionIn){
      clip.transitionSec = clampNum(Number(transitionIn.value), 0, 4);
    }
    if (holdIn){
      clip.holdAfter = clampNum(Number(holdIn.value), 0, 8);
    }
    if (notesIn){
      clip.notes = notesIn.value.slice(0, 240);
    }

    persist();
    if (startIn || endIn || transitionIn || holdIn){
      renderTimeline();
    }else{
      renderTimelineSummary();
    }
  });

  timelineList.addEventListener("change", (e) => {
    const beatSel = e.target.closest(".beatSel");
    const transitionSel = e.target.closest(".transitionSel");
    if (!beatSel && !transitionSel) return;

    const id = (beatSel || transitionSel).dataset.id;
    const clip = state.timeline.find(x => x.id === id);
    if (!clip) return;

    if (beatSel) clip.beat = beatSel.value;
    if (transitionSel) clip.transition = transitionSel.value;
    persist();
    renderTimeline();
  });


  // -------------------------------
  // FFmpeg WASM (no-build, static)
  // -------------------------------
  const ffmpegStatus = $("ffmpegStatus");
  const downloadMp4 = $("downloadMp4");
  const renderProgressInner = $("renderProgressInner");
  const renderProgressOuter = $("renderProgressOuter");

  let FFmpegLib = null; // window.FFmpeg
  let ffmpeg = null;

  function setFfmpegStatus(msg){
    if (ffmpegStatus) ffmpegStatus.textContent = msg;
  }

  async function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureFfmpeg(){
    if (ffmpeg) return ffmpeg;

    setFfmpegStatus("FFmpeg: loading… (first time can be ~20–30MB)");

    // Load @ffmpeg/ffmpeg UMD bundle (creates window.FFmpeg)
    if (!window.FFmpeg){
      await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/ffmpeg.min.js");
    }
    FFmpegLib = window.FFmpeg;

    // Create instance
    const { createFFmpeg, fetchFile } = FFmpegLib;

    ffmpeg = createFFmpeg({
      log: false,
      corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js"
    });

    ffmpeg.setLogger(({ type, message }) => {
      // Keep UI clean; uncomment for debug:
      // console.log("[FFmpeg]", type, message);
    });

    ffmpeg.setProgress(({ ratio }) => {
      try{
        const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        if (renderProgressInner) renderProgressInner.style.width = `${pct}%`;
        showToast(`Rendering… ${pct}%`, 1200);
      }catch{}
    });
await ffmpeg.load();
    setFfmpegStatus("FFmpeg: ready ✅");
    return ffmpeg;
  }

  async function fetchAsUint8(url){
    // ObjectURL or normal URL -> fetch arrayBuffer
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  async function makeTitlePng(text, width, height, bg="black"){
    // Canvas render -> PNG bytes
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = bg === "black" ? "#000000" : bg;
    ctx.fillRect(0, 0, width, height);

    // subtle vignette
    const g = ctx.createRadialGradient(width/2, height/2, width*0.2, width/2, height/2, width*0.65);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,width,height);

    // text
    const t = (text || "").trim();
    if (t){
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // dynamic font size
      const max = 60;
      const min = 26;
      let size = max;
      ctx.font = `800 ${size}px Inter, system-ui, Arial`;
      while (ctx.measureText(t).width > width * 0.82 && size > min){
        size -= 2;
        ctx.font = `800 ${size}px Inter, system-ui, Arial`;
      }

      // glow
      ctx.shadowColor = "rgba(255,255,255,0.28)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#f4f4f5";
      ctx.fillText(t, width/2, height/2);
      ctx.shadowBlur = 0;

      // subline
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `600 16px Inter, system-ui, Arial`;
      ctx.fillText("Splice • Render Pipeline", width/2, height/2 + size*0.72);
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }

  async function renderRealMp4() {
  // NOTE (A): This is now a **real downloadable render** without FFmpeg WASM.
  // It uses a Canvas + MediaRecorder pipeline (static-host safe, mobile-friendly).
  // Output is WebM (most reliable on Android/Chrome). "MP4/MOV" options are kept for UI,
  // but we fall back to WebM unless the browser supports MP4 recording (rare).

  const fmt = String(fmtSel?.value || "WEBM").toUpperCase();

  // Basic guards
  if (!state.timeline.length) {
    showToast("Add at least one clip to the timeline first.");
    return;
  }

  // Resolve render size
  const res = String(resSel?.value || "720p").toLowerCase();
  let W = 1280, H = 720;
  if (res === "1080p") { W = 1920; H = 1080; }
  if (res === "480p") { W = 854; H = 480; }

  // Intro / outro
  const introText = (introTextEl?.value || "").trim();
  const outroText = (outroTextEl?.value || "").trim();
  const introSec = Math.max(0, parseFloat(introSecEl?.value || "0") || 0);
  const outroSec = Math.max(0, parseFloat(outroSecEl?.value || "0") || 0);

  // Music (optional) — simplest reliable mode: music-only bed
  const audioMode = String(audioModeSel?.value || "musicOnly");
  const musicVol = Math.min(1, Math.max(0, parseFloat(musicVolEl?.value || "0.6") || 0.6));
  const pickPd = String(pdTrackSel?.value || "");
  const pickedPd = MUSIC_LIBRARY.find(t => t.id === pickPd);

  // Prepare canvas
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.style.position = "fixed";
  canvas.style.left = "-99999px";
  canvas.style.top = "-99999px";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });

  // Streams
  const fps = 30;
  const vStream = canvas.captureStream(fps);

  // Optional audio stream (music bed)
  let aTrack = null;
  let audioCtx = null;
  let audioEl = null;
  let dest = null;

  try {
    if (audioMode !== "silent") {
      audioEl = new Audio();
      audioEl.crossOrigin = "anonymous";

      if (audioFileEl?.files?.[0]) {
        audioEl.src = URL.createObjectURL(audioFileEl.files[0]);
      } else if (pickedPd?.url) {
        audioEl.src = pickedPd.url;
      }

      if (audioEl.src) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        dest = audioCtx.createMediaStreamDestination();
        const srcNode = audioCtx.createMediaElementSource(audioEl);
        const gain = audioCtx.createGain();
        gain.gain.value = musicVol;

        srcNode.connect(gain);
        gain.connect(dest);
        aTrack = dest.stream.getAudioTracks()[0] || null;

        // iOS/Android: ensure context starts on user gesture (we are inside click)
        if (audioCtx.state === "suspended") await audioCtx.resume();
      }
    }
  } catch (e) {
    console.warn("[Splice] Audio init failed (continuing silent):", e);
    aTrack = null;
  }

  const outStream = new MediaStream([
    ...vStream.getVideoTracks(),
    ...(aTrack ? [aTrack] : [])
  ]);

  // Choose recorder mime
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  let mimeType = candidates.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  if (!mimeType) {
    showToast("This browser can't record video with MediaRecorder.");
    cleanup();
    return;
  }

  const chunks = [];
  let rec;
  try {
    rec = new MediaRecorder(outStream, mimeType ? { mimeType } : undefined);
  } catch (e) {
    console.error("[Splice] MediaRecorder init failed:", e);
    showToast("Render failed: MediaRecorder couldn't start.");
    cleanup();
    return;
  }

  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };

  const startedAt = performance.now();

  // Helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function drawTitleCard(text, seconds) {
    if (!seconds) return;
    const totalFrames = Math.max(1, Math.round(seconds * fps));
    for (let f = 0; f < totalFrames; f++) {
      // background
      ctx.fillStyle = "#0a0b10";
      ctx.fillRect(0,0,W,H);

      // subtle glow plate
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      const pad = Math.round(Math.min(W,H) * 0.08);
      roundRect(ctx, pad, pad, W - pad*2, H - pad*2, Math.round(pad*0.35));
      ctx.fill();

      // text
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(H*0.06)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      wrapTextCentered(ctx, text || "Splice", W/2, H/2, W * 0.72, Math.round(H*0.08));

      // small footer
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = `600 ${Math.round(H*0.025)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillText("Generated locally (no server)", W/2, H - pad*0.75);

      await sleep(1000 / fps);
    }
  }

  async function drawClip(asset, tStart, tEnd) {
    const vid = document.createElement("video");
    vid.muted = true;            // we only include music bed for reliability
    vid.playsInline = true;
    vid.preload = "auto";
    vid.src = asset.url;

    await new Promise((res, rej) => {
      const onOk = () => { cleanup(); res(); };
      const onErr = () => { cleanup(); rej(new Error("Video failed to load")); };
      const cleanup = () => {
        vid.removeEventListener("loadedmetadata", onOk);
        vid.removeEventListener("error", onErr);
      };
      vid.addEventListener("loadedmetadata", onOk, { once: true });
      vid.addEventListener("error", onErr, { once: true });
    });

    const end = Math.min(tEnd, vid.duration || tEnd);
    const start = Math.max(0, Math.min(tStart, Math.max(0, end - 0.05)));

    // seek
    vid.currentTime = start;
    await new Promise(r => {
      const onSeek = () => r();
      vid.addEventListener("seeked", onSeek, { once: true });
    });

    await vid.play().catch(() => {}); // some browsers require gesture; we are in click

    // draw loop
    while (vid.currentTime < end - (1 / fps)) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // cover fit (center crop)
      const vw = vid.videoWidth || W;
      const vh = vid.videoHeight || H;
      const s = Math.max(W / vw, H / vh);
      const dw = vw * s;
      const dh = vh * s;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;

      ctx.drawImage(vid, dx, dy, dw, dh);

      // tiny timecode
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      roundRect(ctx, 14, 14, 120, 34, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(fmtTime(vid.currentTime), 26, 31);

      // Prefer rVFC when available (smoother)
      if (vid.requestVideoFrameCallback) {
        await new Promise(r => vid.requestVideoFrameCallback(() => r()));
      } else {
        await sleep(1000 / fps);
      }
    }

    vid.pause();
    // best-effort cleanup
    try { vid.removeAttribute("src"); vid.load(); } catch {}
  }

  function cleanup() {
    try { canvas.remove(); } catch {}
    try { if (audioEl && audioFileEl?.files?.[0]) URL.revokeObjectURL(audioEl.src); } catch {}
    try { if (audioCtx && audioCtx.state !== "closed") audioCtx.close(); } catch {}
  }

  // Tiny helpers (local to this function)
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }
  function wrapTextCentered(ctx, text, cx, cy, maxW, lineH) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const lines = [];
    let cur = words[0];
    for (let i=1; i<words.length; i++) {
      const test = cur + " " + words[i];
      if (ctx.measureText(test).width <= maxW) cur = test;
      else { lines.push(cur); cur = words[i]; }
    }
    lines.push(cur);
    const totalH = lines.length * lineH;
    let y = cy - totalH/2 + lineH/2;
    for (const ln of lines) {
      ctx.fillText(ln, cx, y);
      y += lineH;
    }
  }

  try {
    setBusy(true);
    showToast("Rendering… stay on this tab (mobile needs focus).");

    // Start audio bed (looped across full render)
    if (audioEl && audioEl.src) {
      audioEl.loop = true;
      audioEl.currentTime = 0;
      await audioEl.play().catch(() => {});
    }

    rec.start(100);

    // Intro
    if (introText && introSec) await drawTitleCard(introText, introSec);

    // Clips
    for (const item of state.timeline) {
      const asset = state.assets.find(a => a.id === item.assetId);
      if (!asset) continue;
      await drawClip(asset, item.start, item.end);
      if (Number(item.holdAfter || 0) > 0) await sleep(Number(item.holdAfter) * 1000);
    }

    // Outro
    if (outroText && outroSec) await drawTitleCard(outroText, outroSec);

    // Stop
    await sleep(200);
    rec.stop();

    const blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
    });

    const safeTitle = (introText || "splice").replace(/[^\w\-]+/g, "_").slice(0, 40) || "splice";
    const ext = "webm"; // reliable
    const filename = `${safeTitle}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.${ext}`;

    triggerDownload(URL.createObjectURL(blob), filename);
    showToast("Download ready.");
  } catch (e) {
    console.error("[Splice] Render failed:", e);
    showToast("Render failed. Check console for details.");
  } finally {
    try { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; } } catch {}
    cleanup();
    setBusy(false);
  }
}

function handleProjectExport(){
    if (state.timeline.length === 0){
      showToast("Add clips to timeline before exporting.");
      return;
    }

    // We do NOT ship FFmpeg WASM here (static/no-build portfolio constraint).
    // So “Render & Polish” exports a portable PROJECT FILE you can re-open later.
    const preset = state.preset;
    const res = state.res;
    const fmt = state.fmt;

    const project = {
      kind: "splice-project",
      version: 1,
      createdAt: new Date().toISOString(),
      preset,
      res,
      fmt,
      summary: timelineSummary(),
      timeline: state.timeline.map((c, i) => {
        const a = state.assets.find(x => x.id === c.assetId);
        return {
          order: i + 1,
          label: c.label || "",
          sourceName: a ? a.name : "(missing asset)",
          beat: c.beat || "build",
          transition: c.transition || "cut",
          transitionSec: Number(c.transitionSec || 0),
          holdAfter: Number(c.holdAfter || 0),
          notes: c.notes || "",
          start: c.start,
          end: c.end,
          duration: Math.max(0, c.end - c.start),
          plannedDuration: clipPlannedDuration(c)
        };
      })
    };

    const steps = [
      "Analyzing sequence…",
      `Preparing ${res} ${fmt} settings…`,
      preset === "Lossless" ? "Applying lossless pipeline (demo)…" : "Polishing transitions (demo)…",
      "Finalizing project export…",
      "Download starting…"
    ];

    let i = 0;
    showToast(steps[i], 1200);

    const t = window.setInterval(() => {
      i++;
      if (i >= steps.length){
        window.clearInterval(t);

        const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
        const filename = `splice_project_${ts}.json`;
        const ok = triggerDownload(filename, "application/json", JSON.stringify(project, null, 2));

        if (ok){
          showToast("Export complete ✅ (project file downloaded)", 2400);
        }else{
          showToast("Export ready ✅ (tap to download)", 2400);
          // Fallback: create visible link
          try{
            const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.textContent = "Download Splice Project File";
            link.className = "mt-3 inline-block w-full text-center rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[11px] font-semibold hover:bg-white/10 transition";
            renderBtn.insertAdjacentElement("afterend", link);
          }catch{}
        }
        return;
      }
      showToast(steps[i], 1200);
    }, 900);
  }

  function exportSequenceBrief(){
    if (!state.timeline.length){
      showToast("Add clips to timeline before exporting a brief.");
      return;
    }
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    const filename = `splice_sequence_brief_${ts}.txt`;
    const ok = triggerDownload(filename, "text/plain;charset=utf-8", buildSequenceBrief());
    showToast(ok ? "Sequence brief downloaded." : "Sequence brief export failed.");
  }

  // Controls
  renderBtn.addEventListener("click", () => renderRealMp4().catch(err => { console.error(err); showToast("Render failed (see console)."); }));
  exportBriefBtn?.addEventListener("click", exportSequenceBrief);
  clearTimelineBtn.addEventListener("click", () => {
    state.timeline = [];
    persist();
    renderTimeline();
    showToast("Timeline cleared.");
  });
  resetBtn.addEventListener("click", () => {
    stopSequence();
    // revoke urls
    state.assets.forEach(a => { try{ URL.revokeObjectURL(a.url); }catch{} });
    state.assets = [];
    state.timeline = [];
    state.preset = "Standard";
    state.res = "720p";
    state.fmt = "MP4";
    clearPersist();
    renderAssets();
    renderTimeline();
    player.removeAttribute("src");
    player.load();
    nowPlaying.textContent = "No clip selected.";
    clipMeta.textContent = "";
    renderTimelineSummary();
    showToast("Reset project.");
  });
  playSeqBtn.addEventListener("click", () => playSequence());
  stopBtn.addEventListener("click", () => { stopSequence(); showToast("Stopped."); });

  // Presets UI
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      state.preset = p;
      presetBtns.forEach(b => {
        const active = b.dataset.preset === p;
        b.classList.toggle("bg-white/10", active);
        b.classList.toggle("text-white", active);
        b.classList.toggle("shadow-sm", active);
        b.classList.toggle("text-zinc-600", !active);
      });
      persist();
    });
  });
  resSel.addEventListener("change", () => { state.res = resSel.value; persist(); });
  fmtSel.addEventListener("change", () => { state.fmt = fmtSel.value; persist(); });

  // Load files
  fileInput.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (files.length === 0) return;

    for (const f of files){
      const url = URL.createObjectURL(f);
      const dur = await readVideoDuration(url);
      state.assets.push({ id: uid(), name: f.name, url, duration: dur || 0 });
    }
    persist();
    renderAssets();
    renderTimeline();
    showToast(`Added ${files.length} clip(s).`);
    fileInput.value = "";
  });

  // Restore
  (async function init(){
    try{
      // Backend hydrate (only if local is empty)
      if(!localStorage.getItem(STORAGE_KEY)){
        const remote = await window.NexusAppData?.loadLatest?.("splice");
        if(remote && remote.payload){
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.payload));
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){
        const data = JSON.parse(raw);
        if (Array.isArray(data?.timeline)){
          state.timeline = data.timeline.map((clip, idx) => normalizeTimelineClip(clip, null, idx)).filter(Boolean);
        }
        if (data?.assets?.length){
          // NOTE: object URLs can't be restored after reload; so we only restore settings + empty assets/timeline
          // This is intentional for privacy + correctness.
          state.preset = data.preset || state.preset;
          state.res = data.res || state.res;
          state.fmt = data.fmt || state.fmt;
        }
      }
    }catch{}
    // Apply UI restored settings
    resSel.value = state.res;
    fmtSel.value = state.fmt;
    presetBtns.forEach(b => {
      const active = b.dataset.preset === state.preset;
      b.classList.toggle("bg-white/10", active);
      b.classList.toggle("text-white", active);
      b.classList.toggle("shadow-sm", active);
      b.classList.toggle("text-zinc-600", !active);
    });
    renderAssets();
    renderTimeline();
  })();
})();
