function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function safeMessage(error) {
  return String(error?.message || error || 'Unknown question rule failure').slice(0, 300);
}

export function questionHasAnswer(answers = {}, questionId) {
  return Object.prototype.hasOwnProperty.call(answers, questionId) && answers[questionId] !== undefined;
}

export function planQuestionExecution(questions = [], answers = {}) {
  return Object.freeze(questions.map((question, index) => Object.freeze({
    questionId: String(question?.id || `unknown-${index}`),
    index,
    status: !questionHasAnswer(answers, question?.id)
      ? 'skipped'
      : typeof question?.logic !== 'function'
        ? 'no-rule'
        : 'pending'
  })));
}

export function executeQuestionRule(question, answer) {
  const questionId = String(question?.id || 'unknown');
  if (typeof question?.logic !== 'function') {
    return Object.freeze({ questionId, status: 'no-rule', value: undefined, error: null });
  }

  try {
    const value = question.logic(answer);
    return Object.freeze({ questionId, status: 'applied', value, error: null });
  } catch (error) {
    return Object.freeze({
      questionId,
      status: 'failed',
      value: undefined,
      error: Object.freeze({
        code: 'QUESTION_RULE_FAILURE',
        questionId,
        message: safeMessage(error)
      })
    });
  }
}

export function executeQuestionRules(questions = [], answers = {}) {
  const outcomes = [];
  for (const question of questions) {
    if (!questionHasAnswer(answers, question?.id)) {
      outcomes.push(Object.freeze({ questionId: String(question?.id || 'unknown'), status: 'skipped', value: undefined, error: null }));
      continue;
    }
    outcomes.push(executeQuestionRule(question, clone(answers[question.id])));
  }

  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    errors: Object.freeze(outcomes.filter((outcome) => outcome.error).map((outcome) => outcome.error)),
    applied: Object.freeze(outcomes.filter((outcome) => outcome.status === 'applied')),
    skipped: Object.freeze(outcomes.filter((outcome) => outcome.status === 'skipped')),
    failed: Object.freeze(outcomes.filter((outcome) => outcome.status === 'failed'))
  });
}

export function finalizeQuestionExecution(questions = [], answers = {}, observedOutcomes = new Map()) {
  const plan = planQuestionExecution(questions, answers);
  const outcomes = plan.map((entry) => {
    const observed = observedOutcomes instanceof Map ? observedOutcomes.get(entry.questionId) : observedOutcomes?.[entry.questionId];
    if (observed) return observed;
    if (entry.status === 'pending') {
      return Object.freeze({
        questionId: entry.questionId,
        status: 'not-observed',
        value: undefined,
        error: Object.freeze({
          code: 'QUESTION_RULE_NOT_OBSERVED',
          questionId: entry.questionId,
          message: 'An answered question rule was not observed during engine recomputation.'
        })
      });
    }
    return Object.freeze({ questionId: entry.questionId, status: entry.status, value: undefined, error: null });
  });

  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    errors: Object.freeze(outcomes.filter((outcome) => outcome.error).map((outcome) => outcome.error)),
    applied: Object.freeze(outcomes.filter((outcome) => outcome.status === 'applied')),
    skipped: Object.freeze(outcomes.filter((outcome) => outcome.status === 'skipped')),
    failed: Object.freeze(outcomes.filter((outcome) => outcome.status === 'failed' || outcome.status === 'not-observed'))
  });
}
