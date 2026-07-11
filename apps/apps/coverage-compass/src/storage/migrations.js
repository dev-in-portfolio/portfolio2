export const ASSESSMENT_SCHEMA_VERSION = 2;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createAssessmentEnvelope(input = {}) {
  if (!input.modelVersion || !input.ruleSetVersion) {
    throw new TypeError('modelVersion and ruleSetVersion are required.');
  }

  return Object.freeze({
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    modelVersion: String(input.modelVersion),
    ruleSetVersion: String(input.ruleSetVersion),
    savedAt: input.savedAt || new Date().toISOString(),
    answers: clone(input.answers || {}),
    currentQuestionIndex: Number.isInteger(input.currentQuestionIndex) ? input.currentQuestionIndex : 0,
    completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
    recalculationRequired: Boolean(input.recalculationRequired),
    migrationReason: input.migrationReason ? String(input.migrationReason) : null,
    sourceSchemaVersion: Number.isInteger(input.sourceSchemaVersion)
      ? input.sourceSchemaVersion
      : ASSESSMENT_SCHEMA_VERSION
  });
}

export function migrateAssessmentEnvelope(payload, expected = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const isV2 = source.schemaVersion === ASSESSMENT_SCHEMA_VERSION && source.answers && typeof source.answers === 'object';
  const legacyAnswers = source.answers && typeof source.answers === 'object' ? source.answers : {};
  const currentQuestionIndex = Number.isInteger(source.currentQuestionIndex)
    ? source.currentQuestionIndex
    : Number.isInteger(source.idx)
      ? source.idx
      : 0;

  const versionMatches = isV2 &&
    source.modelVersion === expected.modelVersion &&
    source.ruleSetVersion === expected.ruleSetVersion;
  const inheritedRecalculation = Boolean(source.recalculationRequired);
  const migrated = !isV2 || !versionMatches;
  const recalculationRequired = migrated || inheritedRecalculation;
  const reason = !isV2
    ? 'legacy-schema'
    : !versionMatches
      ? 'model-or-rule-version-changed'
      : inheritedRecalculation
        ? (source.migrationReason || 'recalculation-required')
        : 'current';
  const sourceSchemaVersion = Number.isInteger(source.schemaVersion) ? source.schemaVersion : 1;

  const envelope = createAssessmentEnvelope({
    modelVersion: expected.modelVersion,
    ruleSetVersion: expected.ruleSetVersion,
    savedAt: source.savedAt || new Date().toISOString(),
    answers: legacyAnswers,
    currentQuestionIndex,
    completedAt: recalculationRequired ? null : source.completedAt,
    recalculationRequired,
    migrationReason: recalculationRequired ? reason : null,
    sourceSchemaVersion
  });

  return Object.freeze({
    envelope,
    sourceSchemaVersion,
    sourceModelVersion: typeof source.modelVersion === 'string' ? source.modelVersion : 'legacy-unversioned',
    sourceRuleSetVersion: typeof source.ruleSetVersion === 'string' ? source.ruleSetVersion : 'legacy-unversioned',
    migrated,
    recalculationRequired,
    completionReset: Boolean(source.completedAt) && envelope.completedAt === null,
    reason
  });
}
