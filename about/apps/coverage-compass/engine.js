/* Coverage Compass
   - Full scoring brain with layered engines:
     GI enforcement, assistance modeling, giveback tradeoffs, churn modeling,
     multi-year scenario simulation, regret minimization, lockouts & warnings,
     agent-grade explanation trace.

   This file is dependency-free and intended to be used by app.js.
*/

// ================================
// 1) STATE RULES (GI / Switching)
// ================================
// Note: These are simplified educational heuristics. Real-world rules vary by carrier/state.
const STATE_RULES = {
  "AL": { type: "standard" }, "AK": { type: "standard" }, "AZ": { type: "standard" }, "AR": { type: "standard" },
  "CA": { type: "birthday", note: "CA Birthday Rule (Medigap): You may switch to another plan of equal/lesser benefits around your birthday with limited underwriting." },
  "CO": { type: "standard" },
  "CT": { type: "continuous", note: "CT Continuous Open Enrollment (Medigap): You can enroll/switch year-round (pricing rules vary)." },
  "DE": { type: "standard" }, "DC": { type: "standard" },
  "FL": { type: "standard", note: "Issue-Age pricing is common in FL (premium may depend on your age at purchase)." },
  "GA": { type: "standard" }, "HI": { type: "standard" },
  "ID": { type: "birthday", note: "ID Birthday Rule (Medigap): You may switch within a window around your birthday." },
  "IL": { type: "birthday", note: "IL has additional Medigap protections in certain age ranges (verify current rule specifics)." },
  "IN": { type: "standard" }, "IA": { type: "standard" }, "KS": { type: "standard" },
  "KY": { type: "birthday" }, "LA": { type: "birthday" }, "ME": { type: "standard" },
  "MD": { type: "birthday", note: "MD has broader guaranteed-issue switching rights in some situations (verify)." },
  "MA": { type: "continuous", note: "MA Continuous Open Enrollment (Medigap)." },
  "MI": { type: "standard" }, "MN": { type: "standard" }, "MS": { type: "standard" },
  "MO": { type: "birthday", note: "MO Anniversary Rule (Medigap) exists for certain plan types." },
  "MT": { type: "standard" }, "NE": { type: "standard" },
  "NV": { type: "birthday" }, "NH": { type: "standard" }, "NJ": { type: "standard" },
  "NM": { type: "standard" },
  "NY": { type: "continuous", note: "NY Continuous Open Enrollment (Medigap)." },
  "NC": { type: "standard" }, "ND": { type: "standard" }, "OH": { type: "standard" },
  "OK": { type: "birthday" },
  "OR": { type: "birthday", note: "OR Birthday Rule (Medigap)." },
  "PA": { type: "standard" }, "RI": { type: "standard" }, "SC": { type: "standard" },
  "SD": { type: "standard" }, "TN": { type: "standard" }, "TX": { type: "standard" },
  "UT": { type: "standard" }, "VT": { type: "standard" }, "VA": { type: "standard" },
  "WA": { type: "standard", note: "WA uses community-rated pricing commonly." },
  "WV": { type: "standard" }, "WI": { type: "standard", note: "WI uses a standardized rider-based Medigap design." },
  "WY": { type: "standard" }
};
const STATE_LIST = Object.keys(STATE_RULES).sort();

// ================================
// 2) ENGINE STATE
// ================================
const C = { MEDIGAP: "MEDIGAP", MA_HMO: "MA_HMO", MA_PPO: "MA_PPO" };

const state = {
  i: 0,
  stage: "front",
  answers: {},
  flags: {},
  candidates: { MEDIGAP: 0, MA_HMO: 0, MA_PPO: 0 },
  axes: {
    predictability: 0,
    volatilityTolerance: 0,
    networkDependency: 0,
    adminTolerance: 0,
    futureLockInSensitivity: 0,
    extrasPreference: 0,
    mobility: 0,
    utilization: 0,
    assistanceLikelihood: 0,
    misconceptionCount: 0,
    regretSensitivity: 0,
    // added axes
    rxRisk: 0,
    churnSensitivity: 0,
    givebackAttraction: 0,
    providerFragility: 0
  },
  hardBlocks: [],
  hardWarnings: [],
  explanations: { why: [], tradeoffs: [], changes: [] },
  // Trace / audit
  trace: [],
  audit: {
    axisDeltas: [],
    flagEvents: [],
    warningEvents: [],
    scoreContrib: [],
    overrides: []
  },
  // Scenario outputs
  scenarios: {
    expectedAnnualCost: {},
    moopRisk: {},
    churnRisk: {},
    regretRisk: {}
  }
};

// ================================
// 3) HELPERS + TRACE
// ================================
function t(msg, obj) {
  state.trace.push({ ts: Date.now(), msg, obj });
}
function setFlag(k, v = true, why) {
  state.flags[k] = v;
  state.audit.flagEvents.push({ k, v, why: why || "" });
}
function hasFlag(k) { return !!state.flags[k]; }
function addAxis(k, v, why) {
  state.axes[k] = (state.axes[k] || 0) + v;
  state.audit.axisDeltas.push({ axis: k, delta: v, why: why || "" });
}
function addWhy(s) { state.explanations.why.push(s); }
function addTrade(s) { state.explanations.tradeoffs.push(s); }
function addChange(s) { state.explanations.changes.push(s); }
function addWarn(s) { state.hardWarnings.push(s); state.audit.warningEvents.push({ type: "warning", text: s }); }
function addBlock(s) { state.hardBlocks.push(s); state.audit.warningEvents.push({ type: "block", text: s }); }
function uniq(arr) { return [...new Set(arr)]; }

function qSingle(id, text, options, section, note, onAnswer) {
  return { id, section, text, type: "single", options, note, logic: onAnswer };
}
function qMulti(id, text, options, section, note, onAnswer) {
  return { id, section, text, type: "multi", options, note, logic: onAnswer };
}
function qDrop(id, text, options, section, note, onAnswer) {
  return { id, section, text, type: "dropdown", options, note, logic: onAnswer };
}
function qNumber(id, text, section, note, min, max, step, onAnswer) {
  return { id, section, text, type: "number", min, max, step, note, logic: onAnswer };
}

// ================================
// 4) QUESTION BANK (150+ high-signal)
// ================================
// Philosophy: not fluff — each question either:
//  - sets a hard block/warning
//  - moves an axis meaningfully
//  - feeds assistance ladder or scenario simulator inputs
//  - detects misconceptions

