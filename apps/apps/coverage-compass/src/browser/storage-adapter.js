/* First-class assessment persistence adapter.
   Loaded before app.js so V2 storage owns save/load from the first boot read. */
(function installCoverageCompassStorage(root) {
  'use strict';

  const app = root.CoverageCompass;
  if (!app || app.__assessmentStorageInstalled) return;

  const MODEL_VERSION = '2.0.0-modular.1';
  const RULE_SET_VERSION = '2026.07-beta';
  const SCHEMA_VERSION = 2;
  const KEYS = Object.freeze({
    current: 'coverage_compass_assessment_v2',
    prior: 'coverage_compass_state_v1',
    legacy: 'mde_build'
  });

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return isPlainRecord(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function assessmentPayloadIsUsable(payload) {
    return isPlainRecord(payload) && isPlainRecord(payload.answers);
  }

  function readFirstPayload() {
    const storage = root.localStorage;
    if (!storage) return Object.freeze({ key: null, payload: null });
    for (const key of [KEYS.current, KEYS.prior, KEYS.legacy]) {
      const payload = safeParse(storage.getItem(key));
      if (assessmentPayloadIsUsable(payload)) return Object.freeze({ key, payload });
    }
    return Object.freeze({ key: null, payload: null });
  }

  function createEnvelope(input) {
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      modelVersion: MODEL_VERSION,
      ruleSetVersion: RULE_SET_VERSION,
      savedAt: input.savedAt || nowIso(),
      answers: clone(input.answers || {}),
      currentQuestionIndex: Number.isInteger(input.currentQuestionIndex) ? input.currentQuestionIndex : 0,
      completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
      recalculationRequired: Boolean(input.recalculationRequired),
      migrationReason: input.migrationReason ? String(input.migrationReason) : null,
      sourceSchemaVersion: Number.isInteger(input.sourceSchemaVersion) ? input.sourceSchemaVersion : SCHEMA_VERSION
    });
  }

  function migratePayload(payload, sourceKey) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const isCurrentSchema = source.schemaVersion === SCHEMA_VERSION && source.answers && typeof source.answers === 'object';
    const sourceSchemaVersion = Number.isInteger(source.schemaVersion) ? source.schemaVersion : 1;
    const sourceModelVersion = typeof source.modelVersion === 'string' ? source.modelVersion : null;
    const sourceRuleSetVersion = typeof source.ruleSetVersion === 'string' ? source.ruleSetVersion : null;
    const versionsMatch = isCurrentSchema && sourceModelVersion === MODEL_VERSION && sourceRuleSetVersion === RULE_SET_VERSION;
    const inheritedRecalculation = Boolean(source.recalculationRequired);
    const migrated = sourceKey !== KEYS.current || !isCurrentSchema || !versionsMatch;
    const recalculationRequired = migrated || inheritedRecalculation;
    const reason = migrated
      ? (!isCurrentSchema || sourceKey !== KEYS.current ? 'legacy-schema' : 'model-or-rule-version-changed')
      : inheritedRecalculation
        ? (source.migrationReason || 'recalculation-required')
        : 'current';

    const envelope = createEnvelope({
      savedAt: source.savedAt || nowIso(),
      answers: source.answers && typeof source.answers === 'object' ? source.answers : {},
      currentQuestionIndex: Number.isInteger(source.currentQuestionIndex)
        ? source.currentQuestionIndex
        : Number.isInteger(source.idx)
          ? source.idx
          : 0,
      completedAt: recalculationRequired ? null : source.completedAt,
      recalculationRequired,
      migrationReason: recalculationRequired ? reason : null,
      sourceSchemaVersion
    });

    return Object.freeze({
      envelope,
      sourceKey,
      sourceSchemaVersion,
      sourceModelVersion: sourceModelVersion || 'legacy-unversioned',
      sourceRuleSetVersion: sourceRuleSetVersion || 'legacy-unversioned',
      migrated,
      recalculationRequired,
      completionReset: Boolean(source.completedAt) && envelope.completedAt === null,
      reason
    });
  }

  function applyMigration(migration) {
    const envelope = migration.envelope;
    app.state.answers = clone(envelope.answers || {});
    app.state.i = envelope.currentQuestionIndex;
    app.state.completedAt = envelope.completedAt;
    app.state.assessmentStorageSchemaVersion = SCHEMA_VERSION;
    app.state.assessmentSourceSchemaVersion = migration.sourceSchemaVersion;
    app.state.assessmentSourceStorageKey = migration.sourceKey;
    app.state.assessmentModelVersion = envelope.modelVersion;
    app.state.assessmentRuleSetVersion = envelope.ruleSetVersion;
    app.state.assessmentPreviousModelVersion = migration.sourceModelVersion;
    app.state.assessmentPreviousRuleSetVersion = migration.sourceRuleSetVersion;
    app.state.assessmentMigrationRequired = migration.recalculationRequired;
    app.state.assessmentMigrationReason = migration.reason;
    return true;
  }

  function persistCurrentEnvelope() {
    const storage = root.localStorage;
    if (!storage) return false;

    const completed = typeof app.state.completedAt === 'string' && app.state.completedAt.length > 0;
    const recalculationRequired = Boolean(app.state.assessmentMigrationRequired) && !completed;
    const envelope = createEnvelope({
      answers: app.state.answers || {},
      currentQuestionIndex: Number.isInteger(app.state.i) ? app.state.i : 0,
      completedAt: completed ? app.state.completedAt : null,
      recalculationRequired,
      migrationReason: recalculationRequired ? (app.state.assessmentMigrationReason || 'recalculation-required') : null,
      sourceSchemaVersion: Number.isInteger(app.state.assessmentSourceSchemaVersion)
        ? app.state.assessmentSourceSchemaVersion
        : SCHEMA_VERSION
    });

    storage.setItem(KEYS.current, JSON.stringify(envelope));
    storage.removeItem(KEYS.prior);
    storage.removeItem(KEYS.legacy);

    app.state.assessmentStorageSchemaVersion = SCHEMA_VERSION;
    app.state.assessmentSourceStorageKey = KEYS.current;
    app.state.assessmentModelVersion = MODEL_VERSION;
    app.state.assessmentRuleSetVersion = RULE_SET_VERSION;
    app.state.assessmentMigrationRequired = recalculationRequired;
    app.state.assessmentMigrationReason = recalculationRequired ? envelope.migrationReason : 'current';
    return true;
  }

  app.loadState = function modularLoadState() {
    try {
      const source = readFirstPayload();
      if (!source.payload) return false;
      return applyMigration(migratePayload(source.payload, source.key));
    } catch (_) {
      return false;
    }
  };

  app.saveState = function modularSaveState() {
    try {
      return persistCurrentEnvelope();
    } catch (_) {
      return false;
    }
  };

  const originalRecomputeAll = typeof app.recomputeAll === 'function'
    ? app.recomputeAll.bind(app)
    : null;
  if (originalRecomputeAll) {
    app.recomputeAll = function storageAwareRecomputeAll() {
      const result = originalRecomputeAll();
      try {
        persistCurrentEnvelope();
      } catch (_) {
        // The legacy engine treats unavailable local storage as non-fatal.
      }
      return result;
    };
  }

  root.CoverageCompassAssessmentStorage = Object.freeze({
    MODEL_VERSION,
    RULE_SET_VERSION,
    SCHEMA_VERSION,
    KEYS,
    createEnvelope,
    migratePayload,
    readFirstPayload,
    assessmentPayloadIsUsable,
    persistCurrentEnvelope
  });

  app.__assessmentStorageInstalled = true;
})(window);
