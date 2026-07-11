import { computeAssessmentReadiness } from '../assessment/readiness.js';
import { validateAssessmentAnswers } from '../assessment/validation.js';
import { assertCandidateTotals } from './audit.js';
import { computeConfidence, rankCandidates } from './confidence.js';
import { applyRankingOverrides } from './overrides.js';
import { createImmutableSnapshot, deepClone } from '../reports/snapshot.js';
import { MODEL_VERSION, RULE_SET_VERSION } from '../config/versions.js';

const DEFAULT_CANDIDATE_NAMES = Object.freeze({
  MEDIGAP: 'Medigap (Supplement)',
  MA_PPO: 'Medicare Advantage PPO',
  MA_HMO: 'Medicare Advantage HMO'
});

function calculationError(code, message, detail = null) {
  return Object.freeze({
    code,
    message: String(message || 'Unknown calculation error').slice(0, 300),
    detail: detail == null ? null : deepClone(detail)
  });
}

function normalizeScoringResult(result = {}) {
  return {
    candidateScores: result.candidateScores && typeof result.candidateScores === 'object' ? result.candidateScores : {},
    contributions: Array.isArray(result.contributions) ? result.contributions : [],
    flags: result.flags && typeof result.flags === 'object' ? result.flags : {},
    explanations: result.explanations && typeof result.explanations === 'object'
      ? result.explanations
      : { why: [], tradeoffs: [], changes: [] },
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    blocks: Array.isArray(result.blocks) ? result.blocks : [],
    scenarios: result.scenarios && typeof result.scenarios === 'object' ? result.scenarios : {},
    overrides: Array.isArray(result.overrides) ? result.overrides : []
  };
}

export function calculateAssessment(rawAnswers = {}, context = {}) {
  const questions = Array.isArray(context.questions) ? context.questions : [];
  const answers = deepClone(rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {});
  const validation = validateAssessmentAnswers(answers, questions);
  const errors = validation.errors.map((entry) => calculationError('ANSWER_VALIDATION_FAILURE', entry.message, entry));
  let scoring = normalizeScoringResult();
  let scoreAudit = Object.freeze({ valid: true, calculated: Object.freeze({}), mismatches: Object.freeze([]) });

  if (!errors.length) {
    if (typeof context.scorer !== 'function') {
      errors.push(calculationError('SCORER_UNAVAILABLE', 'No pure scorer was supplied to calculateAssessment.'));
    } else {
      try {
        scoring = normalizeScoringResult(context.scorer(deepClone(answers), Object.freeze({
          modelVersion: context.modelVersion || MODEL_VERSION,
          ruleSetVersion: context.ruleSetVersion || RULE_SET_VERSION,
          questionCount: questions.length
        })));
        scoreAudit = assertCandidateTotals(scoring.candidateScores, scoring.contributions);
      } catch (error) {
        errors.push(calculationError(
          error && String(error.message || '').startsWith('Candidate score audit failed')
            ? 'SCORE_AUDIT_FAILURE'
            : 'SCORER_FAILURE',
          error?.message || error
        ));
      }
    }
  }

  const baseRanked = errors.length
    ? []
    : rankCandidates(scoring.candidateScores, context.candidateNames || DEFAULT_CANDIDATE_NAMES);
  const overrideResult = errors.length
    ? Object.freeze({ ranked: Object.freeze([]), applied: Object.freeze([]) })
    : applyRankingOverrides(baseRanked, Array.isArray(context.overrideRules) ? context.overrideRules : [], {
      answers,
      flags: scoring.flags,
      candidateScores: scoring.candidateScores
    });
  const ranked = overrideResult.ranked;
  const confidence = errors.length ? 'N/A' : computeConfidence(ranked, context.confidenceThresholds);
  const primary = ranked[0] || Object.freeze({ key: 'ERROR', name: 'Calculation unavailable', score: 0 });

  const readiness = computeAssessmentReadiness({
    answers,
    totalQuestions: Number.isFinite(context.totalQuestions) ? context.totalQuestions : questions.length,
    completedAt: context.completedAt,
    calculationErrors: errors,
    criticalRequirements: context.criticalRequirements,
    minimumAnswerOptions: context.minimumAnswerOptions
  });

  return createImmutableSnapshot({
    modelVersion: context.modelVersion || MODEL_VERSION,
    ruleSetVersion: context.ruleSetVersion || RULE_SET_VERSION,
    generatedAt: context.generatedAt || null,
    answers,
    answerRecords: validation.records,
    skippedAnswers: validation.skipped,
    validation: {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    },
    calculationErrors: errors,
    readiness,
    candidates: scoring.candidateScores,
    ranked,
    primary,
    confidence,
    contributions: scoring.contributions,
    scoreAudit,
    flags: scoring.flags,
    explanations: scoring.explanations,
    warnings: scoring.warnings,
    blocks: scoring.blocks,
    scenarios: scoring.scenarios,
    overrides: [...scoring.overrides, ...overrideResult.applied]
  });
}