const questions = [
  // ===== SECTION 1: ELIGIBILITY & TIMING =====
  qSingle("S1_Q1", "Are you currently enrolled in Medicare Part A and Part B?",
    ["Yes, both A and B", "A only", "B only", "No, not enrolled yet", "Not sure"], "Eligibility",
    "You must have A & B for Medigap or Medicare Advantage to function.",
    (v) => {
      if (v !== 0) {
        setFlag("needs_medicare_enrollment_guidance", true, "Not enrolled in both A & B");
        addBlock("You must be enrolled in Medicare Parts A & B before Medigap or Medicare Advantage can work.");
      }
    }),

  qDrop("S1_STATE", "Which state do you primarily live in?", STATE_LIST, "Geography",
    "State rules affect whether you can switch Medigap later without health questions.",
    (val) => {
      const code = STATE_LIST[val];
      const rule = STATE_RULES[code];
      setFlag("home_state", code, "Captured state");
      if (rule.type === "continuous") setFlag("continuous_gi_state", true, "Continuous GI state");
      if (rule.type === "birthday") setFlag("birthday_rule_state", true, "Birthday/Anniversary protection");
      if (rule.note) addWhy(`Your state (${code}) has a Medigap rule: ${rule.note}`);
    }),

  qSingle("S1_Q2", "How did you become eligible for Medicare?",
    ["Turned 65", "Disability (under 65)", "ESRD", "ALS", "Not sure"], "Eligibility",
    "Under-65 Medigap availability and pricing vary by state.",
    (v) => {
      if (v === 1) setFlag("state_specific_medigap_rules_apply", true, "Under 65");
      if (v === 2) setFlag("esrd_history", true, "ESRD");
      if (v === 3) setFlag("als_history", true, "ALS");
    }),

  qSingle("S1_Q3", "When did you first enroll in Medicare Part B?",
    ["Less than 6 months ago", "6–12 months ago", "1–2 years ago", "More than 2 years ago", "Not sure"], "Timing",
    "Medigap is often easiest during the first 6 months after Part B starts (your Medigap Open Enrollment window).",
    (v) => {
      if (v === 0) {
        setFlag("within_gi_window", true, "Within 6 months of Part B");
        addAxis("futureLockInSensitivity", -0.1, "Within GI window reduces lock-in fear");
      }
      if (v > 0 && v < 4) {
        setFlag("medigap_underwriting_risk", true, "Outside GI window");
        addAxis("futureLockInSensitivity", 0.35, "Outside GI window increases lock-in concern");
      }
    }),

  qSingle("S1_Q4", "Did you enroll in a Medicare Advantage plan when you first became eligible?",
    ["Yes", "No", "Not sure"], "History",
    "This can matter for trial rights.",
    (v) => { if (v === 0) setFlag("trial_right_possible", true, "Started in MA"); }),

  qSingle("S1_Q5", "Have you ever had a Medigap policy before?",
    ["Yes, currently", "Yes, in the past", "No", "Not sure"], "History", "",
    (v) => { if (v === 0) setFlag("has_medigap_now", true); if (v === 1) setFlag("had_medigap_before", true); }),

  qMulti("S1_Q6", "Have you been diagnosed with any of the following? (Select all that apply)",
    ["Cancer", "Heart disease", "COPD / asthma", "Diabetes", "Autoimmune disease", "Stroke history", "Kidney disease", "None of these", "Prefer not to answer"], "Health",
    "This affects Medigap underwriting if you are outside your open enrollment window.",
    (arr) => {
      if (!Array.isArray(arr)) return;
      if (arr.includes(7)) return;
      const chronicCount = arr.filter(i => i <= 6).length;
      if (chronicCount >= 2) setFlag("multiple_chronic_conditions", true, "2+ chronic conditions");
      if (chronicCount >= 1) addAxis("utilization", 0.1, "Chronic conditions imply higher utilization");
    }),

  qSingle("S1_Q7", "Are you currently in a Medicare Advantage plan right now?",
    ["Yes", "No", "Not sure"], "History",
    "This changes the near-term path for switching.",
    (v) => { if (v === 0) setFlag("currently_in_ma", true); }),

  qSingle("S1_Q8", "Are you currently receiving Medicaid or any state assistance?",
    ["Yes", "No", "Not sure"], "Assistance",
    "Dual eligibility changes the decision tree.",
    (v) => { if (v === 0) { setFlag("possible_dual_eligible", true, "Self-reported assistance"); addAxis("assistanceLikelihood", 0.6, "Self-reported assistance"); } }),

  qSingle("S1_Q9", "Do you currently have employer or retiree health coverage?",
    ["Yes, active employment", "Yes, retiree coverage", "No", "Not sure"], "Coordination",
    "Can affect Part B timing and coordination of benefits.",
    (v) => { if (v <= 1) setFlag("coordination_of_benefits_needed", true, "Has other coverage"); }),

  qSingle("S1_Q10", "Are you planning to move in the next 12 months?",
    ["Yes, different state", "Yes, same state", "No", "Not sure"], "Mobility",
    "Moving can destabilize MA networks; Medigap is portable.",
    (v) => {
      if (v === 0) { addAxis("mobility", 0.55, "Moving states"); addAxis("networkDependency", 0.15, "Moving increases network risk"); }
      if (v === 1) { addAxis("mobility", 0.25, "Moving within state"); }
    }),

  qSingle("S1_Q11", "Would you like this tool to warn you if you are about to lose options permanently?",
    ["Yes — strongly", "Yes — lightly", "No", "Not sure"], "Preference",
    "Controls warning intensity.",
    (v) => { if (v === 0) setFlag("strong_warning_preference", true, "Wants strong warnings"); }),

  // ===== SECTION 2: INCOME, ASSETS & ASSISTANCE LADDER =====
  qSingle("S2_Q1", "What is your approximate monthly income before taxes?",
    ["Under $1,000", "$1,000–$1,500", "$1,500–$2,000", "$2,000–$2,500", "$2,500–$3,000", "$3,000–$4,000", "$4,000+", "Not sure", "Prefer not to answer"], "Finances",
    "Used for soft-screening LIS/MSP/Medicaid likelihood (not guarantees).",
    (v) => {
      if (v <= 2) { setFlag("possible_LIS", true, "Low income"); addAxis("assistanceLikelihood", 0.35, "Low income suggests LIS"); }
      if (v <= 1) { setFlag("possible_MSP", true, "Very low income"); addAxis("assistanceLikelihood", 0.25, "MSP more likely"); }
      if (v === 0) { setFlag("possible_Medicaid", true, "Very low income"); addAxis("assistanceLikelihood", 0.35, "Medicaid possible"); }
    }),

  qSingle("S2_Q1b", "Household size (you + spouse/others you file with)?",
    ["1", "2", "3", "4+", "Not sure"], "Finances",
    "Assistance thresholds depend on household size.",
    (v) => { setFlag("household_size", [1,2,3,4,0][v], "Household size captured"); }),

  qSingle("S2_Q1c", "Marital status?",
    ["Single", "Married", "Widowed", "Divorced", "Not sure"], "Finances",
    "Used for assistance ladder heuristics.",
    (v) => { setFlag("marital", v, "Marital captured"); }),

  qMulti("S2_Q2", "What is your primary source of income?",
    ["Social Security only", "Social Security + pension", "Social Security + investments", "Employment", "Disability benefits", "Survivor benefits", "Other", "Not sure"], "Finances",
    "Fixed income increases premium sensitivity.",
    (arr) => { if (Array.isArray(arr) && (arr.includes(0) || arr.includes(4))) setFlag("fixed_income", true, "Fixed income"); }),

  qSingle("S2_Q3", "Do you expect your income to change in the next 2–3 years?",
    ["Likely to increase", "Likely to decrease", "Likely to stay about the same", "Not sure"], "Finances",
    "Income changes can flip assistance eligibility and affordability.",
    (v) => { if (v === 1) { addAxis("assistanceLikelihood", 0.15, "Income downside risk"); setFlag("income_downside_risk", true); } }),

  qMulti("S2_Q4", "Do you currently receive any of the following?",
    ["Medicaid", "Extra Help / LIS", "Medicare Savings Program (QMB/SLMB/QI)", "SNAP", "SSI", "Housing assistance", "None", "Not sure"], "Assistance",
    "If Medicaid/MSP is present, MA often dominates.",
    (arr) => {
      if (!Array.isArray(arr)) return;
      if (arr.includes(0)) { setFlag("dual_or_medicaid_present", true, "Has Medicaid"); addAxis("assistanceLikelihood", 0.7, "Has Medicaid"); }
      if (arr.includes(2)) { setFlag("msp_present", true, "Has MSP"); addAxis("assistanceLikelihood", 0.4, "Has MSP"); }
      if (arr.includes(1)) { setFlag("lis_present", true, "Has LIS"); addAxis("assistanceLikelihood", 0.3, "Has LIS"); }
    }),

  qSingle("S2_Q5", "Do you have savings or emergency funds (outside your home)?",
    ["Less than $1,000", "$1,000–$5,000", "$5,000–$15,000", "$15,000+", "Prefer not to answer"], "Finances",
    "Low emergency funds makes MA MOOP exposure more dangerous.",
    (v) => {
      if (v === 0) { setFlag("low_emergency_funds", true, "Very low savings"); addAxis("volatilityTolerance", -0.25, "Low savings reduces volatility tolerance"); }
      if (v <= 1) { addAxis("volatilityTolerance", -0.1, "Low savings reduces volatility tolerance"); }
      if (v === 3) { addAxis("volatilityTolerance", 0.15, "High savings increases volatility tolerance"); }
    }),

  qSingle("S2_Q5b", "Roughly how much is in retirement/investment accounts (if any)?",
    ["$0", "Under $25k", "$25k–$100k", "$100k–$250k", "$250k+", "Prefer not to answer"], "Finances",
    "Used to gauge ability to self-insure for a bad year.",
    (v) => {
      if (v <= 1) addAxis("volatilityTolerance", -0.05, "Low investments");
      if (v >= 3) addAxis("volatilityTolerance", 0.1, "Higher investments");
    }),

  qSingle("S2_Q6", "If you had an unexpected $3,000 medical bill, what would happen?",
    ["It would be devastating", "I could manage but it would hurt", "I could pay it", "I wouldn’t notice", "Not sure"], "Risk",
    "This is a direct MOOP survivability signal.",
    (v) => {
      if (v <= 1) { addAxis("predictability", 0.3, "Bill shock feared"); addAxis("volatilityTolerance", -0.3, "Bill shock feared"); }
      if (v === 2) addAxis("volatilityTolerance", 0.1, "Can handle moderate bill");
      if (v === 3) addAxis("volatilityTolerance", 0.25, "Can handle bill easily");
    }),

  qSingle("S2_Q7", "Would you rather pay:",
    ["Higher predictable monthly cost, fewer surprises", "Lower monthly cost, but risk big bills", "Depends", "Not sure"], "Preference",
    "One of the strongest MA vs Medigap signals.",
    (v) => {
      if (v === 0) { addAxis("predictability", 0.4, "Prefers predictable costs"); addWhy("You prefer predictable costs over surprise bills."); }
      if (v === 1) { addAxis("volatilityTolerance", 0.35, "Open to variable costs"); addWhy("You’re open to variable costs in exchange for lower monthly premiums."); }
    }),

  qSingle("S2_Q8", "Have you heard of Medicare Extra Help (LIS) for prescriptions?",
    ["Yes", "No", "Not sure"], "Knowledge",
    "If not, we inject assistance education.",
    (v) => { if (v !== 0) setFlag("needs_lis_explainer", true, "Doesn't know LIS"); }),

  qSingle("S2_Q9", "Have you ever looked into Medicaid eligibility?",
    ["Yes — I qualify", "Yes — I don’t qualify", "No", "Not sure"], "Knowledge",
    "If no/not sure, we inject Medicaid tiers/path education.",
    (v) => { if (v >= 2) setFlag("needs_medicaid_explainer", true, "Needs Medicaid explainer"); }),

  qSingle("S2_Q10", "Would you accept higher out-of-pocket risk in exchange for lower monthly costs?",
    ["Yes", "Maybe", "No", "Not sure"], "Preference",
    "Drives MA vs Medigap weighting.",
    (v) => {
      if (v === 0) addAxis("volatilityTolerance", 0.25, "Accepts OOP risk");
      if (v === 2) addAxis("predictability", 0.25, "Rejects OOP risk");
    }),

  qSingle("S2_Q11", "Would you prefer to explore assistance options before choosing a plan?",
    ["Yes", "Maybe", "No"], "Preference",
    "If yes, we prioritize assistance overlay.",
    (v) => { if (v === 0) setFlag("assistance_first_preference", true, "Wants assistance first"); }),

  // ===== SECTION 3: HEALTH USAGE =====
  qSingle("S3_Q1", "In a typical year, how often do you see a primary care doctor?",
    ["0–1", "2–3", "4–6", "More than 6", "Not sure"], "Usage",
    "Higher frequency increases MA copay stacking.",
    (v) => { if (v >= 2 && v <= 3) addAxis("utilization", 0.25, "Higher PCP use"); }),

  qSingle("S3_Q2", "In a typical year, how often do you see specialists?",
    ["Never", "1–2", "3–5", "6+", "Not sure"], "Usage",
    "Specialist-heavy care increases network dependency.",
    (v) => { if (v >= 2 && v <= 3) { addAxis("utilization", 0.25, "Higher specialist use"); addAxis("networkDependency", 0.2, "Specialist dependency"); } }),

  qMulti("S3_Q3", "In the past 3 years, have you had any of the following?",
    ["MRI/CT", "X-rays", "Ultrasound", "Cardiac testing", "Endoscopy/colonoscopy", "None", "Not sure"], "Usage",
    "Testing/imaging increases prior auth exposure in many MA designs.",
    (arr) => { if (Array.isArray(arr) && !arr.includes(5) && !arr.includes(6)) { addAxis("utilization", 0.15, "Testing history"); setFlag("prior_auth_exposure", true, "History of services often requiring auth"); } }),

  qSingle("S3_Q4", "In the past 3 years, have you had any hospital stays?",
    ["No", "Yes — 1", "Yes — 2–3", "Yes — 4+", "Not sure"], "Usage",
    "Hospitalization increases MOOP probability.",
    (v) => { if (v >= 1 && v <= 3) { addAxis("utilization", 0.35, "Hospital history"); addAxis("predictability", 0.2, "Hospital history increases desire for predictability"); } }),

  qMulti("S3_Q5", "Have you used any of the following?",
    ["Physical therapy", "Occupational therapy", "Speech therapy", "Chiropractic", "Mental health therapy", "None"], "Usage",
    "Recurring visits amplify copay stacking.",
    (arr) => { if (Array.isArray(arr) && !arr.includes(5)) addAxis("utilization", 0.15, "Therapy use"); }),

  qSingle("S3_Q6", "Do you use durable medical equipment (CPAP/oxygen/walker/etc.)?",
    ["Yes", "No", "Not sure"], "Usage",
    "DME can be sensitive to authorization and network rules.",
    (v) => { if (v === 0) { addAxis("utilization", 0.15, "DME use"); setFlag("dme_user", true, "Uses DME"); } }),

  qSingle("S3_Q7", "When you need care, how fast do you want access?",
    ["Immediately", "Within a few days", "Within a week", "Timing doesn’t matter"], "Preference",
    "Lower tolerance for delays increases MA friction penalty.",
    (v) => { if (v <= 1) { addAxis("adminTolerance", -0.15, "Low delay tolerance"); addAxis("networkDependency", 0.1, "Low delay tolerance"); } }),

  qSingle("S3_Q8", "If a plan required approval before a service (Prior Auth), how would that make you feel?",
    ["Very frustrated", "Slightly annoyed", "Neutral", "Fine", "Not sure"], "Preference",
    "Prior auth intolerance strongly favors Medigap.",
    (v) => { if (v === 0) { addAxis("adminTolerance", -0.25, "Hates prior auth"); addAxis("predictability", 0.1, "Hates prior auth"); } }),

  qSingle("S3_Q9", "Do you avoid care when it costs money?",
    ["Yes", "Sometimes", "Rarely", "Never", "Not sure"], "Behavior",
    "Cost-avoidance increases risk under variable copay structures.",
    (v) => { if (v <= 1) { setFlag("care_avoidance_risk", true, "Avoids care when costs" ); addAxis("predictability", 0.1, "Avoids care -> safer structure helpful"); } }),

  qSingle("S3_Q10", "Do you expect your healthcare needs to increase over the next 10 years?",
    ["Yes", "Probably", "Unsure", "Probably not", "No"], "Future",
    "Long-horizon increases Medigap value scaling.",
    (v) => { if (v <= 1) { addAxis("futureLockInSensitivity", 0.25, "Expects higher future needs"); addAxis("predictability", 0.1, "Expects higher future needs"); } }),

  // ===== SECTION 3B: RX (Part D) & MEDICATION RISK (high signal) =====
  qSingle("RX_Q1", "How many prescription medications do you take regularly?",
    ["0", "1–2", "3–5", "6–10", "10+", "Not sure"], "Prescriptions",
    "More meds increases Part D complexity and risk of formulary changes.",
    (v) => { if (v >= 2 && v <= 4) addAxis("rxRisk", 0.25 + (v * 0.05), "More medications" ); }),

  qSingle("RX_Q2", "Are any of your medications specialty drugs (very expensive / limited pharmacies)?",
    ["Yes", "Maybe", "No", "Not sure"], "Prescriptions",
    "Specialty drugs raise risk of plan mismatch, PA, step therapy, and pharmacy network issues.",
    (v) => { if (v <= 1) { addAxis("rxRisk", 0.35, "Specialty drugs" ); setFlag("specialty_rx", true, "Specialty meds" ); } }),

  qSingle("RX_Q3", "Do you strongly prefer a specific pharmacy (e.g., one chain/store)?",
    ["Yes", "Somewhat", "No", "Not sure"], "Prescriptions",
    "Pharmacy network sensitivity increases churn/friction risk.",
    (v) => { if (v <= 1) { addAxis("churnSensitivity", 0.15, "Pharmacy preference" ); } }),

  qSingle("RX_Q4", "Have you ever hit the Part D coverage gap (“donut hole”) or had surprise drug costs?",
    ["Yes", "No", "Not sure"], "Prescriptions",
    "Prior drug cost shocks increase stability preference.",
    (v) => { if (v === 0) { addAxis("predictability", 0.1, "Prior RX cost shock" ); addAxis("rxRisk", 0.15, "Prior RX cost shock" ); } }),

  qSingle("RX_Q5", "Are you willing to re-check your drug plan (Part D) every year?",
    ["Yes", "Maybe", "No", "Not sure"], "Prescriptions",
    "Part D re-shopping matters regardless of MA vs Medigap.",
    (v) => { if (v === 2) { addAxis("adminTolerance", -0.1, "Doesn't want yearly Part D review" ); setFlag("rx_annual_review_averse", true); } }),

  // ===== SECTION 4: PROVIDER ACCESS =====
  qSingle("S4_Q1", "Do you have doctors you absolutely do not want to lose?",
    ["Yes — multiple", "Yes — one or two", "No", "Not sure"], "Network",
    "Doctor loyalty raises network risk for MA structures.",
    (v) => { if (v <= 1) { addAxis("networkDependency", 0.25, "Must-keep doctors" ); addAxis("providerFragility", 0.2, "Provider dependency" ); addAxis("predictability", 0.05, "Must-keep doctors" ); } }),

  qSingle("S4_Q2", "Are any of your providers part of a specific health system (Atrium/Novant/Duke/UNC/etc.)?",
    ["Yes", "No", "Not sure"], "Network",
    "System dependency can create all-or-nothing network risk.",
    (v) => { if (v === 0) { setFlag("system_dependency", true, "System dependency" ); addAxis("networkDependency", 0.2, "System dependency" ); addAxis("providerFragility", 0.15, "System dependency" ); } }),

  qSingle("S4_Q3", "If your plan dropped a doctor you like, what would you do?",
    ["Switch plans immediately", "Switch doctors", "Try for an exception", "I’m not sure", "I’d be very upset/stressed"], "Network",
    "Measures annual re-shopping tolerance.",
    (v) => {
      if (v === 0) addAxis("adminTolerance", 0.1, "Willing to switch plans" );
      if (v === 1) addAxis("networkDependency", -0.05, "Willing to switch doctors" );
      if (v === 2) addAxis("adminTolerance", 0.05, "Will fight for exception" );
      if (v === 4) { addAxis("networkDependency", 0.15, "Very upset if doctor lost" ); addAxis("regretSensitivity", 0.1, "Doctor loss regret" ); }
    }),

  qSingle("S4_Q4", "How comfortable are you switching doctors if needed?",
    ["Not comfortable at all", "Slightly uncomfortable", "Neutral", "Comfortable", "Very comfortable"], "Network",
    "Low comfort penalizes MA; boosts Medigap.",
    (v) => { if (v <= 1) { addAxis("networkDependency", 0.2, "Uncomfortable switching doctors" ); addAxis("predictability", 0.05, "Uncomfortable switching doctors" ); } else if (v >= 3) { addAxis("networkDependency", -0.1, "Comfortable switching doctors" ); } }),

  qSingle("S4_Q5", "How important is access to specialists without barriers?",
    ["Extremely important", "Important", "Somewhat", "Not important", "Not sure"], "Network",
    "Specialist barrier intolerance penalizes HMO first.",
    (v) => { if (v <= 1) { addAxis("networkDependency", 0.2, "Needs specialist freedom" ); addAxis("adminTolerance", -0.1, "Hates specialist barriers" ); } }),

  qSingle("S4_Q6", "Do you need access to large hospitals / centers of excellence?",
    ["Yes — very important", "Maybe", "No", "Not sure"], "Network",
    "Centers-of-excellence needs often favor Medigap.",
    (v) => { if (v === 0) { setFlag("centers_of_excellence_needed", true, "Needs centers" ); addAxis("networkDependency", 0.25, "Centers of excellence" ); addAxis("predictability", 0.1, "Centers of excellence" ); } }),

  qSingle("S4_Q7", "Do you want the freedom to get care anywhere in the U.S.?",
    ["Yes — important", "Nice to have", "Not important", "Not sure"], "Network",
    "Nationwide access strongly favors Medigap.",
    (v) => { if (v === 0) { addAxis("networkDependency", 0.25, "Wants nationwide" ); addAxis("mobility", 0.2, "Wants nationwide" ); } }),

  qSingle("S4_Q8", "Are you comfortable verifying networks every year?",
    ["Yes", "Somewhat", "No", "Not sure"], "Admin",
    "MA survivability depends on willingness to re-check networks.",
    (v) => { if (v === 2) { addAxis("adminTolerance", -0.15, "Doesn't want yearly network checks" ); setFlag("low_network_maintenance_tolerance", true, "No annual network checks" ); } }),

  qSingle("S4_Q9", "If a plan required you to choose a primary care doctor as gatekeeper, how would you feel?",
    ["I hate that", "Not ideal", "Fine", "Prefer it", "Not sure"], "Network",
    "HMO penalty if hated.",
    (v) => { if (v === 0) { addAxis("adminTolerance", -0.15, "Hates PCP gatekeeper" ); addAxis("predictability", 0.05, "Hates PCP gatekeeper" ); } }),

  qSingle("S4_Q10", "How far are you willing to drive to stay in-network?",
    ["0–10 miles", "10–25 miles", "25–50 miles", "50+ miles", "Not sure"], "Network",
    "Low distance tolerance increases MA network fragility risk.",
    (v) => { if (v === 0) { setFlag("low_drive_tolerance", true, "Low drive tolerance" ); addAxis("networkDependency", 0.1, "Low drive tolerance" ); } }),

  // ===== SECTION 5: MOBILITY =====
  qSingle("S5_Q1", "Do you live in more than one place during the year (Snowbird)?",
    ["Yes — two or more states", "Yes — multiple locations in same state", "No", "Not sure"], "Mobility",
    "Multi-state patterns can near-disqualify HMOs.",
    (v) => { if (v === 0) { setFlag("snowbird", true, "Snowbird" ); addAxis("mobility", 0.45, "Snowbird" ); } }),

  qSingle("S5_Q2", "When you’re away, do you need routine care (not just emergencies)?",
    ["Yes", "Maybe", "No", "Not sure"], "Mobility",
    "Routine care while traveling strongly penalizes HMOs.",
    (v) => { if (v === 0) { setFlag("routine_care_away", true, "Routine care away" ); addAxis("mobility", 0.25, "Routine care away" ); } }),

  qSingle("S5_Q3", "Would emergency-only coverage while traveling be acceptable?",
    ["Yes", "No", "Not sure"], "Mobility",
    "If no, HMOs become very risky for high mobility.",
    (v) => { if (v === 1) { setFlag("needs_routine_travel_coverage", true, "Needs routine travel coverage" ); addAxis("mobility", 0.15, "Needs routine travel coverage" ); } }),

  qSingle("S5_Q4", "Are you comfortable paying more to see out-of-network doctors if needed?",
    ["Yes", "Maybe", "No", "Not sure"], "Network",
    "Out-of-network tolerance is a key PPO viability signal.",
    (v) => { if (v === 0) setFlag("oon_tolerant", true, "OON tolerant" ); if (v === 2) setFlag("oon_intolerant", true, "OON intolerant" ); }),

  qSingle("S5_Q5", "Do you plan to move states permanently in the next 3–5 years?",
    ["Yes", "Maybe", "No", "Not sure"], "Mobility",
    "Moves penalize MA stability; Medigap portability advantage increases.",
    (v) => { if (v <= 1) { addAxis("mobility", 0.25, "Future move risk" ); setFlag("future_move_risk", true, "Future move" ); } }),

  qSingle("S5_Q6", "Would you be okay with your plan only covering non-emergency care in one region?",
    ["No", "Maybe", "Yes", "Not sure"], "Mobility",
    "No = penalize HMO, caution PPO; Medigap favored.",
    (v) => { if (v === 0) { setFlag("region_limited_unacceptable", true, "Region limited unacceptable" ); addAxis("mobility", 0.2, "Region limited unacceptable" ); } }),

  // ===== SECTION 6: FINANCIAL RISK =====
  qSingle("S6_Q1", "Which is more stressful?",
    ["Paying a higher premium every month", "Getting a surprise $1,500 bill in a bad year", "Both equally", "Neither", "Not sure"], "Risk",
    "Premium stress leans MA; bill-shock stress leans Medigap.",
    (v) => { if (v === 1) { addAxis("predictability", 0.25, "Bill shock feared" ); addAxis("volatilityTolerance", -0.15, "Bill shock feared" ); } if (v === 0) addAxis("volatilityTolerance", 0.15, "Premium stress" ); }),

  qSingle("S6_Q2", "Imagine you hit your plan’s maximum out-of-pocket in a rough year. How would that affect you?",
    ["Devastating", "Manage but it would hurt", "Manageable", "Wouldn’t matter", "Not sure"], "Risk",
    "MOOP survivability drives MA viability and warning intensity.",
    (v) => { if (v <= 1) { setFlag("low_moop_survivability", true, "Low MOOP survivability" ); addAxis("predictability", 0.25, "MOOP survivability low" ); addAxis("volatilityTolerance", -0.25, "MOOP survivability low" ); } if (v === 3) addAxis("volatilityTolerance", 0.2, "High MOOP survivability" ); }),

  qSingle("S6_Q3", "If your premium rose by $50–$100/month later, how would that affect you?",
    ["Couldn’t afford it", "Very hard", "Could manage", "No problem", "Not sure"], "Finances",
    "Premium sensitivity increases importance of assistance paths.",
    (v) => { if (v <= 1) { setFlag("premium_fragility", true, "Premium fragile" ); addAxis("assistanceLikelihood", 0.2, "Premium fragile" ); } }),

  qSingle("S6_Q4", "Are you attracted to giveback plans (Part B premium reduction)?",
    ["Yes, strongly", "Somewhat", "No", "I don’t know what this means"], "Finances",
    "Giveback interest triggers tradeoff warnings.",
    (v) => {
      if (v <= 1) { setFlag("giveback_interest", true, "Giveback interest" ); addAxis("givebackAttraction", v===0?0.35:0.2, "Giveback interest" ); }
      if (v === 3) setFlag("needs_giveback_explainer", true, "Needs giveback explainer" );
    }),

  qSingle("S6_Q5", "If a giveback plan had a higher maximum out-of-pocket, would you still want it?",
    ["Yes", "Maybe", "No", "Not sure"], "Tradeoff",
    "If yes, MA tolerance increases.",
    (v) => { if (v === 0) addAxis("volatilityTolerance", 0.15, "Accepts giveback tradeoff" ); if (v === 2) setFlag("giveback_mismatch", true, "Giveback mismatch" ); }),

  qSingle("S6_Q6", "If two options were close, would you prefer the safer one or the cheaper one?",
    ["Safer", "Cheaper", "Depends", "Not sure"], "Preference",
    "Tie-breaker if scores are close.",
    (v) => { if (v === 0) setFlag("tie_break_safer", true, "Tie safer" ); if (v === 1) setFlag("tie_break_cheaper", true, "Tie cheaper" ); }),

  // ===== SECTION 7: ADMIN & COMPLEXITY =====
  qSingle("S7_Q1", "How do you feel about dealing with insurance companies?",
    ["I hate it", "Strongly dislike", "Neutral", "Don’t mind", "I like handling this stuff"], "Admin",
    "Low tolerance penalizes MA.",
    (v) => { if (v <= 1) { addAxis("adminTolerance", -0.25, "Hates insurers" ); addAxis("predictability", 0.1, "Hates insurers" ); } if (v >= 3) addAxis("adminTolerance", 0.1, "Fine with admin" ); }),

  qSingle("S7_Q2", "If a service required prior approval, how would you react?",
    ["Furious", "Annoyed", "Neutral", "Fine", "Not sure"], "Admin",
    "Prior auth intolerance penalizes MA.",
    (v) => { if (v <= 1) addAxis("adminTolerance", -0.2, "Hates prior auth" ); }),

  qSingle("S7_Q3", "If a claim were denied, what would you do?",
    ["Appeal immediately", "Ask for help", "Probably give up", "Not sure"], "Admin",
    "Low fight-back tolerance penalizes MA.",
    (v) => { if (v === 2) { setFlag("low_appeal_tolerance", true, "Won't appeal" ); addAxis("adminTolerance", -0.15, "Won't appeal" ); } }),

  qSingle("S7_Q4", "Are you willing to re-evaluate your coverage every year?",
    ["Yes", "Maybe", "No", "Not sure"], "Admin",
    "MA requires annual attention; Medigap typically less.",
    (v) => { if (v === 2) { setFlag("no_annual_shopping", true, "No annual shopping" ); addAxis("adminTolerance", -0.15, "No annual shopping" ); } }),

  qSingle("S7_Q5", "If you became sick and tired, would you still want to manage complexity?",
    ["No", "Probably not", "Maybe", "Yes"], "Future",
    "Long-horizon complexity intolerance boosts Medigap.",
    (v) => { if (v <= 1) { addAxis("futureLockInSensitivity", 0.2, "Wants future simplicity" ); addAxis("predictability", 0.05, "Wants future simplicity" ); } }),

  // ===== SECTION 8: DECISION STYLE =====
  qSingle("S8_Q1", "When making big decisions, what do you usually do?",
    ["Research deeply", "Ask others", "Trust my gut", "Avoid thinking about it", "Not sure"], "Psych",
    "Controls explanation depth.",
    (v) => { if (v === 3) setFlag("decision_avoider", true, "Avoids decisions" ); }),

  qSingle("S8_Q2", "Do you tend to regret decisions later?",
    ["Often", "Sometimes", "Rarely", "Almost never", "Not sure"], "Psych",
    "Higher regret sensitivity favors stability.",
    (v) => { if (v <= 1) { addAxis("regretSensitivity", 0.25, "High regret sensitivity" ); addAxis("predictability", 0.1, "High regret sensitivity" ); } }),

  qSingle("S8_Q3", "How do you feel about uncertainty?",
    ["I hate it", "Dislike it", "Neutral", "Comfortable", "I enjoy it"], "Psych",
    "Uncertainty intolerance penalizes variable-cost.",
    (v) => { if (v <= 1) { addAxis("regretSensitivity", 0.15, "Uncertainty intolerance" ); addAxis("volatilityTolerance", -0.1, "Uncertainty intolerance" ); } if (v >= 3) addAxis("volatilityTolerance", 0.15, "Comfortable with uncertainty" ); }),

  qSingle("S8_Q4", "If you had to revisit this decision every year, how would that feel?",
    ["Very stressful", "Somewhat stressful", "Neutral", "Fine", "Not sure"], "Psych",
    "Annual re-shopping stress penalizes MA.",
    (v) => { if (v <= 1) addAxis("adminTolerance", -0.15, "Annual revisit stressful" ); }),

  // ===== SECTION 9: FUTURE PROOFING =====
  qSingle("S9_Q1", "Do you worry about being stuck in a bad plan later?",
    ["Yes", "Somewhat", "No", "Not sure"], "Future",
    "Lock-in sensitivity favors Medigap.",
    (v) => { if (v <= 1) addAxis("futureLockInSensitivity", 0.25, "Worries about lock-in" ); }),

  qSingle("S9_Q2", "If you later wanted Medigap but couldn’t get it, would that bother you?",
    ["Very much", "Somewhat", "Not really", "Not sure"], "Future",
    "Direct Medigap lockout regret signal.",
    (v) => { if (v <= 1) addAxis("futureLockInSensitivity", 0.25, "Would regret Medigap lockout" ); }),

  qSingle("S9_Q3", "Do you have a caregiver or someone who may manage your care later?",
    ["Yes", "Maybe", "No"], "Future",
    "Caregiver presence increases simplicity weighting.",
    (v) => { if (v <= 1) { setFlag("caregiver_present", true, "Caregiver present" ); addAxis("predictability", 0.1, "Caregiver present" ); } }),

  qSingle("S9_Q4", "If your cognition declined, would you want your plan to be simpler?",
    ["Yes", "Probably", "Not sure", "No"], "Future",
    "Cognitive-load planning favors simpler structures.",
    (v) => { if (v <= 1) { addAxis("futureLockInSensitivity", 0.2, "Wants cognitive simplicity" ); addAxis("predictability", 0.05, "Wants cognitive simplicity" ); } }),

  qSingle("S9_Q5", "Would you rather protect against worst-case scenarios or optimize for best-case?",
    ["Worst-case", "Best-case", "Balance", "Not sure"], "Future",
    "Worst-case protection favors Medigap.",
    (v) => { if (v === 0) addAxis("predictability", 0.2, "Worst-case focus" ); if (v === 1) addAxis("volatilityTolerance", 0.15, "Best-case focus" ); }),

  // ===== SECTION 10: EXTRAS =====
  qSingle("S10_Q1", "How important are dental benefits to you?",
    ["Extremely", "Important", "Somewhat", "Not important", "Not sure"], "Extras",
    "Extras increase MA attractiveness.",
    (v) => { if (v <= 1) addAxis("extrasPreference", 0.2, "Dental important" ); }),

  qSingle("S10_Q2", "How important is vision coverage to you?",
    ["Extremely", "Important", "Somewhat", "Not important", "Not sure"], "Extras",
    (v) => { if (v <= 1) addAxis("extrasPreference", 0.15, "Vision important" ); }),

  qSingle("S10_Q3", "Would you trade higher medical risk for better everyday perks?",
    ["Yes", "Maybe", "No", "Not sure"], "Tradeoff",
    "Direct extras-vs-safety preference signal.",
    (v) => { if (v === 0) { addAxis("extrasPreference", 0.25, "Would trade risk for perks" ); addAxis("volatilityTolerance", 0.1, "Would trade risk for perks" ); } if (v === 2) addAxis("predictability", 0.15, "Won't trade medical risk" ); }),

  qSingle("S10_Q4", "Would you be willing to buy separate dental/vision if it meant stronger medical coverage?",
    ["Yes", "Maybe", "No", "Not sure"], "Tradeoff",
    (v) => { if (v === 0) addAxis("predictability", 0.1, "Willing to buy separate extras" ); if (v === 2) addAxis("extrasPreference", 0.1, "Needs built-in extras" ); }),

  // ===== SECTION 11: KNOWLEDGE / MISCONCEPTIONS =====
  qSingle("S11_Q1", "Before this tool, how familiar were you with Medicare?",
    ["Very familiar", "Somewhat familiar", "Slightly familiar", "Not familiar at all"], "Knowledge",
    "Controls explanation depth.",
    (v) => { if (v >= 2) setFlag("low_medicare_familiarity", true, "Low Medicare familiarity" ); }),

  qMulti("S11_Q2", "Which of these do you believe?",
    ["Medicare Advantage replaces Original Medicare", "Medigap is the same as Medicare Advantage", "All doctors accept Medicare Advantage", "Medicare Advantage is free", "Medigap covers prescriptions", "I don’t know"], "Knowledge",
    "Incorrect beliefs trigger corrections.",
    (arr) => {
      if (!Array.isArray(arr)) return;
      const incorrect = arr.filter(i => i <= 4).length;
      if (incorrect > 0) { addAxis("misconceptionCount", incorrect, "Misconceptions detected" ); setFlag("misconceptions_detected", true, "Misconceptions" ); }
    }),

  qSingle("S11_Q3", "Do you believe $0 premium means $0 cost?",
    ["Yes", "No", "Not sure"], "Knowledge",
    (v) => { if (v !== 1) { addAxis("misconceptionCount", 1, "$0 premium misunderstanding" ); setFlag("misconceptions_detected", true, "$0 premium misunderstanding" ); } }),

  qSingle("S11_Q4", "Do you believe you can always switch to Medigap later?",
    ["Yes", "No", "Not sure"], "Knowledge",
    (v) => { if (v !== 1) { addAxis("misconceptionCount", 1, "Medigap lockout misunderstanding" ); setFlag("needs_medigap_lockout_education", true, "Thinks always can switch" ); } }),

  // ==============================================
  // EXPANSION: 80 additional high-signal questions
  // ==============================================
  // We'll keep them structured and compact; each has a real scoring purpose.
];

