import { createScoreLedger } from './scoring.js';

export const LEGACY_CANDIDATES = Object.freeze(['MEDIGAP', 'MA_HMO', 'MA_PPO']);

function axis(axes, key) {
  const value = Number(axes?.[key] || 0);
  if (!Number.isFinite(value)) throw new TypeError(`Axis ${key} must be a finite number.`);
  return value;
}

function flag(flags, key) {
  return Boolean(flags?.[key]);
}

function addWeightedAxis(ledger, candidate, axes, axisName, weight) {
  const value = axis(axes, axisName);
  ledger.add(candidate, `axis.${axisName}`, value * weight, { axis: axisName, value, weight });
}

export function scoreLegacyCandidates(axes = {}, flags = {}) {
  const ledger = createScoreLedger(LEGACY_CANDIDATES);

  addWeightedAxis(ledger, 'MEDIGAP', axes, 'predictability', 3.0);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'networkDependency', 2.6);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'futureLockInSensitivity', 2.4);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'mobility', 1.3);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'utilization', 1.8);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'extrasPreference', -1.2);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'volatilityTolerance', -0.8);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'providerFragility', 0.9);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'churnSensitivity', 0.6);
  addWeightedAxis(ledger, 'MEDIGAP', axes, 'rxRisk', 0.4);
  if (flag(flags, 'medigap_lockout_risk')) {
    ledger.add('MEDIGAP', 'flag.medigap_lockout_risk', -2.2, { flag: 'medigap_lockout_risk' });
  }

  addWeightedAxis(ledger, 'MA_HMO', axes, 'extrasPreference', 2.6);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'volatilityTolerance', 2.0);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'adminTolerance', 1.3);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'assistanceLikelihood', 1.1);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'networkDependency', -2.5);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'mobility', -2.2);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'predictability', -1.6);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'utilization', -1.2);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'givebackAttraction', 0.8);
  if (flag(flags, 'giveback_veto')) ledger.add('MA_HMO', 'flag.giveback_veto', -1.0, { flag: 'giveback_veto' });
  addWeightedAxis(ledger, 'MA_HMO', axes, 'rxRisk', -0.25);
  addWeightedAxis(ledger, 'MA_HMO', axes, 'providerFragility', -0.25);
  if (flag(flags, 'hmo_snowbird_risk')) {
    ledger.add('MA_HMO', 'flag.hmo_snowbird_risk', -5.0, { flag: 'hmo_snowbird_risk' });
  }

  addWeightedAxis(ledger, 'MA_PPO', axes, 'extrasPreference', 2.0);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'volatilityTolerance', 1.6);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'adminTolerance', 1.1);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'assistanceLikelihood', 0.8);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'networkDependency', 1.1);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'mobility', -1.2);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'predictability', -0.7);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'givebackAttraction', 0.55);
  if (flag(flags, 'giveback_veto')) ledger.add('MA_PPO', 'flag.giveback_veto', -0.6, { flag: 'giveback_veto' });
  addWeightedAxis(ledger, 'MA_PPO', axes, 'rxRisk', -0.2);
  addWeightedAxis(ledger, 'MA_PPO', axes, 'providerFragility', -0.18);
  if (flag(flags, 'oon_tolerant')) ledger.add('MA_PPO', 'flag.oon_tolerant', 1.2, { flag: 'oon_tolerant' });
  if (flag(flags, 'oon_intolerant')) ledger.add('MA_PPO', 'flag.oon_intolerant', -0.7, { flag: 'oon_intolerant' });

  if (flag(flags, 'assistance_dominant')) {
    ledger.add('MA_HMO', 'flag.assistance_dominant', 2.0, { flag: 'assistance_dominant' });
    ledger.add('MA_PPO', 'flag.assistance_dominant', 1.5, { flag: 'assistance_dominant' });
    ledger.add('MEDIGAP', 'flag.assistance_dominant', -2.2, { flag: 'assistance_dominant' });
  }

  let snapshot = ledger.snapshot();
  if (flag(flags, 'needs_medicare_enrollment_guidance')) {
    for (const candidate of LEGACY_CANDIDATES) {
      ledger.add(candidate, 'hard-block.medicare-a-b-required', -999 - (snapshot.candidateScores[candidate] || 0), {
        flag: 'needs_medicare_enrollment_guidance',
        terminalScore: -999
      });
    }
    snapshot = ledger.snapshot();
  }

  return Object.freeze({
    candidateScores: snapshot.candidateScores,
    contributions: snapshot.contributions
  });
}
