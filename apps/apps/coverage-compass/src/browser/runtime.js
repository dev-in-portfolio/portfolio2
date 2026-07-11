import { computeAssessmentReadiness } from '../assessment/readiness.js';
import { validateAssessmentAnswers } from '../assessment/validation.js';
import { calculateAssessment } from '../engine/calculate.js';
import { assertCandidateTotals, compareCandidateTotals } from '../engine/audit.js';
import { computeConfidence, rankCandidates } from '../engine/confidence.js';
import { scoreLegacyCandidates } from '../engine/legacy-score-model.js';
import {
  executeQuestionRule,
  executeQuestionRules,
  finalizeQuestionExecution,
  planQuestionExecution
} from '../engine/question-execution.js';
import { createScoreLedger } from '../engine/scoring.js';
import { applyRankingOverrides } from '../engine/overrides.js';
import { assertReportAllowed, reportAccessFor } from '../reports/readiness.js';
import { createImmutableSnapshot } from '../reports/snapshot.js';
import { createAssessmentEnvelope, migrateAssessmentEnvelope } from '../storage/migrations.js';
import { STORAGE_KEYS, isCoverageCompassStorageKey } from '../storage/keys.js';
import { MODEL_VERSION, RULE_SET_VERSION } from '../config/versions.js';

function normalizedCalculationError(error) {
  return Object.freeze({
    code: error?.code || 'MODULAR_RUNTIME_FAILURE',
    questionId: error?.questionId || error?.detail?.questionId || null,
    message: String(error?.message || error || 'Unknown modular runtime failure').slice(0, 300),
    detail: error?.detail || null
  });
}

function recordCalculationError(app, error) {
  app.state.calculationErrors = Array.isArray(app.state.calculationErrors) ? app.state.calculationErrors : [];
  const normalized = normalizedCalculationError(error);
  const duplicate = app.state.calculationErrors.some((entry) =>
    entry?.code === normalized.code &&
    (entry?.questionId || null) === normalized.questionId &&
    String(entry?.message || '') === normalized.message
  );
  if (!duplicate) app.state.calculationErrors.push(normalized);
  return normalized;
}

function cloneCompatible(value, root = globalThis) {
  if (value === undefined) return undefined;
  const clone = root.structuredClone || globalThis.structuredClone;
  if (typeof clone === 'function') {
    try { return clone(value); } catch {}
  }
  return JSON.parse(JSON.stringify(value));
}

