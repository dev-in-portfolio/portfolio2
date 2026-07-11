import { isAnswered } from './question-metadata.js';

function issue(questionId, code, message, severity = 'error') {
  return Object.freeze({ questionId, code, message, severity });
}

function validOptionIndex(value, optionCount) {
  return Number.isInteger(value) && value >= 0 && value < optionCount;
}

export function validateAnswer(question, value) {
  if (!question || !question.id) return [issue('unknown', 'INVALID_QUESTION', 'Question metadata is missing an id.')];
  if (!isAnswered(value)) return [];

  const optionCount = Array.isArray(question.options) ? question.options.length : 0;

  if (question.type === 'single' || question.type === 'dropdown') {
    return validOptionIndex(value, optionCount)
      ? []
      : [issue(question.id, 'INVALID_OPTION', 'Answer is not a valid option index.')];
  }

  if (question.type === 'multi') {
    if (!Array.isArray(value)) return [issue(question.id, 'INVALID_MULTI', 'Answer must be an array of option indexes.')];
    const invalid = value.some((entry) => !validOptionIndex(entry, optionCount));
    const duplicated = new Set(value).size !== value.length;
    const issues = [];
    if (invalid) issues.push(issue(question.id, 'INVALID_MULTI_OPTION', 'One or more selected options are invalid.'));
    if (duplicated) issues.push(issue(question.id, 'DUPLICATE_MULTI_OPTION', 'Selected options contain duplicates.', 'warning'));
    return issues;
  }

  if (question.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return [issue(question.id, 'INVALID_NUMBER', 'Answer must be a finite number.')];
    }
    const issues = [];
    if (Number.isFinite(question.min) && value < question.min) issues.push(issue(question.id, 'NUMBER_BELOW_MIN', 'Answer is below the allowed minimum.'));
    if (Number.isFinite(question.max) && value > question.max) issues.push(issue(question.id, 'NUMBER_ABOVE_MAX', 'Answer is above the allowed maximum.'));
    return issues;
  }

  return [issue(question.id, 'UNKNOWN_QUESTION_TYPE', `Unsupported question type: ${String(question.type || 'missing')}.`)];
}

export function validateAssessmentAnswers(rawAnswers = {}, questions = []) {
  const answers = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers) ? rawAnswers : {};
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const errors = [];
  const warnings = [];
  const records = [];

  for (const question of questions) {
    const value = answers[question.id];
    if (!isAnswered(value)) {
      records.push(Object.freeze({ questionId: question.id, status: 'skipped' }));
      continue;
    }

    const questionIssues = validateAnswer(question, value);
    questionIssues.forEach((entry) => (entry.severity === 'warning' ? warnings : errors).push(entry));
    records.push(Object.freeze({
      questionId: question.id,
      status: questionIssues.some((entry) => entry.severity === 'error') ? 'invalid' : 'answered'
    }));
  }

  for (const answerId of Object.keys(answers)) {
    if (!questionMap.has(answerId)) {
      warnings.push(issue(answerId, 'UNKNOWN_ANSWER', 'Answer does not match a known question.', 'warning'));
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    records: Object.freeze(records),
    skipped: Object.freeze(records.filter((record) => record.status === 'skipped')),
    answered: Object.freeze(records.filter((record) => record.status === 'answered')),
    invalid: Object.freeze(records.filter((record) => record.status === 'invalid'))
  });
}
