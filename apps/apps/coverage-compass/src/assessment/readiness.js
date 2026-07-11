import {
  CRITICAL_REQUIREMENTS,
  evaluateCriticalRequirements,
  isAnswered
} from './question-metadata.js';

export const MIN_ANSWER_FLOOR = 30;
export const MIN_ANSWER_RATIO = 0.35;

const LABELS = Object.freeze({
  'not-started': 'Assessment not started',
  'in-progress': 'Assessment in progress',
  preliminary: 'Preliminary Packet - assessment incomplete',
  complete: 'Final Packet - critical domains complete',
  'enrollment-review': 'Enrollment Status Review - recommendation not final',
  'calculation-error': 'Calculation incomplete - final packet blocked'
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function countAnswers(answers = {}) {
  return Object.values(answers).filter(isAnswered).length;
}

export function minimumAnswerCount(totalQuestions = 0, options = {}) {
  const floor = Number.isFinite(options.floor) ? options.floor : MIN_ANSWER_FLOOR;
  const ratio = Number.isFinite(options.ratio) ? options.ratio : MIN_ANSWER_RATIO;
  return Math.max(floor, Math.ceil(Math.max(0, totalQuestions) * ratio));
}

export function computeAssessmentReadiness(input = {}) {
  const answers = input.answers && typeof input.answers === 'object' ? input.answers : {};
  const totalQuestions = Number.isFinite(input.totalQuestions) ? Math.max(0, input.totalQuestions) : 0;
  const calculationErrors = Array.isArray(input.calculationErrors) ? input.calculationErrors : [];
  const requirements = Array.isArray(input.criticalRequirements)
    ? input.criticalRequirements
    : CRITICAL_REQUIREMENTS;

  const answeredCount = countAnswers(answers);
  const percentAnswered = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const critical = evaluateCriticalRequirements(answers, requirements);
  const criticalCoverage = requirements.length
    ? Math.round((critical.completed.length / requirements.length) * 100)
    : 100;
  const requiredAnswers = minimumAnswerCount(totalQuestions, input.minimumAnswerOptions);
  const traversalCompleted = typeof input.completedAt === 'string' && input.completedAt.length > 0;
  const enrollmentReview = isAnswered(answers.S1_Q1) && answers.S1_Q1 !== 0;

  let status = 'not-started';
  if (answeredCount > 0) status = 'in-progress';
  if (calculationErrors.length) status = 'calculation-error';
  else if (enrollmentReview) status = 'enrollment-review';
  else if (answeredCount >= 6) status = 'preliminary';

  if (
    !calculationErrors.length &&
    !enrollmentReview &&
    traversalCompleted &&
    answeredCount >= requiredAnswers &&
    critical.missing.length === 0
  ) {
    status = 'complete';
  }

  return Object.freeze({
    status,
    label: LABELS[status],
    answeredCount,
    totalQuestions,
    percentAnswered,
    completenessPercent: Math.min(100, Math.round((percentAnswered + criticalCoverage) / 2)),
    minimumAnswersRequired: requiredAnswers,
    traversalCompleted,
    criticalDomainsComplete: critical.missing.length === 0,
    criticalDomainEvaluations: critical.evaluations,
    missingCoreItems: Object.freeze(critical.missing.map((item) => item.label)),
    missingCriticalDomains: Object.freeze(critical.missing.map((item) => item.id)),
    calculationErrors: Object.freeze(clone(calculationErrors)),
    canShowDirectionalResult: status === 'preliminary' || status === 'complete',
    canGenerateFinalReports: status === 'complete',
    canGeneratePreliminaryReports: status === 'preliminary' || status === 'complete',
    canGenerateEnrollmentReviewReports: status === 'enrollment-review'
  });
}
