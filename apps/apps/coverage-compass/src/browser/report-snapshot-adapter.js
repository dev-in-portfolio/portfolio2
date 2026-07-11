/* First-class report snapshot isolation boundary.
   Loaded after reports.js and before hardening.js so legacy report builders
   never pass mutable engine references into hardened or modular snapshots. */
(function installCoverageCompassReportSnapshots(root) {
  'use strict';

  const reports = root.CoverageCompassReports;
  if (!reports || reports.__reportSnapshotAdapterInstalled) return;
  if (typeof reports.buildResultSnapshot !== 'function') return;

  function deepClone(value) {
    if (value === undefined) return undefined;
    if (typeof root.structuredClone === 'function') {
      try {
        return root.structuredClone(value);
      } catch (_) {
        // JSON-compatible assessment/report data uses the fallback below.
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function isolateSnapshot(value) {
    const isolated = deepClone(value);
    if (!isolated || typeof isolated !== 'object') {
      throw new TypeError('Report snapshot builders must return an object.');
    }
    return isolated;
  }

  const originalBuildResultSnapshot = reports.buildResultSnapshot.bind(reports);
  reports.buildResultSnapshot = function isolatedBuildResultSnapshot() {
    return isolateSnapshot(originalBuildResultSnapshot());
  };

  reports.__reportSnapshotAdapterInstalled = true;
  root.CoverageCompassReportSnapshots = Object.freeze({
    deepClone,
    isolateSnapshot,
    installed: true
  });
})(window);