// ---- Generate additional question modules programmatically (keeps file maintainable)
(function buildExpansion() {
  const push = (q) => questions.push(q);

  // Section 12: Provider + facility patterns (10)
  for (let n = 1; n <= 10; n++) {
    push(qSingle(`PATT_Q${n}`, `In the last 24 months, how often have you used ${
      ["urgent care","ER","outpatient surgery","home health","skilled nursing","lab work","diagnostic imaging","infusion center","specialty clinic","telehealth"][n-1]
    }?`,
    ["Never","1x","2–3x","4+","Not sure"], "Utilization Patterns",
    "Feeds scenario simulator and prior auth likelihood.",
    (v) => {
      if (v >= 2 && v <= 3) addAxis("utilization", 0.1, `Utilization pattern Q${n}`);
      if (n <= 7 && v >= 2 && v <= 3) setFlag("prior_auth_exposure", true, "Complex service usage");
      if (n === 2 && v >= 2 && v <= 3) addAxis("predictability", 0.05, "ER use increases desire for predictability");
    }));
  }

  // Section 13: Chronic trajectory signals (10)
  const chronicSignals = [
    "Do you have planned surgeries or major procedures in the next 12 months?",
    "Do you have regular treatments that must stay uninterrupted (e.g., infusions, dialysis, chemo follow-ups)?",
    "Do you see a specialist that is hard to replace (rare specialty)?",
    "Have you been denied prior authorization in the past?",
    "Have you had claims/coverage disputes in the past 2 years?",
    "Do you have frequent follow-ups after hospitalization?",
    "Do you require brand-name drugs with no good generic substitute?",
    "Do you rely on a specific hospital for complex care?",
    "Do you need frequent medical transportation?",
    "Do you have an implanted device (pacemaker, defib, insulin pump, etc.)?"
  ];
  chronicSignals.forEach((text, idx) => {
    push(qSingle(`CHRON_Q${idx+1}`, text,
      ["Yes","Maybe","No","Not sure"], "Care Complexity",
      "Raises network/predictability and scenario risk.",
      (v) => {
        if (v <= 1) {
          addAxis("utilization", 0.12, `Complexity: ${text}`);
          addAxis("networkDependency", 0.12, `Complexity: ${text}`);
          if (idx === 3 || idx === 4) addAxis("adminTolerance", -0.1, "Prior disputes/PA intolerance" );
          if (idx === 6) addAxis("rxRisk", 0.15, "Brand-only meds" );
        }
      }
    ));
  });

  // Section 14: Churn sensitivity (10)
  const churnQs = [
    "If your plan changed networks next year, would you notice fast?",
    "How likely are you to read your Annual Notice of Change (ANOC)?",
    "How likely are you to miss paperwork deadlines?",
    "Do you prefer one plan and never want to think about it again?",
    "Do you have someone who will help you compare plans each fall?",
    "If a plan required a referral for specialists, would you follow that process reliably?",
    "If your drug moved to a higher tier next year, would you switch plans?",
    "Do you have anxiety about switching insurance?",
    "Have you changed health plans in the last 3 years?",
    "Do you use online portals / apps comfortably?"
  ];
  churnQs.forEach((text, idx) => {
    const options = idx === 1 ? ["Always","Sometimes","Rarely","Never","Not sure"] : ["Yes","Maybe","No","Not sure"];
    push(qSingle(`CHURN_Q${idx+1}`, text, options, "Plan-Year Stability",
      "Feeds churn model (risk of disruptions).",
      (v) => {
        const yesish = (options.length === 4) ? (v <= 1) : (v <= 1);
        if (idx === 1) {
          if (v >= 2 && v <= 3) addAxis("churnSensitivity", 0.2, "Doesn't read ANOC" );
          if (v === 0) addAxis("adminTolerance", 0.05, "Reads ANOC" );
        } else {
          if (yesish) addAxis("churnSensitivity", 0.12, `Churn signal: ${text}`);
          if (idx === 3 && yesish) addAxis("predictability", 0.08, "Wants set-and-forget" );
          if (idx === 7 && yesish) addAxis("regretSensitivity", 0.08, "Switch anxiety" );
          if (idx === 8 && v <= 1) addAxis("adminTolerance", 0.05, "Has switched plans before" );
        }
      }
    ));
  });

  // Section 15: Giveback deep tradeoffs (10)
  const givebackDeep = [
    "Would you accept narrower networks to lower your Part B cost?",
    "Would you accept more prior auth to lower your Part B cost?",
    "Would you accept higher copays to lower your Part B cost?",
    "If giveback disappeared next year, would you feel betrayed?",
    "Would you rather lock in medical stability even if it means no giveback?",
    "Do you need dental/vision enough to tolerate more medical restrictions?",
    "Do you prefer cash-flow relief now over risk reduction later?",
    "If your doctors were out-of-network on a giveback plan, would you still consider it?",
    "If the giveback plan had a higher MOOP by $2,000, would you still pick it?",
    "Do you want the tool to automatically veto giveback if it increases your worst-case risk too much?"
  ];
  givebackDeep.forEach((text, idx) => {
    push(qSingle(`GB_Q${idx+1}`, text,
      ["Yes","Maybe","No","Not sure"], "Giveback Tradeoffs",
      "Builds the giveback tradeoff brain.",
      (v) => {
        if (v <= 1) {
          setFlag("giveback_interest", true, "Giveback deep")
          addAxis("givebackAttraction", 0.08, `Giveback preference: ${text}`);
          if (idx <= 2) addAxis("volatilityTolerance", 0.05, "Accepts giveback tradeoffs" );
          if (idx === 4) addAxis("predictability", 0.08, "Prefers stability over giveback" );
          if (idx === 9) setFlag("giveback_veto_ok", true, "User wants giveback veto");
        } else {
          if (idx === 4 && v === 2) addAxis("givebackAttraction", -0.08, "Prefers stability" );
        }
      }
    ));
  });

  // Section 16: Medigap underwriting specifics (10)
  const uw = [
    "Do you use oxygen (including at night)?",
    "Have you been hospitalized in the last 12 months?",
    "Have you been diagnosed with congestive heart failure?",
    "Do you have insulin-dependent diabetes?",
    "Have you had a stroke/TIA in the last 24 months?",
    "Do you have end-stage renal disease or dialysis?",
    "Do you have uncontrolled COPD requiring frequent steroids?",
    "Do you have a history of cancer treatment in the last 2 years?",
    "Do you have memory/cognition concerns diagnosed by a doctor?",
    "Do you currently have a Medigap guaranteed issue right (trial right, loss of coverage, etc.)?"
  ];
  uw.forEach((text, idx) => {
    push(qSingle(`UW_Q${idx+1}`, text,
      ["Yes","Maybe","No","Not sure"], "Medigap Underwriting",
      "Used for lockout warnings when outside GI windows.",
      (v) => {
        if (v <= 1) {
          setFlag("underwriting_red_flags", true, "Underwriting red flags");
          addAxis("futureLockInSensitivity", 0.08, "Underwriting concern");
          if (idx === 9) setFlag("possible_gi_event", true, "Possible GI right" );
        }
      }
    ));
  });

  // Section 17: Regret / personality (10)
  const reg = [
    "If you chose the cheaper option and had a bad year, would you blame yourself?",
    "If you chose the safer option and stayed healthy, would you feel you wasted money?",
    "How much do you hate paperwork and phone calls when you are sick?",
    "Do you prefer to pay for simplicity even if it’s not mathematically optimal?",
    "Do you prefer maximizing provider freedom even if it costs more?",
    "Would you rather avoid a 5% chance of disaster or capture a 50% chance of savings?",
    "How much stress does doctor-network uncertainty cause you?",
    "How much stress do unpredictable bills cause you?",
    "Do you want the tool to err toward “sleep-at-night” safety?",
    "When unsure, do you want the tool to pick what you’d regret least?"
  ];
  reg.forEach((text, idx) => {
    const opts = (idx === 2) ? ["I hate it","Dislike it","Neutral","Fine","Not sure"] : ["Yes","Maybe","No","Not sure"];
    push(qSingle(`REG_Q${idx+1}`, text, opts, "Regret",
      "Feeds regret minimization engine.",
      (v) => {
        if (idx === 2) {
          if (v <= 1) { addAxis("regretSensitivity", 0.15, "Hates admin while sick" ); addAxis("predictability", 0.05, "Hates admin while sick" ); }
        } else {
          if (v <= 1) addAxis("regretSensitivity", 0.1, `Regret signal: ${text}`);
          if (idx === 8 && v <= 1) setFlag("sleep_at_night_mode", true, "Wants safety bias");
          if (idx === 9 && v <= 1) setFlag("regret_override_ok", true, "Wants regret override");
        }
      }
    ));
  });

  // Section 18: Part D / Medications / Pharmacies (12)
  const partD = [
    "Do you take 5 or more prescription medications?",
    "Are any of your medications specialty or very expensive (e.g., injections, infusions, biologics)?",
    "Do you strongly prefer using a specific pharmacy?",
    "Would you travel often enough that out-of-area pharmacies matter?",
    "Do you expect medication changes this year (new diagnosis, new doctor, etc.)?",
    "Would you rather pay a higher premium to reduce unpredictable prescription costs?",
    "Do you use mail-order pharmacy today?",
    "Do you rely on manufacturer copay cards or assistance (pre-Medicare)?",
    "Do you want the tool to penalize plans with complex prior authorization/step therapy behavior?",
    "Do you want the tool to favor stability even if it costs more (formulary/network)?",
    "Have you hit the Part D coverage gap (" + "donut hole" + ") before?",
    "If your meds got denied, would that be a major problem vs. an annoyance?"
  ];
  partD.forEach((text, idx) => {
    push(qSingle(`PD_Q${idx+1}`, text,
      ["Yes","Maybe","No","Not sure"],
      "Part D / Medications",
      "Feeds churn risk (formularies change), admin burden, and predictability preference.",
      (v) => {
        if (v <= 1) {
          if (idx === 0 || idx === 1 || idx === 4) {
            addAxis("planComplexityTolerance", -0.05, "Medication complexity" );
            addAxis("predictability", 0.05, "Medication cost concern" );
            addAxis("utilization", 0.05, "Higher likely Rx utilization" );
            setFlag("high_rx_complexity", true, "Higher Rx complexity");
          }
          if (idx === 2) addAxis("freedom", -0.03, "Pharmacy preference can behave like a network constraint");
          if (idx === 5) addAxis("predictability", 0.07, "Prefers predictable Rx spend");
          if (idx === 8) setFlag("wants_admin_penalty", true, "Wants admin complexity penalties");
          if (idx === 9) setFlag("stability_bias", true, "Stability bias" );
          if (idx === 11) addAxis("regretSensitivity", 0.06, "Denial risk is high impact" );
        }
      }
    ));
  });

  // Section 19: Post-acute care / high-cost events (6)
  const postAcute = [
    "Do you have a history of falls or mobility issues?",
    "Do you expect outpatient therapy (PT/OT) this year?",
    "Would you want broad access to skilled nursing facilities if needed?",
    "Would you likely use home health care if your health declined?",
    "If you needed rehab after a hospitalization, would network limits worry you?",
    "Is avoiding surprise facility costs a priority?"
  ];
  postAcute.forEach((text, idx) => {
    push(qSingle(`PA_Q${idx+1}`, text,
      ["Yes","Maybe","No","Not sure"],
      "Post-Acute Risk",
      "Skilled nursing, rehab, therapy are frequent MA cost drivers; impacts regret and predictability.",
      (v) => {
        if (v <= 1) {
          addAxis("utilization", 0.05, "Post-acute likelihood" );
          addAxis("predictability", 0.05, "Wants predictable post-acute costs" );
          if (idx === 4) addAxis("freedom", 0.04, "Rehab network concern" );
          if (idx === 5) addAxis("regretSensitivity", 0.05, "Facility cost regret" );
        }
      }
    ));
  });

})();

