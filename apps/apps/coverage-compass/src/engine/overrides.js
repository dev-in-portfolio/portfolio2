import { deepClone } from '../reports/snapshot.js';

export function applyRankingOverrides(rankedCandidates = [], overrideRules = [], context = {}) {
  let ranked = deepClone(rankedCandidates);
  const applied = [];

  for (const rule of overrideRules) {
    if (!rule || typeof rule.test !== 'function' || typeof rule.apply !== 'function') continue;
    if (!rule.test(Object.freeze(deepClone(context)), Object.freeze(deepClone(ranked)))) continue;

    const before = deepClone(ranked);
    const next = rule.apply(Object.freeze(deepClone(ranked)), Object.freeze(deepClone(context)));
    if (!Array.isArray(next)) throw new TypeError(`Override ${rule.id || 'unknown'} must return a ranked candidate array.`);
    ranked = deepClone(next);
    applied.push(Object.freeze({
      id: String(rule.id || 'unnamed-override'),
      reason: String(rule.reason || ''),
      before,
      after: deepClone(ranked)
    }));
  }

  return Object.freeze({
    ranked: Object.freeze(ranked.map(Object.freeze)),
    applied: Object.freeze(applied)
  });
}
