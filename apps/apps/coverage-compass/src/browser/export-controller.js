/* First-class export controller.
   Loaded after app.js so it owns safe and sensitive full export generation,
   including the deliberate confirmation boundary for full exports. */
(function installCoverageCompassExports(root) {
  'use strict';

  if (root.CoverageCompassExports?.installed) return;

  const DEFAULT_MODEL_VERSION = '2.0.0-modular.1';
  const DEFAULT_RULE_SET_VERSION = '2026.07-beta';

  function unique(items) {
    return [...new Set((items || []).filter(Boolean).map((item) => String(item)))];
  }

  function readinessStatus() {
    const reports = root.CoverageCompassReports;
    if (reports && typeof reports.reportReadinessStatus === 'function') {
      return reports.reportReadinessStatus();
    }
    return {
      status: 'calculation-error',
      label: 'Calculation unavailable',
      completenessPercent: 0,
      missingCriticalDomains: ['assessment-engine']
    };
  }

  function generalizedWarnings(app = root.CoverageCompass) {
    const flags = app?.state?.flags || {};
    const warnings = [];
    if (flags.medigap_lockout_risk || flags.medigap_underwriting_risk) warnings.push('Future Medigap access or underwriting may need verification.');
    if (flags.specialty_rx || flags.high_rx_complexity) warnings.push('Prescription coverage and formulary rules need verification.');
    if (flags.hmo_snowbird_risk || flags.snowbird) warnings.push('Travel and out-of-area care need verification.');
    if (flags.possible_LIS || flags.possible_MSP || flags.possible_Medicaid) warnings.push('Assistance eligibility may need review.');
    if (!warnings.length) warnings.push('Plan details still need independent verification before any change.');
    return unique(warnings);
  }

  function buildSafeExport(options = {}) {
    const app = options.app || root.CoverageCompass;
    const readiness = options.readiness || readinessStatus();
    const canShowDirectionalResult = readiness.status === 'preliminary' || readiness.status === 'complete';
    const winner = options.winner || (canShowDirectionalResult && app && typeof app.pickWinner === 'function'
      ? app.pickWinner()
      : { primary: {}, confidence: 'N/A' });
    const modelVersion = options.modelVersion || app?.modelVersion || root.ENV?.MODEL_VERSION || DEFAULT_MODEL_VERSION;
    const ruleSetVersion = options.ruleSetVersion || app?.ruleSetVersion || root.ENV?.RULE_SET_VERSION || DEFAULT_RULE_SET_VERSION;

    return JSON.stringify({
      exportType: 'safe',
      generatedAt: options.generatedAt || new Date().toISOString(),
      modelVersion,
      ruleSetVersion,
      readiness: {
        status: readiness.status,
        label: readiness.label,
        completenessPercent: readiness.completenessPercent,
        missingCriticalDomains: [...(readiness.missingCriticalDomains || [])]
      },
      directionalResult: {
        structure: canShowDirectionalResult ? (winner?.primary?.name || 'Unavailable') : 'Unavailable',
        confidence: readiness.status === 'complete' ? (winner.confidence || 'N/A') : (readiness.status === 'preliminary' ? 'Low' : 'N/A')
      },
      generalizedWarnings: generalizedWarnings(app),
      verificationReminder: 'Verify current plan details and enrollment rules with Medicare.gov, the plan, SHIP, and/or a trusted licensed professional before enrolling, switching, or canceling.'
    }, null, 2);
  }

  function fallbackReportAccess() {
    return {
      purchase_model: 'pay-per-report',
      billing_provider: 'unconfigured',
      source: 'private-beta',
      unlocked_reports: [],
      enforcement_note: 'Private beta report access. Production purchase enforcement is not configured.'
    };
  }

  function fallbackOrganizationProfile() {
    return {
      display_name: 'Coverage Compass',
      support_email: null,
      license_mode: 'private-beta',
      disclosure_stance: 'education-only',
      report_disclosure: null,
      privacy_note: 'Organization profile is stored locally and included only in sensitive full exports.'
    };
  }

  function fallbackReportContext() {
    return {
      client_label: null,
      prepared_by: null,
      organization: null,
      review_type: null,
      planning_horizon: null,
      report_date: null,
      reviewer_notes: null,
      privacy_note: 'Local-only print packet context. Avoid sensitive identifiers.'
    };
  }

  function resolveContext(builderName, fallback, explicitValue) {
    if (explicitValue && typeof explicitValue === 'object') return explicitValue;
    const builder = root[builderName];
    if (typeof builder !== 'function') return fallback();
    try {
      const value = builder();
      return value && typeof value === 'object' ? value : fallback();
    } catch {
      return fallback();
    }
  }

  function incompleteAssessmentText(readiness) {
    const missing = Array.isArray(readiness?.missingCriticalDomains) && readiness.missingCriticalDomains.length
      ? readiness.missingCriticalDomains.join(', ')
      : '(none listed)';
    return [
      'ASSESSMENT STATUS',
      `Status: ${readiness?.label || readiness?.status || "Assessment incomplete"}`,
      `Completion: ${Number.isFinite(readiness?.completenessPercent) ? readiness.completenessPercent : 0}%`,
      `Missing critical domains: ${missing}`,
      '',
      'A recommendation, numerical score, confidence rating, and decision-defense script are intentionally omitted until the assessment is complete and calculation-error free.'
    ].join('\n');
  }

  function engineAssessmentText(app, winner) {
    if (!app || typeof app.getExportText !== 'function') {
      throw new Error('Assessment export formatter is unavailable.');
    }
    return app.getExportText({
      ...(winner?.primary || {}),
      confidence: winner?.confidence || 'N/A'
    });
  }

  function buildFullExport(options = {}) {
    const app = options.app || root.CoverageCompass;
    const readiness = options.readiness || readinessStatus();
    const reportAccess = resolveContext('reportAccessContext', fallbackReportAccess, options.reportAccess);
    const organization = resolveContext('orgProfileContext', fallbackOrganizationProfile, options.organizationProfile);
    const reportContext = resolveContext('proReportContext', fallbackReportContext, options.reportContext);
    const generatedAt = options.generatedAt || new Date().toISOString();

    const contextBlock = [
      'REPORT ACCESS',
      `Purchase model: ${reportAccess.purchase_model || '(not set)'}`,
      `Billing provider: ${reportAccess.billing_provider || '(not set)'}`,
      `Access source: ${reportAccess.source || '(not set)'}`,
      `Unlocked reports: ${(reportAccess.unlocked_reports || []).join(', ') || '(none)'}`,
      `Enforcement note: ${reportAccess.enforcement_note || '(none)'}`,
      '',
      'ORGANIZATION PROFILE',
      `Display name: ${organization.display_name || '(not set)'}`,
      `Support email: ${organization.support_email || '(not set)'}`,
      `License mode: ${organization.license_mode || '(not set)'}`,
      `Disclosure stance: ${organization.disclosure_stance || '(not set)'}`,
      `Report disclosure: ${organization.report_disclosure || '(none)'}`,
      `Privacy note: ${organization.privacy_note || '(none)'}`,
      '',
      'PRINT PACKET CONTEXT',
      `Household / case label: ${reportContext.client_label || '(not set)'}`,
      `Prepared by / helper: ${reportContext.prepared_by || '(not set)'}`,
      `Organization: ${reportContext.organization || '(not set)'}`,
      `Review type: ${reportContext.review_type || '(not set)'}`,
      `Planning horizon: ${reportContext.planning_horizon || '(not set)'}`,
      `Report date: ${reportContext.report_date || '(not set)'}`,
      `Reviewer notes: ${reportContext.reviewer_notes || '(none)'}`,
      `Privacy note: ${reportContext.privacy_note || '(none)'}`
    ].join('\n');

    if (readiness.status !== 'complete') {
      return `${contextBlock}\n\n---\n${incompleteAssessmentText(readiness)}\n\n---\nGenerated: ${generatedAt}\n`;
    }

    const winner = options.winner || (app && typeof app.pickWinner === 'function'
      ? app.pickWinner()
      : { primary: {}, confidence: 'N/A' });
    return `${contextBlock}\n\n---\n${engineAssessmentText(app, winner)}\n\n---\nGenerated: ${generatedAt}\n`;
  }

  root.getExportText = function controlledGetExportText(mode) {
    if (mode === 'safe') return buildSafeExport();
    if (mode === 'full') return buildFullExport();
    throw new Error(`Unsupported export mode: ${String(mode)}`);
  };

  function installFullExportWarning() {
    const tabs = root.document?.getElementById('exportTabs');
    if (!tabs || tabs.dataset.exportWarningInstalled === 'true') return false;
    tabs.dataset.exportWarningInstalled = 'true';
    let fullExportConfirmed = false;

    tabs.addEventListener('click', (event) => {
      const tab = event.target.closest?.('[data-tab="full"]');
      if (!tab || fullExportConfirmed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const ok = root.confirm('Full export may contain health, financial, prescription, location, coverage-history, and identifying information. Continue?');
      if (!ok) return;
      fullExportConfirmed = true;
      tab.click();
    }, true);
    return true;
  }

  function installUi() {
    installFullExportWarning();
  }

  root.CoverageCompassExports = Object.freeze({
    installed: true,
    buildSafeExport,
    buildFullExport,
    generalizedWarnings,
    installFullExportWarning
  });

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', installUi, { once: true });
    else installUi();
  }
})(window);
