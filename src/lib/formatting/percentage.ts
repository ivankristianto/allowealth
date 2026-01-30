export function formatPercentage(value: number, decimals: number = 2): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(decimals)}%`;
}
