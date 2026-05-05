export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

export function suggest(input: string, candidates: string[]): string | null {
  if (candidates.length === 0) return null;

  const threshold = Math.ceil(input.length * 0.4);
  let best: string | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const dist = levenshtein(input, c);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }

  return bestDist <= threshold ? best : null;
}
