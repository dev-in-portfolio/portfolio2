export const CRITICAL_REQUIREMENTS = Object.freeze([
  Object.freeze({
    id: 'medicare-status',
    label: 'Medicare Part A and Part B status',
    questionIds: Object.freeze(['S1_Q1']),
    mode: 'predicate',
    predicate: Object.freeze({ questionId: 'S1_Q1', operator: 'equals', value: 0 })
  }),
  Object.freeze({ id: 'state', label: 'Primary state', questionIds: Object.freeze(['S1_STATE']), mode: 'all' }),
  Object.freeze({
    id: 'coverage-status',
    label: 'Current coverage status',
    questionIds: Object.freeze(['S1_Q4', 'S1_Q5', 'S1_Q7']),
    mode: 'any'
  }),
  Object.freeze({ id: 'medigap-timing', label: 'Part B or Medigap timing', questionIds: Object.freeze(['S1_Q3']), mode: 'all' }),
  Object.freeze({
    id: 'cost-tolerance',
    label: 'Cost predictability and out-of-pocket tolerance',
    questionIds: Object.freeze(['S2_Q6', 'S2_Q7']),
    mode: 'all'
  }),
  Object.freeze({
    id: 'health-usage',
    label: 'Healthcare usage',
    questionIds: Object.freeze(['S3_Q1', 'S3_Q2']),
    mode: 'any'
  }),
  Object.freeze({ id: 'prescriptions', label: 'Prescription complexity', questionIds: Object.freeze(['RX_Q1']), mode: 'all' }),
  Object.freeze({ id: 'provider-access', label: 'Doctor and provider access priorities', questionIds: Object.freeze(['S4_Q1']), mode: 'all' }),
  Object.freeze({ id: 'mobility', label: 'Travel or mobility needs', questionIds: Object.freeze(['S1_Q10']), mode: 'all' }),
  Object.freeze({ id: 'administration', label: 'Prior-authorization tolerance', questionIds: Object.freeze(['S3_Q8']), mode: 'all' })
]);

export function isAnswered(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== '';
}

function evaluatePredicate(answers, predicate) {
  if (!predicate || predicate.operator !== 'equals') return false;
  return answers?.[predicate.questionId] === predicate.value;
}

export function requirementIsComplete(answers = {}, requirement) {
  if (!requirement || !Array.isArray(requirement.questionIds)) return false;
  if (requirement.mode === 'predicate') return evaluatePredicate(answers, requirement.predicate);
  if (requirement.mode === 'any') return requirement.questionIds.some((id) => isAnswered(answers[id]));
  return requirement.questionIds.every((id) => isAnswered(answers[id]));
}

export function evaluateCriticalRequirements(answers = {}, requirements = CRITICAL_REQUIREMENTS) {
  const evaluations = requirements.map((requirement) => Object.freeze({
    id: requirement.id,
    label: requirement.label,
    questionIds: requirement.questionIds,
    complete: requirementIsComplete(answers, requirement)
  }));

  return Object.freeze({
    evaluations: Object.freeze(evaluations),
    completed: Object.freeze(evaluations.filter((item) => item.complete)),
    missing: Object.freeze(evaluations.filter((item) => !item.complete))
  });
}
