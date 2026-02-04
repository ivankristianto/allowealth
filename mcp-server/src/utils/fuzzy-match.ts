/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Fuzzy match a query against a list of options.
 *
 * Priority: exact match > substring match > Levenshtein distance.
 * Returns the best match or null if no good match found.
 */
export function fuzzyMatch(query: string, options: string[], maxDistance = 3): string | null {
  if (!query || options.length === 0) return null;

  const queryLower = query.toLowerCase().trim();
  if (queryLower === '') return null;

  // 1. Exact match (case-insensitive)
  const exactMatch = options.find((opt) => opt.toLowerCase() === queryLower);
  if (exactMatch) return exactMatch;

  // 2. Exact substring — prefer shorter options (more specific)
  const substringMatches = options.filter((opt) => opt.toLowerCase().includes(queryLower));
  if (substringMatches.length > 0) {
    return substringMatches.sort((a, b) => a.length - b.length)[0];
  }

  // 3. Levenshtein distance
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(queryLower, option.toLowerCase());
    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}
