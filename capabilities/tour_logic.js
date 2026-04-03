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

    let currentTourStep = 0;
    let currentPath = [];
    let pathId = "onboarding";

    const PATHS = {
      onboarding: [
        {
          title: "Mission: Protocol Selection",
          desc: `Welcome to the Capabilities Map. This is a <b>Live Verification System</b> of my professional engineering and strategy signals.
            <br><br>To provide a comprehensive walkthrough, please select your exploration protocol:
            <div class="path-grid" style="margin-top:20px;">
              <button class="path-btn" onclick="startPath('audit')">
                <div class="path-icon">📊</div>
                <div class="path-text"><b>Strategic Audit</b><span>High-level confidence scoring and portfolio-wide maturity signals.</span></div>
              </button>
              <button class="path-btn" onclick="startPath('verify')">
                <div class="path-icon">🛡️</div>
                <div class="path-text"><b>Technical Verification</b><span>Deep-dive into technical signals, case notes, and live app auditing.</span></div>
              </button>
              <button class="path-btn" onclick="startPath('hiring')">
                <div class="path-icon">🤝</div>
                <div class="path-text"><b>Hiring Review</b><span>Extract tactical roadmaps, failure modes, and team integration plans.</span></div>
              </button>
            </div>`,
          target: null,
          pos: "center"
        }
      ],
      audit: [
        { title: "Protocol: Strategic Audit", desc: "This comprehensive path focuses on assessing functional depth and maturity across the entire portfolio.", target: null, pos: "center" },
        { title: "1. The Fit Scoreboard", desc: "This panel calculates real-time confidence scores based on the <b>evidence currently in your view</b>. It updates as you filter.", target: ".score", pos: "bottom" },
        { title: "2. Metric: Delivery", desc: "Tracks 'ship-it' rigor and behavior contracts. High scores here prove a history of moving features from concept to production.", target: "#bDelivery", pos: "bottom" },
        { title: "3. Metric: Rigor", desc: "Measures the depth of verification logic—test suites, regression diffs, and adversarial rubrics.", target: "#bRigor", pos: "bottom" },
        { title: "4. Metric: Trust", desc: "Focuses on 'Recovery UX'—how the system handles AI hallucinations, drift, and user-facing failure handling.", target: "#bTrust", pos: "bottom" },
        { title: "5. Metric: Coverage", desc: "This is the raw breadth: the total number of unique, verified applications backing up the claims in your current view.", target: "#bCoverage", pos: "bottom" },
        { title: "6. Pivoting the Lens", desc: "The same skills look different through different functional needs. Let's pivot to the <b>Eval Lens</b> to see the map shift.", target: ".scoreControls", pos: "bottom", action: () => { if($("#lensEval")) $("#lensEval").click(); } },
        { title: "7. Reactive Scoring", desc: "Notice how the scores and evidence weights have shifted. The system is now prioritizing <b>quality and reliability signals</b>.", target: ".score", pos: "bottom" },
        { title: "8. The Realm Filter", desc: "You can focus the audit by selecting a specific functional realm from the navigation toolbar.", target: ".toolbar", pos: "bottom" },
        { title: "9. Portfolio Breath", desc: "Check the 'Proof Scope' for a high-density summary of all apps, frameworks, and live links contributing to the current scores.", target: "#scopeDetails", pos: "top" },
        { title: "Audit Protocol Complete", desc: "You now have the tools to audit my functional strength. Use the lens toggles to pivot your own perspective.", target: null, pos: "center" }
      ],
      verify: [
        { title: "Protocol: Technical Verification", desc: "This path focuses on the 'Ground Truth'—the actual code and implementation patterns that prove the signals.", target: null, pos: "center" },
        { title: "1. Pick your Realm", desc: "<b>Pick the realm</b> of the job you are filling. My skills are categorized by domain for precise technical auditing.", target: ".grid", pos: "bottom", action: () => { const f = document.querySelector(".section"); if(f && !f.classList.contains("open")) f.click(); } },
        { title: "2. Technical Signals", desc: "Look for these badges. They represent <b>vetted implementation patterns</b> (like 'Intent-echo' or 'Rollback triggers') verified in that role.", target: ".tags", pos: "right" },
        { title: "3. Briefing Packets", desc: "Every role card hides a deep-dive verification stack. I'll open one now so we can audit the internals.", target: ".roleCard", pos: "right", action: () => { const r = ROLES.find(x => x.id === "ai-product-manager") || ROLES[0]; setTimeout(() => openDrawer(r, "pm"), 400); } },
        { title: "4. Internal Signals", desc: "Inside the briefing, we list the specific technical patterns used to stabilize the AI systems for this role.", target: "#dProofSignals", pos: "left", arrowDir: "right" },
        { title: "5. Case Notes", desc: "This is the strategic audit log: the Problem, Constraint, Decision, and Result for the projects in this stack.", target: "#dProofIntro", pos: "left", arrowDir: "right" },
        { title: "6. Follow Proof Links", desc: "<b>Follow proof links</b> to the actual apps (e.g., 'Agents', 'Oracle Pit') to see the code and behavior in action.", target: "#dProofLinks", pos: "left", arrowDir: "right" },
        { title: "7. Live Verification", desc: "These links aren't screenshots; they are live deployments. Click them to challenge the claims directly.", target: "#dProofLinks", pos: "left", arrowDir: "right" },
        { title: "Verification Protocol Complete", desc: "The data is transparent. I encourage you to click the proof links and audit the implementation details yourself.", target: null, pos: "center" }
      ],
      hiring: [
        { title: "Protocol: Hiring & Integration", desc: "This tactical path focuses on team integration: what I ship, how I sync, and what risks I proactively prevent.", target: null, pos: "center" },
        { title: "1. Pick your Realm", desc: "<b>Pick the realm</b> of the job you are filling. Each realm represents a different functional 'department' of my work.", target: ".grid", pos: "bottom", action: () => { const f = document.querySelector(".section"); if(f && !f.classList.contains("open")) f.click(); } },
        { title: "2. Click the Job", desc: "<b>Click the job</b> you're hiring for to open the full <b>Briefing Packet</b>. Opening one now for the 'AI Product Manager' profile...", target: ".roleCard", pos: "right", action: () => { const r = ROLES.find(x => x.id === "ai-product-manager") || ROLES[0]; setTimeout(() => openDrawer(r, "pm"), 400); } },
        { title: "3. Strategic Angle", desc: "This defines my specific philosophy for the role—the architectural opinions and standards I bring to the team.", target: "#dAngle", pos: "left", arrowDir: "right" },
        { title: "4. The 12-Week Roadmap", desc: "This is my tactical onboarding plan. It shows exactly how I integrate and what I ship in <b>Week 1, 4, and 12</b>.", target: "#dTimeline", pos: "left", arrowDir: "right" },
        { title: "5. Failure Mode Protection", desc: "This is the most critical part of my value: the specific <b>risks</b> (drift, regression, scope creep) I am hard-wired to prevent.", target: "#dFails", pos: "left", arrowDir: "right" },
        { title: "6. Cross-Functional Sync", desc: "See exactly which partners I interface with (Eng, Design, QA) to ensure a cohesive release cycle.", target: "#dPartners", pos: "left", arrowDir: "right" },
        { title: "7. Artifact Production", desc: "A list of the <b>tangible deliverables</b> I produce, from capability statements to operational recovery playbooks.", target: "#dArtifacts", pos: "left", arrowDir: "right" },
        { title: "8. Recruiter Mode", desc: "Need to scan faster? Let's close the briefing and toggle <b>Recruiter Mode</b> for a high-density, text-first view.", target: "#tRecruiter", pos: "bottom", action: () => { closeDrawer(); setTimeout(() => { if($("#tRecruiter")) $("#tRecruiter").click(); }, 400); } },
        { title: "9. Copy Signals", desc: "In Recruiter Mode, you can quickly copy evidence bullets or role blurbs directly into your internal hiring docs.", target: ".roleTop", pos: "right" },
        { title: "Hiring Protocol Complete", desc: "You have the roadmap. I'm ready to integrate. Use Search (/) to find your specific job profile.", target: null, pos: "center" }
      ]
    };

    function startPath(id) {
      pathId = id;
      currentPath = PATHS[id];
      runTour(0);
    }

    window.startPath = startPath; // Expose to HTML

    function runTour(stepIndex) {
      if (stepIndex < 0 || stepIndex >= currentPath.length) {
        closeTour();
        return;
      }
      currentTourStep = stepIndex;
      const step = currentPath[stepIndex];
      
      tourCard.style.display = "flex";
      tourSpotlight.style.display = step.target ? "block" : "none";
      tourArrow.style.display = (step.target && step.arrowDir) ? "block" : "none";
      tourCard.classList.toggle("centered", !step.target);
      
      tourTitle.innerHTML = step.title;
      tourDesc.innerHTML = step.desc;
      tourStepCount.textContent = pathId === "onboarding" ? "MISSION PROTOCOL" : `${pathId.toUpperCase()} PHASE ${stepIndex + 1} OF ${currentPath.length}`;
      tourProgressFill.style.width = ((stepIndex / (currentPath.length - 1)) * 100) + "%";
      
      if (step.action) step.action();

      if (step.target) {
        setTimeout(() => {
          const targetEl = document.querySelector(step.target);
          if (!targetEl) return;
          const rect = targetEl.getBoundingClientRect();
          
          tourSpotlight.style.width = (rect.width + 30) + "px";
          tourSpotlight.style.height = (rect.height + 20) + "px";
          tourSpotlight.style.left = (rect.left - 15) + "px";
          tourSpotlight.style.top = (rect.top - 10) + "px";
          
          let cardTop, cardLeft;
          if (step.pos === "bottom") {
            cardTop = rect.bottom + 40;
            cardLeft = rect.left;
          } else if (step.pos === "top") {
            cardTop = rect.top - 360;
            cardLeft = rect.left;
          } else if (step.pos === "left") {
            cardTop = rect.top + 20;
            cardLeft = rect.left - 560;
          } else {
            cardTop = rect.top;
            cardLeft = rect.right + 40;
          }
          
          if (cardLeft + 540 > window.innerWidth) cardLeft = window.innerWidth - 560;
          if (cardLeft < 10) cardLeft = 10;
          if (cardTop + 350 > window.innerHeight) cardTop = window.innerHeight - 370;
          if (cardTop < 10) cardTop = 10;
          
          tourCard.style.top = cardTop + "px";
          tourCard.style.left = cardLeft + "px";

          if (step.arrowDir === "right") {
            tourArrow.style.top = (cardTop + 60) + "px";
            tourArrow.style.left = (cardLeft + 520) + "px";
            tourArrow.style.transform = "rotate(90deg)";
          }
        }, 250);
      }
      
      tourPrev.style.display = (stepIndex === 0 && pathId === "onboarding") ? "none" : "block";
      tourNext.style.display = (pathId === "onboarding") ? "none" : "block";
      tourNext.textContent = stepIndex === currentPath.length - 1 ? "Complete Mission" : "Next Phase";
      
      if (stepIndex === 0 && pathId !== "onboarding") {
        tourPrev.onclick = () => { closeDrawer(); startPath('onboarding'); };
      } else {
        tourPrev.onclick = () => runTour(currentTourStep - 1);
      }
    }

    function closeTour() {
      tourCard.style.display = "none";
      tourSpotlight.style.display = "none";
      tourArrow.style.display = "none";
      document.body.style.overflow = "";
      closeDrawer();
      const pmLens = $("#lensPm");
      if (pmLens) pmLens.click();
      const recruiter = $("#tRecruiter");
      if (recruiter && recruiter.classList.contains("on")) recruiter.click();
    }

    if (btnTour) btnTour.onclick = () => startPath('onboarding');
    if (tourNext) tourNext.onclick = () => runTour(currentTourStep + 1);
    if (tourEnd) tourEnd.onclick = closeTour;

    currentPath = PATHS.onboarding;

    // Force show V7 tour
    if (!sessionStorage.getItem("capabilities_tour_v7_seen")) {
      setTimeout(() => runTour(0), 1500);
      sessionStorage.setItem("capabilities_tour_v7_seen", "true");
    }

    $("#close").onclick = closeDrawer;
    mask.addEventListener("click",(e)=>{ if(e.target===mask) closeDrawer(); });

    function openDrawer(role, activeLens){
      $("#dTitle").textContent = role.title;
      $("#dSub").textContent = role.oneLiner;
      $("#dSummary").textContent = role.briefing?.summary || role.focus || "";

      const angle = $("#dAngle"); angle.innerHTML="";
      (role.briefing?.angle || []).forEach(x => angle.appendChild(el("li",{ textContent:x })));

      const t = $("#dTimeline"); t.innerHTML="";
      const wk = role.briefing?.week || { w1:[], w4:[], w12:[] };
      const mk = (label, items)=>{
        const card = el("div",{ className:"tCard" });
        card.appendChild(el("b",{ textContent:label }));
        const ul = el("ul",{});
        (items||[]).forEach(x=>ul.appendChild(el("li",{ textContent:x })));
        card.appendChild(ul);
        return card;
      };
      t.appendChild(mk("Week 1", wk.w1));
      t.appendChild(mk("Week 4", wk.w4));
      t.appendChild(mk("Week 12", wk.w12));

      const fails = $("#dFails"); fails.innerHTML="";
      (role.briefing?.fails || []).forEach(x => fails.appendChild(el("li",{ textContent:x })));

      const partners = $("#dPartners"); partners.innerHTML="";
      (role.briefing?.partners || []).forEach(x => partners.appendChild(el("li",{ textContent:x })));

      const arts = $("#dArtifacts"); arts.innerHTML="";
      (role.briefing?.artifacts || []).forEach(x => arts.appendChild(el("li",{ textContent:x })));

      const lensKey = activeLens || role.lensDefault || "pm";
      const lens = role.lenses[lensKey] || role.lenses[role.lensDefault] || Object.values(role.lenses)[0];
      const ps = lens?.proofStack;

      $("#dProofIntro").textContent = `Active lens: ${lensKey.toUpperCase()} · ${lens?.summary || "Proof stack"}`;

      const links = $("#dProofLinks"); links.innerHTML="";
      expandReceipts(ps?.receipts, { full:true }).forEach(p=>{
        const a = el("a",{ className:"proofLink", href:p.href || "#", target:"_blank", rel:"noopener noreferrer" });
        a.innerHTML = `${escapeHtml(p.label)} <span>${escapeHtml(p.note || "")}</span>`;
        a.onclick = (e)=>{ e.stopPropagation(); };
        links.appendChild(a);
      });

      const sig = $("#dProofSignals"); sig.innerHTML="";
      (ps?.signals || []).forEach(x=> sig.appendChild(el("li",{ textContent:x })));

      const copyBlurb = $("#dCopyBlurb");
      if (copyBlurb) {
        copyBlurb.onclick = async () => {
          const txt = `${role.title}\n${role.oneLiner}\n${lens?.summary || ""}`.trim();
          try { await navigator.clipboard.writeText(txt); copyBlurb.textContent = "Copied"; setTimeout(()=>copyBlurb.textContent="Copy role blurb", 900); } catch(_) {}
        };
      }
      const copyBullets = $("#dCopyBullets");
      if (copyBullets) {
        copyBullets.onclick = async () => {
          const lines = [
            `${role.title} — ${lensKey.toUpperCase()} evidence`,
            ...((lens?.bullets || []).map((x) => `- ${x}`)),
            ...((ps?.signals || []).map((x) => `- ${x}`))
          ];
          try { await navigator.clipboard.writeText(lines.join("\n")); copyBullets.textContent = "Copied"; setTimeout(()=>copyBullets.textContent="Copy evidence bullets", 900); } catch(_) {}
        };
      }

      mask.classList.add("show");
      document.body.style.overflow="hidden";
    }

    function closeDrawer(){ mask.classList.remove("show"); document.body.style.overflow=""; }

    function renderRoleCard(role){
      const card = el("div",{ className:"roleCard" });
      card.addEventListener("mousemove",(e)=>{
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty("--mx", x + "%");
        card.style.setProperty("--my", y + "%");
      });

      const top = el("div",{ className:"roleTop" });
      const info = el("div",{});
      const h = el("h3",{ className:"roleName" }); h.innerHTML = highlight(role.title, state.q); info.appendChild(h);
      const d = el("p",{ className:"roleDesc" }); d.innerHTML = highlight(role.oneLiner, state.q); info.appendChild(d);

      const tags = el("div",{ className:"tags" });
      (role.tags||[]).slice(0,6).forEach((t,i)=>{
        const span = el("span",{ className:"tag "+(i===0?"lime":i===1?"blue":"" ) });
        span.innerHTML = highlight(t, state.q);
        tags.appendChild(span);
      });
      info.appendChild(tags);
      top.appendChild(info);

      const mini = el("div",{ className:"miniHint" });
      mini.innerHTML = `Click for briefing →<br><span style="font-family:var(--mono); font-size:12.6px;">lens + proofs + plan</span>`;
      top.appendChild(mini);

      top.onclick = ()=>{ openDrawer(role, role.lensDefault || "pm"); };
      card.appendChild(top);

      const wrap = el("div",{ className:"lensWrap" });
      const lensSummary = el("div",{ className:"lensSummary" });
      const lensBullets = el("ul",{ className:"lensBullets" });
      const proof = el("div",{ className:"proofStack" });
      const tabs = el("div",{ className:"proofTabs" });
      const body = el("div",{ className:"proofBody" });

      const tReceipts = el("div",{ className:"tab active", textContent:"Receipts" });
      tabs.appendChild(tReceipts);
      proof.appendChild(tabs);
      proof.appendChild(body);

      function renderLens(){
        const L = role.lenses[role.lensDefault] || Object.values(role.lenses)[0];
        lensSummary.innerHTML = highlight(L.summary, state.q);
        lensBullets.innerHTML="";
        (L.bullets||[]).forEach(x=>{
          const li = el("li",{}); li.innerHTML = highlight(x, state.q); lensBullets.appendChild(li);
        });

        body.innerHTML="";
        const links = el("div",{ className:"proofLinks" });
        expandReceipts(L.proofStack?.receipts, { full:false, limit:16 }).forEach(p=>{
          const a = el("a",{ className:"proofLink", href:p.href||"#", target:"_blank", rel:"noopener noreferrer" });
          a.innerHTML = `${highlight(p.label, state.q)} <span>${highlight(p.note||"", state.q)}</span>`;
          a.onclick=(e)=>{ e.stopPropagation(); };
          links.appendChild(a);
        });
        body.appendChild(links);
      }

      wrap.appendChild(lensSummary);
      wrap.appendChild(lensBullets);
      wrap.appendChild(proof);
      card.appendChild(wrap);

      renderLens();
      return card;
    }

    const CATEGORY_COLORS = {
      product: "#9cd0ff",
      decision: "#b2ff9a",
      agents: "#ffd488",
      arch: "#c0b0ff",
      eval: "#ff9fb8",
      ops: "#95ffd8",
      ux: "#ffd59c",
      creative: "#f1b6ff"
    };

    function render(){
      document.body.classList.toggle("compact", state.compact);
      $("#score").style.display = state.autoScore ? "" : "none";
      const filtered = ROLES.filter(matches);
      const grouped = groupByCategory(filtered);
      const root = $("#sections"); root.innerHTML="";
      for(const c of CATS){
        const roles = grouped.get(c.id);
        if(!roles || roles.length===0) continue;

        const section = el("div",{ className:"section" });
        section.dataset.category = c.id;
        section.style.setProperty("--cat-color", CATEGORY_COLORS[c.id] || "rgba(255,255,255,.2)");
        if (state.scoreCategory && state.scoreCategory === c.id) section.classList.add("open");
        const head = el("div",{ className:"secHead" });
        head.onclick=()=>{
          section.classList.toggle("open");
          const opens = [...root.querySelectorAll(".section.open")];
          state.scoreCategory = opens.length === 1 ? (opens[0].dataset.category || null) : null;
          setScoreboard(state.scoreboardLens, filtered, state.scoreCategory);
        };
        const left = el("div",{}); left.appendChild(el("h2",{ className:"secTitle", textContent:c.name }));
        const chev = el("div",{ className:"chev", innerHTML:"▾" });
        head.appendChild(left); head.appendChild(el("div",{className:"secMeta"})); head.appendChild(chev);

        const body = el("div",{ className:"roles" });
        roles.forEach(r=> body.appendChild(renderRoleCard(r)));

        section.appendChild(head);
        section.appendChild(body);
        root.appendChild(section);
      }
      const opens = [...root.querySelectorAll(".section.open")];
      state.scoreCategory = opens.length === 1 ? (opens[0].dataset.category || null) : null;
      setScoreboard(state.scoreboardLens, filtered, state.scoreCategory);
    }

    document.addEventListener("keydown",(e)=>{
      if(e.key==="/"){ e.preventDefault(); $("#q").focus(); }
      if(e.key==="Escape"){ closeDrawer(); closeTour(); }
    });

    $("#q").addEventListener("input",(e)=>{ state.q=e.target.value; render(); });

    function toggleEl(elm, on){ elm.classList.toggle("on", !!on); }
    function wireToggle(id, getter, setter){
      const t = $(id);
      const click = ()=>{
        const next = !getter();
        setter(next);
        toggleEl(t, next);
        render();
      };
      t.addEventListener("click", click);
      toggleEl(t, getter());
    }
    wireToggle("#tRecruiter", ()=>state.compact, (v)=>state.compact=v);
    wireToggle("#tAutoScore", ()=>state.autoScore, (v)=>state.autoScore=v);

    const wireScoreLens = (id, lens) => {
      const btn = $(id);
      if (!btn) return;
      btn.onclick = () => {
        state.scoreboardLens = lens;
        SCORE_LENS_IDS.forEach((x) => $(x)?.classList.remove("on"));
        btn.classList.add("on");
        render();
      };
    };
    wireScoreLens("#lensPm", "pm");
    wireScoreLens("#lensEval", "eval");
    wireScoreLens("#lensOps", "ops");
    wireScoreLens("#lensArch", "arch");
    wireScoreLens("#lensUx", "ux");
    wireScoreLens("#lensReliability", "reliability");

    setScoreboard(state.scoreboardLens, ROLES, null);
    render();