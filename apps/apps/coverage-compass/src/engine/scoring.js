import { createContribution, sumContributions } from './audit.js';

export function createScoreLedger(candidateKeys = []) {
  const allowed = new Set(candidateKeys.map(String));
  const contributions = [];

  function add(candidate, rule, amount, detail = null) {
    const key = String(candidate);
    if (allowed.size && !allowed.has(key)) throw new Error(`Unknown candidate: ${key}`);
    const contribution = createContribution({ candidate: key, rule, amount, detail });
    contributions.push(contribution);
    return contribution;
  }

  function snapshot() {
    return Object.freeze({
      candidateScores: sumContributions(contributions),
      contributions: Object.freeze(contributions.slice())
    });
  }

  return Object.freeze({ add, snapshot });
}
