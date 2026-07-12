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
import { assertReportAllowed, reportAccessFor } from '../reporting/readiness.js';
import { createImmutableSnapshot } from '../reporting/snapshot.js';
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
    'Use the report as an educational review aid, not as enrollment advice or a replacement for plan-specific carrier materials.'
  ]);
}

export function createCoverageCompassRuntime(root = globalThis) {
  const document = root.document;
  const now = () => new Date().toISOString();

  const app = {
    state: {
      version: MODEL_VERSION,
      ruleSetVersion: RULE_SET_VERSION,
      answers: {},
      result: null,
      readiness: computeAssessmentReadiness({}),
      generatedReports: [],
      calculationErrors: [],
      createdAt: now(),
      updatedAt: now()
    },
    calculate() {
      try {
        validateAssessmentAnswers(this.state.answers);
        const rawResult = calculateAssessment(this.state.answers);
        assertCandidateTotals(rawResult.candidates);
        compareCandidateTotals(rawResult.candidates, rawResult.totals);
        const legacy = scoreLegacyCandidates(rawResult.candidates, this.state.answers);
        const confidence = computeConfidence(rawResult.candidates, this.state.answers);
        const ranked = applyRankingOverrides(rankCandidates(rawResult.candidates, confidence), this.state.answers);
        const ledger = createScoreLedger(ranked, rawResult, legacy);
        this.state.result = Object.freeze({ ...rawResult, legacy, confidence, ranked, ledger });
        this.state.readiness = computeAssessmentReadiness(this.state.answers, this.state.result);
        this.state.updatedAt = now();
        return this.state.result;
      } catch (error) {
        recordCalculationError(this, error);
        this.state.readiness = Object.freeze({ status: 'calculation-error', errors: this.state.calculationErrors });
        throw error;
      }
    },
    answer(questionId, value) {
      this.state.answers[questionId] = value;
      this.state.updatedAt = now();
      return this.calculate();
    },
    executeQuestion(question) {
      const plan = planQuestionExecution(question, this.state.answers, this.state.result);
      const result = executeQuestionRule(question, this.state.answers, this.state.result);
      return finalizeQuestionExecution(question, plan, result);
    },
    executeQuestions(questions) {
      return executeQuestionRules(questions, this.state.answers, this.state.result);
    },
    reportAccess() {
      return reportAccessFor(this.state.readiness);
    },
    generateReport(reportId) {
      assertReportAllowed(reportId, this.state.readiness);
      const snapshot = createImmutableSnapshot({
        reportId,
        generatedAt: now(),
        version: MODEL_VERSION,
        ruleSetVersion: RULE_SET_VERSION,
        answers: this.state.answers,
        result: this.state.result,
        readiness: this.state.readiness,
        scenarios: qualitativeScenarios(),
        scenarioSummary: scenarioSummary()
      });
      this.state.generatedReports.push(snapshot);
      this.state.updatedAt = now();
      return snapshot;
    },
    save(storage = root.localStorage) {
      const envelope = createAssessmentEnvelope(this.state);
      storage?.setItem(STORAGE_KEYS.ASSESSMENT, JSON.stringify(envelope));
      return envelope;
    },
    load(storage = root.localStorage) {
      const raw = storage?.getItem(STORAGE_KEYS.ASSESSMENT);
      if (!raw) return null;
      const envelope = migrateAssessmentEnvelope(JSON.parse(raw));
      restoreObject(this.state, envelope.payload, root);
      return envelope;
    },
    isManagedStorageKey(key) {
      return isCoverageCompassStorageKey(key);
    },
    renderSummary(target = document?.querySelector('[data-coverage-summary]')) {
      if (!target) return '';
      const readiness = this.state.readiness || {};
      const html = `
        <section class="cc-summary-card">
          <h2>Coverage Compass Status</h2>
          <p><strong>Readiness:</strong> ${escapeHtml(readiness.status || 'not-started')}</p>
          <p><strong>Reports available:</strong> ${escapeHtml(this.reportAccess().allowedReportIds.join(', ') || 'None yet')}</p>
          <p><strong>Model:</strong> ${escapeHtml(MODEL_VERSION)} · ${escapeHtml(RULE_SET_VERSION)}</p>
        </section>`;
      target.innerHTML = html;
      return html;
    }
  };

  return app;
}

export default createCoverageCompassRuntime;