function restoreObject(target, snapshot, root = globalThis) {
  Object.keys(target || {}).forEach((key) => delete target[key]);
  Object.assign(target, cloneCompatible(snapshot, root));
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function qualitativeScenarios() {
  return Object.freeze({
    classification: 'qualitative-educational-only',
    relativeCostPressure: Object.freeze({
      MEDIGAP: 'Higher monthly premium pressure; lower medical cost-sharing variability',
      MA_HMO: 'Lower monthly premium pressure; higher variable cost-sharing and network dependency',
      MA_PPO: 'Lower-to-moderate monthly premium pressure; higher variable cost-sharing and moderate network dependency'
    }),
    limitation: 'Coverage Compass does not provide a quote, plan-specific estimate, or personalized cost forecast.'
  });
}

export function scenarioSummary() {
  return Object.freeze([
    'This packet uses qualitative tradeoffs rather than a personalized price, quote, or cost forecast.',
    'Compare monthly premium pressure, variable medical cost exposure, provider-network dependency, administrative friction, and annual review burden.',
    'Verify actual premiums, benefits, networks, formularies, authorization rules, and maximum out-of-pocket amounts with current official plan materials.'
  ]);
}

export function applyConsumerScenarioPolicy(app) {
  const state = app?.state;
  if (!state) return false;

  if (state.explanations && Array.isArray(state.explanations.tradeoffs)) {
    state.explanations.tradeoffs = state.explanations.tradeoffs.filter(
      (item) => !/^Scenario simulator \(rough\):/i.test(String(item || ''))
    );
    const qualitative = 'Use relative tradeoffs—not fixed dollar projections—to compare monthly premium pressure, variable medical cost exposure, network dependency, and annual review burden.';
    if (!state.explanations.tradeoffs.includes(qualitative)) state.explanations.tradeoffs.push(qualitative);
  }

  state.consumerScenarios = qualitativeScenarios();
  const stateNotice = 'State Medigap protections and switching rights must be verified with current official state sources before enrollment, switching, or cancellation.';
  state.hardWarnings = Array.isArray(state.hardWarnings) ? state.hardWarnings : [];
  if (state.flags?.home_state && !state.hardWarnings.includes(stateNotice)) state.hardWarnings.push(stateNotice);
  return true;
}

export function addReportMetadata(report) {
  if (!report || typeof report !== 'object') return report;
  const enhanced = { ...report };
  const status = enhanced.readiness?.status || enhanced.snapshot?.readiness?.status || 'unknown';
  const statusLabel = enhanced.readinessLabel || enhanced.readiness?.label || enhanced.snapshot?.readiness?.label || status;
  const metadataText = `Assessment model: ${MODEL_VERSION}\nRule set: ${RULE_SET_VERSION}\nPacket status: ${statusLabel}`;

  enhanced.modelVersion = MODEL_VERSION;
  enhanced.ruleSetVersion = RULE_SET_VERSION;
  enhanced.suggestedFilename = `Coverage_Compass_${String(status).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_${String(enhanced.id || 'report').replace(/[^a-z0-9]+/gi, '_')}`;
  if (typeof enhanced.text === 'string' && !enhanced.text.includes('Assessment model:')) {
    enhanced.text = enhanced.text.replace(/(Readiness:.*\n)/, `$1${metadataText}\n`);
  }
  if (typeof enhanced.html === 'string' && !enhanced.html.includes('reportModelMeta')) {
    const html = `<p class="reportModelMeta"><strong>Assessment model:</strong> ${MODEL_VERSION} &nbsp; <strong>Rule set:</strong> ${RULE_SET_VERSION} &nbsp; <strong>Status:</strong> ${escapeHtml(statusLabel)}</p>`;
    enhanced.html = enhanced.html.replace('</header>', `${html}</header>`);
  }
  return enhanced;
}

function installRuntimeUi(root) {
  const document = root.document;
  if (!document || typeof document.getElementById !== 'function') return;

  if (!document.getElementById('coverageCompassReportMetadataStyles') && typeof document.createElement === 'function') {
    const style = document.createElement('style');
    style.id = 'coverageCompassReportMetadataStyles';
    style.textContent = '.reportModelMeta{font-size:9pt;color:#475569;margin-top:10px}';
    document.head?.appendChild?.(style);
  }

  try {
    if (root.sessionStorage?.getItem('coverage_compass_blocked_import') === '1') {
      const status = document.getElementById('saveStatus');
      if (status) status.textContent = 'Shared answer links are disabled for privacy';
      root.sessionStorage.removeItem('coverage_compass_blocked_import');
    }
  } catch {}

  const footer = document.querySelector?.('.foot .muted');
  if (footer) footer.innerHTML = footer.innerHTML.replace(/v\d+\.\d+\.\d+(?:-[\w.]+)?/i, `v${MODEL_VERSION}`);

  try {
    if (typeof root.renderReportStore === 'function') root.renderReportStore();
  } catch {}
}

export function installModularRuntime(root = globalThis) {
  const app = root.CoverageCompass;
  const reports = root.CoverageCompassReports;
  if (!app || !app.state || !reports || reports.__modularRuntimeInstalled) return false;

  app.modelVersion = MODEL_VERSION;
  app.ruleSetVersion = RULE_SET_VERSION;

  const currentReadiness = () => computeAssessmentReadiness({
    answers: app.state.answers || {},
    totalQuestions: Array.isArray(app.questions) ? app.questions.length : 0,
    completedAt: app.state.completedAt,
    calculationErrors: Array.isArray(app.state.calculationErrors) ? app.state.calculationErrors : []
  });

  function rescoreFromCurrentAxes() {
    const priorScores = { ...(app.state.candidates || {}) };
    const modular = scoreLegacyCandidates(app.state.axes || {}, app.state.flags || {});
    const parity = compareCandidateTotals(priorScores, modular.contributions);

    app.state.audit = app.state.audit && typeof app.state.audit === 'object' ? app.state.audit : {};
    app.state.audit.modularScoreAudit = parity;
    app.state.audit.modularScoreVersion = MODEL_VERSION;

    if (!parity.valid) {
      const detail = parity.mismatches.map((item) => ({
        candidate: item.candidate,
        legacy: item.declared,
        modular: item.audited,
        difference: item.difference
      }));
      const error = new Error('Modular candidate scores do not match the legacy scoring output.');
      error.code = 'MODULAR_SCORE_PARITY_FAILURE';
      error.detail = detail;
      throw error;
    }

    app.state.candidates = { ...modular.candidateScores };
    app.state.audit.scoreContrib = modular.contributions;
    return Object.freeze({
      candidateScores: Object.freeze({ ...modular.candidateScores }),
      contributions: modular.contributions,
      parity
    });
  }

  const observedQuestionOutcomes = new Map();
  for (const question of Array.isArray(app.questions) ? app.questions : []) {
    if (!question || typeof question.logic !== 'function' || question.__modularExecutionWrapped) continue;
    const previousLogic = question.logic;
    question.logic = function modularQuestionRule(answer) {
      const outcome = executeQuestionRule({ id: question.id, logic: previousLogic }, answer);
      observedQuestionOutcomes.set(question.id, outcome);
      if (outcome.error) recordCalculationError(app, outcome.error);
      return outcome.value;
    };
    question.__modularExecutionWrapped = true;
  }

  function finalizeQuestionAudit() {
    const execution = finalizeQuestionExecution(
      Array.isArray(app.questions) ? app.questions : [],
      app.state.answers || {},
      observedQuestionOutcomes
    );
    app.state.audit = app.state.audit && typeof app.state.audit === 'object' ? app.state.audit : {};
    app.state.audit.questionExecution = execution.outcomes;
    app.state.audit.questionExecutionSummary = Object.freeze({
      applied: execution.applied.length,
      skipped: execution.skipped.length,
      failed: execution.failed.length
    });
    execution.errors.forEach((error) => recordCalculationError(app, error));
    return execution;
  }

  const previousRecomputeAll = typeof app.recomputeAll === 'function'
    ? app.recomputeAll.bind(app)
    : null;
  if (previousRecomputeAll) {
    app.recomputeAll = function modularRecomputeAll() {
      observedQuestionOutcomes.clear();
      app.state.calculationErrors = [];
      let result = null;
      try {
        result = previousRecomputeAll();
      } catch (error) {
        const normalized = new Error(String(error?.message || error || 'Engine recomputation failed.'));
        normalized.code = 'ENGINE_FAILURE';
        recordCalculationError(app, normalized);
      }

      finalizeQuestionAudit();
      applyConsumerScenarioPolicy(app);
      const existingErrors = Array.isArray(app.state.calculationErrors) ? app.state.calculationErrors : [];
      if (!existingErrors.length) {
        try {
          rescoreFromCurrentAxes();
        } catch (error) {
          recordCalculationError(app, error);
        }
      }
      return result;
    };
  }

  const previousPickWinner = typeof app.pickWinner === 'function'
    ? app.pickWinner.bind(app)
    : null;
  if (previousPickWinner) {
    app.pickWinner = function modularPurePickWinner() {
      const before = cloneCompatible(app.state, root);
      try {
        const result = cloneCompatible(previousPickWinner(), root);
        restoreObject(app.state, before, root);
        return result;
      } catch (error) {
        restoreObject(app.state, before, root);
        const normalized = new Error(String(error?.message || error || 'Winner selection failed.'));
        normalized.code = 'WINNER_SELECTION_FAILURE';
        recordCalculationError(app, normalized);
        return {
          primary: { key: 'ERROR', name: 'Calculation unavailable', score: 0 },
          ranked: [],
          confidence: 'N/A'
        };
      }
    };
  }

  const missingAssessmentTargets = () => currentReadiness().criticalDomainEvaluations
    .filter((evaluation) => !evaluation.complete)
    .map((evaluation) => Object.freeze({
      id: evaluation.id,
      label: evaluation.label,
      questionId: evaluation.questionIds.find((questionId) => {
        const answer = app.state.answers?.[questionId];
        return answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
      }) || evaluation.questionIds[0]
    }));

  function navigateToQuestion(questionId) {
    const index = Array.isArray(app.questions)
      ? app.questions.findIndex((question) => question.id === questionId)
      : -1;
    if (index < 0) return false;

    app.state.i = index;
    if (typeof app.saveState === 'function') app.saveState();
    if (typeof root.showScreen === 'function') root.showScreen('screenQuiz');
    if (typeof root.renderQuestion === 'function') root.renderQuestion();
    return true;
  }

  function renderMissingNavigation() {
    const document = root.document;
    if (!document || typeof document.getElementById !== 'function') return;
    const box = document.getElementById('assessmentReadinessStatus');
    if (!box) return;

    const existing = document.getElementById('modularMissingNavigation');
    if (existing) existing.remove();

    const readiness = currentReadiness();
    const targets = missingAssessmentTargets();
    if (readiness.status === 'complete' || readiness.status === 'calculation-error' || targets.length === 0) return;

    const container = document.createElement('div');
    container.id = 'modularMissingNavigation';
    container.className = 'modularMissingNavigation';
    const heading = document.createElement('strong');
    heading.textContent = 'Go directly to an incomplete section';
    container.appendChild(heading);

    const row = document.createElement('div');
    row.className = 'btnrow';
    targets.forEach((target) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn tiny';
      button.textContent = target.label;
      button.dataset.questionId = target.questionId;
      button.addEventListener('click', () => navigateToQuestion(target.questionId));
      row.appendChild(button);
    });
    container.appendChild(row);
    box.appendChild(container);
  }

  const previousBuildSnapshot = typeof reports.buildResultSnapshot === 'function'
    ? reports.buildResultSnapshot.bind(reports)
    : null;
  const previousBuildReport = typeof reports.buildReport === 'function'
    ? reports.buildReport.bind(reports)
    : null;
  const previousBuildFullBundle = typeof reports.buildFullBundle === 'function'
    ? reports.buildFullBundle.bind(reports)
    : null;
  const getProducts = typeof reports.getReportProducts === 'function'
    ? reports.getReportProducts.bind(reports)
    : () => [];

  reports.reportReadinessStatus = currentReadiness;
  reports.assessmentAnswerCount = () => currentReadiness().answeredCount;
  reports.requiredCoreAnswersPresent = () => currentReadiness().missingCoreItems;
  reports.hasCompletedAssessment = () => currentReadiness().status === 'complete';
  reports.getMissingAssessmentTargets = missingAssessmentTargets;

  if (previousBuildSnapshot) {
    reports.buildResultSnapshot = function modularBuildResultSnapshot() {
      const snapshot = previousBuildSnapshot();
      const readiness = currentReadiness();
      const primary = snapshot.primary
        ? { ...snapshot.primary, confidence: readiness.status === 'complete' ? snapshot.primary.confidence : 'Low' }
        : snapshot.primary;
      return createImmutableSnapshot({
        ...snapshot,
        primary,
        readiness,
        status: readiness.status,
        modelVersion: MODEL_VERSION,
        ruleSetVersion: RULE_SET_VERSION,
        scenarios: qualitativeScenarios(),
        scenarioSummary: scenarioSummary(),
        questionExecution: app.state.audit?.questionExecution || [],
        questionExecutionSummary: app.state.audit?.questionExecutionSummary || null,
        scoreAudit: app.state.audit?.modularScoreAudit || null,
        scoreContributions: app.state.audit?.scoreContrib || [],
        modularCoreVersion: MODEL_VERSION,
        modularRuleSetVersion: RULE_SET_VERSION
      });
    };
  }

  if (previousBuildReport) {
    reports.buildReport = function modularBuildReport(id, snapshot) {
      const safeSnapshot = snapshot || reports.buildResultSnapshot();
      assertReportAllowed(id, safeSnapshot.readiness || currentReadiness());
      return addReportMetadata(previousBuildReport(id, safeSnapshot));
    };
  }

  if (previousBuildFullBundle) {
    reports.buildFullBundle = function modularBuildFullBundle(snapshot) {
      const safeSnapshot = snapshot || reports.buildResultSnapshot();
      assertReportAllowed('full-bundle', safeSnapshot.readiness || currentReadiness());
      return addReportMetadata(previousBuildFullBundle(safeSnapshot));
    };
  }

  reports.getAvailableReportProducts = function modularAvailableProducts(readiness = currentReadiness()) {
    const access = reportAccessFor(readiness);
    return getProducts().filter((product) => access.allowedReportIds.includes(product.id));
  };

  reports.buildAvailableReports = function modularBuildAvailableReports(snapshot) {
    const safeSnapshot = snapshot || reports.buildResultSnapshot();
    return reports.getAvailableReportProducts(safeSnapshot.readiness)
      .map((product) => reports.buildReport(product.id, safeSnapshot));
  };
  reports.buildAllReports = reports.buildAvailableReports;
  reports.buildReportText = (id, snapshot) => reports.buildReport(id, snapshot).text;
  reports.__modularRuntimeInstalled = true;

  const previousRenderResults = typeof root.renderResults === 'function' ? root.renderResults : null;
  if (previousRenderResults) {
    root.renderResults = function modularRenderResults() {
      const result = previousRenderResults.apply(this, arguments);
      renderMissingNavigation();
      return result;
    };
  }

  root.CoverageCompassCore = Object.freeze({
    MODEL_VERSION,
    RULE_SET_VERSION,
    STORAGE_KEYS,
    calculateAssessment,
    computeAssessmentReadiness,
    validateAssessmentAnswers,
    computeConfidence,
    rankCandidates,
    scoreLegacyCandidates,
    executeQuestionRule,
    executeQuestionRules,
    finalizeQuestionExecution,
    planQuestionExecution,
    createScoreLedger,
    compareCandidateTotals,
    assertCandidateTotals,
    applyRankingOverrides,
    reportAccessFor,
    assertReportAllowed,
    createImmutableSnapshot,
    createAssessmentEnvelope,
    migrateAssessmentEnvelope,
    isCoverageCompassStorageKey,
    qualitativeScenarios,
    scenarioSummary,
    applyConsumerScenarioPolicy,
    addReportMetadata,
    currentReadiness,
    rescoreFromCurrentAxes,
    finalizeQuestionAudit,
    missingAssessmentTargets,
    navigateToQuestion,
    renderMissingNavigation
  });

  if (previousRecomputeAll) app.recomputeAll();
  else {
    finalizeQuestionAudit();
    applyConsumerScenarioPolicy(app);
    try {
      rescoreFromCurrentAxes();
    } catch (error) {
      recordCalculationError(app, error);
    }
  }

  installRuntimeUi(root);
  renderMissingNavigation();
  return true;
}

if (typeof window !== 'undefined') {
  if (!installModularRuntime(window)) {
    window.addEventListener('DOMContentLoaded', () => installModularRuntime(window), { once: true });
  }
}