// Safety: ensure 150+ questions
setFlag("question_count", questions.length, "Question bank built");

// ================================
// 5) LAYERED ENGINES
// ================================

function enforceGIWindows() {
  // State-based protections + GI window handling
  const home = state.flags.home_state;
  const rule = home ? STATE_RULES[home] : null;

  // Basic GI window from S1_Q3
  if (hasFlag("medigap_underwriting_risk")) {
    // if protected by continuous or birthday-like rule, soften
    if (hasFlag("continuous_gi_state")) {
      addWhy("Your state appears to allow Medigap access/switching more broadly year-round than most states.");
      addAxis("futureLockInSensitivity", -0.1, "Continuous GI mitigates lock-in");
      setFlag("medigap_lockout_risk", false, "Continuous GI mitigates lockout");
    } else if (hasFlag("birthday_rule_state")) {
      addWhy("Your state appears to have a birthday/anniversary-style Medigap switching protection.");
      addAxis("futureLockInSensitivity", -0.05, "Birthday rule mitigates lock-in");
    }
  }

  if (rule && rule.note) {
    // add as explanation trace, but do not treat as legal advice
    addChange(`State rule surfaced (${home}): ${rule.note}`);
  }
}

function assistanceLadderModel() {
  // Very rough tier ladder. Output is probabilistic-ish signals.
  // Inputs: S2_Q1 income bucket, S2_Q1b household size, S2_Q5 assets bucket.
  const incomeBucket = state.answers.S2_Q1; // 0..8
  const hh = state.flags.household_size || 1;
  const assetsBucket = state.answers.S2_Q5; // 0..4

  let lis = 0, msp = 0, medicaid = 0;

  // Income bucket: lower => higher likelihood
  if (incomeBucket !== undefined) {
    if (incomeBucket <= 2) lis += 0.45;
    if (incomeBucket <= 1) msp += 0.45;
    if (incomeBucket === 0) medicaid += 0.55;
    if (incomeBucket >= 5 && incomeBucket <= 6) { lis -= 0.15; msp -= 0.2; medicaid -= 0.25; }
  }

  // Household size: larger households shift thresholds upward (softly)
  if (hh >= 2) { lis += 0.05; msp += 0.05; medicaid += 0.05; }
  if (hh >= 3) { lis += 0.07; msp += 0.07; medicaid += 0.07; }

  // Assets: low assets increase Medicaid/MSP plausibility in many programs
  if (assetsBucket !== undefined) {
    if (assetsBucket <= 1) { msp += 0.1; medicaid += 0.1; }
    if (assetsBucket === 0) { medicaid += 0.15; }
    if (assetsBucket >= 3) { msp -= 0.12; medicaid -= 0.2; }
  }

  // Clamp
  lis = Math.max(0, Math.min(1, lis));
  msp = Math.max(0, Math.min(1, msp));
  medicaid = Math.max(0, Math.min(1, medicaid));

  state.scenarios.assistance = { lis, msp, medicaid };

  // Feed into axes
  const assist = Math.max(lis, msp, medicaid);
  addAxis("assistanceLikelihood", (assist - 0.25) * 0.6, "Assistance ladder model" );

  if (assist >= 0.55) {
    setFlag("assistance_dominant", true, "High assistance likelihood");
    addWhy("Assistance pathways (Medicaid/MSP/LIS) look plausible enough that they should be checked before locking a high-premium choice.");
  }

  if (lis >= 0.55 && !hasFlag("lis_present")) addTrade("Prescription help (LIS/Extra Help) may reduce drug costs substantially if you qualify.");
  if (msp >= 0.55 && !hasFlag("msp_present")) addTrade("A Medicare Savings Program (MSP) may help with Part B premium/costs if you qualify.");
  if (medicaid >= 0.55 && !hasFlag("dual_or_medicaid_present")) addTrade("Medicaid eligibility could change your plan options and cost structure significantly.");
}

