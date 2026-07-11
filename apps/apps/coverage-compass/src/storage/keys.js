export const STORAGE_PREFIX = 'coverage_compass_';
export const LEGACY_STORAGE_KEYS = Object.freeze(['mde_build']);

export const STORAGE_KEYS = Object.freeze({
  assessmentV1: 'coverage_compass_state_v1',
  assessmentV2: 'coverage_compass_assessment_v2',
  reportUnlocksV1: 'coverage_compass_report_unlocks_v1',
  organizationProfileV1: 'coverage_compass_org_profile_v1',
  reportContextV1: 'coverage_compass_pro_report_v1',
  blockedImportSession: 'coverage_compass_blocked_import'
});

export function isCoverageCompassStorageKey(key) {
  return typeof key === 'string' && (key.startsWith(STORAGE_PREFIX) || LEGACY_STORAGE_KEYS.includes(key));
}
