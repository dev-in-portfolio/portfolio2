function normalizeCare(care){
  const c = care && typeof care === "object" ? care : {};
  return {
    light: c.light || "",
    water: c.water || "",
    soil: c.soil || "",
    temperature: c.temperature || "",
    humidity: c.humidity || "",
    fertilizer: c.fertilizer || ""
  };
}

function normalizeIssue(issue){
  const sev = String(issue?.severity || "low").toLowerCase();
  return {
    title: String(issue?.title || "Issue"),
    severity: ["low","medium","high"].includes(sev) ? sev : "low",
    notes: String(issue?.notes || "")
  };
}

function normalizeDiagnosisCandidate(candidate){
  const indicators = Array.isArray(candidate?.indicators) ? candidate.indicators.map(String).filter(Boolean) : [];
  const nextSteps = Array.isArray(candidate?.nextSteps) ? candidate.nextSteps.map(String).filter(Boolean) : [];
  return {
    name: String(candidate?.name || "Unknown"),
    scientificName: String(candidate?.scientificName || ""),
    confidence: clampConfidence(candidate?.confidence),
    summary: String(candidate?.summary || ""),
    reasoning: String(candidate?.reasoning || candidate?.summary || ""),
    indicators,
    care: normalizeCare(candidate?.care),
    issues: Array.isArray(candidate?.issues) ? candidate.issues.map(normalizeIssue) : [],
    nextSteps
  };
}

function normalizePlantData(raw){
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackCandidate = normalizeDiagnosisCandidate(source);
  const diagnoses = Array.isArray(source.diagnoses) && source.diagnoses.length
    ? source.diagnoses.map(normalizeDiagnosisCandidate)
    : [fallbackCandidate];
  diagnoses.sort((a,b)=>b.confidence-a.confidence);
  return {
    overview: String(source.overview || source.summary || diagnoses[0]?.summary || ""),
    uncertainty: String(source.uncertainty || ""),
    evidenceGaps: Array.isArray(source.evidenceGaps) ? source.evidenceGaps.map(String).filter(Boolean) : [],
    diagnoses
  };
}

function toast(type, title, message){
  const id = crypto.randomUUID();
  state.notifications.push({ id, type, title, message });
  renderToasts();
  setTimeout(()=>{
    state.notifications = state.notifications.filter(n=>n.id!==id);
    renderToasts();
  }, 4200);
}

function loadHistory(){
  try{
    const raw = localStorage.getItem(HISTORY_STORE);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    localStorage.removeItem(HISTORY_STORE);
    return [];
