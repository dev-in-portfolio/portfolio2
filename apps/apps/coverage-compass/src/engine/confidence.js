export function computeConfidence(rankedCandidates = [], thresholds = {}) {
  const highGap = Number.isFinite(thresholds.highGap) ? thresholds.highGap : 3;
  const mediumGap = Number.isFinite(thresholds.mediumGap) ? thresholds.mediumGap : 1.5;
  const first = rankedCandidates[0];
  const second = rankedCandidates[1];

  if (!first || !Number.isFinite(first.score)) return 'N/A';
  if (!second || !Number.isFinite(second.score)) return 'High';

  const gap = Math.abs(first.score - second.score);
  if (gap >= highGap) return 'High';
  if (gap >= mediumGap) return 'Medium';
  return 'Low';
}

export function rankCandidates(candidateScores = {}, names = {}) {
  return Object.entries(candidateScores)
    .map(([key, score]) => Object.freeze({
      key,
      name: names[key] || key,
      score: Number(score)
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}
