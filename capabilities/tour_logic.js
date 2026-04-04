const tourSpotlight = $("#tourSpotlight");
const tourCard = $("#tourCard");
const tourTitle = $("#tourTitle");
const tourDesc = $("#tourDesc");
const tourStepCount = $("#tourStepCount");
const tourProgressFill = $("#tourProgressFill");
const tourArrow = $("#tourArrow");
const btnTour = $("#btnTour");
const tourPrev = $("#tourPrev");
const tourNext = $("#tourNext");
const tourEnd = $("#tourEnd");
const TOUR_FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

let currentTourStep = 0;
let currentPath = [];
let pathId = "onboarding";
let tourPreviouslyFocused = null;

function firstSection() {
  return document.querySelector("#sections .section");
}

function firstRoleCard() {
  return document.querySelector("#sections .roleCard");
}

function ensureSectionOpen() {
  const section = firstSection();
  if (section && !section.classList.contains("open")) {
    section.querySelector(".secHead")?.click();
  }
}

function focusFirstRoleCard() {
  ensureSectionOpen();
  const card = firstRoleCard();
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function openDemoRole(lens = "pm") {
  ensureSectionOpen();
  const role = ROLES.find((x) => x.id === "ai-product-manager") || ROLES[0];
  if (!role) return;
  setTimeout(() => {
    openDrawer(role, lens);
    const drawer = document.querySelector(".drawer");
    drawer?.scrollTo({ top: 0, behavior: "instant" });
  }, 220);
}

function resetTourState() {
  closeDrawer();
  const pmLens = $("#lensPm");
  if (pmLens) pmLens.click();
  const recruiter = $("#tRecruiter");
  if (recruiter && recruiter.classList.contains("on")) recruiter.click();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTourFocusable() {
  return [...tourCard.querySelectorAll(TOUR_FOCUSABLE)]
    .filter((node) => node.offsetParent !== null && !node.hasAttribute("disabled"));
}

function setTourOpenState(open) {
  document.body.classList.toggle("tour-open", open);
  if (open) {
    if (!tourPreviouslyFocused) {
      tourPreviouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    tourCard.setAttribute("role", "dialog");
    tourCard.setAttribute("aria-modal", "true");
    tourCard.setAttribute("tabindex", "-1");
  } else {
    document.body.classList.remove("tour-open");
    tourCard.removeAttribute("aria-modal");
    if (tourPreviouslyFocused && typeof tourPreviouslyFocused.focus === "function") {
      tourPreviouslyFocused.focus({ preventScroll: true });
    }
    tourPreviouslyFocused = null;
  }
}

function focusTourPrimary() {
  const focusable = getTourFocusable();
  const preferred = focusable.find((node) => node.id === "tourNext")
    || focusable.find((node) => node.classList.contains("path-btn"))
    || focusable[0]
    || tourCard;
  preferred.focus({ preventScroll: true });
}

function handleTourKeydown(e) {
  if (tourCard.style.display !== "flex") return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeTour();
    return;
  }
  if (e.key !== "Tab") return;

  const focusable = getTourFocusable();
  if (!focusable.length) {
    e.preventDefault();
    tourCard.focus({ preventScroll: true });
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === tourCard)) {
    e.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function alignTargetIntoView(targetEl, step) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const gutter = 36;
  const offTop = rect.top < gutter;
  const offBottom = rect.bottom > window.innerHeight - gutter;
  const offLeft = rect.left < gutter;
  const offRight = rect.right > window.innerWidth - gutter;
  if (!(offTop || offBottom || offLeft || offRight)) return;

  const block = step?.pos === "top" ? "start" : step?.pos === "bottom" ? "end" : "center";
  const inline = step?.pos === "left" ? "end" : step?.pos === "right" ? "start" : "nearest";
  targetEl.scrollIntoView({ behavior: "smooth", block, inline });
}

function placeTourForTarget(targetEl, step) {
  const rect = targetEl.getBoundingClientRect();
  const spotlightPadX = rect.width < 220 ? 10 : 16;
  const spotlightPadY = rect.height < 90 ? 8 : 12;
  const cardRect = tourCard.getBoundingClientRect();
  const cardWidth = cardRect.width || Math.min(window.innerWidth - 24, 500);
  const cardHeight = cardRect.height || Math.min(window.innerHeight - 24, 320);
  const gap = window.innerWidth < 760 ? 18 : 28;
  const viewportPad = 12;

  tourSpotlight.style.width = `${rect.width + spotlightPadX * 2}px`;
  tourSpotlight.style.height = `${rect.height + spotlightPadY * 2}px`;
  tourSpotlight.style.left = `${rect.left - spotlightPadX}px`;
  tourSpotlight.style.top = `${rect.top - spotlightPadY}px`;

  let cardTop = rect.top;
  let cardLeft = rect.left;

  switch (step.pos) {
    case "bottom":
      cardTop = rect.bottom + gap;
      cardLeft = rect.left + (rect.width - cardWidth) / 2;
      break;
    case "top":
      cardTop = rect.top - cardHeight - gap;
      cardLeft = rect.left + (rect.width - cardWidth) / 2;
      break;
    case "left":
      cardTop = rect.top + (rect.height - cardHeight) / 2;
      cardLeft = rect.left - cardWidth - gap;
      break;
    case "right":
    default:
      cardTop = rect.top + (rect.height - cardHeight) / 2;
      cardLeft = rect.right + gap;
      break;
  }

  if (step.pos === "left" && cardLeft < viewportPad) {
    cardLeft = rect.right + gap;
  } else if (step.pos === "right" && cardLeft + cardWidth > window.innerWidth - viewportPad) {
    cardLeft = rect.left - cardWidth - gap;
  }

  if ((step.pos === "top" && cardTop < viewportPad) || (step.pos === "bottom" && cardTop + cardHeight > window.innerHeight - viewportPad)) {
    cardTop = rect.top + (rect.height - cardHeight) / 2;
    cardLeft = rect.right + gap;
    if (cardLeft + cardWidth > window.innerWidth - viewportPad) {
      cardLeft = rect.left - cardWidth - gap;
    }
  }

  cardLeft = clamp(cardLeft, viewportPad, window.innerWidth - cardWidth - viewportPad);
  cardTop = clamp(cardTop, viewportPad, window.innerHeight - cardHeight - viewportPad);

  tourCard.style.top = `${cardTop}px`;
  tourCard.style.left = `${cardLeft}px`;

  if (step.arrowDir === "right") {
    const arrowTop = clamp(rect.top + rect.height / 2 - 28, viewportPad, window.innerHeight - 84);
    const arrowLeft = clamp(cardLeft + cardWidth - 8, viewportPad, window.innerWidth - 84);
    tourArrow.style.top = `${arrowTop}px`;
    tourArrow.style.left = `${arrowLeft}px`;
    tourArrow.style.transform = "rotate(90deg)";
  }
}

const PATHS = {
  onboarding: [
    {
      title: "Capability Map Orientation",
      desc: "This page works best when you read it in <b>five layers</b>: overview, scoreboard, categories, role cards, then the Briefing Packet drawer. We’ll establish that grammar first, then branch into the deeper review path you actually need.",
      target: ".hero",
      pos: "bottom"
    },
    {
      title: "1. Page Overview",
      desc: "The hero is the legend. It tells you what each layer is for: <b>scoreboard for synthesis</b>, <b>categories for navigation</b>, <b>cards for scanning</b>, and the <b>drawer for proof</b>. Read this first so the page feels structured, not crowded.",
      target: ".hero",
      pos: "bottom"
    },
    {
      title: "2. Fit Scoreboard",
      desc: "This is the <b>synthesis layer</b>. Read it in order: active lens, four bars, then the proof context underneath. It gives directional fit, not a fake precision ranking.",
      target: ".score",
      pos: "bottom"
    },
    {
      title: "3. Lens + Proof Scope",
      desc: "Lenses let you reinterpret the same body of work for different decision-makers. <b>Proof Scope</b> then shows the breadth behind that read: app count, framework families, and live links.",
      target: "#scopeDetails",
      pos: "top",
      action: () => {
        if (!$("#scopeDetails")?.open) $("#scopeDetails")?.setAttribute("open", "open");
        if ($("#lensEval")) $("#lensEval").click();
      }
    },
    {
      title: "4. Accordion Categories",
      desc: "This is the <b>navigation layer</b>. Categories group roles by functional realm so you can narrow the audit before opening detail. Pick the capability family first, then inspect inside it.",
      target: "#sections",
      pos: "bottom",
      action: () => {
        focusFirstRoleCard();
      }
    },
    {
      title: "5. Role Cards",
      desc: "These cards are the <b>scan layer</b>. Skim title, one-line fit, tags, and proof hints until you find the profile worth opening.",
      target: ".roleCard",
      pos: "right",
      action: () => {
        focusFirstRoleCard();
      }
    },
    {
      title: "6. Briefing Packet Drawer",
      desc: "Clicking a role opens the <b>deep proof layer</b>. This is where the page becomes decision-grade: summary, role angle, roadmap, failure modes, artifacts, and the proof stack.",
      target: "#dSummary",
      pos: "left",
      arrowDir: "right",
      action: () => {
        openDemoRole("pm");
      }
    },
    {
      title: "7. Support Tools",
      desc: "Three helpers sit across the whole page: <b>Search</b> finds roles fast, <b>Recruiter Mode</b> compresses the scan, and this <b>tour</b> teaches the system progressively instead of dumping everything at once.",
      target: ".toolbar",
      pos: "bottom",
      action: () => {
        closeDrawer();
      }
    },
    {
      title: "Choose Your Deep-Dive Protocol",
      desc: `Now that the page grammar is clear, choose the protocol that matches your goal:
        <div class="path-grid" style="margin-top:20px;">
          <button class="path-btn" onclick="startPath('audit')">
            <div class="path-icon">📊</div>
            <div class="path-text"><b>Strategic Audit</b><span>Read the scoreboard, lenses, and portfolio-wide proof coverage.</span></div>
          </button>
          <button class="path-btn" onclick="startPath('verify')">
            <div class="path-icon">🛡️</div>
            <div class="path-text"><b>Technical Verification</b><span>Inspect signals, proof stack internals, case notes, and live links.</span></div>
          </button>
          <button class="path-btn" onclick="startPath('hiring')">
            <div class="path-icon">🤝</div>
            <div class="path-text"><b>Hiring Review</b><span>Read role fit, onboarding plan, failure modes, and recruiter shortcuts.</span></div>
          </button>
        </div>`,
      target: null,
      pos: "center",
      action: () => {
        closeDrawer();
      }
    }
  ],
  audit: [
    { title: "Protocol: Strategic Audit", desc: "Use this path when the question is portfolio fit at a glance: what is strong, what is proven, and what still needs inspection.", target: null, pos: "center" },
    { title: "1. Start at the Scoreboard", desc: "Begin with the Fit Scoreboard. It is the fastest high-level read on what the visible evidence supports right now.", target: ".score", pos: "bottom" },
    { title: "2. Metric: Delivery", desc: "Delivery asks whether the visible work shows shipping discipline: clear scope, practical execution, and stable follow-through.", target: "#bDelivery", pos: "bottom" },
    { title: "3. Metric: Rigor", desc: "Rigor is the verification signal: tests, eval patterns, review discipline, and regression control inside the work.", target: "#bRigor", pos: "bottom" },
    { title: "4. Metric: UX / Trust", desc: "UX/Trust asks whether the systems stay legible under pressure: clear recovery, honest communication, and low-friction behavior.", target: "#bTrust", pos: "bottom" },
    { title: "5. Metric: Evidence Coverage", desc: "Coverage is the breadth signal: how much distinct proof is backing the current interpretation of capability.", target: "#bCoverage", pos: "bottom" },
    { title: "6. Pivot the Lens", desc: "Switch lenses to see how the same body of work reads for a different functional owner. Here we pivot into evaluation thinking.", target: ".scoreControls", pos: "bottom", action: () => { if ($("#lensEval")) $("#lensEval").click(); } },
    { title: "7. Read Scope Breadth", desc: "Proof Scope gives the density behind the summary: apps, framework families, and live links contributing to the current read.", target: "#scopeDetails", pos: "top", action: () => { if (!$("#scopeDetails")?.open) $("#scopeDetails")?.setAttribute("open", "open"); } },
    { title: "Audit Protocol Complete", desc: "For a strategic audit, the reading order is simple: lens, bars, scope, then category detail only where the signal needs more proof.", target: null, pos: "center" }
  ],
  verify: [
    { title: "Protocol: Technical Verification", desc: "Use this path when you want to challenge the page as a proof system, not just browse it as a polished artifact.", target: null, pos: "center" },
    { title: "1. Open the Relevant Realm", desc: "Start with the category that matches the system you want to audit. Categories keep the technical review scoped and readable.", target: "#sections", pos: "bottom", action: () => { focusFirstRoleCard(); } },
    { title: "2. Scan the Role Signals", desc: "The tags are quick technical clues. They surface recurring implementation patterns and operating concerns before you open the drawer.", target: ".tags", pos: "right", action: () => { focusFirstRoleCard(); } },
    { title: "3. Open the Briefing Packet", desc: "The real verification layer starts in the drawer. We’ll open a representative role so you can inspect the internals directly.", target: "#dSummary", pos: "left", arrowDir: "right", action: () => { openDemoRole("pm"); } },
    { title: "4. Internal Signals", desc: "These bullets name the implementation patterns and stabilizers that repeatedly show up in the work, not just the marketing layer around it.", target: "#dProofSignals", pos: "left", arrowDir: "right" },
    { title: "5. Case Notes", desc: "The proof intro explains what was being solved, which constraints mattered, and why these receipts are the right evidence.", target: "#dProofIntro", pos: "left", arrowDir: "right" },
    { title: "6. Live Proof Links", desc: "These receipts are meant to be challenged. Open the live links and test whether the claims hold up outside the page.", target: "#dProofLinks", pos: "left", arrowDir: "right" },
    { title: "Verification Protocol Complete", desc: "For technical verification, read tags first, then drawer internals, then live proof links.", target: null, pos: "center" }
  ],
  hiring: [
    { title: "Protocol: Hiring Review", desc: "Use this path when the question is team fit: how the role operates, how fast it ramps, and what failure it helps prevent.", target: null, pos: "center" },
    { title: "1. Find the Job Family", desc: "Open the category that matches the role you are hiring for. This narrows the page from broad capability to an actual job context.", target: "#sections", pos: "bottom", action: () => { focusFirstRoleCard(); } },
    { title: "2. Open the Role Briefing", desc: "The drawer is where the page becomes hiring-usable. We’ll open a representative packet and read it as an integration plan, not a title card.", target: "#dSummary", pos: "left", arrowDir: "right", action: () => { openDemoRole("pm"); } },
    { title: "3. Strategic Angle", desc: "This section explains the operating philosophy and standards the role would bring into the team, not just a keyword match.", target: "#dAngle", pos: "left", arrowDir: "right" },
    { title: "4. Week 1 / 4 / 12", desc: "This roadmap translates the role from abstraction into execution. Read it as the onboarding and delivery trajectory.", target: "#dTimeline", pos: "left", arrowDir: "right" },
    { title: "5. Failure Modes I Protect Against", desc: "This is the sharpest hiring section. It tells you which risks this role actively prevents once embedded in the team.", target: "#dFails", pos: "left", arrowDir: "right" },
    { title: "6. Partners + Artifacts", desc: "These sections show how the role collaborates and what concrete outputs it produces in a real operating environment.", target: "#dArtifacts", pos: "left", arrowDir: "right" },
    { title: "7. Recruiter Mode", desc: "Recruiter Mode compresses the page into a denser text-first scan. Use it once you understand the page and want faster throughput.", target: "#tRecruiter", pos: "bottom", action: () => { closeDrawer(); setTimeout(() => { if ($("#tRecruiter") && !$("#tRecruiter").classList.contains("on")) $("#tRecruiter").click(); }, 250); } },
    { title: "Hiring Protocol Complete", desc: "For hiring review, read the role packet, onboarding plan, failure modes, collaboration shape, then switch to Recruiter Mode for speed.", target: null, pos: "center" }
  ]
};

function startPath(id) {
  resetTourState();
  pathId = id;
  currentPath = PATHS[id];
  runTour(0);
}

window.startPath = startPath;

function runTour(stepIndex) {
  if (stepIndex < 0 || stepIndex >= currentPath.length) {
    closeTour();
    return;
  }

  currentTourStep = stepIndex;
  const step = currentPath[stepIndex];

  setTourOpenState(true);
  tourCard.style.display = "flex";
  tourSpotlight.style.display = step.target ? "block" : "none";
  tourArrow.style.display = step.target && step.arrowDir ? "block" : "none";
  tourCard.classList.toggle("centered", !step.target);

  tourTitle.innerHTML = step.title;
  tourDesc.innerHTML = step.desc;
  tourStepCount.textContent = pathId === "onboarding"
    ? `PAGE ORIENTATION ${stepIndex + 1} OF ${currentPath.length}`
    : `${pathId.toUpperCase()} PHASE ${stepIndex + 1} OF ${currentPath.length}`;

  const progressBase = currentPath.length > 1 ? stepIndex / (currentPath.length - 1) : 0;
  tourProgressFill.style.width = `${Math.max(4, Math.round(progressBase * 100))}%`;

  if (step.action) step.action();

  if (step.target) {
    setTimeout(() => {
      const targetEl = document.querySelector(step.target);
      if (!targetEl) return;
      alignTargetIntoView(targetEl, step);
      setTimeout(() => {
        const freshTarget = document.querySelector(step.target);
        if (!freshTarget) return;
        placeTourForTarget(freshTarget, step);
      }, 180);
    }, 180);
  }

  const isOrientationChoice = pathId === "onboarding" && stepIndex === currentPath.length - 1;
  tourPrev.style.display = stepIndex === 0 ? "none" : "block";
  tourNext.style.display = isOrientationChoice ? "none" : "block";
  tourNext.textContent = stepIndex === currentPath.length - 1 ? "Complete Mission" : "Next Phase";

  if (stepIndex === 0 && pathId !== "onboarding") {
    tourPrev.onclick = () => startPath("onboarding");
  } else {
    tourPrev.onclick = () => runTour(currentTourStep - 1);
  }

  requestAnimationFrame(() => focusTourPrimary());
}

function closeTour() {
  setTourOpenState(false);
  tourCard.style.display = "none";
  tourSpotlight.style.display = "none";
  tourArrow.style.display = "none";
  document.body.style.overflow = "";
  resetTourState();
}

function startCapabilitiesTour() {
  startPath("onboarding");
}

window.startCapabilitiesTour = startCapabilitiesTour;
window.runTour = runTour;
window.closeTour = closeTour;
window.isCapabilitiesTourOpen = () => tourCard.style.display === "flex";

if (btnTour) {
  btnTour.onclick = startCapabilitiesTour;
  btnTour.setAttribute("onclick", "window.startCapabilitiesTour && window.startCapabilitiesTour()");
}
if (tourNext) tourNext.onclick = () => runTour(currentTourStep + 1);
if (tourEnd) tourEnd.onclick = closeTour;
document.addEventListener("keydown", handleTourKeydown, true);

currentPath = PATHS.onboarding;

if (!sessionStorage.getItem("capabilities_tour_v8_seen")) {
  setTimeout(() => startPath("onboarding"), 1500);
  sessionStorage.setItem("capabilities_tour_v8_seen", "true");
}