function givebackTradeoffBrain() {
  if (!hasFlag("giveback_interest")) return;

  // Giveback is most dangerous when predictability need is high and MOOP survivability is low.
  const a = state.axes;
  const riskAversion = (a.predictability + a.regretSensitivity + (hasFlag("low_moop_survivability") ? 0.35 : 0)) / 2.2;
  const attraction = (a.givebackAttraction + a.extrasPreference + a.volatilityTolerance) / 2.0;

  // Build a "should veto" heuristic
  const veto = (riskAversion > 0.35 && attraction < 0.25) || (hasFlag("giveback_veto_ok") && riskAversion > 0.25);

  state.scenarios.giveback = { riskAversion, attraction, veto };

  if (veto) {
    addWarn("Giveback attraction detected, but your answers suggest high downside risk. Treat giveback as a 'cash-flow perk' that can raise worst-case exposure.");
    addTrade("Giveback tradeoff: lower Part B cost now can come with higher MOOP / narrower networks / more approvals depending on the plan.");
    setFlag("giveback_veto", true, "Giveback veto triggered");
  } else {
    addWhy("You expressed interest in giveback and appear tolerant of the tradeoffs it can imply.");
  }
}

function planYearChurnModel() {
  // Higher churn sensitivity means MA pain next year (network changes, PA changes, formulary).
  const a = state.axes;
  const churn = Math.max(0, Math.min(1,
    0.15 + (a.churnSensitivity * 0.6) + (a.providerFragility * 0.35) + (a.rxRisk * 0.25) + (hasFlag("low_network_maintenance_tolerance") ? 0.2 : 0)
  ));

  state.scenarios.churnRisk = {
    overall: churn,
    drivers: {
      providerFragility: a.providerFragility,
      rxRisk: a.rxRisk,
      churnSensitivity: a.churnSensitivity
    }
  };

  if (churn >= 0.55) {
    addWarn("High plan-year churn/disruption risk: you are more likely to feel pain from annual network/formulary/authorization changes.");
    addWhy("You signaled low tolerance for annual plan maintenance or high dependency on specific providers/pharmacies.");
    addAxis("predictability", 0.08, "Churn risk increases desire for predictability" );
  }
}

