const STORAGE = {
  userKey: "wayfinder.userKey",
  bookmarks: "wayfinder.bookmarks",
  progress: "wayfinder.progress",
  settings: "wayfinder.settings",
  trail: "wayfinder.trail",
  notes: "wayfinder.notes",
  checkpoints: "wayfinder.checkpoints",
  completions: "wayfinder.completions",
  sessions: "wayfinder.sessions",
  walkSession: "wayfinder.walkSession"
};

let trailTarget = null;
let trailMap = null;

function getUserKey(){
  let key = localStorage.getItem(STORAGE.userKey);
  if(!key){
    key = (crypto?.randomUUID?.() || `wf_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(STORAGE.userKey, key);
  }
  return key;
}

function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings(){
  return readJSON(STORAGE.settings, {
    fontSize: 16,
    contrast: "normal",
    reducedMotion: "false",
    streakEnabled: "true",
    weeklyGoal: 3,
    walkMinutes: 5,
    pauseCards: "true",
    ritualLine: "Arrive with one steady breath and a clear intention.",
    ambientOn: "off",
    ambientVolume: 30,
    sessionGoal: 7
  });
}

function getToday(){
  return new Date().toISOString().slice(0, 10);
}

const CHECKPOINT_SETS = {
  type: {
    prompt: [
      "Stand still for 20 seconds and name a single intention.",
      "Choose a pace you can keep for five minutes.",
      "Find a small boundary and cross it deliberately.",
      "Notice one detail you usually ignore.",
      "End by naming the quietest sound nearby."
    ],
    story: [
      "Find the opening line that matches your current mood.",
      "Pause after each paragraph and name the image it left.",
      "Pick one sentence and restate it in your own words.",
      "Notice where the energy rises, then soften your pace.",
      "Close by writing a single-line summary."
    ],
    tool: [
      "Set a timer for a short session before you begin.",
      "Choose one tool, one place, and one goal.",
      "Apply the tool once, then pause for a breath.",
      "Repeat the tool in a new direction or angle.",
      "Note the smallest measurable change."
    ],
    link: [
      "Preview the link without clicking for ten seconds.",
      "Decide what you want to find before you open it.",
      "Take one note while you read the page.",
      "Close the link and name one takeaway aloud.",
      "Decide whether to return to it later."
    ]
  },
  mood: {
    calm: [
      "Match your breathing to a slow count of four.",
      "Let your shoulders drop before you move.",
      "Keep your gaze low and steady for ten steps.",
      "Pause and feel the weight of your feet.",
      "End with a quiet exhale."
    ],
    curious: [
      "Turn your attention toward a small surprise.",
      "Ask one question about what you see.",
      "Walk toward the most interesting texture nearby.",
      "Notice how light shifts on a surface.",
      "Finish by naming a new detail."
    ],
    tender: [
      "Soften your posture and pace.",
      "Notice one thing you care about in this space.",
      "Offer yourself a small kindness before moving.",
      "Keep your steps quiet and light.",
      "End with a short thank-you."
    ],
    focused: [
      "Choose one target and keep it in view.",
      "Move with a steady rhythm and consistent stride.",
      "Count your steps for one full minute.",
      "Refocus on one detail whenever you drift.",
      "Conclude by naming the thing you held steady."
    ],
    bright: [
      "Let your gaze lift to the horizon.",
      "Look for reflective surfaces or bright edges.",
      "Move slightly faster for one minute.",
      "Pause where the light feels most open.",
      "End by naming one vivid color."
    ],
    grounded: [
      "Press your feet into the ground before you move.",
      "Notice the temperature of the air on your skin.",
      "Keep your steps slow and even.",
      "Pause at a boundary and breathe once.",
      "End by naming the surface beneath you."
    ]
  }
};

const DEFAULT_CHECKPOINTS = [
  "Choose a starting point you can return to.",
  "Move slowly enough to notice details.",
  "Pause once and count three breaths.",
  "Name one subtle change in your surroundings.",
  "End with a single word that fits the moment."
];

const PAUSE_CARDS = [
  { title: "Hold the moment", body: "Take one slow breath and name the closest sound." },
  { title: "Edge finder", body: "Look for the nearest boundary—shadow, curb, doorway—and rest your gaze there." },
  { title: "Soft reset", body: "Roll your shoulders back and let your jaw relax for ten seconds." },
  { title: "Light check", body: "Notice where the light is brightest and where it fades." },
  { title: "Grounded", body: "Press your feet down and feel the weight of the day." },
  { title: "Quiet line", body: "Trace a line with your eyes and follow it to its end." }
];

async function apiRequest(path, method, body){
  try{
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if(!res.ok) throw new Error("bad status");
    return await res.json();
  }catch{
    return null;
  }
}

async function loadBookmarks(){
  const userKey = getUserKey();
  const server = await apiRequest(`/api/bookmarks?userKey=${encodeURIComponent(userKey)}`, "GET");
  if(server && Array.isArray(server.bookmarks)){
    writeJSON(STORAGE.bookmarks, server.bookmarks);
    return server.bookmarks;
  }
  return readJSON(STORAGE.bookmarks, []);
}

async function toggleBookmark(slug){
  const userKey = getUserKey();
  const current = readJSON(STORAGE.bookmarks, []);
  const has = current.includes(slug);
  let next;
  if(has){
    next = current.filter((s) => s !== slug);
    const server = await apiRequest("/api/bookmarks", "DELETE", { userKey, waypoint_slug: slug });
    if(server && Array.isArray(server.bookmarks)) next = server.bookmarks;
  }else{
    next = [...current, slug].slice(0, 500);
    const server = await apiRequest("/api/bookmarks", "POST", { userKey, waypoint_slug: slug });
    if(server && Array.isArray(server.bookmarks)) next = server.bookmarks;
  }
  writeJSON(STORAGE.bookmarks, next);
  return next;
}

async function loadProgress(){
  const userKey = getUserKey();
  const server = await apiRequest(`/api/progress?userKey=${encodeURIComponent(userKey)}`, "GET");
  if(server && server.progress){
    writeJSON(STORAGE.progress, server.progress);
    return server.progress;
  }
  return readJSON(STORAGE.progress, { last_waypoint_slug: null, last_scroll_y: 0, updated_at: null });
}

function updateTrail(slug){
  if(!slug) return;
  const trail = readJSON(STORAGE.trail, []);
  const next = [slug, ...trail.filter((s) => s !== slug)].slice(0, 3);
  writeJSON(STORAGE.trail, next);
  renderTrail();
}

function recordCompletion(slug){
  if(!slug) return;
  const today = getToday();
  const list = readJSON(STORAGE.completions, []);
  const exists = list.find((entry) => entry.slug === slug && entry.date === today);
  if(!exists){
    list.push({ slug, date: today });
    writeJSON(STORAGE.completions, list);
  }
}

function renderTrail(){
  if(!trailTarget) return;
  const trail = readJSON(STORAGE.trail, []);
  if(!trail.length){
    trailTarget.innerHTML = "<div class='trail-item'>No trail yet. Start with any waypoint.</div>";
    return;
  }
  trailTarget.innerHTML = trail.map((slug) => {
    const entry = trailMap?.get(slug);
    const label = entry ? `${entry.order}. ${entry.title}` : slug;
    return `<a class="trail-item" href="/waypoints/${slug}">${label}<span>↗</span></a>`;
  }).join("");
}

function countWeeklyCompletions(){
  const list = readJSON(STORAGE.completions, []);
  const now = new Date(getToday());
  const week = list.filter((entry) => {
    const d = new Date(entry.date);
    const diffDays = Math.round((now - d) / 86400000);
    return diffDays >= 0 && diffDays < 7;
  });
  return week.length;
}

function addSessionRecord(record){
  const sessions = readJSON(STORAGE.sessions, []);
  sessions.unshift(record);
  writeJSON(STORAGE.sessions, sessions.slice(0, 3));
}

function getAchievements(){
  const settings = getSettings();
  const weekly = countWeeklyCompletions();
  const goal = settings.sessionGoal || 7;
  const labels = [];
  if(weekly >= goal) labels.push("Weekly goal achieved");
  if(weekly >= 3) labels.push("3 walks this week");
  if(weekly >= 5) labels.push("5 walks this week");
  return labels;
}

function persistWalkSession(payload){
  writeJSON(STORAGE.walkSession, payload);
}

function readWalkSession(){
  return readJSON(STORAGE.walkSession, null);
}

function clearWalkSession(){
  localStorage.removeItem(STORAGE.walkSession);
}

async function saveProgress(payload){
  const userKey = getUserKey();
  const existing = readJSON(STORAGE.progress, {});
  const today = getToday();
  let streakCount = existing.streakCount || 0;
  const lastDate = existing.streakDate || null;
  if(lastDate !== today){
    if(lastDate){
      const last = new Date(lastDate);
      const now = new Date(today);
      const diffDays = Math.round((now - last) / 86400000);
      streakCount = diffDays === 1 ? streakCount + 1 : 1;
    }else{
      streakCount = 1;
    }
  }
  const progress = {
    last_waypoint_slug: payload.last_waypoint_slug || null,
    last_scroll_y: payload.last_scroll_y || 0,
    updated_at: new Date().toISOString(),
    streakCount,
    streakDate: today
  };
  updateTrail(progress.last_waypoint_slug);
  writeJSON(STORAGE.progress, progress);
  await apiRequest("/api/progress", "POST", { userKey, ...progress });
}

function applySettings(){
  const settings = getSettings();
  document.body.style.setProperty("--font-size", `${settings.fontSize}px`);
  document.body.dataset.contrast = settings.contrast;
  document.body.dataset.reducedMotion = settings.reducedMotion;
}

function initBookmarkButtons(){
  document.querySelectorAll("[data-bookmark]").forEach(async (btn) => {
    const slug = btn.getAttribute("data-bookmark");
    const list = await loadBookmarks();
    btn.dataset.active = list.includes(slug) ? "true" : "false";
    btn.addEventListener("click", async () => {
      const next = await toggleBookmark(slug);
      btn.dataset.active = next.includes(slug) ? "true" : "false";
    });
  });
}

function initScrollProgress(){
  const bar = document.querySelector("[data-scroll-progress]");
  const resume = document.querySelector("[data-resume]");
  const nowPlaying = document.querySelector("[data-now-playing]");
  const nowTitle = document.querySelector("[data-now-playing-title]");
  const meter = document.querySelector("[data-progress-meter]");
  const meterBar = meter?.querySelector(".meter-bar span");
  const meterLabel = meter?.querySelector(".meter-label");
  if(!bar) return;
  const indicator = bar.querySelector("span");
  const sections = Array.from(document.querySelectorAll("[data-waypoint-section]"));
  let lastSlug = null;
  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    indicator.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    if(meterBar) meterBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    if(meterLabel) meterLabel.textContent = `${Math.round(progress)}% complete`;
  };
  const track = () => {
    update();
    if(sections.length){
      const current = sections.findLast((section) => section.getBoundingClientRect().top <= 120);
      if(current){
        const slug = current.dataset.slug;
        if(slug && slug !== lastSlug){
          lastSlug = slug;
          const title = current.dataset.title || "Waypoint";
          if(nowPlaying && nowTitle){
            nowTitle.textContent = title;
          }
          updateTrail(slug);
        }
        saveProgress({ last_waypoint_slug: slug, last_scroll_y: window.scrollY });
      }
    }
  };
  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(track);
  });
  update();
  if(resume){
    resume.addEventListener("click", async () => {
      const progress = await loadProgress();
      if(progress.last_scroll_y){
        window.scrollTo({ top: progress.last_scroll_y, behavior: "smooth" });
      }
    });
  }
}

function hashSeed(str){
  let h = 0;
  for(let i = 0; i < str.length; i++){
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildCheckpoints(meta){
  const seed = hashSeed(`${meta.slug}-${meta.mood}-${meta.type}`);
  const typeSet = CHECKPOINT_SETS.type[meta.type] || DEFAULT_CHECKPOINTS;
  const moodSet = CHECKPOINT_SETS.mood[meta.mood] || DEFAULT_CHECKPOINTS;
  const merged = [
    typeSet[seed % typeSet.length],
    moodSet[(seed + 1) % moodSet.length],
    typeSet[(seed + 2) % typeSet.length],
    moodSet[(seed + 3) % moodSet.length],
    DEFAULT_CHECKPOINTS[(seed + 4) % DEFAULT_CHECKPOINTS.length]
  ];
  return merged;
}

function initCheckpoints(){
  const list = document.querySelector("[data-checkpoints]");
  if(!list) return;
  const slug = list.dataset.slug;
  const mood = list.dataset.mood;
  const type = list.dataset.type;
  const data = readJSON(STORAGE.checkpoints, {});
  const checkpoints = buildCheckpoints({ slug, mood, type });
  const saved = data[slug] || new Array(checkpoints.length).fill(false);
  const status = document.querySelector("[data-checkpoint-status]");

  list.innerHTML = checkpoints.map((text, idx) => `
    <li class="checkpoint-item">
      <input type="checkbox" data-check="${idx}" ${saved[idx] ? "checked" : ""}/>
      <span>${text}</span>
    </li>
  `).join("");

  const updateStatus = () => {
    const done = saved.filter(Boolean).length;
    status.textContent = done === checkpoints.length
      ? "All checkpoints complete. Your streak grows."
      : `${done}/${checkpoints.length} completed.`;
  };
  updateStatus();

  list.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.addEventListener("change", () => {
      const idx = Number(box.dataset.check);
      saved[idx] = box.checked;
      data[slug] = saved;
      writeJSON(STORAGE.checkpoints, data);
      updateStatus();
      if(saved.every(Boolean)){
        recordCompletion(slug);
      }
    });
  });
}

function initReflections(){
  const box = document.querySelector("[data-reflection-box]");
  if(!box) return;
  const slug = box.dataset.slug;
  const textarea = box.querySelector("[data-reflection]");
  const status = box.querySelector("[data-reflection-status]");
  const saveBtn = box.querySelector("[data-reflection-save]");
  const clearBtn = box.querySelector("[data-reflection-clear]");
  const notes = readJSON(STORAGE.notes, {});
  textarea.value = notes[slug] || "";
  status.textContent = notes[slug] ? "Saved on this device." : "No reflection saved yet.";

  const persist = () => {
    const next = textarea.value.trim();
    notes[slug] = next;
    writeJSON(STORAGE.notes, notes);
    status.textContent = next ? "Saved on this device." : "Reflection cleared.";
  };
  saveBtn.addEventListener("click", persist);
  clearBtn.addEventListener("click", () => {
    textarea.value = "";
    persist();
  });
}

function initWalkMode(){
  const overlay = document.querySelector("[data-walk-mode]");
  if(!overlay) return;
  const stepsWrap = overlay.querySelector("[data-walk-steps]");
  const timer = overlay.querySelector("[data-walk-timer]");
  const duration = overlay.querySelector("[data-walk-duration]");
  const toggle = overlay.querySelector("[data-walk-toggle]");
  const nextBtn = overlay.querySelector("[data-walk-next]");
  const endBtn = overlay.querySelector("[data-walk-end]");
  const exitBtns = Array.from(overlay.querySelectorAll("[data-walk-exit]"));
  const settingsScreen = overlay.querySelector("[data-walk-settings]");
  const settingsContinue = overlay.querySelector("[data-walk-settings-continue]");
  const settingsResume = overlay.querySelector("[data-walk-settings-resume]");
  const session = overlay.querySelector("[data-walk-session]");
  const summary = overlay.querySelector("[data-walk-summary]");
  const summaryText = overlay.querySelector("[data-walk-summary-text]");
  const summaryMeta = overlay.querySelector("[data-walk-summary-meta]");
  const summaryAchievements = overlay.querySelector("[data-walk-achievements]");
  const summaryHistory = overlay.querySelector("[data-walk-history]");
  const summaryLinks = overlay.querySelector("[data-walk-summary-links]");
  const focusToggle = overlay.querySelector("[data-focus-toggle]");
  const stepRange = overlay.querySelector("[data-walk-step-range]");
  const goalRange = overlay.querySelector("[data-walk-goal]");
  const hapticSelect = overlay.querySelector("[data-walk-haptics]");
  const toneSelect = overlay.querySelector("[data-walk-tones]");
  const ambientSelect = overlay.querySelector("[data-walk-ambient]");
  const ambientVolume = overlay.querySelector("[data-walk-ambient-volume]");
  const restartBtn = overlay.querySelector("[data-walk-restart]");

  const settings = getSettings();
  const mood = overlay.dataset.mood || "calm";
  const type = overlay.dataset.type || "prompt";
  const variantBank = {
    calm: [
      "Arrive: stand still, breathe in for four, out for four.",
      "Anchor: choose one small detail to return to.",
      "Begin: walk at the slowest pace you can keep steady.",
      "Observe: notice texture, then light, then sound.",
      "Boundary: cross a doorway, shadow, or curb with intention.",
      "Repeat: keep the same pace for ten breaths.",
      "Shift: change direction once without hurrying.",
      "Quiet count: count ten steps, then release the count.",
      "Edge scan: notice the nearest line or seam in the space.",
      "Open gaze: lift your sight to the horizon for five breaths.",
      "Close gaze: focus on a small nearby object for five breaths.",
      "Return: re-center on your anchor detail.",
      "Soft finish: slow your pace by one small notch.",
      "Name the drift: notice where attention wandered.",
      "Final turn: choose a slight change of direction.",
      "Close: pick a final point and arrive without rush."
    ],
    focused: [
      "Arrive: count four breaths without moving.",
      "Set a steady pace you can keep for ten minutes.",
      "Hold one line in view as you walk.",
      "Narrow attention to one sound.",
      "Cross a boundary without breaking pace.",
      "Repeat the same pace for one full minute.",
      "Choose one target and walk toward it.",
      "Shift your attention to your feet.",
      "Check posture: shoulders down, jaw soft.",
      "Keep your gaze steady for five breaths.",
      "Return to your anchor detail.",
      "Take ten steps in silence.",
      "Notice the smallest nearby motion.",
      "Slow by one notch.",
      "Confirm your direction.",
      "Close at a clean boundary."
    ],
    curious: [
      "Arrive: notice what draws your attention first.",
      "Pick a small mystery to follow.",
      "Walk toward the most interesting texture.",
      "Look for a repeating shape.",
      "Cross a boundary with a question in mind.",
      "Pause and name three colors.",
      "Shift your view upward.",
      "Shift your view downward.",
      "Follow a line to its end.",
      "Listen for the farthest sound.",
      "Return to your anchor detail.",
      "Change direction once.",
      "Notice a reflection.",
      "Slow down.",
      "Choose one detail to remember.",
      "Close with a quiet thank-you."
    ],
    tender: [
      "Arrive: soften your shoulders and breathe.",
      "Choose a gentle pace.",
      "Hold a kind thought for yourself.",
      "Notice the warmth or coolness of the air.",
      "Cross a boundary slowly.",
      "Pause and relax your hands.",
      "Watch how light touches a surface.",
      "Let your gaze rest on something calm.",
      "Return to your anchor detail.",
      "Take ten quiet steps.",
      "Soften your pace again.",
      "Listen for a low sound.",
      "Name one small comfort.",
      "Slow by one notch.",
      "Choose your final point.",
      "Close with one gentle breath."
    ],
    bright: [
      "Arrive: lift your gaze to the horizon.",
      "Choose a pace that feels light.",
      "Notice the brightest patch of light.",
      "Cross a boundary with a slight smile.",
      "Turn toward the most open view.",
      "Scan for a vivid color.",
      "Shift your pace up for 20 seconds.",
      "Return to your steady pace.",
      "Notice a reflection or shimmer.",
      "Listen for a bright sound.",
      "Return to your anchor detail.",
      "Take ten steps with open gaze.",
      "Slow down gently.",
      "Name a light source.",
      "Choose your final point.",
      "Close with a long exhale."
    ],
    grounded: [
      "Arrive: press your feet into the ground.",
      "Choose a steady, grounded pace.",
      "Notice the surface under your feet.",
      "Cross a boundary with intention.",
      "Feel the temperature of the air.",
      "Count ten steps with heavy feet.",
      "Pause and breathe once.",
      "Return to your anchor detail.",
      "Notice a low sound.",
      "Watch a solid, stable object.",
      "Slow your pace slightly.",
      "Take ten more steps.",
      "Name the weight in your body.",
      "Choose your final point.",
      "Slow again.",
      "Close with a steady breath."
    ]
  };
  const typeExtras = {
    prompt: "Hold a question lightly as you move.",
    story: "Imagine a short line of story with each step.",
    tool: "Repeat one tool-like motion with each breath.",
    link: "Name one link between two things you notice."
  };
  const steps = [...(variantBank[mood] || variantBank.calm)];
  steps[2] = `${steps[2]} ${typeExtras[type] || ""}`.trim();
  const stepCount = steps.length;
  let stepSeconds = Math.max(20, Math.min(120, Math.round((Number(settings.walkMinutes || 5) * 60) / stepCount)));

  if(stepRange) stepRange.value = String(stepSeconds);
  if(goalRange) goalRange.value = String(settings.sessionGoal || 7);
  if(hapticSelect) hapticSelect.value = settings.hapticsOn || "off";
  if(toneSelect) toneSelect.value = settings.tonesOn || "off";
  if(ambientSelect) ambientSelect.value = settings.ambientOn || "off";
  if(ambientVolume) ambientVolume.value = String(settings.ambientVolume || 30);

  const breathHelper = overlay.querySelector("[data-breath-helper]");
  const breathCircle = overlay.querySelector("[data-breath-circle]");
  const breathLabel = overlay.querySelector("[data-breath-label]");
  let breathInterval = null;
  let breathState = 0;

  const updateBreathCycle = () => {
    if (!breathCircle || !breathLabel) return;
    if (breathState === 0) {
      breathCircle.style.transform = "scale(1.4)";
      breathCircle.style.opacity = "0.9";
      breathLabel.textContent = "Inhale";
      breathState = 1;
    } else {
      breathCircle.style.transform = "scale(1.0)";
      breathCircle.style.opacity = "0.45";
      breathLabel.textContent = "Exhale";
      breathState = 0;
    }
  };

  const startBreath = () => {
    if (breathInterval) clearInterval(breathInterval);
    breathState = 0;
    updateBreathCycle();
    breathInterval = setInterval(updateBreathCycle, 4000);
  };

  const stopBreath = () => {
    if (breathInterval) {
      clearInterval(breathInterval);
      breathInterval = null;
    }
  };

  let active = 0;
  let remaining = stepSeconds;
  let interval = null;
  let startedAt = null;
  let focusOn = false;
  let hapticsOn = (settings.hapticsOn || "off") === "on";
  let tonesOn = (settings.tonesOn || "off") === "on";
  let ambientOn = (settings.ambientOn || "off") === "on";
  let ambientGain = Math.max(0, Math.min(1, (settings.ambientVolume || 30) / 100));
  let idleTimer = null;
  let lastInteraction = Date.now();
  let audioCtx = null;
  let pinkNoiseBuffer = null;
  let ambientNode = null;
  let sessionId = null;

  const setScreen = (name) => {
    overlay.dataset.screen = name;
    settingsScreen.hidden = name !== "settings";
    session.hidden = name !== "session";
    summary.hidden = name !== "summary";
    if (breathHelper) {
      breathHelper.hidden = (name === "summary");
    }
    if (name === "settings" || name === "session") {
      startBreath();
    } else {
      stopBreath();
    }
  };

  const renderSteps = () => {
    const step = steps[active] || "";
    stepsWrap.innerHTML = `
      <div class="walk-step" data-active="true">
        Step ${active + 1} of ${steps.length}
        <div class="walk-step-body">${step}</div>
      </div>
    `;
    const hue = 180 + ((active / Math.max(1, steps.length - 1)) * 120);
    overlay.style.setProperty("--step-hue", `${hue}deg`);
  };

  const renderTimer = () => {
    const min = String(Math.floor(remaining / 60)).padStart(2, "0");
    const sec = String(remaining % 60).padStart(2, "0");
    timer.textContent = `${min}:${sec}`;
  };

  const persistSession = () => {
    persistWalkSession({
      id: sessionId,
      active,
      remaining,
      stepSeconds,
      startedAt,
      savedAt: Date.now()
    });
  };

  const tick = () => {
    remaining -= 1;
    if(remaining <= 0){
      if(active < steps.length - 1){
        active += 1;
        remaining = stepSeconds;
        renderSteps();
        triggerCue();
      }else{
        stopTimer();
        timer.textContent = "Done";
        showSummary();
      }
    }
    renderTimer();
    persistSession();
  };

  const startTimer = () => {
    stopTimer();
    interval = window.setInterval(tick, 1000);
    toggle.textContent = "Pause";
  };

  const stopTimer = () => {
    if(interval) window.clearInterval(interval);
    interval = null;
    toggle.textContent = "Resume";
  };

  const triggerCue = () => {
    if(hapticsOn && navigator.vibrate){
      navigator.vibrate(30);
    }
    if(tonesOn){
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        osc.onended = () => ctx.close();
      }catch{}
    }
  };

  const getPinkNoiseBuffer = (ctx) => {
    if (pinkNoiseBuffer) return pinkNoiseBuffer;
    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
    pinkNoiseBuffer = buffer;
    return pinkNoiseBuffer;
  };

  const startAmbient = () => {
    if(!ambientOn) return;
    try{
      if(!audioCtx){
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if(ambientNode) return;

      const buffer = getPinkNoiseBuffer(audioCtx);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const mainGain = audioCtx.createGain();
      mainGain.gain.value = ambientGain;

      // Path 1: Waves (Low-pass filtered pink noise)
      const waveFilter = audioCtx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.Q.value = 1.8;
      
      const waveLfo = audioCtx.createOscillator();
      waveLfo.type = 'sine';
      waveLfo.frequency.value = 0.08; // ~12.5s swell
      
      const waveLfoGain = audioCtx.createGain();
      waveLfoGain.gain.value = 140;
      waveFilter.frequency.value = 220;

      waveLfo.connect(waveLfoGain);
      waveLfoGain.connect(waveFilter.frequency);

      // Path 2: Wind (Band-pass filtered pink noise)
      const windFilter = audioCtx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.Q.value = 1.2;

      const windLfo = audioCtx.createOscillator();
      windLfo.type = 'sine';
      windLfo.frequency.value = 0.125; // 8s cycle (breath-synchronized)

      const windLfoGain = audioCtx.createGain();
      windLfoGain.gain.value = 350;
      windFilter.frequency.value = 750;

      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);

      // Connect source to filters
      source.connect(waveFilter);
      source.connect(windFilter);

      // Mix gains
      const wavePathGain = audioCtx.createGain();
      wavePathGain.gain.value = 0.28;
      waveFilter.connect(wavePathGain);
      wavePathGain.connect(mainGain);

      const windPathGain = audioCtx.createGain();
      windPathGain.gain.value = 0.04;
      windFilter.connect(windPathGain);
      windPathGain.connect(mainGain);

      mainGain.connect(audioCtx.destination);

      source.start(0);
      waveLfo.start(0);
      windLfo.start(0);

      ambientNode = { source, mainGain, waveLfo, windLfo };
    }catch(e){
      console.error(e);
    }
  };

  const stopAmbient = () => {
    if(ambientNode){
      try {
        ambientNode.source.stop();
        ambientNode.waveLfo.stop();
        ambientNode.windLfo.stop();
      } catch(e) {}
      ambientNode = null;
    }
  };

  const resetIdle = () => {
    lastInteraction = Date.now();
    overlay.classList.remove("walk-idle");
    if(idleTimer) window.clearInterval(idleTimer);
  };

  const openSession = (autoStart) => {
    setScreen("session");
    sessionId = sessionId || `wf_${Date.now()}`;
    active = 0;
    remaining = stepSeconds;
    duration.textContent = `${Math.round((stepSeconds * stepCount) / 60)} min`;
    renderSteps();
    renderTimer();
    if(autoStart){
      startTimer();
      startedAt = Date.now();
      triggerCue();
      startAmbient();
    }
    resetIdle();
    persistSession();
  };

  const showSummary = () => {
    setScreen("summary");
    const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    summaryText.textContent = `You completed ${active + 1} steps in about ${minutes} minute(s).`;
    const weekly = countWeeklyCompletions();
    const goal = Number(goalRange?.value || settings.sessionGoal || 7);
    const achieved = weekly >= goal;
    summaryMeta.textContent = `Weekly: ${weekly}/${goal} walks · ${achieved ? "Goal achieved" : "Goal in progress"}`;
    const tags = getAchievements();
    summaryAchievements.innerHTML = tags.length
      ? tags.map((t) => `<span class="pill">${t}</span>`).join("")
      : `<span class="pill">First steps</span>`;
    addSessionRecord({ when: new Date().toLocaleString(), steps: active + 1, minutes });
    const sessions = readJSON(STORAGE.sessions, []);
    summaryHistory.innerHTML = sessions.map((s) => `• ${s.when} — ${s.steps} steps, ${s.minutes} min`).join("<br/>");
    if(summaryLinks){
      summaryLinks.innerHTML = `
        <a class="pill" href="/progress">Progress</a>
        <a class="pill" href="/bookmarks">Bookmarks</a>
        <a class="pill" href="/settings">Settings</a>
      `;
    }
    stopAmbient();
    clearWalkSession();

    // Render the interactive premium trail map
    const currentSlug = overlay.dataset.slug;
    renderTrailMap(currentSlug);
  };

  const open = () => {
    setScreen("settings");
    resetIdle();
    const saved = readWalkSession();
    if(settingsResume){
      settingsResume.hidden = !(saved && saved.savedAt && (Date.now() - saved.savedAt) < 2 * 60 * 60 * 1000);
    }
  };


  toggle.addEventListener("click", () => {
    if(interval){
      stopTimer();
    }else{
      startTimer();
    }
    resetIdle();
  });
  nextBtn.addEventListener("click", () => {
    if(active < steps.length - 1){
      active += 1;
      remaining = stepSeconds;
      renderSteps();
      renderTimer();
      triggerCue();
    }
    resetIdle();
  });
  endBtn.addEventListener("click", () => {
    stopTimer();
    showSummary();
    resetIdle();
  });

  exitBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if(!confirm("Exit this walk? Your session will end.")) return;
      stopTimer();
      stopAmbient();
      clearWalkSession();
      window.location.href = "/waypoints";
    });
  });

  restartBtn?.addEventListener("click", () => {
    open();
  });

  settingsContinue?.addEventListener("click", () => {
    openSession(true);
  });

  settingsResume?.addEventListener("click", () => {
    const saved = readWalkSession();
    if(!saved) return;
    sessionId = saved.id || `wf_${Date.now()}`;
    active = saved.active || 0;
    remaining = saved.remaining || stepSeconds;
    stepSeconds = saved.stepSeconds || stepSeconds;
    startedAt = saved.startedAt || Date.now();
    setScreen("session");
    duration.textContent = `${Math.round((stepSeconds * stepCount) / 60)} min`;
    renderSteps();
    renderTimer();
    startTimer();
    startAmbient();
  });

  focusToggle?.addEventListener("click", () => {
    focusOn = !focusOn;
    overlay.classList.toggle("focus-on", focusOn);
    resetIdle();
  });

  stepRange?.addEventListener("input", () => {
    stepSeconds = Number(stepRange.value);
    duration.textContent = `${Math.round((stepSeconds * stepCount) / 60)} min`;
    resetIdle();
  });

  hapticSelect?.addEventListener("change", () => {
    hapticsOn = hapticSelect.value === "on";
    settings.hapticsOn = hapticSelect.value;
    writeJSON(STORAGE.settings, settings);
    resetIdle();
  });

  toneSelect?.addEventListener("change", () => {
    tonesOn = toneSelect.value === "on";
    settings.tonesOn = toneSelect.value;
    writeJSON(STORAGE.settings, settings);
    resetIdle();
  });

  ambientSelect?.addEventListener("change", () => {
    ambientOn = ambientSelect.value === "on";
    settings.ambientOn = ambientSelect.value;
    writeJSON(STORAGE.settings, settings);
    if(ambientOn){
      startAmbient();
    }else{
      stopAmbient();
    }
    resetIdle();
  });

  ambientVolume?.addEventListener("input", () => {
    ambientGain = Math.max(0, Math.min(1, Number(ambientVolume.value) / 100));
    settings.ambientVolume = Number(ambientVolume.value);
    writeJSON(STORAGE.settings, settings);
    if(ambientNode?.mainGain) {
      ambientNode.mainGain.gain.setValueAtTime(ambientGain, audioCtx.currentTime);
    }
    resetIdle();
  });

  goalRange?.addEventListener("input", () => {
    settings.sessionGoal = Number(goalRange.value);
    writeJSON(STORAGE.settings, settings);
    resetIdle();
  });

  open();
}

function initTrail(){
  trailTarget = document.querySelector("[data-trail]");
  if(!trailTarget) return;
  trailMap = new Map((window.__WAYPOINTS__ || []).map((w) => [w.slug, w]));
  renderTrail();
}

function initPathfinder(){
  const wrap = document.querySelector("[data-pathfinder]");
  if(!wrap) return;
  const sections = Array.from(document.querySelectorAll("[data-waypoint-section]"));
  const jumpTo = (list) => {
    if(!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    pick.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mood = btn.dataset.pathMood;
      const isRandom = btn.dataset.pathRandom;
      if(isRandom){
        jumpTo(sections);
        return;
      }
      const filtered = sections.filter((s) => s.dataset.mood === mood);
      jumpTo(filtered);
    });
  });
}

function initPauseCards(){
  const card = document.querySelector("[data-pause-card]");
  if(!card) return;
  const settings = getSettings();
  if(settings.pauseCards !== "true") return;
  const titleEl = card.querySelector("[data-pause-title]");
  const bodyEl = card.querySelector("[data-pause-body]");
  const nextBtn = card.querySelector("[data-pause-next]");
  const closeBtn = card.querySelector("[data-pause-close]");
  let lastShown = 0;
  let index = 0;

  const showCard = () => {
    const entry = PAUSE_CARDS[index % PAUSE_CARDS.length];
    titleEl.textContent = entry.title;
    bodyEl.textContent = entry.body;
    card.hidden = false;
    lastShown = window.scrollY;
    index += 1;
  };

  const maybeShow = () => {
    if(card.hidden && window.scrollY - lastShown > 900 && window.scrollY > 600){
      showCard();
    }
  };

  nextBtn.addEventListener("click", () => {
    showCard();
  });
  closeBtn.addEventListener("click", () => {
    card.hidden = true;
  });
  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(maybeShow);
  });
}

function initWaypointFilter(){
  const list = document.querySelector("[data-waypoint-list]");
  if(!list) return;
  const moodSelect = document.querySelector("[data-filter-mood]");
  const typeSelect = document.querySelector("[data-filter-type]");
  const rows = Array.from(list.querySelectorAll("[data-waypoint-card]"));
  const apply = () => {
    const mood = moodSelect?.value || "all";
    const type = typeSelect?.value || "all";
    rows.forEach((row) => {
      const matchMood = mood === "all" || row.dataset.mood === mood;
      const matchType = type === "all" || row.dataset.type === type;
      row.style.display = matchMood && matchType ? "grid" : "none";
    });
  };
  moodSelect?.addEventListener("change", apply);
  typeSelect?.addEventListener("change", apply);
  apply();
}

function initDetailProgress(){
  const detail = document.querySelector("[data-waypoint-detail]");
  if(!detail) return;
  const slug = detail.getAttribute("data-slug");
  if(slug){
    saveProgress({ last_waypoint_slug: slug, last_scroll_y: window.scrollY });
  }
}

function initBookmarksPage(){
  const target = document.querySelector("[data-bookmarks-list]");
  if(!target) return;
  loadBookmarks().then((items) => {
    if(!items.length){
      target.innerHTML = "<p class='empty-state'>No bookmarks yet. Save a waypoint to see it here.</p>";
      return;
    }
    const map = new Map((window.__WAYPOINTS__ || []).map((w) => [w.slug, w]));
    target.innerHTML = items.map((slug) => {
      const entry = map.get(slug);
      const label = entry ? `${entry.order}. ${entry.title}` : slug;
      return `<li><a href="/waypoints/${slug}">${label}</a></li>`;
    }).join("");
  });
}

function initProgressPage(){
  const target = document.querySelector("[data-progress]");
  if(!target) return;
  loadProgress().then((progress) => {
    const settings = getSettings();
    const streakText = settings.streakEnabled === "true"
      ? `${progress.streakCount || 0} day(s)`
      : "Streak disabled";
    const map = new Map((window.__WAYPOINTS__ || []).map((w) => [w.slug, w]));
    const slug = progress.last_waypoint_slug || "None yet";
    const label = map.get(slug) ? `${map.get(slug).order}. ${map.get(slug).title}` : slug;
    const updated = progress.updated_at ? new Date(progress.updated_at).toLocaleString() : "Never";
    const weekly = countWeeklyCompletions();
    const goal = settings.weeklyGoal || 3;
    target.innerHTML = `
      <div class="waypoint-card">
        <div class="waypoint-meta">
          <span class="pill">Last waypoint: ${label}</span>
          <span class="pill">Updated: ${updated}</span>
          <span class="pill">Reading streak: ${streakText}</span>
          <span class="pill">Weekly goal: ${weekly}/${goal}</span>
        </div>
      </div>
    `;
  });
}

function initSettings(){
  const form = document.querySelector("[data-settings-form]");
  if(!form) return;
  const settings = getSettings();
  form.fontSize.value = settings.fontSize;
  form.contrast.value = settings.contrast;
  form.reducedMotion.value = settings.reducedMotion;
  form.streakEnabled.value = settings.streakEnabled;
  if(form.weeklyGoal) form.weeklyGoal.value = settings.weeklyGoal;
  if(form.walkMinutes) form.walkMinutes.value = settings.walkMinutes;
  if(form.pauseCards) form.pauseCards.value = settings.pauseCards;
  if(form.ritualLine) form.ritualLine.value = settings.ritualLine;
  if(form.sessionGoal) form.sessionGoal.value = settings.sessionGoal;
  if(form.ambientOn) form.ambientOn.value = settings.ambientOn;
  if(form.ambientVolume) form.ambientVolume.value = settings.ambientVolume;
  form.addEventListener("input", () => {
    const updated = {
      fontSize: Number(form.fontSize.value),
      contrast: form.contrast.value,
      reducedMotion: form.reducedMotion.value,
      streakEnabled: form.streakEnabled.value,
      weeklyGoal: form.weeklyGoal ? Number(form.weeklyGoal.value) : 3,
      walkMinutes: form.walkMinutes ? Number(form.walkMinutes.value) : 5,
      pauseCards: form.pauseCards ? form.pauseCards.value : "true",
      ritualLine: form.ritualLine ? form.ritualLine.value : "Arrive with one steady breath and a clear intention.",
      sessionGoal: form.sessionGoal ? Number(form.sessionGoal.value) : 7,
      ambientOn: form.ambientOn ? form.ambientOn.value : "off",
      ambientVolume: form.ambientVolume ? Number(form.ambientVolume.value) : 30
    };
    writeJSON(STORAGE.settings, updated);
    applySettings();
  });
}

function renderTrailMap(currentSlug) {
  const container = document.querySelector("[data-trail-map]");
  if (!container) return;

  const waypoints = window.__WAYPOINTS__ || [];
  if (!waypoints.length) return;

  const width = 500;
  const height = 400;

  const cols = 10;
  const rows = 10;
  const colSpacing = width / (cols + 1);
  const rowSpacing = height / (rows + 1);

  const points = [];
  for (let i = 0; i < waypoints.length; i++) {
    const r = Math.floor(i / cols);
    let c = i % cols;
    if (r % 2 !== 0) {
      c = cols - 1 - c;
    }
    
    const offsetX = Math.sin(i * 2.3) * 6;
    const offsetY = Math.cos(i * 1.7) * 6;

    points.push({
      x: (c + 1) * colSpacing + offsetX,
      y: (r + 1) * rowSpacing + offsetY,
      wp: waypoints[i],
      index: i
    });
  }

  const currentIndex = waypoints.findIndex(w => w.slug === currentSlug);
  const completedSlugs = new Set(readJSON(STORAGE.completions, []).map(c => c.slug));

  points.forEach(p => {
    if (p.wp.slug === currentSlug) {
      p.state = 'current';
    } else if (completedSlugs.has(p.wp.slug) || (currentIndex !== -1 && p.index < currentIndex)) {
      p.state = 'completed';
    } else {
      p.state = 'locked';
    }
  });

  let activePathD = '';
  let lockedPathD = '';

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const isSegmentActive = (p1.state === 'completed' && (p2.state === 'completed' || p2.state === 'current'));
    const segmentD = `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} L ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    if (isSegmentActive) {
      activePathD += ' ' + segmentD;
    } else {
      lockedPathD += ' ' + segmentD;
    }
  }

  let svgContent = `<svg viewBox="0 0 ${width} ${height}" class="trail-svg" width="100%" height="100%">
    <defs>
      <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffd700" />
        <stop offset="100%" stop-color="#ff8c00" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#7ee6ff" stop-opacity="1" />
        <stop offset="100%" stop-color="#7ee6ff" stop-opacity="0" />
      </radialGradient>
      <filter id="shadow-effect" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  `;

  svgContent += `<path d="${lockedPathD}" class="trail-line locked" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2.5" stroke-dasharray="4,4" />`;
  if (activePathD.trim()) {
    svgContent += `<path d="${activePathD}" class="trail-line active" fill="none" stroke="url(#activeGrad)" stroke-width="3" stroke-linecap="round" />`;
  }

  const currentNode = points.find(p => p.state === 'current');
  if (currentNode) {
    svgContent += `<circle cx="${currentNode.x.toFixed(1)}" cy="${currentNode.y.toFixed(1)}" r="18" fill="url(#glow)" opacity="0.6" class="glow-ring" />`;
  }

  points.forEach(p => {
    let color = 'rgba(255,255,255,0.2)';
    let radius = 4;
    let className = 'trail-node locked';
    let extra = '';

    if (p.state === 'current') {
      color = '#7ee6ff';
      radius = 8;
      className = 'trail-node current';
      extra = `filter="url(#shadow-effect)"`;
    } else if (p.state === 'completed') {
      color = '#ffd700';
      radius = 5.5;
      className = 'trail-node completed';
    }

    svgContent += `
      <g class="node-group" data-slug="${p.wp.slug}" style="cursor: pointer;">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${radius + 6}" fill="transparent" class="node-hitbox" />
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${radius}" fill="${color}" class="${className}" ${extra} />
        <title>${p.wp.order}. ${p.wp.title} (${p.wp.mood})</title>
      </g>
    `;
  });

  svgContent += `</svg>`;
  container.innerHTML = svgContent;

  container.querySelectorAll('.node-group').forEach(group => {
    group.addEventListener('click', () => {
      const slug = group.getAttribute('data-slug');
      if (slug) {
        window.location.href = `/waypoints/${slug}`;
      }
    });
  });
}

applySettings();
initBookmarkButtons();
initScrollProgress();
initWaypointFilter();
initBookmarksPage();
initProgressPage();
initSettings();
initDetailProgress();
initCheckpoints();
initReflections();
initWalkMode();
initTrail();
initPathfinder();
initPauseCards();
