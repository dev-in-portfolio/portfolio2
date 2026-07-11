/*
  Coverage Compass printable packet layer.
  Local-only, dependency-free, and intentionally separate from scoring.
*/

(function () {
  const REPORT_PRODUCTS = [
    { id: "agent-ready", name: "Agent Ready Packet", shortName: "Agent Packet", priceUsd: 19, includedInBundle: true, description: "Give this to an agent before choosing coverage.", useCase: "Before signing up or reviewing coverage with an agent." },
    { id: "switch-defense", name: "Switch Defense Sheet", shortName: "Switch Defense", priceUsd: 12, includedInBundle: true, description: "Use this before changing plans.", useCase: "When someone suggests switching your current coverage." },
    { id: "phone-script", name: "Phone Call Script", shortName: "Phone Script", priceUsd: 7, includedInBundle: true, description: "What to say if someone calls trying to switch your plan.", useCase: "Unsolicited calls or confusing plan-change conversations." },
    { id: "doorstep-event", name: "Doorstep / Event Response Sheet", shortName: "Doorstep Sheet", priceUsd: 7, includedInBundle: true, description: "What to say when someone pressures you in person.", useCase: "Doorstep, event, same-day, or high-pressure conversations." },
    { id: "family-review", name: "Family Review Packet", shortName: "Family Review", priceUsd: 12, includedInBundle: true, description: "Help a spouse, child, caregiver, or trusted helper understand the decision.", useCase: "Family or caregiver review." },
    { id: "annual-review", name: "Annual Review Checklist", shortName: "Annual Review", priceUsd: 12, includedInBundle: true, description: "Use during AEP/OEP before changing anything.", useCase: "Annual review season or major health/cost changes." },
    { id: "red-flag", name: "Red Flag Report", shortName: "Red Flags", priceUsd: 9, includedInBundle: true, description: "Highlights the risks your answers suggest should not be ignored.", useCase: "When there are lockout, network, drug, cost, or giveback concerns." },
    { id: "enrollment-status", name: "Enrollment Status Review Packet", shortName: "Enrollment Review", priceUsd: 9, includedInBundle: false, description: "Use this when Medicare Part A and/or Part B status needs to be resolved before comparing coverage structures.", useCase: "Before comparing Medigap and Medicare Advantage when enrollment status or timing is unclear." },
    { id: "full-bundle", name: "Full Coverage Compass Report Bundle", shortName: "Full Bundle", priceUsd: 39, includedInBundle: false, description: "Includes all personalized printable packets.", useCase: "All reports from the same result." }
  ];

  const BUNDLE_IDS = REPORT_PRODUCTS.filter((p) => p.includedInBundle).map((p) => p.id);
  const STANDARD_DISCLOSURE = "Coverage Compass is educational decision support. It does not sell insurance, enroll users in Medicare, Medicare Advantage, Part D, or Medigap, recommend a specific insurer or plan, provide legal, financial, medical, or tax advice, or verify live plan details. Medicare rules, provider networks, formularies, premiums, and benefits change. Before enrolling, switching, or canceling coverage, verify details with Medicare.gov, the plan, SHIP, and/or a licensed professional.";
  const LOCAL_FIRST_NOTE = "Local-first note: answers stay in your browser unless you choose to print, copy, download, or share.";
  const PRIVATE_BETA_NOTICE = "Private beta legal notice: the legal templates in this app are placeholders for counsel review. The current runtime is local-first with no account system, no analytics, no backend sync, and no default server submission of questionnaire answers.";

  function ensureApp() {
    const app = window.CoverageCompass;
    if (!app || !app.state || typeof app.pickWinner !== "function") {
      throw new Error("Coverage Compass engine is not loaded.");
    }
    return app;
  }

  function uniq(items) {
    return [...new Set((items || []).filter((item) => item !== undefined && item !== null).map((item) => String(item).trim()).filter(Boolean))];
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return `$${Math.round(n)}`;
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return String(value);
    }
  }

  function line(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function titleForKey(key) {
    if (key === "MEDIGAP") return "Medigap + Part D";
    if (key === "MA_PPO") return "Medicare Advantage PPO";
    if (key === "MA_HMO") return "Medicare Advantage HMO";
    if (key === "INELIGIBLE") return "Enrollment Status Needs Review";
    return key || "Coverage structure needs review";
  }

  function resultWhy(primaryKey) {
    if (primaryKey === "MEDIGAP") return "Your answers leaned toward broad provider access, lower downside surprise, and less risk from future switching friction.";
    if (primaryKey === "MA_PPO") return "Your answers balanced cost control with a need for some network flexibility and more room to compare options.";
    if (primaryKey === "MA_HMO") return "Your answers leaned toward lower premium structure, stronger comfort with plan rules, and willingness to stay inside a local network.";
    return "Coverage Compass cannot create a final coverage-structure recommendation yet because Medicare Part A and/or Part B status needs review first.";
  }

  function assessmentAnswerCount() {
    const app = ensureApp();
    const answers = app.state.answers || {};
    return Object.values(answers).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    }).length;
  }

  function requiredCoreAnswersPresent() {
    const app = ensureApp();
    const answers = app.state.answers || {};
    const missing = [];

    if (answers.S1_Q1 !== 0) missing.push("Medicare Part A and Part B status");
    if (answers.S1_STATE === undefined || answers.S1_STATE === null || answers.S1_STATE === "") missing.push("State");
    if (answers.S1_Q7 === undefined && answers.S1_Q5 === undefined && answers.S1_Q4 === undefined) missing.push("Current coverage status");

    return missing;
  }

  function reportReadinessStatus() {
    const app = ensureApp();
    const answeredCount = assessmentAnswerCount();
    const totalQuestions = app.questions?.length || 0;
    const percentAnswered = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    const missingCoreItems = requiredCoreAnswersPresent();
    const completedAt = typeof app.state.completedAt === "string" && app.state.completedAt ? app.state.completedAt : null;
    const canCompute = typeof app.pickWinner === "function";
    const out = canCompute ? app.pickWinner() : null;
    const hasResult = !!out;
    const needsEnrollmentReview = !!(app.state.flags?.needs_medicare_enrollment_guidance || out?.primary?.key === "INELIGIBLE");

    let status = "not-started";
    if (answeredCount > 0) status = "in-progress";
    if (needsEnrollmentReview && answeredCount > 0) status = "enrollment-review";
    if (!needsEnrollmentReview && answeredCount >= 6 && (missingCoreItems.length > 0 || !completedAt)) status = "preliminary";
    if (!needsEnrollmentReview && answeredCount >= 6 && missingCoreItems.length === 0 && completedAt && hasResult) status = "complete";

    const labelMap = {
      "not-started": "Assessment not started",
      "in-progress": "Assessment in progress",
      "enrollment-review": "Enrollment Status Review - recommendation not final",
      "preliminary": "Preliminary Packet - assessment incomplete",
      "complete": "Final Packet - based on completed assessment"
    };

    return {
      status,
      answeredCount,
      totalQuestions,
      percentAnswered,
      missingCoreItems,
      label: labelMap[status],
      canGenerateFinalReports: status === "complete",
      canGeneratePreliminaryReports: status === "preliminary" || status === "complete",
      canGenerateEnrollmentReviewReports: status === "enrollment-review"
    };
  }

  function hasCompletedAssessment() {
    return reportReadinessStatus().status === "complete";
  }

  function labelForPrimary(primary) {
    const key = primary?.key || primary?.name || "";
    return titleForKey(key);
  }

  function scenarioLine(label, value) {
    if (!value || typeof value !== "object") return null;
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => {
        if (typeof v === "object") return null;
        const pretty = typeof v === "number" ? (Math.abs(v) < 1 ? `${Math.round(v * 100)}%` : (Number.isInteger(v) ? String(v) : Number(v).toFixed(2))) : String(v);
        return `${k}: ${pretty}`;
      })
      .filter(Boolean);
    return entries.length ? `${label}: ${entries.join(", ")}` : null;
  }

  function scenarioSummaryLines(snapshot) {
    const scenarios = snapshot.scenarios || {};
    const lines = [];
    const annual = scenarios.expectedAnnualCost || {};
    const annualParts = Object.entries(annual).map(([k, v]) => `${titleForKey(k)} ${formatMoney(v)}/yr`);
    if (annualParts.length) lines.push(`Estimated annual cost: ${annualParts.join("; ")}`);
    const moopParts = Object.entries(scenarios.moopRisk || {}).map(([k, v]) => `${titleForKey(k)} ${Math.round(Number(v || 0) * 100)}%`);
    if (moopParts.length) lines.push(`Chance of a high-cost year: ${moopParts.join("; ")}`);
    const churn = scenarioLine("Plan-year churn risk", scenarios.churnRisk);
    if (churn) lines.push(churn);
    const regret = scenarioLine("Regret risk", scenarios.regretRisk);
    if (regret) lines.push(regret);
    const assistance = scenarioLine("Assistance likelihood", scenarios.assistance);
    if (assistance) lines.push(assistance);
    return uniq(lines);
  }

  function deriveNonNegotiables(state, out) {
    const flags = state.flags || {};
    const axes = state.axes || {};
    const items = [];
    if (flags.provider_dependency || flags.provider_fragility || axes.networkDependency > 0.2 || axes.providerFragility > 0.2) items.push("My doctors, specialists, and preferred health system must be verified before I sign or switch.");
    if (flags.high_rx_complexity || flags.specialty_rx || axes.rxRisk > 0.1) items.push("My prescriptions, drug tiers, prior authorization, step therapy, quantity limits, and pharmacy access must be verified before I sign or switch.");
    if (flags.medigap_lockout_risk || flags.medigap_underwriting_risk || flags.needs_medigap_lockout_education || axes.futureLockInSensitivity > 0.2) items.push("I need to understand whether switching could affect my ability to get Medigap later.");
    if (flags.snowbird || flags.routine_care_away || flags.hmo_snowbird_risk || axes.mobility > 0.2) items.push("Travel, out-of-area care, and routine care away from home must be considered before choosing an HMO or narrow network.");
    if (axes.predictability > 0.2 || axes.volatilityTolerance < -0.1) items.push("I need to understand worst-case annual out-of-pocket exposure, not just premium amount.");
    if (flags.giveback_interest || flags.giveback_veto || axes.givebackAttraction > 0.1 || axes.extrasPreference > 0.3) items.push("Part B giveback, dental, vision, OTC, and grocery benefits should not override my core medical-access needs.");
    if (flags.possible_dual_eligible || flags.possible_LIS || flags.possible_MSP || flags.possible_Medicaid || axes.assistanceLikelihood > 0.2) items.push("Medicaid, LIS/Extra Help, or Medicare Savings Program eligibility should be checked before finalizing a high-premium or high-risk path.");
    if (out?.confidence === "Low") items.push("This result has low confidence, so missing or conflicting information should be verified before making a decision.");
    items.push("I need plan details in writing before enrolling, switching, or canceling coverage.");
    return uniq(items);
  }

  function deriveRiskFlags(state) {
    const flags = state.flags || {};
    const axes = state.axes || {};
    const items = [];
    if (flags.needs_medicare_enrollment_guidance) items.push("Medicare Part A and/or Part B status needs review before comparing coverage structures.");
    if (flags.medigap_lockout_risk || flags.medigap_underwriting_risk || flags.needs_medigap_lockout_education) items.push("Medigap lockout or switching risk may matter.");
    if (axes.networkDependency > 0.2 || axes.providerFragility > 0.2) items.push("Provider or network fragility may matter.");
    if (flags.high_rx_complexity || flags.specialty_rx || axes.rxRisk > 0.1) items.push("Prescription or formulary risk may matter.");
    if (axes.adminTolerance < -0.1 || flags.wants_admin_penalty) items.push("Prior authorization or admin friction concern may matter.");
    if (flags.hmo_snowbird_risk || flags.snowbird || flags.routine_care_away) items.push("HMO risk may be higher for snowbird, travel, or routine care away from home.");
    if (axes.givebackAttraction > 0.1 || flags.giveback_veto) items.push("Giveback or extra-benefit attraction should not override core medical verification.");
    if (axes.predictability > 0.2 || axes.volatilityTolerance < -0.1) items.push("Low tolerance for high-cost-year exposure may matter.");
    if (axes.assistanceLikelihood > 0.2 || flags.possible_LIS || flags.possible_MSP || flags.possible_Medicaid) items.push("Assistance eligibility may need review.");
    if (axes.regretSensitivity > 0.2) items.push("Your answers suggest high sensitivity to future regret if a change goes badly.");
    return uniq(items);
  }

  function deriveAgentVerificationChecklist(state, out) {
    const primary = out?.primary?.key;
    const base = [
      "Doctors and primary care access",
      "Specialists",
      "Hospitals and preferred health systems",
      "Prescription coverage and formulary status",
      "Drug tiers, prior authorization, step therapy, and quantity limits",
      "Preferred pharmacy and mail-order rules",
      "Referrals and specialist access",
      "Prior authorization and denial or appeal process",
      "In-network maximum out-of-pocket",
      "Out-of-network maximum out-of-pocket and cost sharing if PPO",
      "Travel, out-of-area care, and emergency versus routine care away from home",
      "Dental, vision, OTC, grocery, and Part B giveback limitations",
      "What happens if health changes later",
      "What happens if I later want Medigap"
    ];
    if (primary === "MEDIGAP") base.push("Medigap underwriting or guaranteed-issue situation", "Part D drug plan review", "Medigap premium affordability and likely increases");
    if (primary === "MA_PPO") base.push("Out-of-network cost sharing and whether out-of-network care is realistically affordable");
    if (primary === "MA_HMO") base.push("Exact HMO network fit, PCP/referral rules, and local system coverage");
    return uniq(base);
  }

  function deriveDistractionWarnings(snapshot) {
    const key = snapshot.primary?.key;
    if (key === "MEDIGAP") {
      return [
        "Do not switch away from broad provider access based only on dental, vision, OTC, grocery, or Part B giveback.",
        "Do not assume I can easily return to Medigap later.",
        "Do not treat $0 premium as the same as low risk."
      ];
    }
    if (key === "MA_PPO") {
      return [
        "Do not switch from PPO to HMO based only on extra benefits unless the HMO works with my doctors, prescriptions, hospitals, pharmacy, referrals, and authorization rules.",
        "Do not assume PPO means all out-of-network care is affordable.",
        "Do not ignore annual network, MOOP, pharmacy, and formulary changes."
      ];
    }
    if (key === "MA_HMO") {
      return [
        "Do not switch HMOs based only on extra benefits unless my exact network, doctors, specialists, prescriptions, pharmacy, referrals, and authorizations are verified.",
        "Do not ignore that HMO value depends on staying inside the plan's rules.",
        "Do not assume a low premium solves access or authorization friction."
      ];
    }
    return ["Do not compare plans until Part A or Part B status and timing issues are understood."];
  }

  function buildResultSnapshot() {
    const app = ensureApp();
    if (typeof app.recomputeAll === "function") app.recomputeAll();
    const out = app.pickWinner();
    const primary = out.primary || {};
    const readiness = reportReadinessStatus();
    const state = app.state || {};
    const snapshot = {
      generatedAt: new Date().toISOString(),
      completedAt: app.state.completedAt || null,
      readiness,
      status: readiness.status,
      primary: {
        key: primary.key,
        name: labelForPrimary(primary),
        score: primary.score,
        confidence: out.confidence
      },
      ranked: (out.ranked || []).map((r) => ({ key: r.key, name: titleForKey(r.key) || r.name, score: r.score })),
      explanations: {
        why: uniq([resultWhy(primary.key), ...(state.explanations?.why || [])]),
        tradeoffs: uniq(state.explanations?.tradeoffs || []),
        changes: uniq(state.explanations?.changes || [])
      },
      warnings: uniq(state.hardWarnings || []),
      blocks: uniq(state.hardBlocks || []),
      scenarios: state.scenarios || {},
      flags: state.flags || {},
      axes: state.axes || {},
      disclaimers: [STANDARD_DISCLOSURE, LOCAL_FIRST_NOTE, PRIVATE_BETA_NOTICE]
    };
    snapshot.nonNegotiables = deriveNonNegotiables(state, out);
    snapshot.riskFlags = deriveRiskFlags(state);
    snapshot.agentVerificationChecklist = deriveAgentVerificationChecklist(state, out);
    snapshot.distractionWarnings = deriveDistractionWarnings(snapshot);
    snapshot.scenarioSummary = scenarioSummaryLines(snapshot);
    return snapshot;
  }

  function summarySection(title, items, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "summary", items: uniq(items), emphasis: opts.emphasis || "" };
  }

  function checklistSection(title, items, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "checklist", items: uniq(items), emphasis: opts.emphasis || "" };
  }

  function warningSection(title, items, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "warning", items: uniq(items), emphasis: opts.emphasis || "" };
  }

  function scriptSection(title, body, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "script", body: uniq(body), emphasis: opts.emphasis || "" };
  }

  function notesSection(title, rows, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "notes", rows, emphasis: opts.emphasis || "" };
  }

  function tableSection(title, columns, rows, opts = {}) {
    return { id: opts.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, type: "table", columns, rows, emphasis: opts.emphasis || "" };
  }

  function disclaimerSection() {
    return { id: "footer-disclaimer", title: "Footer Disclaimer", type: "warning", items: [
      "No carrier or plan recommendation.",
      "Verify before enrolling, switching, or canceling coverage."
    ] };
  }

  function enrollmentReviewSections(snapshot) {
    return [
      summarySection("Enrollment Status Review Summary", [
        "Coverage Compass cannot create a final coverage-structure recommendation yet because Medicare Part A and/or Part B status needs review first.",
        `Readiness: ${snapshot.readiness.label}`,
        "Use this packet to gather the right information before comparing coverage structures."
      ]),
      checklistSection("Questions To Ask Before Comparing Coverage", [
        "Am I enrolled in Part A?",
        "Am I enrolled in Part B?",
        "When did or will Part B start?",
        "Am I still in an employer or union coverage situation?",
        "Do I have a Special Enrollment Period?",
        "Are there late enrollment penalty risks?",
        "Should I talk with Medicare, SHIP, Social Security, or a licensed professional before choosing coverage?"
      ]),
      checklistSection("What Not To Do Yet", [
        "Do not compare plan extras before enrollment timing is clear.",
        "Do not cancel existing coverage without verifying coordination.",
        "Do not assume eligibility for Medigap or Medicare Advantage before Part A and Part B status is verified."
      ]),
      checklistSection("Information To Gather", [
        "Medicare card effective dates",
        "Employer or union coverage details if applicable",
        "Retiree coverage details if applicable",
        "Current notices",
        "Prescription list",
        "Doctor and hospital list"
      ]),
      tableSection("Verification Checklist", ["Item", "Notes"], [
        ["Part A effective date", ""],
        ["Part B effective date", ""],
        ["Employer or union coverage", ""],
        ["Special Enrollment Period", ""],
        ["Penalty risk questions", ""],
        ["Medicare / SHIP follow-up", ""]
      ]),
      summarySection("Recommended Next Step", [
        "Confirm Medicare Part A and Part B status.",
        "Verify whether current coverage should stay in place until timing is clear.",
        "Use this packet only as a discussion guide until enrollment status is resolved."
      ])
    ];
  }

  function resultSummarySection(snapshot) {
    return summarySection("Coverage Compass Result Summary", [
      `Recommended structure: ${snapshot.primary.name}`,
      `Confidence: ${snapshot.primary.confidence}`,
      `Readiness: ${snapshot.readiness.label}`,
      `Generated from a ${snapshot.readiness.status === "complete" ? "completed" : "partial"} assessment`
    ]);
  }

  function scoreComparisonSection(snapshot) {
    return tableSection("Score Comparison", ["Structure", "Score"], (snapshot.ranked || []).map((r) => [r.name, Number(r.score || 0).toFixed(2)]));
  }

  function whySection(snapshot) {
    return checklistSection("Why This Appeared", snapshot.explanations.why);
  }

  function nonNegotiablesSection(snapshot) {
    return checklistSection("My Non-Negotiables", snapshot.nonNegotiables);
  }

  function riskFlagsSection(snapshot) {
    return snapshot.riskFlags.length
      ? warningSection("Risk Flags", snapshot.riskFlags)
      : summarySection("Risk Flags", ["No major red flags were detected from your answers, but plan details still need verification."]);
  }

  function verificationSection(snapshot) {
    return checklistSection("Verification Checklist", snapshot.agentVerificationChecklist);
  }

  function distractionsSection(snapshot) {
    return checklistSection("What Not To Let Distract Me", snapshot.distractionWarnings);
  }

  function scenarioSection(snapshot) {
    return summarySection("Scenario Summary", snapshot.scenarioSummary.length ? snapshot.scenarioSummary : ["No scenario summary available yet."]);
  }

  function renderSectionHtml(section) {
    const title = esc(section.title);
    const emphasis = section.emphasis ? `<p class="reportSectionEmphasis">${esc(section.emphasis)}</p>` : "";
    if (section.type === "disclaimer") {
      return `<footer class="reportFooter">${section.body.map((lineItem) => `<p>${esc(lineItem)}</p>`).join("")}</footer>`;
    }
    if (section.type === "table") {
      return `<section class="reportSection reportTableSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}<table class="reportTable"><thead><tr>${section.columns.map((col) => `<th>${esc(col)}</th>`).join("")}</tr></thead><tbody>${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
    }
    if (section.type === "script") {
      return `<section class="reportSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}<div class="reportScript"><p>${section.body.map((part) => esc(part)).join("</p><p>")}</p></div></section>`;
    }
    if (section.type === "notes") {
      return `<section class="reportSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}<table class="reportTable reportSignatureTable"><tbody>${section.rows.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1] || "")}</td></tr>`).join("")}</tbody></table></section>`;
    }
    if (section.type === "warning") {
      return `<section class="reportSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}<div class="reportWarningBox"><ul class="reportChecklist">${(section.items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div></section>`;
    }
    const listHtml = (section.items || []).length
      ? `<ul class="reportChecklist">${section.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : `<p>No major items were detected.</p>`;
    if (section.type === "summary") {
      return `<section class="reportSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}<div class="reportNoteBox">${listHtml}</div></section>`;
    }
    return `<section class="reportSection" id="${esc(section.id)}"><h3>${title}</h3>${emphasis}${listHtml}</section>`;
  }

  function textTable(columns, rows) {
    const normalizedRows = rows.map((row) => row.map((cell) => line(cell)));
    const widths = columns.map((col, idx) => Math.max(line(col).length, ...normalizedRows.map((row) => line(row[idx] || "").length)));
    const renderRow = (row) => row.map((cell, idx) => line(cell).padEnd(widths[idx])).join(" | ");
    const separator = widths.map((w) => "-".repeat(Math.max(3, w))).join("-+-");
    return [renderRow(columns), separator, ...normalizedRows.map(renderRow)].join("\n");
  }

  function renderSectionText(section) {
    const lines = [];
    lines.push(section.title.toUpperCase());
    if (section.emphasis) lines.push(section.emphasis);
    if (section.type === "disclaimer") {
      lines.push(...section.body);
      return lines.join("\n");
    }
    if (section.type === "table") {
      lines.push(textTable(section.columns, section.rows));
      return lines.join("\n");
    }
    if (section.type === "script") {
      lines.push(...section.body.map((part) => line(part)));
      return lines.join("\n");
    }
    if (section.type === "notes") {
      section.rows.forEach((row) => {
        lines.push(`${line(row[0])}: ${line(row[1] || "")}`.trim());
      });
      return lines.join("\n");
    }
    const items = section.items || [];
    if (items.length) {
      lines.push(...items.map((item) => `- ${line(item)}`));
    } else {
      lines.push("No major items were detected.");
    }
    return lines.join("\n");
  }

  function renderDocumentText(report) {
    const readinessLine = report.readiness.status === "complete"
      ? "Generated from completed Coverage Compass assessment."
      : report.readiness.status === "enrollment-review"
        ? "This packet is an enrollment-status review because Medicare Part A and/or Part B status needs review."
        : "This packet is preliminary because the assessment is incomplete. Use it for discussion only, not as a final decision packet.";
    const lines = [
      "COVERAGE COMPASS PRINTABLE PACKET",
      report.title,
      report.subtitle || "",
      `Generated: ${formatDate(report.generatedAt) || report.generatedAt}`,
      `Packet type: ${report.packetType}`,
      `Readiness: ${report.readinessLabel}`,
      "Generated from your Coverage Compass result.",
      readinessLine,
      ""
    ];
    report.sections.forEach((section) => {
      lines.push(renderSectionText(section), "");
    });
    if (report.footerLines?.length) {
      lines.push(...report.footerLines, "");
    }
    return lines.map(line).filter((entry, idx, arr) => !(entry === "" && arr[idx - 1] === "")).join("\n").trim() + "\n";
  }

  function renderDocumentHtml(report) {
    const readinessClass = `reportReadinessBanner--${report.readiness.status}`;
    const readinessBody = report.readiness.status === "complete"
      ? "Generated from completed Coverage Compass assessment."
      : report.readiness.status === "enrollment-review"
        ? "This packet is an enrollment-status review because Medicare Part A and/or Part B status needs review. Use it to gather the right information before comparing coverage structures."
        : "This packet is preliminary because the assessment is incomplete. Use it for discussion only, not as a final decision packet.";
    return `<article class="reportDocument reportDocument--${esc(report.packetType)}" data-report-id="${esc(report.id)}">
      <section class="reportPage ${esc(report.pageClass || "")}">
        <header class="reportHeader">
          <p class="reportKicker">Coverage Compass Printable Packet</p>
          <h2>${esc(report.title)}</h2>
          <p class="reportSubtitle">${esc(report.subtitle || "")}</p>
          <div class="reportMetaGrid">
            <div><span>Report type</span><strong>${esc(report.packetTypeLabel)}</strong></div>
            <div><span>Generated</span><strong>${esc(formatDate(report.generatedAt) || report.generatedAt)}</strong></div>
            <div><span>Result</span><strong>${esc(report.resultLabel)}</strong></div>
            <div><span>Confidence</span><strong>${esc(report.snapshot.primary.confidence || "N/A")}</strong></div>
          </div>
        </header>
        <div class="reportReadinessBanner ${readinessClass}">
          <strong>${esc(report.readiness.label)}</strong>
          <span>${esc(readinessBody)}</span>
        </div>
        <p class="reportGenerationLine">Generated from your Coverage Compass result.</p>
        <div class="reportResultBand">
          <div>
            <span class="reportResultLabel">Result</span>
            <strong>${esc(report.snapshot.primary.name)}</strong>
          </div>
          <div>
            <span class="reportResultLabel">Readiness</span>
            <strong>${esc(report.readiness.label)}</strong>
          </div>
          <div>
            <span class="reportResultLabel">Generated from</span>
            <strong>${esc(report.readiness.status === "complete" ? "completed assessment" : "partial assessment")}</strong>
          </div>
        </div>
        ${report.sections.map(renderSectionHtml).join("")}
        <footer class="reportFooter">
          ${report.footerLines.map((item) => `<p>${esc(item)}</p>`).join("")}
        </footer>
      </section>
    </article>`;
  }

  function commonSections(snapshot) {
    return [
      resultSummarySection(snapshot),
      scoreComparisonSection(snapshot),
      whySection(snapshot),
      nonNegotiablesSection(snapshot),
      riskFlagsSection(snapshot),
      verificationSection(snapshot),
      distractionsSection(snapshot),
      scenarioSection(snapshot)
    ];
  }

  function agentReadySections(snapshot) {
    return commonSections(snapshot).concat([
      scriptSection("How To Use This Packet", [
        "Use this packet to keep the conversation focused on the coverage details that matter most to you.",
        "Ask the agent to show how the suggested option preserves the priorities listed above.",
        "Do not let premium, dental, vision, OTC, grocery, or Part B giveback talking points replace medical access verification."
      ]),
      checklistSection("Questions To Answer Before Signing", [
        "How does this option preserve my non-negotiables?",
        "What could get worse if I switch?",
        "What details are verified in writing?",
        "What happens if my doctors, drugs, health status, or county change later?"
      ]),
      notesSection("Agent Notes", [
        ["Agent name", ""],
        ["Agency", ""],
        ["Phone or email", ""],
        ["Date", ""],
        ["Plan or structure discussed", ""],
        ["Follow-up items", ""]
      ])
    ]);
  }

  function switchDefenseSections(snapshot) {
    return commonSections(snapshot).concat([
      checklistSection("My Current Coverage Was Chosen For These Reasons", snapshot.explanations.why),
      scriptSection("Switching Standard", [
        "I am not rejecting a switch automatically, but I am not switching based only on premium, giveback, dental, vision, OTC, or grocery benefits.",
        "Please show in writing how the new option preserves or improves the priorities identified by my Coverage Compass result."
      ]),
      checklistSection("What Would Make A Switch Reasonable", [
        "The proposed option preserves or improves my verified doctors, specialists, hospitals, prescriptions, pharmacy, MOOP, and future flexibility.",
        "The downside risks are explained in writing.",
        "I have time to compare before changing anything."
      ]),
      checklistSection("What Would Make A Switch Risky", [
        "Unverified doctor, specialist, hospital, pharmacy, or prescription access.",
        "Ignoring Medigap access risk, out-of-network exposure, prior authorization, referrals, or high-cost-year risk.",
        "Pressure to decide the same day."
      ]),
      tableSection("Before Changing Coverage", ["Item", "Current coverage", "Proposed coverage"], [
        ["Doctors", "", ""],
        ["Specialists", "", ""],
        ["Hospitals", "", ""],
        ["Prescriptions", "", ""],
        ["Pharmacy", "", ""],
        ["Referrals", "", ""],
        ["Prior authorization", "", ""],
        ["Maximum out-of-pocket", "", ""]
      ])
    ]);
  }

  function phoneScriptSections(snapshot) {
    const key = snapshot.primary.key;
    const addition = key === "MEDIGAP"
      ? "My current decision profile prioritizes provider flexibility and avoiding future switching risk."
      : key === "MA_PPO"
        ? "My current decision profile requires proof that doctors, prescriptions, hospitals, pharmacy access, and out-of-network rules still work for me."
        : key === "MA_HMO"
          ? "My current decision profile depends on exact network fit. I will not change HMOs without verifying doctors, specialists, prescriptions, pharmacy, referrals, and authorization rules."
          : "My enrollment status and timing need to be verified before comparing coverage structures.";
    return [
      summarySection("Phone Script Summary", snapshot.explanations.why.slice(0, 2)),
      scriptSection("Phone Script", [
        addition,
        "I do not make Medicare plan changes from an unsolicited call.",
        "Do not enroll me, switch my plan, record me as agreeing to a change, or submit any application based on this call.",
        "Send information in writing. I will verify it independently with Medicare.gov, the plan, SHIP, or a trusted licensed professional.",
        "If needed, I will review this with a trusted helper before responding.",
        "Do not share your Medicare number, Social Security number, bank information, or sensitive personal information with someone you do not trust or did not contact first."
      ], { id: "phone-script-main" }),
      tableSection("Caller Details To Write Down", ["Field", "Notes"], [
        ["Caller name", ""],
        ["Company", ""],
        ["Callback number", ""],
        ["Plan discussed", ""],
        ["Date and time", ""]
      ]),
      checklistSection("Reminder", [
        "Do not share personal identifiers over the phone unless I initiated the call and verified the source.",
        "Write down the plan details before I decide anything."
      ])
    ];
  }

  function doorstepSections(snapshot) {
    return [
      summarySection("Doorstep / Event Summary", snapshot.explanations.why.slice(0, 2)),
      scriptSection("Polite Response Script", [
        "Thank you, but I do not sign or switch Medicare coverage during a same-day conversation.",
        "My Coverage Compass result says these priorities need to be verified first.",
        "Please leave written information. I will review it later with a trusted helper or official source.",
        "Do not share your Medicare number, Social Security number, bank information, or sensitive personal information with someone you do not trust or did not contact first."
      ]),
      tableSection("Information To Collect", ["Item", "Notes"], [
        ["Plan name", ""],
        ["Doctors and hospitals", ""],
        ["Prescriptions", ""],
        ["Premium and out-of-pocket costs", ""],
        ["What I might lose if I switch", ""]
      ]),
      checklistSection("Do Not", [
        "Do not sign today.",
        "Do not share sensitive identifiers.",
        "Do not let extras override medical access verification."
      ])
    ];
  }

  function familyReviewSections(snapshot) {
    return commonSections(snapshot).concat([
      scriptSection("For A Trusted Helper", [
        "This packet is meant to help a trusted person understand the user's coverage priorities.",
        "It should not be used to pressure the user into switching.",
        "Use it to verify whether a proposed option fits the risks, preferences, and medical-access needs identified by Coverage Compass."
      ]),
      checklistSection("What Matters Most", snapshot.nonNegotiables),
      warningSection("What Could Go Wrong", snapshot.riskFlags.concat(snapshot.warnings)),
      checklistSection("Questions To Ask Together", [
        "What are we verifying before any change?",
        "What could be lost by switching?",
        "What needs annual review?",
        "Are extras being allowed to outweigh medical access or downside risk?"
      ]),
      checklistSection("When To Revisit This Decision", [
        "Annual Enrollment Period or Open Enrollment Period",
        "Major health, medication, income, travel, move, provider, hospital, or premium changes",
        "Any proposed switch from current coverage"
      ])
    ]);
  }

  function annualReviewSections(snapshot) {
    const key = snapshot.primary.key;
    const emphasis = key === "MEDIGAP"
      ? ["Check Medigap premium and Part D annually.", "Do not switch to Medicare Advantage without understanding future Medigap access."]
      : key === "MA_PPO" || key === "MA_HMO"
        ? ["Re-check network, prescriptions, pharmacy, MOOP, prior authorization, referrals, and benefits every year."]
        : ["Resolve Part A and Part B status and timing before comparing annual coverage changes."];
    return commonSections(snapshot).concat([
      checklistSection("Annual Review Checklist", [
        "What changed this year?",
        "Doctors or specialists changed?",
        "Prescriptions changed?",
        "Drug tiers or formulary changed?",
        "Pharmacy changed?",
        "Premium changed?",
        "Maximum out-of-pocket changed?",
        "Referral or prior authorization rules changed?",
        "Dental, vision, OTC, or giveback changed?",
        "Health status changed?",
        "Travel or move plans changed?",
        "Income or assistance eligibility changed?"
      ].concat(emphasis))
    ]);
  }

  function redFlagSections(snapshot) {
    const flags = snapshot.riskFlags.length ? snapshot.riskFlags : ["No major red flags were detected from your answers, but plan details still need verification."];
    const grouped = [
      "Stop and verify: anything that affects doctors, prescriptions, or plan switching rights.",
      "Important caution: any feature that looks cheap but changes network or authorization rules.",
      "Annual review item: anything that might change again next year."
    ];
    return [
      resultSummarySection(snapshot),
      warningSection("Top Red Flags", flags),
      checklistSection("Severity Guide", grouped),
      checklistSection("What To Ask Next", snapshot.agentVerificationChecklist),
      scriptSection("Stop And Verify", [
        "Do not sign, switch, cancel, or record consent until details are verified in writing.",
        "Verify with Medicare.gov, the plan, SHIP, and/or a licensed professional."
      ]),
      checklistSection("No Major Red Flags State", [
        "If there are no major red flags, still verify plan details before any final decision."
      ])
    ];
  }

  function fullBundleSections(snapshot, reports) {
    return [
      summarySection("Cover / Result Snapshot", [
        `Recommended structure: ${snapshot.primary.name}`,
        `Confidence: ${snapshot.primary.confidence}`,
        `Readiness: ${snapshot.readiness.label}`
      ]),
      checklistSection("Table Of Contents", reports.map((r) => r.title)),
      checklistSection("Included Packets", reports.map((r) => `${r.title} - ${r.subtitle || ""}`))
    ];
  }

  function packetSections(id, snapshot) {
    switch (id) {
      case "agent-ready": return agentReadySections(snapshot);
      case "switch-defense": return switchDefenseSections(snapshot);
      case "phone-script": return phoneScriptSections(snapshot);
      case "doorstep-event": return doorstepSections(snapshot);
      case "family-review": return familyReviewSections(snapshot);
      case "annual-review": return annualReviewSections(snapshot);
      case "red-flag": return redFlagSections(snapshot);
      case "enrollment-status": return enrollmentReviewSections(snapshot);
      default: return commonSections(snapshot);
    }
  }

  function buildReport(id, snapshot = buildResultSnapshot()) {
    const product = REPORT_PRODUCTS.find((p) => p.id === id);
    if (!product) throw new Error(`Unknown report product: ${id}`);
    const readiness = snapshot.readiness || reportReadinessStatus();
    if (id === "full-bundle") {
      return buildFullBundle(snapshot);
    }
    if (id === "enrollment-status") {
      if (!readiness.canGenerateEnrollmentReviewReports) {
        throw new Error("The Enrollment Status Review Packet is only available when Medicare Part A and/or Part B status needs review.");
      }
    } else if (!readiness.canGeneratePreliminaryReports && !readiness.canGenerateFinalReports) {
      throw new Error("Complete the assessment first so reports can include your result.");
    }

    const sections = packetSections(id, snapshot).concat([disclaimerSection()]);
    const report = {
      id,
      title: product.name,
      subtitle: product.useCase,
      packetType: id === "enrollment-status" ? "enrollment-review" : (product.includedInBundle ? "single-report" : "bundle"),
      packetTypeLabel: id === "enrollment-status" ? "Enrollment review" : (product.includedInBundle ? "Single report" : "Bundle"),
      generatedAt: snapshot.generatedAt,
      readiness,
      readinessLabel: readiness.label,
      resultLabel: snapshot.primary.name,
      snapshot,
      sections,
      footerLines: [STANDARD_DISCLOSURE, LOCAL_FIRST_NOTE, PRIVATE_BETA_NOTICE],
      pageClass: id === "phone-script" || id === "doorstep-event" ? "reportPage--compact" : "",
      html: "",
      text: ""
    };
    report.html = renderDocumentHtml(report);
    report.text = renderDocumentText(report);
    return report;
  }

  function buildFullBundle(snapshot = buildResultSnapshot()) {
    const product = REPORT_PRODUCTS.find((p) => p.id === "full-bundle");
    const readiness = snapshot.readiness || reportReadinessStatus();
    if (!readiness.canGenerateFinalReports) {
      throw new Error("Complete the assessment before generating the Full Coverage Compass Report Bundle.");
    }

    const reports = BUNDLE_IDS.map((id) => buildReport(id, snapshot));
    const cover = {
      id: "bundle-cover",
      title: "Full Coverage Compass Report Bundle",
      subtitle: "All personalized printable packets generated from the same result.",
      packetType: "bundle",
      packetTypeLabel: "Bundle",
      generatedAt: snapshot.generatedAt,
      readiness,
      readinessLabel: readiness.label,
      resultLabel: snapshot.primary.name,
      snapshot,
      sections: fullBundleSections(snapshot, reports).concat([disclaimerSection()]),
      footerLines: [STANDARD_DISCLOSURE, LOCAL_FIRST_NOTE, PRIVATE_BETA_NOTICE],
      pageClass: "reportPage--bundle-cover",
      html: "",
      text: ""
    };
    const verificationPage = {
      id: "bundle-verification",
      title: "Final Verification Page",
      subtitle: "Last check before any enrollment, switching, or cancellation.",
      packetType: "bundle",
      packetTypeLabel: "Bundle",
      generatedAt: snapshot.generatedAt,
      readiness,
      readinessLabel: readiness.label,
      resultLabel: snapshot.primary.name,
      snapshot,
      sections: [
        checklistSection("Final Verification", [
          "Review the packet that matches the conversation you are having.",
          "Use the readiness label to confirm whether the packet is final or preliminary.",
          "Verify plan details in writing before any enrollment, switching, or cancellation."
        ]),
        disclaimerSection()
      ],
      footerLines: [STANDARD_DISCLOSURE, LOCAL_FIRST_NOTE, PRIVATE_BETA_NOTICE],
      pageClass: "reportPage--bundle-verification",
      html: "",
      text: ""
    };
    const html = [renderDocumentHtml(cover), ...reports.map((r) => r.html), renderDocumentHtml(verificationPage)].join("\n");
    return {
      id: "full-bundle",
      title: product.name,
      subtitle: product.useCase,
      packetType: "bundle",
      packetTypeLabel: "Bundle",
      generatedAt: snapshot.generatedAt,
      readiness,
      readinessLabel: readiness.label,
      resultLabel: snapshot.primary.name,
      snapshot,
      sections: cover.sections.concat(verificationPage.sections),
      footerLines: cover.footerLines,
      html,
      text: [renderDocumentText(cover), ...reports.map((r) => r.text), renderDocumentText(verificationPage)].join("\n\n"),
      reports
    };
  }

  function buildAllReports() {
    return buildAvailableReports();
  }

  function getAvailableReportProducts(readiness = reportReadinessStatus()) {
    if (readiness.status === "complete") {
      return REPORT_PRODUCTS.filter((product) => product.id === "full-bundle" || BUNDLE_IDS.includes(product.id));
    }
    if (readiness.status === "preliminary") {
      return REPORT_PRODUCTS.filter((product) => BUNDLE_IDS.includes(product.id));
    }
    if (readiness.status === "enrollment-review") {
      return REPORT_PRODUCTS.filter((product) => product.id === "enrollment-status");
    }
    return [];
  }

  function buildAvailableReports(snapshot = buildResultSnapshot()) {
    const readiness = snapshot.readiness || reportReadinessStatus();
    return getAvailableReportProducts(readiness).map((product) => buildReport(product.id, snapshot));
  }

  function buildReportText(id, snapshot) {
    return buildReport(id, snapshot).text;
  }

  function getReportProducts() {
    return REPORT_PRODUCTS.map((product) => ({
      ...product,
      priceLabel: formatMoney(product.priceUsd)
    }));
  }

  window.CoverageCompassReports = {
    REPORT_PRODUCTS: getReportProducts(),
    assessmentAnswerCount,
    requiredCoreAnswersPresent,
    reportReadinessStatus,
    hasCompletedAssessment,
    buildResultSnapshot,
    buildReport,
    buildAllReports,
    buildAvailableReports,
    getAvailableReportProducts,
    buildFullBundle,
    buildReportText,
    getReportProducts
  };
})();