function lockoutWarningsEngine() {
  // Medigap lockout risk: outside GI + underwriting red flags + not protected state
  const outsideGI = hasFlag("medigap_underwriting_risk");
  const protectedState = hasFlag("continuous_gi_state") || hasFlag("birthday_rule_state");
  const redFlags = hasFlag("multiple_chronic_conditions") || hasFlag("underwriting_red_flags");

  if (outsideGI && redFlags && !protectedState && !hasFlag("possible_gi_event")) {
    setFlag("medigap_lockout_risk", true, "Outside GI + red flags" );
    addWarn("Medigap lockout risk: you appear outside protected enrollment and have health factors that could trigger underwriting denial or higher pricing.");
    if (hasFlag("strong_warning_preference")) {
      addWarn("Irreversible warning: If you choose MA now and later want Medigap, you may not be able to get it (or it may be expensive)." );
    }
    addTrade("A common regret pattern: choosing MA for low premium now, then developing health issues and losing the ability to get Medigap later.");
  }
}

function scenarioSimulator() {
  // Lightweight scenario model: simulate expected annual cost and MOOP hit probability per option.
  // We use utilization + volatilityTolerance + predictability + assistance.
  const a = state.axes;

  // Utilization baseline 0..~1
  const u = Math.max(0, Math.min(1, 0.25 + a.utilization));

  // Expected cost ranges are intentionally coarse and educational.
  const med = {
    premium: 170 + (a.futureLockInSensitivity > 0.35 ? 15 : 0),
    oop: 30 + (u * 70),
    moopHitProb: Math.max(0.02, Math.min(0.25, u * 0.18))
  };
  const hmo = {
    premium: 15 + (hasFlag("giveback_interest") ? 0 : 10),
    oop: 250 + (u * 2200),
    moopHitProb: Math.max(0.06, Math.min(0.45, 0.08 + u * 0.35))
  };
  const ppo = {
    premium: 35,
    oop: 320 + (u * 2400),
    moopHitProb: Math.max(0.07, Math.min(0.5, 0.1 + u * 0.36))
  };

  // Adjust for assistance
  const assist = state.scenarios.assistance ? Math.max(state.scenarios.assistance.lis, state.scenarios.assistance.msp, state.scenarios.assistance.medicaid) : 0;
  if (assist >= 0.55) {
    hmo.oop *= 0.7;
    ppo.oop *= 0.8;
    hmo.moopHitProb *= 0.85;
    ppo.moopHitProb *= 0.9;
  }

  // Compute expected annual (premium*12 + oop)
  const annual = {
    MEDIGAP: Math.round(med.premium * 12 + med.oop),
    MA_HMO: Math.round(hmo.premium * 12 + hmo.oop),
    MA_PPO: Math.round(ppo.premium * 12 + ppo.oop)
  };

  state.scenarios.expectedAnnualCost = annual;
  state.scenarios.moopRisk = {
    MEDIGAP: med.moopHitProb,
    MA_HMO: hmo.moopHitProb,
    MA_PPO: ppo.moopHitProb
  };

  // Add readable tradeoffs
  addTrade(`Scenario simulator (rough): estimated annual spend (premium+OOP): Medigap ~$${annual.MEDIGAP}/yr, MA HMO ~$${annual.MA_HMO}/yr, MA PPO ~$${annual.MA_PPO}/yr.`);
  addTrade(`Scenario simulator (rough): chance of hitting high-cost year (MOOP-ish): Medigap ~${Math.round(med.moopHitProb*100)}%, MA HMO ~${Math.round(hmo.moopHitProb*100)}%, MA PPO ~${Math.round(ppo.moopHitProb*100)}%.`);
}

