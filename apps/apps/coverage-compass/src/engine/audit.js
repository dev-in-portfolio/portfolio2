function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

export function createContribution({ candidate, rule, amount, detail = null }) {
  if (!candidate) throw new TypeError('candidate is required.');
  if (!rule) throw new TypeError('rule is required.');
  return Object.freeze({
    candidate: String(candidate),
    rule: String(rule),
    amount: finiteNumber(amount, 'amount'),
    detail: detail == null ? null : JSON.parse(JSON.stringify(detail))
  });
}

export function sumContributions(contributions = []) {
  return Object.freeze(contributions.reduce((totals, contribution) => {
    const candidate = String(contribution.candidate);
    totals[candidate] = (totals[candidate] || 0) + finiteNumber(contribution.amount, 'contribution amount');
    return totals;
  }, {}));
}

export function compareCandidateTotals(candidateScores = {}, contributions = [], tolerance = 1e-9) {
  const calculated = sumContributions(contributions);
  const keys = new Set([...Object.keys(candidateScores), ...Object.keys(calculated)]);
  const mismatches = [];

  for (const key of keys) {
    const declared = Number(candidateScores[key] || 0);
    const audited = Number(calculated[key] || 0);
    if (!Number.isFinite(declared) || Math.abs(declared - audited) > tolerance) {
      mismatches.push(Object.freeze({ candidate: key, declared, audited, difference: declared - audited }));
    }
  }

  return Object.freeze({
    valid: mismatches.length === 0,
    calculated,
    mismatches: Object.freeze(mismatches)
  });
}

export function assertCandidateTotals(candidateScores = {}, contributions = [], tolerance = 1e-9) {
  const comparison = compareCandidateTotals(candidateScores, contributions, tolerance);
  if (!comparison.valid) {
    const detail = comparison.mismatches
      .map((item) => `${item.candidate}: declared=${item.declared}, audited=${item.audited}`)
      .join('; ');
    throw new Error(`Candidate score audit failed: ${detail}`);
  }
  return comparison;
}
