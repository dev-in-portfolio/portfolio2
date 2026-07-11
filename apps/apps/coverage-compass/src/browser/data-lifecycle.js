/* First-class local data lifecycle controller.
   Owns assessment-only reset and complete Coverage Compass browser cleanup.
   unrelated application storage is never cleared. */
(function installCoverageCompassDataLifecycle(root) {
  'use strict';

  if (root.CoverageCompassDataLifecycle?.installed) return;

  const STORAGE_PREFIX = 'coverage_compass_';
  const FALLBACK_ASSESSMENT_KEYS = Object.freeze([
    'coverage_compass_assessment_v2',
    'coverage_compass_state_v1',
    'mde_build'
  ]);
  const SESSION_KEYS = Object.freeze(['coverage_compass_blocked_import']);

  function assessmentKeys() {
    const configured = root.CoverageCompassAssessmentStorage?.KEYS;
    return [...new Set([
      configured?.current,
      configured?.prior,
      configured?.legacy,
      ...FALLBACK_ASSESSMENT_KEYS
    ].filter(Boolean))];
  }

  function removeKeys(storage, keys) {
    if (!storage) return [];
    const removed = [];
    for (const key of keys) {
      try {
        storage.removeItem(key);
        removed.push(key);
      } catch (_) {
        // Browser storage can be unavailable; cleanup remains best effort.
      }
    }
    return removed;
  }

  function clearAssessmentData() {
    return Object.freeze({
      localStorageKeys: removeKeys(root.localStorage, assessmentKeys()),
      sessionStorageKeys: []
    });
  }

  function coverageCompassLocalKeys() {
    const storage = root.localStorage;
    if (!storage) return [];
    const keys = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && (key.startsWith(STORAGE_PREFIX) || assessmentKeys().includes(key))) keys.push(key);
      }
    } catch (_) {
      return assessmentKeys();
    }
    return [...new Set([...keys, ...assessmentKeys()])];
  }

  function clearAllLocalData() {
    return Object.freeze({
      localStorageKeys: removeKeys(root.localStorage, coverageCompassLocalKeys()),
      sessionStorageKeys: removeKeys(root.sessionStorage, SESSION_KEYS)
    });
  }

  function bindResetControls() {
    const document = root.document;
    if (!document) return false;

    const resetAll = document.getElementById('btnResetAll');
    if (resetAll) {
      resetAll.textContent = 'Clear All Local Data';
      resetAll.onclick = () => {
        const ok = root.confirm('This removes all Coverage Compass assessment answers, report context, organization information, local report access, and preferences from this browser. This cannot be undone.');
        if (!ok) return;
        clearAllLocalData();
        root.location.reload();
      };
    }

    const restart = document.getElementById('btnReset');
    if (restart) {
      restart.textContent = 'Restart Assessment';
      restart.onclick = () => {
        const ok = root.confirm('Restart the assessment and remove the current answers from this browser?');
        if (!ok) return;
        clearAssessmentData();
        root.location.reload();
      };
    }

    return Boolean(resetAll || restart);
  }

  function installUi() {
    bindResetControls();
  }

  root.CoverageCompassDataLifecycle = Object.freeze({
    installed: true,
    STORAGE_PREFIX,
    assessmentKeys,
    clearAssessmentData,
    clearAllLocalData,
    bindResetControls
  });

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', installUi, { once: true });
    else installUi();
  }
})(window);