function regretMinimizationEngine(ranked) {
  // Compute regret risk for top two options, then optionally override.
  const a = state.axes;
  const highRegret = a.regretSensitivity > 0.3 || hasFlag("sleep_at_night_mode");
  if (!highRegret) return { ranked, override: null };

  const top = ranked[0];
  const second = ranked[1];
  if (!second) return { ranked, override: null };

  // If close scores, prefer the option with lower "worst-case" regret.
  const close = Math.abs(top.score - second.score) <= 1.2;
  if (!close && !hasFlag("regret_override_ok")) return { ranked, override: null };

  const moop = state.scenarios.moopRisk || {};
  const lockout = hasFlag("medigap_lockout_risk") ? 0.35 : 0;

  const regretRisk = (key) => {
    const base = 0.15 + (key !== C.MEDIGAP ? (moop[key] || 0.2) : 0.08) + (key !== C.MEDIGAP ? 0 : lockout);
    const admin = Math.max(0, (0.2 - a.adminTolerance) * 0.6);
    const provider = Math.max(0, a.providerFragility * (key === C.MEDIGAP ? 0.25 : 0.45));
    return Math.max(0, Math.min(1, base + admin + provider));
  };

  const rTop = regretRisk(top.key);
  const rSecond = regretRisk(second.key);
  state.scenarios.regretRisk = { [top.key]: rTop, [second.key]: rSecond };

  // If top has meaningfully higher regret risk, override.
  const override = (rTop - rSecond) >= 0.12;

  if (override) {
    const newRanked = [second, top, ...ranked.slice(2)];
    state.audit.overrides.push({ type: "regret_override", from: top.key, to: second.key, detail: { rTop, rSecond, close } });
    addWarn("Regret minimization override: your answers suggest you'd regret the original top pick more in a bad outcome. Choosing the 'sleep-at-night' option.");
    addWhy("You signaled higher regret sensitivity and/or a preference for worst-case protection.");
    return { ranked: newRanked, override: { from: top.key, to: second.key, rTop, rSecond } };
  }

  return { ranked, override: null };
}

