const SINGLE_REPORTS = Object.freeze([
  'agent-ready',
  'switch-defense',
  'phone-script',
  'doorstep-event',
  'family-review',
  'annual-review',
  'red-flag'
]);

export function reportAccessFor(readiness = {}) {
  const status = readiness.status || 'not-started';
  const allowedReportIds = [];

  if (status === 'complete') allowedReportIds.push(...SINGLE_REPORTS, 'full-bundle');
  else if (status === 'preliminary') allowedReportIds.push(...SINGLE_REPORTS);
  else if (status === 'enrollment-review') allowedReportIds.push('enrollment-status');

  return Object.freeze({
    status,
    allowedReportIds: Object.freeze(allowedReportIds),
    canGenerateAnyReport: allowedReportIds.length > 0,
    canGenerateFinalBundle: allowedReportIds.includes('full-bundle')
  });
}

export function assertReportAllowed(reportId, readiness = {}) {
  if (readiness.status === 'calculation-error') {
    throw new Error('Coverage Compass could not complete this calculation reliably. No report was generated.');
  }

  const access = reportAccessFor(readiness);
  if (!access.allowedReportIds.includes(reportId)) {
    if (reportId === 'full-bundle') {
      throw new Error('Complete all critical assessment domains before generating the Full Coverage Compass Report Bundle.');
    }
    if (readiness.status === 'enrollment-review') {
      throw new Error('Resolve Medicare Part A and Part B status before generating coverage-structure packets.');
    }
    throw new Error('Complete more of the assessment before generating this report packet.');
  }

  return true;
}

export { SINGLE_REPORTS };