// ================================
// 6) SCORING BRAIN (core)
// ================================
function recomputeAll() {
  // Reset (preserve answers and index)
  state.flags = {};
  state.hardBlocks = [];
  state.hardWarnings = [];
  state.explanations = { why: [], tradeoffs: [], changes: [] };
  state.trace = [];
  state.audit = { axisDeltas: [], flagEvents: [], warningEvents: [], scoreContrib: [], overrides: [] };
  state.scenarios = { expectedAnnualCost: {}, moopRisk: {}, churnRisk: {}, regretRisk: {} };

  Object.keys(state.axes).forEach(k => state.axes[k] = 0);
  state.candidates = { MEDIGAP: 0, MA_HMO: 0, MA_PPO: 0 };

  // Process each question's logic
  questions.forEach(q => {
    const ans = state.answers[q.id];
    if (ans !== undefined && q.logic) {
      try { q.logic(ans); } catch (e) { /* ignore bad answer shapes */ }
    }
  });

  // Layer engines
  enforceGIWindows();
  assistanceLadderModel();
  givebackTradeoffBrain();
  planYearChurnModel();
  lockoutWarningsEngine();
  scenarioSimulator();

  // Derived constraints
  if (hasFlag("snowbird") && hasFlag("routine_care_away")) {
    addWarn("Snowbird pattern + routine care away: HMOs are typically high-risk due to local networks.");
    setFlag("hmo_snowbird_risk", true, "Snowbird + routine care away");
  }

  // Misconception education
  if (state.axes.misconceptionCount > 0) {
    addChange("Misconceptions detected: this tool will correct common Medicare myths in the Explanation Trace.");
  }

  // Scoring
  const a = state.axes;
  let med = 0, hmo = 0, ppo = 0;

  // Medigap
  med += (a.predictability * 3.0) + (a.networkDependency * 2.6) + (a.futureLockInSensitivity * 2.4) + (a.mobility * 1.3) + (a.utilization * 1.8);
  med += (a.extrasPreference * -1.2) + (a.volatilityTolerance * -0.8);
  med += (a.providerFragility * 0.9) + (a.churnSensitivity * 0.6) + (a.rxRisk * 0.4);
  if (hasFlag("medigap_lockout_risk")) med -= 2.2;

  // HMO
  hmo += (a.extrasPreference * 2.6) + (a.volatilityTolerance * 2.0) + (a.adminTolerance * 1.3) + (a.assistanceLikelihood * 1.1);
  hmo -= (a.networkDependency * 2.5) + (a.mobility * 2.2) + (a.predictability * 1.6) + (a.utilization * 1.2);
  hmo += (a.givebackAttraction * 0.8) - (hasFlag("giveback_veto") ? 1.0 : 0);
  hmo += (a.rxRisk * -0.25) - (a.providerFragility * 0.25);
  if (hasFlag("hmo_snowbird_risk")) hmo -= 5.0;

  // PPO
  ppo += (a.extrasPreference * 2.0) + (a.volatilityTolerance * 1.6) + (a.adminTolerance * 1.1) + (a.assistanceLikelihood * 0.8);
  ppo += (a.networkDependency * 1.1) - (a.mobility * 1.2) - (a.predictability * 0.7);
  ppo += (a.givebackAttraction * 0.55) - (hasFlag("giveback_veto") ? 0.6 : 0);
  ppo += (a.rxRisk * -0.2) - (a.providerFragility * 0.18);
  if (hasFlag("oon_tolerant")) ppo += 1.2;
  if (hasFlag("oon_intolerant")) ppo -= 0.7;

  // Assistance dominance override
  if (hasFlag("assistance_dominant")) { hmo += 2.0; ppo += 1.5; med -= 2.2; }

  // Hard block: not enrolled
  if (hasFlag("needs_medicare_enrollment_guidance")) { med = -999; hmo = -999; ppo = -999; }

  state.candidates = { MEDIGAP: med, MA_HMO: hmo, MA_PPO: ppo };

  state.audit.scoreContrib.push({ plan: "MEDIGAP", score: med });
  state.audit.scoreContrib.push({ plan: "MA_HMO", score: hmo });
  state.audit.scoreContrib.push({ plan: "MA_PPO", score: ppo });

  saveState();
}

function pickWinner() {
  const s = state.candidates;
  const list = [
    { key: C.MEDIGAP, name: "Medigap (Supplement)", score: s.MEDIGAP },
    { key: C.MA_PPO, name: "Medicare Advantage PPO", score: s.MA_PPO },
    { key: C.MA_HMO, name: "Medicare Advantage HMO", score: s.MA_HMO }
  ].sort((a, b) => b.score - a.score);

  // ineligible
  if (hasFlag("needs_medicare_enrollment_guidance")) {
    return { primary: { key: "INELIGIBLE", name: "Ineligible (Enroll in A & B)", score: 0 }, ranked: list, confidence: "N/A" };
  }

  // Snowbird override: avoid HMO if flagged
  if (hasFlag("hmo_snowbird_risk") && list[0].key === C.MA_HMO) {
    state.audit.overrides.push({ type: "snowbird_override", from: C.MA_HMO, to: list[1]?.key || C.MA_PPO });
    return { primary: list[1] || list[0], ranked: list, confidence: computeConfidence(list) };
  }

  // Regret override (optional)
  const maybe = regretMinimizationEngine(list);
  const finalList = maybe.ranked;

  return { primary: finalList[0], ranked: finalList, confidence: computeConfidence(finalList) };
}

function computeConfidence(ranked) {
  const a = ranked[0];
  const b = ranked[1];
  if (!b) return "High";
  const gap = Math.abs(a.score - b.score);
  if (gap >= 3.0) return "High";
  if (gap >= 1.5) return "Medium";
  return "Low";
}

// ================================
// 7) SAVE / LOAD
// ================================
function saveState() {
  try {
    localStorage.setItem("mde_build", JSON.stringify({ answers: state.answers, idx: state.i }));
  } catch (_) {}
}

function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem("mde_build"));
    if (d && d.answers) {
      state.answers = d.answers || {};
      state.i = typeof d.idx === "number" ? d.idx : 0;
      return true;
    }
  } catch (_) {}
  return false;
}

function encodeShare() {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state.answers))));
  } catch (_) {
    return "";
  }
}

function decodeShare(hash) {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

// ================================
// 7) UI HELPERS (RADAR + QUICK COMPARE)
// ================================
function renderRadar(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const norm = (val, range) => {
    const n = 50 + (val * range);
    return Math.max(10, Math.min(100, n));
  };
  const a = state.axes;

  const stats = [
    { label: "Stability", val: norm(a.predictability, 12) },
    { label: "Freedom", val: norm(a.networkDependency + a.mobility, 12) },
    { label: "Perks", val: norm(a.extrasPreference, 18) },
    { label: "Low Cost", val: norm(a.volatilityTolerance, 12) },
    { label: "Low Hassle", val: norm(-a.adminTolerance, 18) }
  ];

  const r = 90;
  const cx = 150;
  const cy = 120;
  let points = "";
  stats.forEach((stat, i) => {
    const ang = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
    const rr = (stat.val / 100) * r;
    points += `${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)} `;
  });

  const svg = `
    <svg width="300" height="240" viewBox="0 0 300 240" style="display:block; margin:auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#111827" stroke="#24304a"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="#24304a" stroke-dasharray="4"/>
      <polygon points="${points}" fill="rgba(59,130,246,.35)" stroke="#3b82f6" stroke-width="2"/>
      ${stats.map((s, i) => {
        const ang = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
        const x = cx + (r + 25) * Math.cos(ang);
        const y = cy + (r + 18) * Math.sin(ang);
        return `<text x="${x}" y="${y}" fill="#9ca3af" font-size="10" text-anchor="middle" dominant-baseline="middle">${s.label}</text>`;
      }).join("")}
    </svg>
    <div style="text-align:center; font-size:11px; color:#9ca3af">Priority Profile</div>
  `;
  el.innerHTML = svg;
}

function renderComparison(containerId, winnerKey, runnerUpKey) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!runnerUpKey) { el.innerHTML = ""; return; }

  const dict = {
    MEDIGAP: { net: "Any Medicare provider", auth: "Rare", prem: "$100–$250+", moop: "Very low" },
    MA_HMO: { net: "Local network", auth: "Common", prem: "$0–$50", moop: "$3k–$9k" },
    MA_PPO: { net: "Network + OON", auth: "Common", prem: "$0–$80", moop: "$4k–$9k" }
  };
  const w = dict[winnerKey] || dict.MA_PPO;
  const r = dict[runnerUpKey] || dict.MA_HMO;

  el.innerHTML = `
    <table class="comp-table">
      <thead>
        <tr>
          <th width="30%">Feature</th>
          <th width="35%">${winnerKey.replace('_',' ')}</th>
          <th width="35%">${runnerUpKey.replace('_',' ')}</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Doctors</td><td>${w.net}</td><td>${r.net}</td></tr>
        <tr><td>Approvals</td><td>${w.auth}</td><td>${r.auth}</td></tr>
        <tr><td>Premium</td><td>${w.prem}</td><td>${r.prem}</td></tr>
        <tr><td>Risk (MOOP)</td><td>${w.moop}</td><td>${r.moop}</td></tr>
      </tbody>
    </table>
  `;
}

function getExportText(primary) {
  const uniq = (arr) => [...new Set(arr)];
  const why = uniq(state.explanations.why).map(x => `- ${x}`).join("\n");
  const warns = uniq(state.hardWarnings).map(x => `- ${x}`).join("\n");
  const locks = uniq(state.hardBlocks).map(x => `- ${x}`).join("\n");
  const sim = state.sim ? JSON.stringify(state.sim, null, 2) : "";

  return `Coverage Compass Result\n\nRecommendation: ${primary.name}\nScore: ${primary.score.toFixed(2)}\nConfidence: ${primary.confidence}\n\nWHY\n${why || "- (none)"}\n\nWARNINGS\n${warns || "- (none)"}\n\nLOCKOUTS / BLOCKS\n${locks || "- (none)"}\n\nScenario Simulator (summary)\n${sim}`;
}

// ================================
// 8) PUBLIC API
// ================================
window.CoverageCompass = {
  STATE_RULES, STATE_LIST,
  state,
  questions,
  recomputeAll,
  pickWinner,
  computeConfidence,
  saveState,
  loadState,
  encodeShare,
  decodeShare,
  renderRadar,
  renderComparison,
  getExportText
};

// Back-compat alias

